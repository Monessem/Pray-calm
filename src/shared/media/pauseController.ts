/**
 * Media pause controller — Tcalm Firefox Extension (v1.1.26).
 *
 * The honest Firefox-native replacement for Tcalm's playerctl/MPRIS and
 * AppleScript controllers. A WebExtension CANNOT pause desktop apps
 * (Spotify desktop, VLC, system media) — it can pause media inside
 * Firefox tabs, in origins the user has granted access to.
 *
 * v1.1.24 architecture — "target the noise, in parallel":
 *  - v1.1.23 reached the page world (world:"MAIN" injection) which made
 *    SoundCloud & Co. pausable, but still iterated EVERY open tab
 *    sequentially — two awaited executeScript calls per tab, so a
 *    140-tab session took seconds before the playing tab went quiet.
 *  - A pause now targets only tabs that can plausibly be making noise:
 *      1. tabs.query({ audible: true }) — producing sound right now;
 *      2. tabs that produced sound in the last few minutes
 *         (shared/media/audibleTabs.ts cache — covers track gaps and
 *         buffering stalls of still-"playing" tabs);
 *      3. the active tab of every window (the user is often watching
 *         the thing they want paused; a just-started video is not yet
 *         audible during its first silent seconds).
 *    Firefox's audible indicator IS the tab speaker icon every user
 *    sees — no extra permission is needed to query it.
 *  - Targets are processed CONCURRENTLY (bounded mapLimit), not one
 *    after another, so even a noisy 20-tab session pauses in one round
 *    trip instead of twenty.
 *  - Trade-off (documented in README): a tab that is "playing" but has
 *    been silent for minutes (site-muted, volume 0) is no longer
 *    force-paused. It makes no sound during prayer either way; if it
 *    becomes audible later, hold sweeps re-pause it.
 *
 * v1.1.24 resume semantics — "undo the LAST pause, nothing else":
 *  - Every restorable pause event (prayer, manual test) records the tabs
 *    it actually paused (storage key `lastPause`, one record, newest
 *    wins). Sweep re-pauses are not restorable and never touch it.
 *  - "Resume paused media" (and an expiring hold) restore exactly that
 *    record / hold. Older pause events are never resurrected — the
 *    v1.1.23 "resume broadcasts to all tabs" behavior could restart
 *    several paused tabs at once, which the owner explicitly rejected.
 *
 * v1.1.26 hold hardening — "burst, then settle":
 *  - The page-world hook's anti-auto-resume watch covers the first
 *    half-second. For players that keep insisting (live radio, ad
 *    pipelines, auto-next queues), the hold now arms damped one-shot
 *    sweep alarms at +5 s, +10 s, +20 s, +35 s (the original Tcalm
 *    daemon re-paused every 5 s) before the 1-minute periodic sweep
 *    takes over — a restarted stream goes quiet in seconds, not up to
 *    a minute.
 *
 * Semantics (unchanged since v1.0.8, documented in README + options UI):
 *  - Pause happens only for media that is actually playing.
 *  - Elements paused by the initial prayer event are tracked, and — only
 *    in hold mode (duration > 0) — are resumed when the hold expires.
 *  - Hold sweeps re-pause anything that starts playing during the hold
 *    (Tcalm daemon behavior), but those sweep-pauses are never
 *    auto-resumed.
 *  - Single-pause mode (duration 0, the Tcalm default) has no hold; the
 *    manual resume button undoes the last pause event.
 *  - The user always wins: if they manually resume a paused element, the
 *    page-world hook drops it from the restore set.
 */
import type { ActivePause, LastPauseRecord, MainPrayerName, Settings } from '../types.ts';
import { ALARM_NAMES, SCHEDULER } from '../constants.ts';
import {
  clearLastPauseRecord,
  getActivePause,
  getLastPauseRecord,
  getSettings,
  saveActivePause,
  saveLastPauseRecord,
} from '../storage/storage.ts';
import { recentAudibleTabIds } from './audibleTabs.ts';

const HOOK_FILE = 'content/media-hook.js';

/** How many tabs the sweep scripts at once (executeScript round trips). */
const CONCURRENCY = 8;

/**
 * Firefox 135+ lets scripting.executeScript run in the page's MAIN world.
 * @types/webextension-polyfill 0.12 does not know the field yet, hence
 * this local widening (runtime behavior is identical to the typed API).
 */
type MainWorldInjection = Parameters<typeof browser.scripting.executeScript>[0] & {
  world: 'MAIN';
};

/** Per-frame answer of the page-world hook (see mediaHook.ts). */
interface FrameResult {
  paused?: number;
  contexts?: number;
  resumed?: number;
  title?: string;
  host?: string;
  skipped?: boolean;
  resistant?: boolean;
  unavailable?: boolean;
}

export interface TabPauseResult {
  tabId: number;
  paused: number;
  contexts: number;
  /** Allowlist mode: every frame declined the host. */
  skipped: boolean;
  /** Script injection failed (restricted page, no host permission, …). */
  unreachable: boolean;
  /** Page reports playing media that resisted every reach. */
  resistant: boolean;
  /** Hosts of frames reporting resistant playing media. */
  resistantHosts: string[];
  /** Identity of the frame that paused the most media. */
  title?: string;
  host?: string;
}

export interface PauseOutcome {
  /** Tabs the pause actually ran against (scriptable and reachable). */
  attempted: number;
  /** Candidate tabs considered (audible, recently audible, or active). */
  candidates: number;
  /** Candidates skipped without an injection attempt (discarded/frozen). */
  skippedInactive: number;
  /** Tabs where script injection failed. */
  unreachable: number;
  tabsWithPauses: number;
  elementsPaused: number;
  contextsSuspended: number;
  /** Hostnames reporting playing media that could not be paused. */
  resistantHosts: string[];
  tabResults: TabPauseResult[];
}

export interface ResumeOutcome {
  tabs: number;
  elements: number;
  contexts: number;
  /** Which source the resume came from (options status line). */
  source: 'hold' | 'last' | 'none';
}

// --- Page-world trampolines ---------------------------------------------------
//
// These two functions are SERIALIZED into the page world by
// browser.scripting.executeScript — they must stay completely
// self-contained (no imports, no closure over this module). They find the
// hook's page-world global and delegate; every failure mode degrades to a
// zero count so one hostile or exotic page can never break the sweep.

function tcalmFramePause(restorable: boolean, allow: string[] | null): unknown {
  const media = (window as unknown as {
    __tcalmMedia?: { pause: (options: { restorable: boolean; allow: string[] | null }) => unknown };
  }).__tcalmMedia;
  if (!media || typeof media.pause !== 'function') {
    return { paused: 0, contexts: 0, unavailable: true };
  }
  try {
    // May return a promise (the late-injection getter trap waits ~500 ms)
    // — executeScript awaits it before reporting the frame result.
    return media.pause({ restorable, allow });
  } catch {
    return { paused: 0, contexts: 0, error: true };
  }
}

function tcalmFrameResume(): unknown {
  const media = (window as unknown as { __tcalmMedia?: { resume: () => unknown } }).__tcalmMedia;
  if (!media || typeof media.resume !== 'function') {
    return { resumed: 0, contexts: 0 };
  }
  try {
    return media.resume();
  } catch {
    return { resumed: 0, contexts: 0 };
  }
}

// --- Frame result aggregation ---------------------------------------------------

function frameCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

interface TabAggregate {
  paused: number;
  contexts: number;
  resumed: number;
  skipped: boolean;
  resistant: boolean;
  /** Hosts of frames that reported resistant playing media. */
  resistantHosts: string[];
  title?: string;
  host?: string;
}

function aggregateFrames(results: ReadonlyArray<{ frameId?: number; result?: unknown }>): TabAggregate {
  const totals: TabAggregate = {
    paused: 0,
    contexts: 0,
    resumed: 0,
    skipped: true,
    resistant: false,
    resistantHosts: [],
  };
  for (const entry of results) {
    const frame = entry?.result as FrameResult | undefined;
    if (!frame || typeof frame !== 'object') continue; // failed frame — ignored
    const paused = frameCount(frame.paused);
    const contexts = frameCount(frame.contexts);
    const resumed = frameCount(frame.resumed);
    if (paused > 0 || contexts > 0 || resumed > 0) totals.skipped = false;
    totals.paused += paused;
    totals.contexts += contexts;
    totals.resumed += resumed;
    if (paused + contexts === 0 && frame.resistant === true) {
      totals.resistant = true;
      if (typeof frame.host === 'string' && frame.host.length > 0) {
        totals.resistantHosts.push(frame.host);
      }
    }
    // Tab identity from the frame that actually paused media.
    if (
      totals.title === undefined &&
      paused > 0 &&
      typeof frame.title === 'string' &&
      frame.title.length > 0
    ) {
      totals.title = frame.title;
      totals.host = typeof frame.host === 'string' && frame.host.length > 0 ? frame.host : undefined;
    }
  }
  return totals;
}

// --- Target collection ---------------------------------------------------------

/** Minimal tab shape the controller needs (no url/title — least privilege). */
interface TargetTab {
  id: number;
  discarded?: boolean;
  frozen?: boolean;
  status?: string;
}

/** Tabs we can even try to script: loaded, not discarded/frozen. */
function isScriptableTab(tab: { discarded?: boolean; frozen?: boolean; status?: string }): boolean {
  if (tab.discarded === true || tab.frozen === true) return false;
  if (tab.status === 'unloaded') return false;
  return true;
}

/**
 * Candidate tabs that might be making noise: currently audible, recently
 * audible, or the active tab of any window. See the module header for why
 * each source earns its place. Failures of any single source shrink the
 * target set gracefully — the pause still runs on what remains.
 */
async function collectTargets(): Promise<TargetTab[]> {
  const byId = new Map<number, TargetTab>();

  try {
    const audible = await browser.tabs.query({ audible: true });
    for (const tab of audible) {
      if (typeof tab.id === 'number') byId.set(tab.id, tab as TargetTab);
    }
  } catch {
    // query unsupported — fall through to the other sources
  }

  try {
    // The active tab of EVERY window: query({ active: true }) matches one
    // tab per window, not just the focused window.
    const active = await browser.tabs.query({ active: true });
    for (const tab of active) {
      if (typeof tab.id === 'number' && !byId.has(tab.id)) {
        byId.set(tab.id, tab as TargetTab);
      }
    }
  } catch {
    // ignore
  }

  for (const tabId of recentAudibleTabIds()) {
    if (byId.has(tabId)) continue;
    try {
      const tab = await browser.tabs.get(tabId);
      if (tab && typeof tab.id === 'number') byId.set(tab.id, tab as TargetTab);
    } catch {
      // closed since it was last audible — skip
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

// --- Concurrency ---------------------------------------------------------------

/**
 * Bounded-parallel map, input order preserved. Chunks are simple and
 * predictable: no queue machinery, no starvation — exactly CONCURRENCY
 * promises in flight at any moment.
 */
async function mapLimit<T, R>(items: ReadonlyArray<T>, limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  const chunk = Math.max(1, Math.floor(limit));
  for (let i = 0; i < items.length; i += chunk) {
    const slice = items.slice(i, i + chunk);
    const results = await Promise.all(slice.map(fn));
    out.push(...results);
  }
  return out;
}

// --- Core sweep -----------------------------------------------------------------

/**
 * Pause all playing media in tabs that can plausibly be making noise.
 * Tabs without host permission and privileged pages (about:*, add-ons
 * manager, …) fail injection and are counted as unreachable — silently.
 * The URL itself is never read: no "tabs" permission exists (least
 * privilege) and executeScript decides access by origin.
 */
export async function pauseAllTabs(
  settings: Pick<Settings, 'mediaScope' | 'mediaAllowedSites'>,
  options: { restorable: boolean },
): Promise<PauseOutcome> {
  const outcome: PauseOutcome = {
    attempted: 0,
    candidates: 0,
    skippedInactive: 0,
    unreachable: 0,
    tabsWithPauses: 0,
    elementsPaused: 0,
    contextsSuspended: 0,
    resistantHosts: [],
    tabResults: [],
  };

  try {
    const scriptingGranted = await browser.permissions.contains({
      permissions: ['scripting'],
    });
    if (scriptingGranted === false) {
      return outcome; // feature dormant until the user grants access
    }
  } catch {
    // permissions API unavailable in this context — per-tab errors below
    // still cover the no-access case.
  }

  const targets = await collectTargets();
  outcome.candidates = targets.length;

  const allow = settings.mediaScope === 'allowlist' ? settings.mediaAllowedSites : null;
  const scriptable = targets.filter((tab) => {
    const ok = isScriptableTab(tab);
    if (!ok) outcome.skippedInactive += 1;
    return ok;
  });
  outcome.attempted = scriptable.length;

  const tabResults = await mapLimit(scriptable, CONCURRENCY, async (tab): Promise<TabPauseResult> => {
    const base: TabPauseResult = {
      tabId: tab.id,
      paused: 0,
      contexts: 0,
      skipped: true,
      unreachable: false,
      resistant: false,
      resistantHosts: [],
    };
    try {
      // (1) Make sure the page-world hook exists in every frame. Where the
      //     static manifest registration already ran this is a no-op; on
      //     tabs opened before the extension (re)loaded it installs late
      //     and the hook catches up via its getter trap.
      await browser.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        world: 'MAIN',
        files: [HOOK_FILE],
      } as MainWorldInjection);
      // (2) Run the pause in every frame and collect per-frame counts.
      const results = (await browser.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        world: 'MAIN',
        func: tcalmFramePause,
        args: [options.restorable, allow],
      } as MainWorldInjection)) as ReadonlyArray<{ frameId?: number; result?: unknown }>;

      const aggregate = aggregateFrames(Array.isArray(results) ? results : []);
      return {
        ...base,
        paused: aggregate.paused,
        contexts: aggregate.contexts,
        skipped: aggregate.skipped,
        resistant: aggregate.resistant,
        resistantHosts: aggregate.resistantHosts,
        title: aggregate.title,
        host: aggregate.host,
      };
    } catch {
      // No host permission for this tab's origin, privileged page, or the
      // tab died mid-sweep — expected and harmless.
      return { ...base, skipped: true, unreachable: true };
    }
  });

  for (const result of tabResults) {
    if (result.unreachable) outcome.unreachable += 1;
    outcome.tabResults.push(result);
    outcome.elementsPaused += result.paused;
    outcome.contextsSuspended += result.contexts;
    outcome.resistantHosts.push(...result.resistantHosts);
  }
  outcome.tabsWithPauses = outcome.tabResults.filter((r) => r.paused + r.contexts > 0).length;
  return outcome;
}

// --- Resume -----------------------------------------------------------------------

/** Resume only the elements this extension paused, in the given tabs. */
export async function resumeTabs(tabIds: ReadonlyArray<number>): Promise<ResumeOutcome> {
  const totals: ResumeOutcome = { tabs: 0, elements: 0, contexts: 0, source: 'last' };
  const targets = Array.from(new Set(tabIds.filter((id) => Number.isInteger(id)))).sort((a, b) => a - b);
  const results = await mapLimit(targets, CONCURRENCY, (tabId) => resumeInTab(tabId));
  for (const result of results) {
    if (result.elements + result.contexts > 0) totals.tabs += 1;
    totals.elements += result.elements;
    totals.contexts += result.contexts;
  }
  return totals;
}

async function resumeInTab(tabId: number): Promise<{ elements: number; contexts: number }> {
  try {
    // No hook injection here on purpose: a tab without the page-world
    // hook never had anything paused by Tcalm, so there is nothing to
    // restore — and a reloaded tab correctly resumes nothing.
    const results = (await browser.scripting.executeScript({
      target: { tabId, allFrames: true },
      world: 'MAIN',
      func: tcalmFrameResume,
    } as MainWorldInjection)) as ReadonlyArray<{ frameId?: number; result?: unknown }>;
    const aggregate = aggregateFrames(Array.isArray(results) ? results : []);
    return { elements: aggregate.resumed, contexts: aggregate.contexts };
  } catch {
    // Tab closed or navigated since the pause — nothing to restore.
    return { elements: 0, contexts: 0 };
  }
}

/**
 * Execute the prayer-time media action for a given prayer.
 * Mirrors Tcalm's execute_adhan_pause(): pause now; if a duration is
 * configured, hold (periodic re-pause) and resume afterwards.
 */
export async function executePrayerPause(
  prayer: MainPrayerName,
  settings: Pick<Settings, 'mediaPauseDuration' | 'mediaScope' | 'mediaAllowedSites'>,
  nowMs: number,
): Promise<PauseOutcome> {
  const { outcome } = await startPause(prayer, settings, nowMs, {
    holdWhenIdle: true,
  });
  return outcome;
}

/**
 * v1.0.8: the options page's "Test media pause" button. Semantics are
 * IDENTICAL to a real prayer event — it honors mediaPauseDuration exactly:
 *   duration 0  -> single pause, undone only by "Resume paused media"
 *                  (which restores exactly this event's tabs);
 *   duration >0 -> a real hold with sweeps and auto-resume at the
 *                  configured time (the options "Resume paused media"
 *                  button can end it early).
 */
export async function executeManualPause(
  settings: Pick<Settings, 'mediaPauseDuration' | 'mediaScope' | 'mediaAllowedSites'>,
  nowMs: number,
): Promise<{ outcome: PauseOutcome; resumeAt: number | null }> {
  // A test with nothing playing must not start a phantom hold.
  return startPause('test', settings, nowMs, { holdWhenIdle: false });
}

/**
 * Shared pause core. holdWhenIdle=true (prayer events) starts the hold even
 * when nothing was playing — the window must keep media quiet if the user
 * starts something DURING it; false (manual test) only holds when something
 * was actually paused.
 */
async function startPause(
  prayer: MainPrayerName | 'test',
  settings: Pick<Settings, 'mediaPauseDuration' | 'mediaScope' | 'mediaAllowedSites'>,
  nowMs: number,
  options: { holdWhenIdle: boolean },
): Promise<{ outcome: PauseOutcome; resumeAt: number | null }> {
  const outcome = await pauseAllTabs(settings, { restorable: true });
  const pausedTabs = outcome.tabResults.filter((r) => r.paused + r.contexts > 0);

  // v1.1.24: remember THIS event as the last restorable pause — the
  // manual resume button restores exactly these tabs, not every tab
  // Tcalm ever paused. Only restorable events write the record; sweep
  // re-pauses (restorable=false) never come near it.
  if (pausedTabs.length > 0) {
    const record: LastPauseRecord = {
      at: nowMs,
      tabIds: pausedTabs.map((r) => r.tabId),
    };
    await saveLastPauseRecord(record);
  }

  if (
    settings.mediaPauseDuration <= 0 ||
    (pausedTabs.length === 0 && !options.holdWhenIdle)
  ) {
    // Single-pause mode (or nothing playing): no hold state, no alarms —
    // the only resume path is the manual button + lastPause record.
    return { outcome, resumeAt: null };
  }
  const resumeAt = nowMs + settings.mediaPauseDuration * 60_000;
  const activePause: ActivePause = {
    prayer,
    startedAt: nowMs,
    resumeAt,
    tabIds: pausedTabs.map((r) => r.tabId),
    lastSweepAt: nowMs,
  };
  await saveActivePause(activePause);
  await createHoldAlarms(nowMs, resumeAt);
  return { outcome, resumeAt };
}

/**
 * Hold-mode alarms: the damped burst one-shots (v1.1.26), the periodic
 * sweep, and the one-shot resume. Idempotent names. Burst entries beyond
 * the resume time are skipped — a 10-second hold does not need a 35-second
 * sweep.
 */
export async function createHoldAlarms(startedAt: number, resumeAt: number): Promise<void> {
  try {
    for (const [seq, delay] of SCHEDULER.holdBurstDelaysMs.entries()) {
      const at = startedAt + delay;
      if (at >= resumeAt) break;
      await browser.alarms.create(ALARM_NAMES.holdBurst(seq, at), { when: at });
    }
    await browser.alarms.create(ALARM_NAMES.holdSweep, {
      periodInMinutes: SCHEDULER.holdSweepPeriodMinutes,
    });
    await browser.alarms.create(ALARM_NAMES.holdResume(resumeAt), {
      when: resumeAt,
    });
  } catch {
    // Alarms API unavailable — hold simply won't re-pause/resume.
  }
}

/**
 * One hold sweep: re-pause whatever is playing (non-restorable), unless the
 * hold already expired — then finish it. Mirrors Tcalm's daemon behavior of
 * keeping media quiet for the whole pause window.
 */
export async function sweepHold(nowMs: number): Promise<void> {
  const pause = await getActivePause();
  if (!pause) {
    await clearHoldAlarms();
    return;
  }
  if (pause.resumeAt !== null && nowMs >= pause.resumeAt) {
    await endHold(nowMs);
    return;
  }
  const settings = await getSettings();
  if (settings.enabled && settings.mediaPauseEnabled) {
    // Sweep pauses are NOT restorable: media the user started during the
    // prayer window must not be auto-resumed later — and they never
    // overwrite the lastPause record (still the initial event's).
    await pauseAllTabs(settings, { restorable: false });
  }
  await saveActivePause({ ...pause, lastSweepAt: nowMs });
}

/**
 * End the active hold: resume only what Tcalm paused itself, clear state.
 * v1.1.24: also clears the lastPause record — the hold WAS the newest
 * pause event, and its elements have just been restored, so there is
 * nothing left for the manual button to undo. Returns what was restored
 * so callers (manual resume, scheduler) can report it.
 */
export async function endHold(_nowMs: number): Promise<ResumeOutcome> {
  const pause = await getActivePause();
  await clearHoldAlarms();
  await saveActivePause(null);
  await clearLastPauseRecord();
  if (!pause) return { tabs: 0, elements: 0, contexts: 0, source: 'none' };
  const totals = await resumeTabs(pause.tabIds);
  return { ...totals, source: 'hold' };
}

/**
 * v1.1.24: "Resume paused media" — undo the LAST pause event only.
 *  1. An active hold is the newest event by definition: end it (its
 *     elements are restored, alarms and state cleared).
 *  2. Otherwise restore the recorded last pause (single-pause mode,
 *     duration 0): exactly the tabs of the most recent event — older
 *     events stay paused until the user plays them manually. A closed
 *     or reloaded target tab resumes nothing (its hook state is gone).
 * Hook-side guards still apply: only elements Tcalm itself paused and
 * that are still paused are restarted (the "user wins" rule).
 */
export async function resumeLastPause(): Promise<ResumeOutcome> {
  const hold = await getActivePause();
  if (hold) {
    return endHold(Date.now());
  }
  const record = await getLastPauseRecord();
  if (!record) {
    return { tabs: 0, elements: 0, contexts: 0, source: 'none' };
  }
  const totals = await resumeTabs(record.tabIds);
  await clearLastPauseRecord();
  return { ...totals, source: 'last' };
}

/** Remove every media-hold alarm without touching prayer alarms. */
export async function clearHoldAlarms(): Promise<void> {
  try {
    const alarms = await browser.alarms.getAll();
    for (const alarm of alarms) {
      if (
        alarm.name === ALARM_NAMES.holdSweep ||
        alarm.name.startsWith('media-resume:') ||
        alarm.name.startsWith('media-hold-burst:')
      ) {
        await browser.alarms.clear(alarm.name);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Startup/integrity recovery for an active pause:
 *  - hold expired while the browser was closed -> resume now;
 *  - hold still active -> recreate its alarms.
 */
export async function recoverActivePause(nowMs: number): Promise<void> {
  const pause = await getActivePause();
  if (!pause) {
    return;
  }
  if (pause.resumeAt === null) {
    await saveActivePause(null);
    return;
  }
  if (nowMs >= pause.resumeAt) {
    await endHold(nowMs);
  } else {
    await createHoldAlarms(pause.startedAt, pause.resumeAt);
  }
}
