/**
 * Alarm scheduler — Tcalm Firefox Extension.
 *
 * Event-driven replacement for Tcalm's daemon loop. There is no sleeping
 * thread: every future prayer becomes a browser.alarms entry with a
 * deterministic name (prayer:date:epoch), so:
 *  - re-creating a schedule overwrites same-named alarms (no duplicates),
 *  - alarms persist across browser restarts (Firefox restores them),
 *  - a missed alarm (browser asleep at fire time) is detected by comparing
 *    the scheduled epoch with "now" and is skipped instead of replayed,
 *  - a daily-refresh alarm at local midnight rebuilds the timetable,
 *  - a low-frequency integrity alarm re-verifies everything (self-healing
 *    against clock changes, timezone travel, or cleared alarms).
 */
import type { DaySchedule, MainPrayerName, Settings } from '../shared/types.ts';
import {
  isMainPrayer,
  isScheduleFresh,
  buildSchedulePair,
  localDateFor,
} from '../shared/schedule.ts';
import { addDays, formatDateString, msUntilNextMidnight, resolveTimezone } from '../shared/time/tz.ts';
import { ALARM_NAMES, SCHEDULER } from '../shared/constants.ts';
import {
  getActivePause,
  getFiredEvents,
  getScheduleCache,
  getSettings,
  saveFiredEvents,
  saveScheduleCache,
} from '../shared/storage/storage.ts';
import {
  clearHoldAlarms,
  endHold,
  executePrayerPause,
  recoverActivePause,
  sweepHold,
} from '../shared/media/pauseController.ts';
import { notifyPrePrayer, notifyPrayer } from '../shared/notify/notifier.ts';
import { closeAllToasts, handleToastCloseAlarm } from '../shared/notify/toastWindow.ts';
import { updateToolbarBadge } from './badge.ts';
import { log } from '../shared/utils/log.ts';

interface AlarmInfo {
  name: string;
  scheduledTime?: number;
}

/** Alarms owned by the scheduler (never touch media-hold alarms here). */
const SCHEDULER_PREFIXES = ['prayer:', 'pre:', 'daily-refresh:', 'integrity', 'badge-tick'];

function isSchedulerAlarm(name: string): boolean {
  return SCHEDULER_PREFIXES.some((prefix) =>
    prefix.endsWith(':') ? name.startsWith(prefix) : name === prefix,
  );
}

async function clearSchedulerAlarms(): Promise<void> {
  try {
    const alarms = await browser.alarms.getAll();
    for (const alarm of alarms) {
      if (isSchedulerAlarm(alarm.name)) {
        await browser.alarms.clear(alarm.name);
      }
    }
  } catch {
    // alarms API unavailable in this context — nothing to clear.
  }
}

/** True when tomorrow's cached schedule matches today+1 and current settings. */
function isTomorrowFresh(
  tomorrow: DaySchedule | null,
  settings: Settings,
  nowMs: number,
): boolean {
  if (!tomorrow) return false;
  const today = localDateFor(settings, nowMs);
  const expectedDate = formatDateString(
    ...(() => {
      const next = addDays(today, 1);
      return [next.year, next.month, next.day] as const;
    })(),
  );
  return tomorrow.date === expectedDate && isScheduleFresh(tomorrow, settings, tomorrow.generatedAt);
}

/**
 * Rebuild (if needed) and (re)install all alarms. Cheap and idempotent —
 * called on install, startup, every background wake, settings changes,
 * midnight rollover, and the periodic integrity check.
 */
export async function ensureSchedule(nowMs: number = Date.now()): Promise<void> {
  const settings = await getSettings();
  if (!settings.enabled) {
    await deactivate();
    return;
  }

  const cache = await getScheduleCache();
  let { today, tomorrow } = cache;
  if (!isScheduleFresh(today, settings, nowMs) || !isTomorrowFresh(tomorrow, settings, nowMs)) {
    const pair = buildSchedulePair(settings, nowMs);
    today = pair.today;
    tomorrow = pair.tomorrow;
    await saveScheduleCache(pair);
  }

  await clearSchedulerAlarms();
  await createPrayerAlarms(settings, today, tomorrow, nowMs);
  await createMaintenanceAlarms(settings, nowMs);
  await recoverActivePause(nowMs);
  await pruneFiredEvents(nowMs);
}

/** Full stop: no alarms, no active hold (media restored if held). */
async function deactivate(): Promise<void> {
  const now = Date.now();
  await clearSchedulerAlarms();
  // v1.1.17: a paused extension must not keep alert windows on screen.
  await closeAllToasts();
  const pause = await getActivePause();
  if (pause) {
    await endHold(now);
  } else {
    await clearHoldAlarms();
  }
}

async function createPrayerAlarms(
  settings: Settings,
  today: DaySchedule | null,
  tomorrow: DaySchedule | null,
  nowMs: number,
): Promise<void> {
  const minutesBefore = settings.notificationsEnabled
    ? settings.notificationMinutesBefore
    : 0;

  for (const day of [today, tomorrow]) {
    if (!day) continue;
    for (const entry of day.prayers) {
      if (!isMainPrayer(entry.name) || entry.epochMs === null) continue;
      if (entry.epochMs <= nowMs) continue; // never schedule the past

      const name = entry.name as MainPrayerName;
      try {
        await browser.alarms.create(ALARM_NAMES.prayer(name, day.date, entry.epochMs), {
          when: entry.epochMs,
        });
        if (
          minutesBefore > 0 &&
          settings.prayerNotifications[name] &&
          entry.epochMs - minutesBefore * 60_000 > nowMs
        ) {
          await browser.alarms.create(
            ALARM_NAMES.pre(name, day.date, entry.epochMs - minutesBefore * 60_000),
            { when: entry.epochMs - minutesBefore * 60_000 },
          );
        }
      } catch {
        log.error('scheduler', `alarm create failed for ${name} ${day.date}`);
      }
    }
  }
}

async function createMaintenanceAlarms(settings: Settings, nowMs: number): Promise<void> {
  const tz = resolveTimezone(settings.timezone);
  try {
    const wait = msUntilNextMidnight(new Date(nowMs), tz);
    const nextDay = addDays(localDateFor(settings, nowMs), 1);
    await browser.alarms.create(ALARM_NAMES.dailyRefresh(formatDateString(nextDay.year, nextDay.month, nextDay.day)), {
      when: nowMs + wait,
    });
    await browser.alarms.create(ALARM_NAMES.integrity, {
      periodInMinutes: SCHEDULER.integrityPeriodMinutes,
    });
    // v1.1.6: keep the next-prayer toolbar badge current (self-healing —
    // recomputed from the clock, so it can never stick on one prayer).
    await browser.alarms.create(ALARM_NAMES.badgeTick, {
      periodInMinutes: SCHEDULER.badgeTickPeriodMinutes,
    });
  } catch {
    log.error('scheduler', 'maintenance alarm creation failed');
  }
}

async function pruneFiredEvents(nowMs: number): Promise<void> {
  const events = await getFiredEvents();
  let changed = false;
  for (const [key, at] of Object.entries(events)) {
    if (nowMs - at > SCHEDULER.firedEventTtlMs) {
      delete events[key];
      changed = true;
    }
  }
  if (changed) await saveFiredEvents(events);
}

function firedKey(kind: string, date: string, prayer: string): string {
  return `${kind}:${date}#${prayer}`;
}

/** Parse "prayer:fajr:2026-09-21:1758493200000". */
function parseEventAlarm(name: string): { kind: 'prayer' | 'pre'; prayer: string; date: string; epoch: number } | null {
  const parts = name.split(':');
  if (parts.length !== 4) return null;
  const kind = parts[0];
  if (kind !== 'prayer' && kind !== 'pre') return null;
  const prayer = parts[1]!;
  const date = parts[2]!;
  const epoch = Number(parts[3]);
  if (!Number.isFinite(epoch) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { kind, prayer, date, epoch };
}

/** Central alarm dispatch. */
export async function onAlarm(alarm: AlarmInfo): Promise<void> {
  const now = Date.now();
  const name = alarm.name;

  // v1.1.17: toast-window auto-close (alarm-owned so a suspended event
  // page still wakes to close the window).
  if (name.startsWith('toast-close:')) {
    await handleToastCloseAlarm(name);
    return;
  }

  if (name === ALARM_NAMES.integrity || name.startsWith('daily-refresh:')) {
    await ensureSchedule(now);
    await updateToolbarBadge(now);
    return;
  }

  // v1.1.6: minute-tick that keeps the next-prayer badge honest. Also
  // self-heals the schedule if the day rolled over while the browser was
  // asleep and the daily-refresh alarm was missed.
  // v1.1.20: the settings/cache read here are PRELOADED into
  // updateToolbarBadge — the tick used to read both keys twice per fire
  // (handler + badge), i.e. 4 storage reads/minute; now 2.
  if (name === ALARM_NAMES.badgeTick) {
    const settings = await getSettings();
    if (settings.enabled) {
      const cache = await getScheduleCache();
      if (!isScheduleFresh(cache.today, settings, now)) {
        // Stale: ensureSchedule rebuilds + SAVES a new cache, so the local
        // `cache` object is outdated — do not preload it; let the badge
        // re-read the fresh pair from storage.
        await ensureSchedule(now);
        await updateToolbarBadge(now, { settings });
      } else {
        await updateToolbarBadge(now, { settings, cache });
      }
    } else {
      // Disabled: the badge is a plain OFF stamp — no cache read needed.
      await updateToolbarBadge(now, { settings });
    }
    return;
  }

  if (name === ALARM_NAMES.holdSweep || name.startsWith('media-hold-burst:')) {
    // v1.1.26: the burst one-shots and the periodic sweep share the same
    // handler — sweepHold decides (re-pause vs. finish) from the stored
    // hold state, so a burst that outlived its hold self-heals too.
    await sweepHold(now);
    return;
  }

  if (name.startsWith('media-resume:')) {
    await endHold(now);
    return;
  }

  const event = parseEventAlarm(name);
  if (event) {
    if (event.kind === 'pre') {
      await handlePreEvent(event, now);
    } else {
      await handlePrayerEvent(event, now);
    }
    // The next prayer just changed — refresh the toolbar indicator now
    // instead of waiting for the next minute tick. Use the EVENT's epoch
    // (>= now: prayer epochs are minute-rounded, so plain `now` could sit
    // before the fired prayer and leave the badge one step behind).
    await updateToolbarBadge(Math.max(now, event.epoch));
    return;
  }

  log.warn('scheduler', `unknown alarm: ${name}`);
}

async function handlePrayerEvent(
  event: { prayer: string; date: string; epoch: number },
  now: number,
): Promise<void> {
  const settings = await getSettings();
  const key = firedKey('prayer', event.date, event.prayer);

  // Missed alarm (browser asleep / started late): record, do not replay.
  if (now > event.epoch + SCHEDULER.graceMs) {
    const events = await getFiredEvents();
    events[key] = event.epoch;
    await saveFiredEvents(events);
    log.info('scheduler', `missed ${event.prayer} ${event.date} — skipped`);
    return;
  }

  const events = await getFiredEvents();
  if (events[key] !== undefined) return; // duplicate alarm — already handled
  events[key] = now;
  await saveFiredEvents(events);

  if (!settings.enabled) return;
  if (!isMainPrayer(event.prayer)) return;

  const prayer = event.prayer as MainPrayerName;

  let pausedElements = 0;
  if (settings.mediaPauseEnabled) {
    const outcome = await executePrayerPause(prayer, settings, now);
    // v1.1.23: elements + suspended Web Audio contexts — everything Tcalm
    // actually stopped counts toward the notification's number.
    pausedElements = outcome.elementsPaused + outcome.contextsSuspended;
    log.info(
      'scheduler',
      `paused ${outcome.elementsPaused} element(s) + ${outcome.contextsSuspended} audio context(s) in ${outcome.tabsWithPauses} tab(s) for ${prayer}`,
    );
  }

  if (settings.notificationsEnabled && settings.prayerNotifications[prayer]) {
    await notifyPrayer(prayer, settings, pausedElements, event.epoch);
  }
}

async function handlePreEvent(
  event: { prayer: string; date: string; epoch: number },
  now: number,
): Promise<void> {
  const settings = await getSettings();
  const key = firedKey('pre', event.date, event.prayer);

  if (now > event.epoch + SCHEDULER.graceMs) return; // stale — drop silently

  const events = await getFiredEvents();
  if (events[key] !== undefined) return;
  events[key] = now;
  await saveFiredEvents(events);

  if (!settings.enabled || !settings.notificationsEnabled) return;
  if (!isMainPrayer(event.prayer)) return;
  const prayer = event.prayer as MainPrayerName;
  if (!settings.prayerNotifications[prayer]) return;
  if (settings.notificationMinutesBefore <= 0) return;

  await notifyPrePrayer(prayer, settings.notificationMinutesBefore, settings, event.epoch);
}
