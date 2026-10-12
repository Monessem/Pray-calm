/**
 * Background event page — Tcalm Firefox Extension (Manifest V3).
 *
 * Firefox MV3 background pages are non-persistent: the page suspends when
 * idle and wakes on events. This entry point only wires listeners — all
 * business logic lives in shared modules. The page owns:
 *  - prayer/alarm scheduling,  - notification + media-pause events,
 *  - configuration loading & change reaction,  - cache management.
 *
 * v1.1.6 additions:
 *  - startup notification-readiness verification (permission + API, with
 *    the result recorded to Diagnostics);
 *  - Firefox notifications.onShown listener — real banner-display proof
 *    ("system banner displayed (…)"), so "sound but no banner" becomes
 *    diagnosable instead of invisible;
 *  - toolbar badge = NEXT prayer (src/background/badge.ts), refreshed by
 *    init, settings changes, every prayer event and a minute tick.
 *
 * v1.1.17 additions:
 *  - the guaranteed toast alert window (shared/notify/toastWindow.ts):
 *    at every notified prayer Tcalm opens its own always-visible window,
 *    immune to OS notification suppression; windows.onRemoved keeps the
 *    registry clean; toast-close alarms are dispatched by the scheduler.
 *
 * The popup and options pages contain UI code only; they talk to this page
 * via runtime messages and browser.storage.
 */
import { ensureSchedule, onAlarm } from './scheduler.ts';
import { updateToolbarBadge } from './badge.ts';
import { ALARM_NAMES } from '../shared/constants.ts';
import { getSettings, saveSettings } from '../shared/storage/storage.ts';
import { normalizeSettings } from '../shared/storage/settings.ts';
import { executeManualPause, resumeLastPause } from '../shared/media/pauseController.ts';
import { attachAudibleTracking } from '../shared/media/audibleTabs.ts';
import {
  notifyTestVerified,
  onNotificationShown,
  verifyNotificationReadiness,
} from '../shared/notify/notifier.ts';
import { onToastWindowRemoved } from '../shared/notify/toastWindow.ts';
import { recordDiag, pruneDiagnostics } from '../shared/utils/diagnostics.ts';
import { log } from '../shared/utils/log.ts';

interface RuntimeMessage {
  type?: string;
  [key: string]: unknown;
}

/** Always in sync: the manifest is the single source of version truth. */
function manifestVersion(): string {
  try {
    return browser.runtime.getManifest().version;
  } catch {
    return 'unknown';
  }
}

function init(reason: string): void {
  log.info('background', `Tcalm v${manifestVersion()} initializing (${reason})`);
  void ensureSchedule().catch((error) => {
    log.error('background', `ensureSchedule failed: ${String(error)}`);
  });
  // v1.1.6: prove at every boot that notifications are actually usable
  // (required permission granted + API present) — recorded to Diagnostics.
  void verifyNotificationReadiness();
  void updateToolbarBadge();
  // v1.1.21: one-week diagnostics retention — sweep expired entries on
  // every wake so the buffer can never accumulate (cheap: a single storage
  // read; writes back only when something actually expired).
  void pruneDiagnostics();
  // v1.1.24: keep the recently-audible tab cache warm so the targeted
  // pause covers track gaps and buffering stalls. Listener wiring is
  // idempotent per event-page lifetime; the in-memory cache resets on
  // suspend by design (the live audible query remains the truth).
  attachAudibleTracking();
}

// --- Lifecycle ---------------------------------------------------------------

browser.runtime.onInstalled.addListener((details) => {
  init(`installed/${details.reason}`);
  // One durable marker per install/upgrade — the Diagnostics card then
  // shows WHICH build last initialized, even after background suspends.
  void recordDiag('background', 'info', `installed (${details.reason}) v${manifestVersion()}`);
  // v1.1.22: first-install onboarding — the landing page asks for the
  // OPTIONAL permissions (scripting + site access + ipwho.is) so media
  // pause can actually work. Fresh installs ONLY: upgrades and browser
  // restarts must never re-open it (the page stays reachable from
  // Settings -> Media pause -> Permission setup anytime).
  if (details.reason === 'install') {
    void browser.tabs
      .create({ url: browser.runtime.getURL('onboarding/onboarding.html') })
      .catch((error) => {
        log.warn('background', `onboarding tab failed: ${String(error)}`);
      });
  }
});

browser.runtime.onStartup.addListener(() => {
  init('startup');
});

// Runs on every (re)load of the event page — cheap and self-healing.
init('load');

// --- Alarms ------------------------------------------------------------------

browser.alarms.onAlarm.addListener((alarm) => {
  // v1.1.21: the 6-hourly integrity alarm also refreshes the diagnostics
  // retention window (separate listener — keeps scheduler.ts free of
  // diagnostics concerns).
  if (alarm.name === ALARM_NAMES.integrity) void pruneDiagnostics();
  void onAlarm(alarm).catch((error) => {
    log.error('background', `alarm ${alarm.name} failed: ${String(error)}`);
    void recordDiag('background', 'error', `alarm ${alarm.name} failed: ${String(error)}`);
  });
});

// --- Settings changes --------------------------------------------------------

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes['settings']) return;
  void ensureSchedule().catch((error) => {
    log.error('background', `reschedule after settings change failed: ${String(error)}`);
  });
  void updateToolbarBadge();
});

// --- Notifications -----------------------------------------------------------

// Firefox-only event: fires when a notification banner is actually DISPLAYED
// (create() resolving only means it was accepted). This is the proof the
// owner asked for — the diagnostics log now distinguishes "created" from
// "system banner displayed (…)". Feature-detected: absent on other engines.
const notificationsEvents = browser.notifications as {
  onShown?: { addListener: (callback: (notificationId: string) => void) => void };
};
notificationsEvents.onShown?.addListener((notificationId) => {
  try {
    onNotificationShown(notificationId);
  } catch (error) {
    log.warn('notify', `onShown handling failed: ${String(error)}`);
  }
});

browser.notifications.onClicked.addListener((notificationId) => {
  try {
    void browser.notifications.clear(notificationId);
    // Opening the popup from a notification click is allowed as a user
    // gesture in Firefox 127+; strict_min_version is 115, so feature-detect
    // instead of assuming browser.action.openPopup exists (a missing method
    // would otherwise throw a TypeError here).
    const actionApi = browser.action as { openPopup?: () => Promise<void> };
    actionApi.openPopup?.().catch(() => {
      /* not supported — notification is simply dismissed */
    });
  } catch {
    // ignore
  }
});

// --- Alert windows (v1.1.17) -------------------------------------------------

// Toast windows the user closes themselves: drop the in-memory registry
// entry and cancel the pending toast-close alarm (feature-detected).
const windowsEvents = (browser as unknown as {
  windows?: {
    onRemoved?: { addListener: (callback: (windowId: number) => void) => void };
  };
}).windows;
windowsEvents?.onRemoved?.addListener((windowId) => {
  try {
    onToastWindowRemoved(windowId);
  } catch (error) {
    log.warn('notify', `onRemoved handling failed: ${String(error)}`);
  }
});

// --- Runtime messages (popup / options) --------------------------------------

const messageHandlers: Record<string, (message: RuntimeMessage) => Promise<unknown>> = {
  'tcalm:recalculate': async () => {
    await ensureSchedule(Date.now());
    await updateToolbarBadge();
    return { ok: true };
  },

  'tcalm:test-notification': async () => {
    // v1.1.17: the answer now covers BOTH visible channels — the system
    // banner verdict (ok + shown via onShown) AND the guaranteed toast
    // window (opened + mode), so "the browser never shows my notifications"
    // is answered with evidence for every layer the owner can see.
    const settings = await getSettings();
    try {
      return await notifyTestVerified(settings);
    } catch (error) {
      return { ok: false, shown: null, error: String(error) };
    }
  },

  'tcalm:test-media-pause': async () => {
    // v1.1.22: gate on the permission BEFORE sweeping tabs. Without the
    // optional "scripting" permission the feature is dormant — answer
    // permissionMissing so callers show a warning instead of the
    // misleading "no playing media", and skip the whole tab sweep
    // (tabs.query + N × executeScript attempts) for nothing.
    try {
      const scriptingGranted = await browser.permissions.contains({
        permissions: ['scripting'],
      });
      if (scriptingGranted === false) {
        return { ok: false, permissionMissing: true };
      }
    } catch {
      // permissions API unavailable — fall through to the real test.
    }
    // v1.0.8: mirror a REAL prayer event exactly (executeManualPause) —
    // honors mediaPauseDuration. duration 0 = single pause that is never
    // auto-resumed (the v1.0.7 bug hardcoded an 8-second auto-resume here,
    // ignoring the setting entirely); duration > 0 = a real hold whose
    // sweeps and auto-resume run at the configured time.
    const settings = await getSettings();
    const { outcome, resumeAt } = await executeManualPause(settings, Date.now());
    const pausedTabs = outcome.tabResults.filter((r) => r.paused + r.contexts > 0);
    return {
      ok: true,
      paused: outcome.elementsPaused,
      contexts: outcome.contextsSuspended,
      tabs: outcome.tabsWithPauses,
      candidates: outcome.candidates,
      skipped: outcome.skippedInactive,
      unreachable: outcome.unreachable,
      resistant: outcome.resistantHosts,
      tabTitles: pausedTabs.map((r) => r.title ?? ''),
      tabHosts: pausedTabs.map((r) => r.host ?? ''),
      targetTabIds: outcome.tabResults.map((r) => r.tabId),
      resumeAt,
    };
  },

  'tcalm:resume-media': async () => {
    // v1.1.24: undo the LAST pause event only — an active hold if one is
    // running, otherwise the recorded last restorable pause. The old
    // all-tabs broadcast could restart several paused tabs at once.
    const result = await resumeLastPause();
    return { ok: true, resumed: result.elements + result.contexts, tabs: result.tabs, source: result.source };
  },

  'tcalm:set-enabled': async (message) => {
    const current = await getSettings();
    const updated = normalizeSettings({ ...current, enabled: message['enabled'] === true });
    await saveSettings(updated);
    return { ok: true, enabled: updated.enabled };
  },
};

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!message || typeof message !== 'object') return undefined;
  const type = (message as RuntimeMessage)['type'];
  if (typeof type !== 'string' || !messageHandlers[type]) return undefined;
  return messageHandlers[type]!(message as RuntimeMessage).catch((error) => {
    log.error('background', `message ${type} failed: ${String(error)}`);
    void recordDiag('background', 'error', `message ${type} failed: ${String(error)}`);
    return { ok: false, error: String(error) };
  });
});
