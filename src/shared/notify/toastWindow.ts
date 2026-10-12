/**
 * Guaranteed-visible alert window — Tcalm Firefox Extension (v1.1.17).
 *
 * WHY THIS MODULE EXISTS: the owner reported, across every 1.1.x build,
 * "the notification plays a sound but the browser never shows it". Root
 * cause analysis: `browser.notifications.create()` resolving is NOT proof
 * the banner was painted — the OS (Focus Assist / Do-Not-Disturb /
 * per-app notification blocks) or Firefox's own notification permission
 * UI can suppress the banner while the extension's chime still plays.
 * No extension code can force a suppressed OS banner to appear.
 *
 * THE RADICAL FIX: Tcalm stops depending on the OS notification stack as
 * its only visible channel. At every notified prayer it opens a small
 * Tcalm-owned popup window ("toast") inside the user's active browser
 * window — bottom-right, focused:false, auto-closing. `browser.windows`
 * cannot be blocked by OS notification settings, so the visible outcome
 * becomes a property of the extension itself.
 *
 * Robustness details:
 *  - auto-close is owned by a browser.alarms one-shot (NOT a setTimeout):
 *    the background event page suspends, and only an alarm reliably wakes
 *    it to close the window. The toast page ALSO closes itself (double
 *    path), and clicking anywhere / Esc closes it immediately.
 *  - windows.onRemoved (wired in the background entry) cleans the
 *    in-memory registry and cancels the pending close alarm, so a window
 *    the user closed never leaves a dangling alarm.
 *  - one toast per event key: a storm of re-fired alarms can never stack
 *    windows (the v1.1.4 "11 banners in 7 minutes" regression class).
 *  - positioning: derived from the LAST FOCUSED browser window so the
 *    toast appears where the user is actually looking; falls back to the
 *    default position when the window geometry is unavailable.
 */
import type { ThemeSetting } from '../types.ts';
import { ALARM_NAMES } from '../constants.ts';
import { t } from '../i18n/i18n.ts';
import { log } from '../utils/log.ts';
import { recordDiag } from '../utils/diagnostics.ts';

/** Toast window geometry (popup-type, chromeless). */
const TOAST_WIDTH = 400;
const TOAST_HEIGHT = 216;
/** Kept inside the browser window's content area (approx chrome + margin). */
const TOAST_BOTTOM_INSET = 96;

/** Everything the toast page needs to render (strings are prebuilt). */
export interface ToastSpec {
  kind: 'prayer' | 'pre' | 'test';
  /** Diagnostics label, e.g. "maghrib" / "pre maghrib" / "test". */
  label: string;
  title: string;
  body: string;
  /** Display-formatted time ("6:45 PM") or '' to hide the line. */
  time: string;
  lang: 'en' | 'ar';
  theme: ThemeSetting;
  /** Auto-close delay in seconds (already clamped by the settings layer). */
  autoSeconds: number;
}

export interface ToastResult {
  opened: boolean;
  windowId: number | null;
  reason?: 'already-open' | 'create-failed' | 'windows-unavailable';
}

/** windows API surface used here (feature-detected for safety). */
interface WindowsApi {
  create?: (options: Record<string, unknown>) => Promise<{ id?: number }>;
  remove?: (windowId: number) => Promise<void>;
  getLastFocused?: () => Promise<{
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  }>;
}

function windowsApi(): WindowsApi {
  return (browser as unknown as { windows?: WindowsApi }).windows ?? {};
}

/** key -> window id of toasts we believe are open. */
const openToasts = new Map<string, number>();

function toastUrl(spec: ToastSpec): string {
  const url = new URL(browser.runtime.getURL('notify/toast.html'));
  const params = url.searchParams;
  params.set('k', spec.kind);
  params.set('ti', spec.title);
  params.set('bo', spec.body);
  if (spec.time) params.set('tm', spec.time);
  params.set('cl', t(spec.lang, 'toast_close'));
  params.set('l', spec.lang);
  params.set('th', spec.theme);
  params.set('a', String(spec.autoSeconds));
  return url.toString();
}

/** Bottom-right of the last-focused browser window (fallback: default). */
async function toastPosition(): Promise<{ left?: number; top?: number }> {
  try {
    const win = await windowsApi().getLastFocused?.();
    if (
      win &&
      typeof win.left === 'number' &&
      typeof win.top === 'number' &&
      typeof win.width === 'number' &&
      typeof win.height === 'number'
    ) {
      return {
        left: Math.max(0, win.left + win.width - TOAST_WIDTH - 20),
        top: Math.max(0, win.top + win.height - TOAST_HEIGHT - TOAST_BOTTOM_INSET),
      };
    }
  } catch {
    // No focused window / API hiccup — let Firefox pick the position.
  }
  return {};
}

/**
 * Open the guaranteed alert window. Never throws; every failure is
 * recorded to Diagnostics and returned in the result.
 */
export async function openToastWindow(spec: ToastSpec): Promise<ToastResult> {
  const key = `${spec.kind}:${spec.label}`;
  if (openToasts.has(key)) {
    log.info('notify', `toast window already open (${spec.label}) — skipped`);
    return { opened: false, windowId: openToasts.get(key) ?? null, reason: 'already-open' };
  }

  const api = windowsApi();
  if (typeof api.create !== 'function') {
    const detail = 'toast window unavailable (browser.windows missing)';
    log.error('notify', detail);
    void recordDiag('notify', 'error', detail);
    return { opened: false, windowId: null, reason: 'windows-unavailable' };
  }

  const position = await toastPosition();
  let windowId: number;
  try {
    const created = await api.create({
      type: 'popup',
      url: toastUrl(spec),
      width: TOAST_WIDTH,
      height: TOAST_HEIGHT,
      allowScriptsToClose: true,
      focused: false,
      ...position,
    });
    windowId = created.id ?? -1;
  } catch (error) {
    const detail = `toast window create failed (${spec.label}): ${String(error)}`;
    log.error('notify', detail);
    void recordDiag('notify', 'error', detail);
    return { opened: false, windowId: null, reason: 'create-failed' };
  }

  openToasts.set(key, windowId);
  try {
    await browser.alarms.create(ALARM_NAMES.toastClose(windowId), {
      when: Date.now() + spec.autoSeconds * 1000,
    });
  } catch {
    // The page closes itself too; a missing close alarm is survivable.
  }
  log.info('notify', `toast window displayed (${spec.label})`);
  void recordDiag('notify', 'info', `toast window displayed (${spec.label})`);
  return { opened: true, windowId };
}

/** Scheduler dispatch: "toast-close:<id>" alarm fired — close the window. */
export async function handleToastCloseAlarm(alarmName: string): Promise<void> {
  const id = Number(alarmName.split(':')[1]);
  if (!Number.isFinite(id) || id < 0) return;
  try {
    await windowsApi().remove?.(id);
  } catch {
    // Window already closed by the user — nothing to do.
  }
}

/**
 * Background wiring for windows.onRemoved: drop the registry entry and
 * cancel the pending close alarm so nothing dangles.
 */
export function onToastWindowRemoved(windowId: number): void {
  for (const [key, id] of openToasts) {
    if (id === windowId) {
      openToasts.delete(key);
      void browser.alarms.clear(ALARM_NAMES.toastClose(windowId)).catch(() => undefined);
      log.info('notify', `toast window closed by user (${key})`);
      return;
    }
  }
}

/** Close every open toast (used when the extension is paused mid-toast). */
export async function closeAllToasts(): Promise<void> {
  const ids = Array.from(openToasts.values());
  openToasts.clear();
  for (const id of ids) {
    try {
      await windowsApi().remove?.(id);
    } catch {
      // already gone
    }
  }
}

/**
 * Test-only seam: the in-memory registry is module state that must not
 * leak between unit tests (each test simulates a fresh background boot).
 */
export function resetToastStateForTests(): void {
  openToasts.clear();
}
