/**
 * Schedule construction & navigation — Tcalm Firefox Extension.
 *
 * A DaySchedule is the extension's equivalent of Tcalm's cached
 * "prayer times for today" — computed offline, persisted in storage.local,
 * and rebuilt whenever the date, timezone, coordinates, or method change.
 */
import type { DaySchedule, MainPrayerName, NextPrayerInfo, PrayerTimeEntry, Settings } from './types.ts';
import { MAIN_PRAYERS } from './types.ts';
import { computePrayerTimes } from './prayer/engine.ts';
import {
  addDays,
  approximateOffsetHours,
  formatDateString,
  resolveTimezone,
  zonedDateString,
  zonedTimeToUtc,
  type LocalDate,
} from './time/tz.ts';
import { formatEpochAsTime, roundToMinute } from './time/format.ts';
import { PRAYER_ORDER } from './prayer/engine.ts';

/** Build the schedule for one local date in the settings' timezone. */
export function buildDaySchedule(settings: Settings, date: LocalDate, nowMs: number): DaySchedule {
  const timeZone = resolveTimezone(settings.timezone);
  const tzOffsetHours = approximateOffsetHours(timeZone, date);
  const computed = computePrayerTimes({
    year: date.year,
    month: date.month,
    day: date.day,
    latitude: settings.latitude,
    longitude: settings.longitude,
    tzOffsetHours,
    methodId: settings.calculationMethod,
    asrMethod: settings.asrMethod,
    highLatitudeRule: settings.highLatitudeRule,
  });

  const prayers: PrayerTimeEntry[] = PRAYER_ORDER.map((name) => {
    const hours = computed[name] as number | null;
    if (hours === null || !Number.isFinite(hours)) {
      return { name, epochMs: null, timeStr: null };
    }
    const epochMs = roundToMinute(zonedTimeToUtc(date, hours, timeZone));
    // Display string derived from the epoch (authoritative after DST resolution).
    const timeStr = formatEpochAsTime(epochMs, timeZone);
    return { name, epochMs, timeStr };
  });

  return {
    date: formatDateString(date.year, date.month, date.day),
    source: {
      latitude: settings.latitude,
      longitude: settings.longitude,
      timezone: timeZone,
      calculationMethod: settings.calculationMethod,
      asrMethod: settings.asrMethod,
      highLatitudeRule: settings.highLatitudeRule,
    },
    prayers,
    generatedAt: nowMs,
  };
}

/** Local date (in the schedule timezone) for an instant. */
export function localDateFor(settings: Settings, nowMs: number): LocalDate {
  const tz = resolveTimezone(settings.timezone);
  const s = zonedDateString(new Date(nowMs), tz);
  const [y, m, d] = s.split('-').map(Number);
  return { year: y!, month: m!, day: d! };
}

/** Build today + tomorrow schedules (tomorrow smooths the midnight rollover). */
export function buildSchedulePair(
  settings: Settings,
  nowMs: number,
): { today: DaySchedule; tomorrow: DaySchedule } {
  const today = localDateFor(settings, nowMs);
  return {
    today: buildDaySchedule(settings, today, nowMs),
    tomorrow: buildDaySchedule(settings, addDays(today, 1), nowMs),
  };
}

/** Is a cached schedule still valid for the current settings/date? */
export function isScheduleFresh(
  schedule: DaySchedule | null,
  settings: Settings,
  nowMs: number,
): boolean {
  if (!schedule) return false;
  if (schedule.date !== zonedDateString(new Date(nowMs), resolveTimezone(settings.timezone))) {
    return false;
  }
  const src = schedule.source;
  return (
    src.latitude === settings.latitude &&
    src.longitude === settings.longitude &&
    src.timezone === resolveTimezone(settings.timezone) &&
    src.calculationMethod === settings.calculationMethod &&
    src.asrMethod === settings.asrMethod &&
    src.highLatitudeRule === settings.highLatitudeRule
  );
}

/**
 * The next MAIN prayer strictly after `nowMs`, searching today's then
 * tomorrow's schedule. Falls back to null only when nothing is computable
 * (deep polar edge case) — callers must handle that.
 */
export function findNextPrayer(
  nowMs: number,
  schedules: ReadonlyArray<DaySchedule | null>,
): NextPrayerInfo | null {
  let best: NextPrayerInfo | null = null;
  for (const day of schedules) {
    if (!day) continue;
    for (const entry of day.prayers) {
      if (!isMainPrayer(entry.name) || entry.epochMs === null) continue;
      if (entry.epochMs <= nowMs) continue;
      if (!best || entry.epochMs < best.epochMs) {
        best = {
          name: entry.name as MainPrayerName,
          epochMs: entry.epochMs,
          timeStr: entry.timeStr ?? '',
          date: day.date,
        };
      }
    }
  }
  return best;
}

export function isMainPrayer(name: string): name is MainPrayerName {
  return (MAIN_PRAYERS as readonly string[]).includes(name);
}

/** Entry lookup by prayer name. */
export function prayerEntry(day: DaySchedule, name: string): PrayerTimeEntry | undefined {
  return day.prayers.find((p) => p.name === name);
}
