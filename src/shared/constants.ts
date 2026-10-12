/**
 * Calculation method table + defaults — Tcalm Firefox Extension.
 *
 * Method ids intentionally match the Tcalm/Aladhan numbering used by the
 * original project (constants.py::CALCULATION_METHODS, ids 1-15, id 6 unused).
 * Angle/minute parameters follow the published conventions of each authority.
 */
import type { AsrMethod, HighLatitudeRule, MainPrayerName, Settings } from './types.ts';

/** How a method defines Isha / Maghrib. */
export interface CalcMethod {
  id: number;
  /** Stable key used for tests/debug; display names come from i18n (`method_1` …). */
  key: string;
  fajrAngle: number;
  ishaAngle?: number;
  ishaMinutesAfterMaghrib?: number;
  /** Depression angle below the horizon for Maghrib (default: sunset, 0.833°). */
  maghribAngle?: number;
}

/**
 * Tcalm method ids -> parameters.
 * Default (5) = Egyptian General Authority of Survey, as in Tcalm.
 */
export const CALCULATION_METHODS: CalcMethod[] = [
  { id: 1, key: 'karachi', fajrAngle: 18, ishaAngle: 18 },
  { id: 2, key: 'isna', fajrAngle: 15, ishaAngle: 15 },
  { id: 3, key: 'mwl', fajrAngle: 18, ishaAngle: 17 },
  { id: 4, key: 'makkah', fajrAngle: 18.5, ishaMinutesAfterMaghrib: 90 },
  { id: 5, key: 'egypt', fajrAngle: 19.5, ishaAngle: 17.5 },
  { id: 7, key: 'tehran', fajrAngle: 17.7, maghribAngle: 4.5, ishaAngle: 14 },
  { id: 8, key: 'gulf', fajrAngle: 19.5, ishaMinutesAfterMaghrib: 90 },
  { id: 9, key: 'kuwait', fajrAngle: 18, ishaAngle: 17.5 },
  { id: 10, key: 'qatar', fajrAngle: 18, ishaMinutesAfterMaghrib: 90 },
  { id: 11, key: 'muis', fajrAngle: 20, ishaAngle: 18 },
  { id: 12, key: 'france', fajrAngle: 12, ishaAngle: 12 },
  { id: 13, key: 'diyanet', fajrAngle: 18, ishaAngle: 17 },
  { id: 14, key: 'russia', fajrAngle: 16, ishaAngle: 15 },
  { id: 15, key: 'moonsighting', fajrAngle: 18, ishaAngle: 18 },
];

const DEFAULT_METHOD_ID = 5;

export function getMethod(id: number): CalcMethod {
  return CALCULATION_METHODS.find((m) => m.id === id) ?? CALCULATION_METHODS[4]!;
}

export function isValidMethodId(id: unknown): id is number {
  return typeof id === 'number' && Number.isInteger(id) && CALCULATION_METHODS.some((m) => m.id === id);
}

/** Sunrise/sunset depression: geocentric + 34' refraction + 0.6' semidiameter. */
export const SUNRISE_SUNSET_DEPRESSION = 0.833;

/** Asr shadow factors. 'standard' = Shafi'i/majority (Tcalm behavior), 'hanafi' = factor 2. */
export const ASR_FACTORS: Record<AsrMethod, number> = { standard: 1, hanafi: 2 };

export const HIGH_LATITUDE_RULES: HighLatitudeRule[] = [
  'night-middle',
  'angle-based',
  'one-seventh',
  'unresolved',
];

/**
 * Default settings — mirrors Tcalm DEFAULT_CONFIG (Cairo / Egypt / method 5).
 */
export const DEFAULT_SETTINGS: Settings = {
  schemaVersion: 1,
  enabled: true,
  language: 'auto',
  locationMode: 'manual',
  country: 'Egypt',
  city: 'Cairo',
  latitude: 30.0444,
  longitude: 31.2357,
  timezone: 'auto',
  calculationMethod: DEFAULT_METHOD_ID,
  asrMethod: 'standard',
  highLatitudeRule: 'angle-based',
  notificationsEnabled: true,
  notificationMinutesBefore: 0,
  notificationSoundEnabled: true,
  prayerNotifications: {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  mediaPauseEnabled: false,
  mediaPauseDuration: 0,
  mediaScope: 'all',
  mediaAllowedSites: [],
  hijriOffset: 0,
  theme: 'system',
  // v1.0.6: 12-hour clock is the default display format (user request);
  // the 24-hour convention remains available in Settings → General.
  timeFormat: '12h',
  // v1.1.21: default is 'never' — rely on the system notification channel
  // only, matching the owner's preference. The guaranteed-visible window
  // remains available ('always' / 'auto') for users whose OS suppresses
  // Firefox banners; choosing it is an explicit opt-in now.
  alertWindowMode: 'never',
  alertWindowSeconds: 25,
};

/** All main prayers (Tcalm's canonical list). */
export const ALL_MAIN_PRAYERS: MainPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Constraints used by validation (shared with options UI). */
export const LIMITS = {
  latMin: -90,
  latMax: 90,
  lngMin: -180,
  lngMax: 180,
  minutesBeforeMax: 30,
  pauseDurationMax: 120,
  hijriOffsetMin: -2,
  hijriOffsetMax: 2,
  maxAllowedSites: 50,
  /** v1.1.17: alert-window auto-close bounds (seconds). */
  alertSecondsMin: 10,
  alertSecondsMax: 60,
} as const;

/** Scheduler tuning. */
export const SCHEDULER = {
  /** Prayer event accepted this long after the scheduled time (ms). */
  graceMs: 120_000,
  /** Periodic self-healing alarm (minutes). */
  integrityPeriodMinutes: 360,
  /** Re-pause sweep period during a media hold (minutes) — browser.alarms floor. */
  holdSweepPeriodMinutes: 1,
  /**
   * v1.1.26: damped burst sweep delays after a hold STARTS (ms). Streaming
   * players with "keep playing" state machines restart within seconds of
   * an external pause; the original Tcalm daemon re-paused every 5 s for
   * the whole window. One-shot alarms (browser.alarms minimum period is
   * 1 minute, but one-shots are not bounded) deliver the same behavior
   * for the critical first half-minute, then the 1-minute periodic sweep
   * takes over as the long tail. Entries beyond the hold's resume time
   * are not created.
   */
  holdBurstDelaysMs: [5_000, 10_000, 20_000, 35_000] as const,
  /** v1.1.6: toolbar badge refresh period (minutes). Cheap (storage read +
   * findNextPrayer) and it is what keeps the next-prayer badge from ever
   * going stale — the v1.1.x badge stuck on "Maghrib" is the regression
   * this tick exists to prevent. */
  badgeTickPeriodMinutes: 1,
  /** Alarms older than this are pruned from firedEvents. */
  firedEventTtlMs: 3 * 24 * 3600 * 1000,
  /** How many days of schedules to keep in cache. */
  cacheDays: 2,
  /** v1.1.17: in-memory notification storm guard — a prayer event seen
   * twice within this window is dropped at the NOTIFIER level too (the
   * scheduler's persisted firedEvents ledger is the first line of
   * defense; this is the second). Mirrors the v1.1.4 "11 banners in 7
   * minutes" incident. */
  notifyGuardTtlMs: 12 * 3600 * 1000,
  /** v1.1.17: how long 'auto' mode waits for notifications.onShown before
   * deciding the banner was suppressed and opening the toast window. */
  bannerConfirmWaitMs: 6_000,
} as const;

/** storage.local keys (single namespace, no personal data beyond settings). */
export const STORAGE_KEYS = {
  settings: 'settings',
  schedule: 'schedule',
  firedEvents: 'firedEvents',
  activePause: 'activePause',
  /** v1.1.24: last restorable pause event (see types.ts LastPauseRecord). */
  lastPause: 'lastPause',
} as const;

/** Alarm name factories — deterministic names make re-creation idempotent. */
export const ALARM_NAMES = {
  prayer: (prayer: string, date: string, epoch: number) => `prayer:${prayer}:${date}:${epoch}`,
  pre: (prayer: string, date: string, epoch: number) => `pre:${prayer}:${date}:${epoch}`,
  dailyRefresh: (date: string) => `daily-refresh:${date}`,
  integrity: 'integrity-check',
  holdSweep: 'media-hold-sweep',
  holdResume: (epoch: number) => `media-resume:${epoch}`,
  /** v1.1.26: one-shot burst sweeps early in a hold (seq, fire epoch). */
  holdBurst: (seq: number, epoch: number) => `media-hold-burst:${seq}:${epoch}`,
  /** v1.1.6: periodic toolbar-badge refresh (next-prayer indicator). */
  badgeTick: 'badge-tick',
  /** v1.1.17: auto-close a toast alert window (arg = browser window id). */
  toastClose: (windowId: number) => `toast-close:${windowId}`,
} as const;
