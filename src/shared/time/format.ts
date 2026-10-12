/**
 * Time formatting helpers — Tcalm Firefox Extension.
 *
 * Schedules carry 24-hour "HH:MM" times with Latin digits (Tcalm data
 * parity); the DISPLAY format is a user setting since v1.0.6 — 12-hour
 * (default) or 24-hour — converted at the presentation edge only.
 */
import type { CountdownParts, LanguageCode, TimeFormat } from '../types.ts';

/** Round epoch ms down/up to the nearest whole minute (seconds discarded). */
export function roundToMinute(epochMs: number): number {
  return Math.round(epochMs / 60000) * 60000;
}

/** "HH:MM" from a wall-clock hour decimal (e.g. 12.75 -> "12:45"). */
export function hoursToTimeString(hours: number): string {
  let h = Math.floor(hours);
  let m = Math.round((hours - h) * 60);
  if (m === 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  h = ((h % 24) + 24) % 24;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "HH:MM" for an epoch in a given timezone (24h, Latin digits). */
export function formatEpochAsTime(epochMs: number, timeZone: string): string {
  const fmt = getTimeFormatter(timeZone);
  const parts = fmt.formatToParts(new Date(epochMs));
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '0';
  return `${String(Number(hour) % 24).padStart(2, '0')}:${String(Number(minute)).padStart(2, '0')}`;
}

const timeFormatters = new Map<string, Intl.DateTimeFormat>();
function getTimeFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = timeFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    });
    timeFormatters.set(timeZone, fmt);
  }
  return fmt;
}

/** Live clock string for an instant in a zone, honoring the display format. */
export function formatClock(
  instant: Date,
  timeZone: string,
  timeFormat: TimeFormat = '24h',
  language: LanguageCode = 'en',
): string {
  return formatTimeForDisplay(
    formatEpochAsTime(instant.getTime(), timeZone),
    timeFormat,
    language,
  );
}

/*
 * Presentation-edge 12/24-hour conversion. Input is always the canonical
 * 24h "HH:MM"; output:
 *   24h -> unchanged ("13:45")
 *   12h -> "1:45 PM" / "1:45 م" (Latin digits, matching Tcalm parity)
 */
export function formatTimeForDisplay(
  timeStr: string,
  timeFormat: TimeFormat,
  language: LanguageCode,
): string {
  if (timeFormat === '24h') return timeStr;
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!m) return timeStr;
  const hour = Number(m[1]);
  const minute = m[2]!;
  const suffix =
    hour < 12
      ? language === 'ar'
        ? 'ص'
        : 'AM'
      : language === 'ar'
        ? 'م'
        : 'PM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${suffix}`;
}

/** Countdown between now and a target epoch. */
export function countdown(nowMs: number, targetMs: number): CountdownParts {
  const totalMs = targetMs - nowMs;
  const clamped = Math.max(0, totalMs);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

/**
 * Human countdown label. Latin digits in both locales (Tcalm parity):
 *   en: "in 2h 17m"   ar: "بعد 2 س 17 د"
 * Seconds are included only under one minute, to keep the display calm.
 */
export function countdownLabel(parts: CountdownParts, language: 'en' | 'ar'): string {
  const { hours, minutes, seconds, totalMs } = parts;
  if (totalMs <= 0) {
    return language === 'ar' ? 'الآن' : 'now';
  }
  if (totalMs < 60_000) {
    return language === 'ar'
      ? `بعد ${seconds} ث`
      : `in ${seconds}s`;
  }
  if (hours > 0) {
    return language === 'ar'
      ? `بعد ${hours} س ${minutes} د`
      : `in ${hours}h ${minutes}m`;
  }
  return language === 'ar' ? `بعد ${minutes} د` : `in ${minutes}m`;
}

/*
 * Formatter caches: Intl.DateTimeFormat construction is comparatively
 * expensive, and callers (popup tick loop, background notifications) repeat
 * the same locale/timeZone combinations. Caching keeps per-minute refreshes
 * allocation-free. (The time-of-day formatter above is cached the same way.)
 */
const dateLabelFormatters = new Map<string, Intl.DateTimeFormat>();

/** Weekday + date label, localized: en "Mon 21 Sep 2026", ar "الاثنين 21 سبتمبر 2026". */
export function formatDateLabel(
  instant: Date,
  language: 'en' | 'ar',
  options?: { timeZone?: string; weekday?: boolean },
): string {
  const locale = language === 'ar' ? 'ar-EG' : 'en-GB';
  const weekday = options?.weekday === false ? undefined : 'long';
  const key = `${locale}|${options?.timeZone ?? ''}|${weekday ? 'w' : ''}`;
  let fmt = dateLabelFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, {
      timeZone: options?.timeZone,
      weekday,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    dateLabelFormatters.set(key, fmt);
  }
  return fmt.format(instant);
}

const hijriFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * Hijri date label via Intl calendars ('islamic-umalqura' with graceful
 * fallback to 'islamic-civil'). Returns null when the runtime lacks both.
 * Successful formatters are cached per locale/timeZone pair.
 */
export function formatHijriLabel(
  instant: Date,
  language: 'en' | 'ar',
  dayOffset: number,
  timeZone?: string,
): string | null {
  const umalqura = language === 'ar' ? 'ar-EG-u-ca-islamic-umalqura' : 'en-GB-u-ca-islamic-umalqura';
  const civil = umalqura.replace('islamic-umalqura', 'islamic-civil');
  const shifted = new Date(instant.getTime() + dayOffset * 86400_000);
  for (const locale of [umalqura, civil]) {
    const key = `${locale}|${timeZone ?? ''}`;
    let fmt = hijriFormatters.get(key);
    if (!fmt) {
      try {
        fmt = new Intl.DateTimeFormat(locale, {
          timeZone,
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      } catch {
        continue; // try the next calendar
      }
      hijriFormatters.set(key, fmt);
    }
    return fmt.format(shifted);
  }
  return null;
}
