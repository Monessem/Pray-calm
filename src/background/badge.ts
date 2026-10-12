/**
 * Toolbar badge — Tcalm Firefox Extension.
 *
 * v1.1.6: the badge now shows the NEXT prayer (localized name) instead of a
 * static "OK". The owner reported the v1.1.x badge stuck on "مغرب / Maghrib"
 * at almost any time; the root cause was that the badge value was computed
 * rarely and never re-derived from the current clock. This module fixes the
 * contract:
 *   - the text is recomputed from the schedule cache + the CURRENT time on
 *     every call (pure function of stored state — it cannot go stale);
 *   - it is refreshed on boot, on settings changes, after every prayer /
 *     advance alarm, and by a 1-minute badge-tick alarm (scheduler-owned),
 *     so even a missed alarm or a cleared schedule self-heals within a
 *     minute;
 *   - OFF (gray) = paused by the user; prayer name (green) = running, with
 *     a tooltip carrying the prayer's own time in the display format.
 *
 * v1.1.20 performance: callers that already hold this wake's settings /
 * schedule pass them via the `preload` argument (halves the tick's storage
 * reads), and unchanged badge values are written at most once per wake
 * (zero browser.action round-trips in the common case).
 */
import type { MainPrayerName, Settings } from '../shared/types.ts';
import { findNextPrayer } from '../shared/schedule.ts';
import { getScheduleCache, getSettings } from '../shared/storage/storage.ts';
import type { ScheduleCache } from '../shared/storage/storage.ts';
import { resolveLanguage, prayerName, t } from '../shared/i18n/i18n.ts';
import { formatEpochAsTime, formatTimeForDisplay } from '../shared/time/format.ts';
import { resolveTimezone } from '../shared/time/tz.ts';
import { log } from '../shared/utils/log.ts';

/**
 * v1.1.20 performance: data the caller already loaded this wake. Passing
 * it in skips the duplicate storage reads inside updateToolbarBadge — the
 * 1-minute badge tick previously read settings + schedule TWICE per fire
 * (once in the scheduler, once here).
 */
export interface BadgePreload {
  settings?: Settings;
  cache?: ScheduleCache;
}

/* v1.1.20 performance: last badge actually written. When the computed
 * badge is unchanged (the normal case — the next prayer changes ~5×/day)
 * all browser.action writes are skipped instead of re-sending identical
 * values. Per-wake memory: one small object, dropped with the page. */
let lastWritten: { text: string; color: string; title: string } | null = null;

/** Test hook — reset the no-op-write guard between unit tests. */
export function resetBadgeStateForTests(): void {
  lastWritten = null;
}

/** The subset of browser.action used here (feature-detected, FF 115+ safe). */
interface BadgeActionApi {
  setBadgeText?: (details: { text: string }) => Promise<void>;
  setBadgeBackgroundColor?: (details: { color: string }) => Promise<void>;
  setTitle?: (details: { title: string }) => Promise<void>;
}

function actionApi(): BadgeActionApi {
  return browser.action as BadgeActionApi;
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

/** Badge text for the next prayer: the localized prayer name alone. */
export function badgeTextForPrayer(prayer: MainPrayerName, lang: 'en' | 'ar'): string {
  return prayerName(lang, prayer);
}

/**
 * Recompute and stamp the toolbar badge + tooltip. Never throws — a failed
 * badge update must never break the scheduler that calls it.
 *
 * v1.1.20 performance contract:
 *  - `preload` supplies settings/cache the caller already read this wake;
 *  - identical results are written at most once per wake (no-op skip);
 *  - the three browser.action calls run in parallel, not in series.
 */
export async function updateToolbarBadge(
  nowMs: number = Date.now(),
  preload: BadgePreload = {},
): Promise<void> {
  try {
    const settings = preload.settings ?? (await getSettings());
    const action = actionApi();
    const lang = languageOf(settings);

    let text: string;
    let color: string;
    let title: string;

    if (!settings.enabled) {
      text = 'OFF';
      color = '#64708a';
      title = t(lang, 'actionTitle');
    } else {
      const cache = preload.cache ?? (await getScheduleCache());
      const next = findNextPrayer(nowMs, [cache.today, cache.tomorrow]);

      if (next) {
        const tz = resolveTimezone(settings.timezone);
        const timeStr = formatEpochAsTime(next.epochMs, tz);
        const time = formatTimeForDisplay(timeStr, settings.timeFormat, lang);
        text = badgeTextForPrayer(next.name, lang);
        color = '#1b7f4d';
        title = t(lang, 'badge_nextTitle', {
          prayer: prayerName(lang, next.name),
          time,
        });
      } else {
        // Running but nothing computable (deep polar edge case) — stay alive.
        text = 'OK';
        color = '#1b7f4d';
        title = t(lang, 'actionTitle');
      }
    }

    // No-op skip: unchanged badge → zero browser.action round-trips.
    if (
      lastWritten &&
      lastWritten.text === text &&
      lastWritten.color === color &&
      lastWritten.title === title
    ) {
      return;
    }
    lastWritten = { text, color, title };

    await Promise.all([
      action.setBadgeText?.({ text }) ?? Promise.resolve(),
      action.setBadgeBackgroundColor?.({ color }) ?? Promise.resolve(),
      action.setTitle?.({ title }) ?? Promise.resolve(),
    ]);
  } catch (error) {
    log.warn('badge', `toolbar badge update failed: ${String(error)}`);
  }
}
