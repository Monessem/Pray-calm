/**
 * Solar position mathematics — Tcalm Firefox Extension.
 *
 * Implements the sun-position algorithm popularized by PrayTimes.org
 * (Meeus-derived low-precision series, accurate to well under one minute for
 * prayer-time purposes). Pure functions only — no browser APIs, fully testable.
 *
 * This replaces Tcalm's Python fallback formulas (Spencer EoT + approximate
 * declination), which are accurate only to a few minutes and break down at
 * high latitudes. The methodology (angle-based prayer times from solar
 * declination and equation of time) is identical.
 */

const DEG = Math.PI / 180;

export function sin(d: number): number {
  return Math.sin(d * DEG);
}

export function cos(d: number): number {
  return Math.cos(d * DEG);
}

export function tan(d: number): number {
  return Math.tan(d * DEG);
}

function arcsin(x: number): number {
  return Math.asin(x) / DEG;
}

function arccos(x: number): number {
  return Math.acos(x) / DEG;
}

export function arctan2(y: number, x: number): number {
  return Math.atan2(y, x) / DEG;
}

/** Normalize angle to [0, 360). */
function fixAngle(a: number): number {
  return mod(a, 360);
}

/** Normalize hours to [0, 24). */
export function fixHour(h: number): number {
  return mod(h, 24);
}

function mod(a: number, b: number): number {
  const r = a - b * Math.floor(a / b);
  // Guard against -0 and float fuzz at the boundary.
  return r < 0 ? r + b : r;
}

/**
 * Julian Day for a Gregorian calendar date at 00:00 UT.
 * (Meeus, Astronomical Algorithms, ch. 7.)
 */
export function julianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5
  );
}

export interface SunPosition {
  /** Solar declination in degrees. */
  declination: number;
  /** Equation of time in HOURS (positive: sun ahead of mean time). */
  equationOfTime: number;
}

/**
 * Sun position for a given Julian Day (UT).
 * Series truncated after the two dominant terms — standard for prayer times.
 */
export function sunPosition(jd: number): SunPosition {
  const d = jd - 2451545.0; // days since J2000.0

  // Mean anomaly and mean longitude (deg).
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);

  // Ecliptic longitude (deg).
  const l = fixAngle(q + 1.915 * sin(g) + 0.02 * sin(2 * g));

  // Obliquity of the ecliptic (deg).
  const e = 23.439 - 0.00000036 * d;

  // Declination (deg).
  const declination = arcsin(sin(e) * sin(l));

  // Right ascension (hours).
  let ra = arctan2(cos(e) * sin(l), cos(l)) / 15;
  ra = fixHour(ra);

  // Equation of time (hours): difference between mean and apparent solar time.
  const equationOfTime = q / 15 - ra;

  return { declination, equationOfTime };
}

/**
 * Equation of time in MINUTES (positive: apparent sun ahead of clock).
 * Used by tests and the Python oracle comparison.
 */
export function equationOfTimeMinutes(jd: number): number {
  return sunPosition(jd).equationOfTime * 60;
}

/**
 * Hour angle (in hours) at which the sun reaches the given depression angle
 * from the horizon, for the given latitude and declination.
 *
 * Returns null when the sun never reaches that depression that day
 * (polar day/night edge cases) — the caller decides how to handle it.
 */
export function hourAngleHours(
  depression: number,
  latitude: number,
  declination: number,
): number | null {
  // cos(H) = (-sin(depression) - sin(lat) sin(dec)) / (cos(lat) cos(dec))
  const numerator = -sin(depression) - sin(latitude) * sin(declination);
  const denominator = cos(latitude) * cos(declination);
  if (denominator === 0) return null;
  const cosH = numerator / denominator;
  if (cosH > 1 || cosH < -1 || Number.isNaN(cosH)) return null;
  return arccos(cosH) / 15;
}

/**
 * Sun altitude (degrees above horizon) at solar noon for latitude/declination.
 */
export function noonAltitude(latitude: number, declination: number): number {
  return 90 - Math.abs(latitude - declination);
}
