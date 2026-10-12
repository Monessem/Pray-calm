/**
 * Prayer time engine — Tcalm Firefox Extension.
 *
 * Computes, for a Gregorian calendar date and a location, the local-clock
 * hours of: fajr, sunrise, dhuhr, asr, sunset, maghrib, isha.
 *
 * Methodology follows the classic angle-based approach (PrayTimes.org /
 * Aladhan convention) which the original Tcalm project consumed remotely:
 *
 *   time(prayer) = solar noon ± hourAngle(depression angle)
 *   solar noon   = 12 − EoT + (tz − lng/15)
 *
 * Unlike Tcalm's remote-first design, this engine is fully offline and is the
 * PRIMARY source of times; no network is required for daily operation.
 */
import type { AsrMethod, HighLatitudeRule, PrayerName } from '../types.ts';
import { ASR_FACTORS, SUNRISE_SUNSET_DEPRESSION, getMethod } from '../constants.ts';
import {
  arctan2,
  fixHour,
  hourAngleHours,
  julianDay,
  sunPosition,
  tan,
} from './astro.ts';

export interface ComputeInput {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  latitude: number;
  longitude: number;
  /** Approximate UTC offset (hours, east positive) in effect on that local date. */
  tzOffsetHours: number;
  methodId: number;
  asrMethod: AsrMethod;
  highLatitudeRule: HighLatitudeRule;
}

export interface ComputedTimes {
  fajr: number | null;
  sunrise: number | null;
  dhuhr: number | null;
  asr: number | null;
  sunset: number | null;
  maghrib: number | null;
  isha: number | null;
}

/** Iteration count for refining sun-position-dependent times. */
const ITERATIONS = 2;

/** Initial estimates as day fractions (PrayTimes defaults). */
const INITIAL: Record<string, number> = {
  fajr: 5 / 24,
  sunrise: 6 / 24,
  dhuhr: 12 / 24,
  asr: 13 / 24,
  sunset: 18 / 24,
  maghrib: 18 / 24,
  isha: 18 / 24,
};

export const PRAYER_ORDER: PrayerName[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'sunset',
  'isha',
];

export function computePrayerTimes(input: ComputeInput): ComputedTimes {
  const { latitude, longitude } = input;
  const method = getMethod(input.methodId);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { fajr: null, sunrise: null, dhuhr: null, asr: null, sunset: null, maghrib: null, isha: null };
  }

  // Julian day anchored to the location's solar day (PrayTimes convention).
  const jDate = julianDay(input.year, input.month, input.day) - longitude / (15 * 24);

  const estimates: Record<string, number> = { ...INITIAL };
  let result: ComputedTimes = {
    fajr: null, sunrise: null, dhuhr: null, asr: null, sunset: null, maghrib: null, isha: null,
  };

  for (let i = 0; i < ITERATIONS; i++) {
    result = onePass(jDate, estimates, input, method);
    // Feed refined values back for the next pass.
    for (const key of PRAYER_ORDER) {
      const v = result[key as keyof ComputedTimes] as number | null;
      if (v !== null && Number.isFinite(v)) {
        estimates[key] = v / 24;
      }
    }
  }
  return result;
}

function onePass(
  jDate: number,
  estimates: Record<string, number>,
  input: ComputeInput,
  method: ReturnType<typeof getMethod>,
): ComputedTimes {
  const { latitude, longitude, tzOffsetHours } = input;

  // Solar noon, using the EoT at the current dhuhr estimate (SOLAR time).
  const dhuhrSolar = midDay(jDate, estimates['dhuhr']!);

  // --- Sunrise / sunset (0.833° depression) ---
  const declSunrise = declinationAt(jDate, estimates['sunrise']!);
  const declSunset = declinationAt(jDate, estimates['sunset']!);
  const haSunrise = hourAngleHours(SUNRISE_SUNSET_DEPRESSION, latitude, declSunrise);
  const haSunset = hourAngleHours(SUNRISE_SUNSET_DEPRESSION, latitude, declSunset);
  const sunriseSolar = haSunrise === null ? null : dhuhrSolar - haSunrise;
  const sunsetSolar = haSunset === null ? null : dhuhrSolar + haSunset;

  // --- Fajr ---
  const declFajr = declinationAt(jDate, estimates['fajr']!);
  const haFajr = hourAngleHours(method.fajrAngle, latitude, declFajr);
  const fajrSolar = haFajr === null ? null : dhuhrSolar - haFajr;

  // --- Asr ---
  const declAsr = declinationAt(jDate, estimates['asr']!);
  const asrAltitudeDepression = asrAngle(ASR_FACTORS[input.asrMethod], latitude, declAsr);
  const haAsr = hourAngleHours(asrAltitudeDepression, latitude, declAsr);
  const asrSolar = haAsr === null ? null : dhuhrSolar + haAsr;

  // --- Maghrib: method angle, otherwise sunset. ---
  let maghribSolar: number | null;
  if (method.maghribAngle !== undefined) {
    const haMaghrib = hourAngleHours(method.maghribAngle, latitude, declSunset);
    maghribSolar = haMaghrib === null ? null : dhuhrSolar + haMaghrib;
  } else {
    maghribSolar = sunsetSolar;
  }

  // --- Isha: angle-based, or minutes after maghrib (Makkah/Gulf/Qatar). ---
  let ishaSolar: number | null;
  if (method.ishaMinutesAfterMaghrib !== undefined) {
    ishaSolar = maghribSolar === null ? null : maghribSolar + method.ishaMinutesAfterMaghrib / 60;
  } else {
    const declIsha = declinationAt(jDate, estimates['isha']!);
    const haIsha = hourAngleHours(method.ishaAngle!, latitude, declIsha);
    ishaSolar = haIsha === null ? null : dhuhrSolar + haIsha;
  }

  // Solar -> local clock time. Identical in structure to Tcalm's
  // solar_noon = 12 + (tz*15 - lng)/15 - eot/60. Values may fall outside
  // [0,24) (isha past midnight, fajr before midnight at high latitudes) —
  // consumers (format/zonedTimeToUtc) handle the wrap.
  const clockShift = tzOffsetHours - longitude / 15;
  const toClock = (solar: number | null): number | null =>
    solar === null ? null : solar + clockShift;

  const times: ComputedTimes = {
    fajr: toClock(fajrSolar),
    sunrise: toClock(sunriseSolar),
    dhuhr: toClock(dhuhrSolar),
    asr: toClock(asrSolar),
    sunset: toClock(sunsetSolar),
    maghrib: toClock(maghribSolar),
    isha: toClock(ishaSolar),
  };

  return applyHighLatitudeRule(times, input.highLatitudeRule, method);
}

/** Solar noon in local clock hours. */
function midDay(jDate: number, dayPortion: number): number {
  const { equationOfTime } = sunPosition(jDate + dayPortion);
  return fixHour(12 - equationOfTime);
}

function declinationAt(jDate: number, dayPortion: number): number {
  return sunPosition(jDate + dayPortion).declination;
}

/**
 * Asr depression angle (negative of the sun's altitude at asr time).
 * altitude = arctan(1 / (shadowFactor + tan(|lat − decl|)))
 */
function asrAngle(shadowFactor: number, latitude: number, declination: number): number {
  return -arctan2(1, shadowFactor + tan(Math.abs(latitude - declination)));
}

/** Portion of the night used by high-latitude adjustment rules. */
function nightPortion(rule: HighLatitudeRule, angleDeg: number): number {
  switch (rule) {
    case 'night-middle':
      return 1 / 2;
    case 'one-seventh':
      return 1 / 7;
    case 'angle-based':
      return angleDeg / 60;
    case 'unresolved':
      return 0;
  }
}

/**
 * High-latitude adjustment (PrayTimes semantics).
 *
 * A time is REPLACED only when it is invalid at the given latitude:
 *  - null (the sun never reaches the angle that day), or
 *  - out of order (fajr at/after sunrise, isha/maghrib at/before sunset).
 * Valid computed times are never clamped — this keeps mid-latitude results
 * exact while polar regions fall back to the rule's estimate:
 *   fajr  := sunrise − portion·night
 *   isha  := sunset + portion·night
 *   maghrib := sunset + portion·night (angle-based methods only)
 *
 * For minutes-based isha (Makkah family) the angle-based portion is not
 * defined; only night-middle / one-seventh adjust. With rule 'unresolved'
 * nothing is replaced — the UI shows "—" for uncomputable times.
 */
function applyHighLatitudeRule(
  times: ComputedTimes,
  rule: HighLatitudeRule,
  method: ReturnType<typeof getMethod>,
): ComputedTimes {
  if (rule === 'unresolved') return times;
  const { fajr, sunrise, sunset, isha, maghrib } = times;
  if (sunrise === null || sunset === null) return times;

  // Night length in hours, from sunset to the next sunrise.
  const night = fixHour(sunrise - sunset);
  if (!Number.isFinite(night) || night <= 0) return times;

  const out: ComputedTimes = { ...times };

  const fajrPortion = nightPortion(rule, method.fajrAngle);
  const fajrFallback = sunrise - fajrPortion * night;
  if (fajr === null || fajr > sunrise) out.fajr = fajrFallback;

  if (method.ishaAngle !== undefined) {
    const ishaPortion = nightPortion(rule, method.ishaAngle);
    const ishaFallback = sunset + ishaPortion * night;
    if (isha === null || isha < sunset) out.isha = ishaFallback;
  } else if (rule === 'night-middle' || rule === 'one-seventh') {
    const ishaPortion = nightPortion(rule, 0);
    const ishaFallback = sunset + ishaPortion * night;
    if (isha === null || isha < sunset) out.isha = ishaFallback;
  }

  if (method.maghribAngle !== undefined) {
    const maghribPortion = nightPortion(rule, method.maghribAngle);
    const maghribFallback = sunset + maghribPortion * night;
    if (maghrib === null || maghrib < sunset) out.maghrib = maghribFallback;
  }

  return out;
}
