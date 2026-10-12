/**
 * Timezone utilities — Tcalm Firefox Extension.
 *
 * All zone math goes through Intl (ICU) — the same database Firefox itself
 * uses — so DST transitions are handled exactly as the browser renders them.
 * Pure functions; no browser.* APIs. Replaces Tcalm's reliance on the OS
 * local timezone + IP-lookup timezone.
 */

export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** Hour decimal, e.g. 12.75 => 12:45. */
export type LocalHours = number;

export function systemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidTimezone(timeZone: string): boolean {
  if (typeof timeZone !== 'string' || timeZone.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * All IANA zones the runtime knows (Intl.supportedValuesOf, FF 84+).
 * Returns [] on engines without the API (guarded).
 */
export function knownTimezones(): string[] {
  const anyIntl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  if (typeof anyIntl.supportedValuesOf === 'function') {
    try {
      return anyIntl.supportedValuesOf('timeZone');
    } catch {
      return [];
    }
  }
  return [];
}

// Cache of DateTimeFormat instances per zone (formatting is expensive).
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function offsetFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = offsetFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    offsetFormatters.set(timeZone, fmt);
  }
  return fmt;
}

/**
 * UTC offset of `timeZone` at a given instant, in MINUTES east of UTC.
 * Example: America/New_York on 2026-01-15 → -300; on 2026-07-15 → -240.
 * Rounded to whole minutes — modern IANA offsets are whole minutes and
 * the formatted parts only carry whole seconds.
 */
export function getOffsetMinutes(timeZone: string, instant: Date): number {
  const parts = offsetFormatter(timeZone).formatToParts(instant);
  const get = (type: string): number => {
    const p = parts.find((x) => x.type === type);
    return p ? Number(p.value) : 0;
  };
  // "As-if" wall clock of that instant, interpreted as if it were UTC.
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  const rounded = Math.round((asUtc - instant.getTime()) / 60000);
  // Normalize -0 to 0 so strict comparisons downstream behave.
  return rounded === 0 ? 0 : rounded;
}

/**
 * Resolve a settings timezone ('auto' sentinel) to a concrete IANA id.
 */
export function resolveTimezone(timezone: string): string {
  if (!timezone || timezone === 'auto') return systemTimezone();
  return isValidTimezone(timezone) ? timezone : systemTimezone();
}

/**
 * Convert a wall-clock time in `timeZone` on a given local date to a UTC
 * epoch (ms). Iterates so that the offset used is the one in effect AT the
 * resulting instant — this is what makes DST boundaries behave correctly.
 *
 * `hours` may be fractional (12.75 = 12:45) and may fall outside [0,24)
 * (e.g. isha computed as 24.5 for high latitudes rolls into the next day).
 */
export function zonedTimeToUtc(
  date: LocalDate,
  hours: LocalHours,
  timeZone: string,
): number {
  const wallMidnightUtc = Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0);
  const wallMs = wallMidnightUtc + Math.round(hours * 3600 * 1000);

  // First guess: offset at the wall time interpreted naively as UTC.
  let guess = wallMs - getOffsetMinutes(timeZone, new Date(wallMs)) * 60000;
  // Two refinement passes converge for all real-world DST rules.
  for (let i = 0; i < 2; i++) {
    const offset = getOffsetMinutes(timeZone, new Date(guess));
    const next = wallMs - offset * 60000;
    if (next === guess) break;
    guess = next;
  }
  return guess;
}

/** Opposite direction: epoch -> local date in a zone. */
export function utcToZonedDate(instant: Date, timeZone: string): LocalDate {
  const parts = offsetFormatter(timeZone).formatToParts(instant);
  const get = (type: string): number => {
    const p = parts.find((x) => x.type === type);
    return p ? Number(p.value) : 0;
  };
  return { year: get('year'), month: get('month'), day: get('day') };
}

/** Local date for "today" in a zone, as "YYYY-MM-DD". */
export function zonedDateString(instant: Date, timeZone: string): string {
  const { year, month, day } = utcToZonedDate(instant, timeZone);
  return formatDateString(year, month, day);
}

export function formatDateString(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function parseDateString(s: string): LocalDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const base = Date.UTC(date.year, date.month - 1, date.day) + days * 86400_000;
  const d = new Date(base);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * Offset (hours, east positive) in effect around local noon of the given
 * zoned date — the "tz" input of the solar formulas.
 */
export function approximateOffsetHours(timeZone: string, date: LocalDate): number {
  const noonUtcGuess = Date.UTC(date.year, date.month - 1, date.day, 12, 0, 0);
  const offset = getOffsetMinutes(timeZone, new Date(noonUtcGuess));
  return offset / 60;
}

/**
 * Milliseconds until the NEXT local midnight in `timeZone` after `instant`.
 * Used by the scheduler to roll over to the next day's timetable.
 */
export function msUntilNextMidnight(instant: Date, timeZone: string): number {
  const today = utcToZonedDate(instant, timeZone);
  const tomorrow = addDays(today, 1);
  const nextMidnight = zonedTimeToUtc(tomorrow, 0, timeZone);
  let delta = nextMidnight - instant.getTime();
  // Safety: never return a non-positive wait (clock/timezone shift weirdness).
  if (delta <= 0) delta = 60_000;
  return delta;
}

/** UTC offset label like "UTC+03:00" (used in UI status lines). */
export function offsetLabel(timeZone: string, instant: Date): string {
  const minutes = getOffsetMinutes(timeZone, instant);
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hh}:${mm}`;
}

/** True when DST is in effect in `timeZone` at `instant` (offset differs from January's). */
export function isDstActive(timeZone: string, instant: Date): boolean {
  const january = new Date(Date.UTC(instant.getUTCFullYear(), 0, 15));
  const july = new Date(Date.UTC(instant.getUTCFullYear(), 6, 15));
  const standard = Math.min(
    Math.abs(getOffsetMinutes(timeZone, january)),
    Math.abs(getOffsetMinutes(timeZone, july)),
  );
  return Math.abs(getOffsetMinutes(timeZone, instant)) > standard;
}
