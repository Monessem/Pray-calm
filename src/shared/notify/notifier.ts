/**
 * Notification service — Tcalm Firefox Extension.
 *
 * Firefox-native replacement for Tcalm's notify-send / osascript calls.
 * Titles and bodies are localized (carried over from Tcalm's i18n
 * tables). No remote notification service is ever used.
 *
 * v1.0.6: bodies carry the prayer's own time in the user's 12/24-hour
 * display format.
 *
 * v1.1.6: display CONFIRMATION. A notification that resolves create() is
 * NOT proof the OS banner appeared. notifications.onShown (Firefox-only,
 * feature-detected) proves display, creation failures are recorded with
 * raw errors, and the test notification answers with { ok, shown }.
 *
 * v1.1.17: THE RADICAL FIX for "sound plays but the browser never shows
 * the notification". The system banner is now only ONE of two visible
 * channels; the second is the Tcalm toast window (shared/notify/
 * toastWindow.ts) which no OS notification setting can suppress:
 *   - alertWindowMode 'always': toast at every notified prayer
 *     and advance notice, regardless of banner outcome;
 *   - 'auto': toast only when the banner was not confirmed shown;
 *   - 'never' (the default since v1.1.21): banner-only.
 * The chime now plays when EITHER visible channel succeeded, and an
 * in-memory storm guard (12 h TTL) drops duplicate events at the
 * notifier level — the scheduler's persisted firedEvents ledger remains
 * the first line of defense.
 *
 * v1.1.25: Diagnostics is SIGNAL-ONLY. The background event page wakes
 * about once a minute (badge tick); the readiness check now records its
 * verdict only when it changes (once per browser session via
 * browser.storage.session) instead of appending an identical line on
 * every wake, which had buried every real event in noise. Failures are
 * never deduped.
 */
import type { MainPrayerName, Settings } from '../types.ts';
import { resolveLanguage, prayerName, t } from '../i18n/i18n.ts';
import { formatEpochAsTime, formatTimeForDisplay } from '../time/format.ts';
import { resolveTimezone } from '../time/tz.ts';
import { SCHEDULER } from '../constants.ts';
import { log } from '../utils/log.ts';
import { recordDiag } from '../utils/diagnostics.ts';
import { openToastWindow } from './toastWindow.ts';

function iconUrl(): string {
  // Static string keeps the manifest audit simple; runtime.getURL not needed
  // for extension-relative notification icons in Firefox.
  return 'icons/icon-96.png';
}

let chimeAudio: HTMLAudioElement | null = null;

/** Best-effort chime; Firefox may block background audio — never throws. */
function playChime(): void {
  try {
    if (!chimeAudio) {
      chimeAudio = new Audio('audio/chime.ogg');
    }
    chimeAudio.currentTime = 0;
    const playback = chimeAudio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        /* autoplay blocked — the toast window still shows */
      });
    }
  } catch {
    // Audio constructor/play unsupported — ignore.
  }
}

function languageOf(settings: Settings): 'en' | 'ar' {
  let ui = 'en';
  try {
    ui = browser.i18n?.getUILanguage?.() ?? 'en';
  } catch {
    ui = 'en';
  }
  return resolveLanguage(settings.language, ui);
}

/** Display string for a prayer epoch in the user's format, e.g. "6:45 PM". */
function displayTime(epochMs: number | null, settings: Settings, lang: 'en' | 'ar'): string {
  if (epochMs === null) return lang === 'ar' ? 'الآن' : 'now';
  const tz = resolveTimezone(settings.timezone);
  const timeStr = formatEpochAsTime(epochMs, tz);
  return formatTimeForDisplay(timeStr, settings.timeFormat, lang);
}

/*
 * --- Display confirmation (Firefox notifications.onShown) ------------------
 *
 * create() resolving only means Firefox ACCEPTED the notification; the OS
 * may still suppress the banner (Focus Assist, per-app banner settings…).
 * Firefox fires notifications.onShown when the banner is actually painted.
 * We register the id → label BEFORE create so the event can never race us,
 * and lazy-prune stale entries so the map cannot grow unbounded on engines
 * without the event (where nothing fires and nothing resolves).
 */
const SHOWN_LABEL_TTL_MS = 60_000;
const shownLabels = new Map<string, { label: string; at: number }>();
const shownWaiters = new Map<string, (shown: boolean) => void>();

function trackForShown(id: string, label: string): void {
  const now = Date.now();
  for (const [key, entry] of shownLabels) {
    if (now - entry.at > SHOWN_LABEL_TTL_MS) shownLabels.delete(key);
  }
  shownLabels.set(id, { label, at: now });
}

/** Promise that resolves true when onShown fires (false after `waitMs`). */
function awaitShown(id: string, waitMs: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      shownWaiters.delete(id);
      resolve(false);
    }, waitMs);
    shownWaiters.set(id, (shown: boolean) => {
      clearTimeout(timer);
      shownWaiters.delete(id);
      resolve(shown);
    });
  });
}

/**
 * Call from the background's notifications.onShown listener. Records the
 * display confirmation to the diagnostics log ("system banner displayed
 * (maghrib)") and resolves any pending confirmation wait.
 */
export function onNotificationShown(notificationId: string): void {
  const label = shownLabels.get(notificationId)?.label ?? 'unknown';
  shownLabels.delete(notificationId);
  log.info('notify', `system banner displayed (${label})`);
  void recordDiag('notify', 'info', `system banner displayed (${label})`);
  const waiter = shownWaiters.get(notificationId);
  if (waiter) waiter(true);
}

/*
 * --- v1.1.17: in-memory storm guard ------------------------------------------
 *
 * Second line of defense behind the scheduler's persisted firedEvents
 * ledger: the same event (kind+prayer+epoch) hitting the notifier twice
 * within the TTL is dropped here. Bounded (pruned on insert, hard cap).
 */
const notifyGuard = new Map<string, number>();

/**
 * Test-only seam: the guard is module state that must not leak between
 * unit tests (each test simulates a fresh background boot).
 */
export function resetNotifyGuardForTests(): void {
  notifyGuard.clear();
}

function guardSeen(key: string): boolean {
  const now = Date.now();
  for (const [k, at] of notifyGuard) {
    if (now - at > SCHEDULER.notifyGuardTtlMs) notifyGuard.delete(k);
  }
  if (notifyGuard.has(key)) return true;
  notifyGuard.set(key, now);
  if (notifyGuard.size > 64) {
    // Evict the oldest entry — pathological case only.
    const firstKey = notifyGuard.keys().next().value;
    if (firstKey !== undefined) notifyGuard.delete(firstKey);
  }
  return false;
}

/*
 * --- v1.1.25: change-driven readiness logging --------------------------------
 *
 * The background event page wakes roughly once a minute (badge-tick alarm).
 * Every wake used to re-run this check and append "notifications ready"
 * to Diagnostics, so the 120-entry buffer filled with ~60 identical lines
 * per hour and buried every real event (the owner's report). The verdict
 * is now recorded only when it CHANGES, tracked in browser.storage.session
 * (which survives event-page suspensions but is cleared on browser
 * restart — exactly the "once per browser session" semantics a boot
 * confirmation needs):
 *   - READY is announced once per session (first success or recovery
 *     after a failure) and stays silent on every later wake;
 *   - NOT READY is always recorded — a broken channel must never hide
 *     behind dedupe;
 *   - the permission probe itself still runs on every wake (one cheap
 *     permissions.contains call), so a permission revoked mid-session
 *     is caught within a minute.
 * Engines without storage.session: success degrades to console-only
 * (an unde-dupable Diagnostics line per wake is the bug being fixed),
 * while failures keep their guaranteed Diagnostics entry.
 */
const SESSION_READY_KEY = 'notifyReadyAnnounced';

interface SessionStorageArea {
  get(keys: string | string[] | null): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

/** Feature-detected browser.storage.session (typed loosely like onShown). */
function sessionArea(): SessionStorageArea | null {
  try {
    const area = (browser as unknown as { storage?: { session?: SessionStorageArea } })
      .storage?.session;
    return area &&
      typeof area.get === 'function' &&
      typeof area.set === 'function' &&
      typeof area.remove === 'function'
      ? area
      : null;
  } catch {
    return null;
  }
}

/**
 * Startup verification: the manifest declares `notifications` as a REQUIRED
 * permission (granted at install — deliberately NOT optional, notifications
 * are the core of this extension). This check proves the grant at runtime
 * and surfaces the state in Diagnostics instead of failing silently —
 * but only on CHANGE, per the v1.1.25 policy above.
 */
export async function verifyNotificationReadiness(): Promise<boolean> {
  const hasApi =
    typeof browser !== 'undefined' &&
    typeof browser.notifications?.create === 'function';
  let granted = false;
  try {
    granted = await browser.permissions.contains({ permissions: ['notifications'] });
  } catch {
    granted = false;
  }
  const ready = hasApi && granted;
  const message = ready
    ? 'notifications ready (required permission granted)'
    : `notifications NOT ready (api: ${hasApi}, permission granted: ${granted})`;

  const session = sessionArea();

  if (!ready) {
    // Always loud, never deduped. Drop the session marker so a later
    // recovery is announced as the state change it is.
    if (session) {
      try {
        await session.remove(SESSION_READY_KEY);
      } catch {
        /* marker cleanup is best-effort */
      }
    }
    log.error('notify', message);
    await recordDiag('notify', 'error', message);
    return false;
  }

  if (!session) {
    // No dedupe possible: console-only, so Diagnostics stays signal-only.
    log.info('notify', message);
    return true;
  }

  let announced = false;
  try {
    announced = (await session.get(SESSION_READY_KEY))[SESSION_READY_KEY] === true;
  } catch {
    announced = false; // unreadable — decide again after the write attempt
  }
  if (announced) {
    // State unchanged since this session's first success — silent.
    return true;
  }
  try {
    await session.set({ [SESSION_READY_KEY]: true });
  } catch {
    // Marker unwritable: announcing an unde-dupable line would recreate
    // the per-wake spam, so keep this wake console-only.
    log.info('notify', message);
    return true;
  }
  log.info('notify', message);
  // Await the record so callers (tests, diagnostics UI) observe it written.
  await recordDiag('notify', 'info', message);
  return true;
}

/** Result contract of the verified test notification. */
export interface TestNotificationResult {
  ok: boolean;
  /** true = onShown fired; false = created but banner not confirmed; null = this browser cannot confirm. */
  shown: boolean | null;
  error?: string;
  /** v1.1.17: outcome of the guaranteed toast-window channel. */
  toast?: { opened: boolean; mode: Settings['alertWindowMode']; reason?: string };
}

/** Rich prayer-notification outcome (banner + toast + chime layers). */
export interface PrayerNotifyResult {
  /** System notification id, or null when create() failed. */
  bannerId: string | null;
  bannerOk: boolean;
  /** null = not awaited; true/false = onShown outcome in 'auto' mode. */
  shown: boolean | null;
  toastOpened: boolean;
  /** true when the storm guard dropped this call as a duplicate. */
  skipped: boolean;
}

/** Toast decision shared by every notify path (single source of truth). */
function shouldOpenToast(
  settings: Settings,
  bannerOk: boolean,
  bannerConfirmedShown: boolean | null,
): boolean {
  switch (settings.alertWindowMode) {
    case 'always':
      return true;
    case 'auto':
      return !bannerOk || bannerConfirmedShown === false;
    case 'never':
      return false;
  }
}

/** Open the toast window with prebuilt strings; never throws. */
async function openToast(
  settings: Settings,
  kind: 'prayer' | 'pre' | 'test',
  label: string,
  title: string,
  body: string,
  time: string,
  lang: 'en' | 'ar',
): Promise<{ opened: boolean; reason?: string }> {
  const result = await openToastWindow({
    kind,
    label,
    title,
    body,
    time,
    lang,
    theme: settings.theme,
    autoSeconds: settings.alertWindowSeconds,
  });
  return { opened: result.opened, reason: result.reason };
}

/**
 * Prayer-time notification (the main event).
 * `pausedElements` > 0 changes the body to reflect the media action.
 */
export async function notifyPrayer(
  prayer: MainPrayerName,
  settings: Settings,
  pausedElements: number,
  prayerEpochMs: number | null,
): Promise<PrayerNotifyResult> {
  const guardKey = `prayer:${prayer}:${prayerEpochMs ?? 'now'}`;
  if (guardSeen(guardKey)) {
    log.warn('notify', `duplicate prayer event dropped (${prayer})`);
    void recordDiag('notify', 'error', `duplicate prayer event dropped (${prayer})`);
    return { bannerId: null, bannerOk: false, shown: null, toastOpened: false, skipped: true };
  }

  const lang = languageOf(settings);
  const title = t(lang, 'notify_title', { prayer: prayerName(lang, prayer) });
  const time = displayTime(prayerEpochMs, settings, lang);
  const message =
    pausedElements > 0 || settings.mediaPauseEnabled
      ? t(lang, 'notify_body_media', { time })
      : t(lang, 'notify_body_plain', { time });

  let bannerId: string | null = null;
  let bannerOk = false;
  const id = `tcalm-prayer-${prayer}-${Date.now()}`;
  trackForShown(id, prayer);
  try {
    await browser.notifications.create(id, {
      type: 'basic',
      iconUrl: iconUrl(),
      title,
      message,
    });
    bannerId = id;
    bannerOk = true;
    log.info('notify', `notification created (${prayer})`);
    void recordDiag('notify', 'info', `notification created (${prayer})`);
  } catch (error) {
    const detail = `notification failed (${prayer}): ${String(error)}`;
    log.error('notify', detail);
    void recordDiag('notify', 'error', detail);
  }

  // 'auto' mode needs the display verdict to decide the toast. 'always'
  // opens the toast unconditionally; 'never' never waits.
  let shown: boolean | null = null;
  if (settings.alertWindowMode === 'auto' && bannerOk) {
    shown = await awaitShown(id, SCHEDULER.bannerConfirmWaitMs);
  }

  let toastOpened = false;
  if (shouldOpenToast(settings, bannerOk, shown)) {
    const toast = await openToast(settings, 'prayer', prayer, title, message, time, lang);
    toastOpened = toast.opened;
  }

  // The chime follows ANY successful visible channel — in 'always' mode
  // the toast is the guaranteed one, so a suppressed banner never
  // silences the alert (v1.1.6 played it only after create() resolved).
  if (settings.notificationSoundEnabled && (bannerOk || toastOpened)) {
    playChime();
  }

  return { bannerId, bannerOk, shown, toastOpened, skipped: false };
}

/** Advance notice: "{prayer} in {minutes} minutes — prayer time {time}". */
export async function notifyPrePrayer(
  prayer: MainPrayerName,
  minutes: number,
  settings: Settings,
  prayerEpochMs: number | null,
): Promise<{ bannerOk: boolean; toastOpened: boolean; skipped: boolean }> {
  const guardKey = `pre:${prayer}:${prayerEpochMs ?? 'now'}`;
  if (guardSeen(guardKey)) {
    log.warn('notify', `duplicate pre-event dropped (${prayer})`);
    void recordDiag('notify', 'error', `duplicate pre-event dropped (${prayer})`);
    return { bannerOk: false, toastOpened: false, skipped: true };
  }

  const lang = languageOf(settings);
  const title = t(lang, 'notify_pre_title', {
    prayer: prayerName(lang, prayer),
    minutes,
  });
  const message = t(lang, 'notify_pre_body', {
    time: displayTime(prayerEpochMs, settings, lang),
  });
  const time = displayTime(prayerEpochMs, settings, lang);

  let bannerOk = false;
  const id = `tcalm-pre-${prayer}-${Date.now()}`;
  trackForShown(id, `pre ${prayer}`);
  try {
    await browser.notifications.create(id, {
      type: 'basic',
      iconUrl: iconUrl(),
      title,
      message,
    });
    bannerOk = true;
    log.info('notify', `pre-notification created (${prayer})`);
    void recordDiag('notify', 'info', `pre-notification created (${prayer})`);
  } catch (error) {
    const detail = `pre-notification failed (${prayer}): ${String(error)}`;
    log.error('notify', detail);
    void recordDiag('notify', 'error', detail);
  }

  let toastOpened = false;
  if (shouldOpenToast(settings, bannerOk, null)) {
    const toast = await openToast(settings, 'pre', `pre ${prayer}`, title, message, time, lang);
    toastOpened = toast.opened;
  }

  return { bannerOk, toastOpened, skipped: false };
}

/**
 * Verified test notification (options page "Send a test notification").
 * Returns the banner verdict AND the toast-window verdict, so the user
 * gets a real layered answer: which channels worked, which were
 * suppressed — plus a toast window they can see right now.
 */
export async function notifyTestVerified(
  settings: Settings,
  waitMs: number = 3500,
): Promise<TestNotificationResult> {
  const lang = languageOf(settings);
  const title = t(lang, 'notify_testTitle');
  const message = t(lang, 'notify_testBody');
  const id = `tcalm-test-${Date.now()}`;
  trackForShown(id, 'test');
  const shownPromise = awaitShown(id, waitMs);
  let bannerOk = false;
  try {
    await browser.notifications.create(id, {
      type: 'basic',
      iconUrl: iconUrl(),
      title,
      message,
    });
    bannerOk = true;
  } catch (error) {
    shownWaiters.delete(id);
    const detail = `test notification failed: ${String(error)}`;
    log.error('notify', detail);
    void recordDiag('notify', 'error', detail);
    // v1.1.17: even a failed banner must not hide the toast channel state.
    const toast =
      settings.alertWindowMode === 'never'
        ? { opened: false, reason: 'disabled' }
        : await openToast(settings, 'test', 'test', title, message, '', lang);
    if (settings.notificationSoundEnabled && toast.opened) playChime();
    return {
      ok: false,
      shown: null,
      error: String(error),
      toast: { opened: toast.opened, mode: settings.alertWindowMode, reason: toast.reason },
    };
  }
  const shown = await shownPromise;

  let toastOpened = false;
  let toastReason: string | undefined;
  if (settings.alertWindowMode === 'never') {
    toastReason = 'disabled';
  } else {
    // The test always demonstrates the toast channel (that is its job in
    // v1.1.17) — 'auto' users get to see what the fallback looks like.
    const toast = await openToast(settings, 'test', 'test', title, message, '', lang);
    toastOpened = toast.opened;
    toastReason = toast.reason;
  }

  if (settings.notificationSoundEnabled && (bannerOk || toastOpened)) {
    playChime();
  }
  return {
    ok: true,
    shown,
    toast: { opened: toastOpened, mode: settings.alertWindowMode, reason: toastReason },
  };
}
