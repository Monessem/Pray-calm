/**
 * Shared domain types — Tcalm Firefox Extension.
 *
 * These types are the single source of truth for data that crosses module
 * boundaries (storage <-> scheduler <-> UI). Pure data shapes only; no
 * functions, no browser API references.
 */

/** The seven computed times. The five MAIN prayers drive events/UI. */
export type PrayerName =
  | 'fajr'
  | 'sunrise'
  | 'dhuhr'
  | 'asr'
  | 'maghrib'
  | 'sunset'
  | 'isha';

export const MAIN_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type MainPrayerName = (typeof MAIN_PRAYERS)[number];

export type LanguageCode = 'en' | 'ar';
export type LanguageSetting = 'auto' | LanguageCode;
export type ThemeSetting = 'light' | 'dark' | 'system';
export type LocationMode = 'auto' | 'manual';
export type AsrMethod = 'standard' | 'hanafi';
export type HighLatitudeRule = 'night-middle' | 'angle-based' | 'one-seventh' | 'unresolved';
export type MediaScope = 'all' | 'allowlist';
/** Wall-clock display preference. Schedules stay 24h "HH:MM" internally. */
export type TimeFormat = '12h' | '24h';
/**
 * v1.1.17: the guaranteed-visible alert window strategy.
 *  - 'always' — open the Tcalm toast window at every notified prayer, in
 *    addition to the system notification. Guarantees the owner actually
 *    SEES the alert even when the OS suppresses Firefox banners (Focus
 *    Assist, per-app notification blocks, …). Opt-in since v1.1.21.
 *  - 'auto'   — only when the system banner was not confirmed shown.
 *  - 'never'  — system notification channel only (the default since
 *    v1.1.21; was the v1.1.6 behavior).
 */
export type AlertWindowMode = 'always' | 'auto' | 'never';

/** Settings schema version. Bump when breaking changes; migrations in settings.ts. */
export const SETTINGS_SCHEMA_VERSION = 1;

/**
 * User settings. Field-by-field equivalent of Tcalm's config.json
 * (see MIGRATION.md for the mapping), extended with Firefox-native options.
 */
export interface Settings {
  schemaVersion: number;
  /** Master switch — mirrors "daemon running" state in Tcalm. */
  enabled: boolean;
  language: LanguageSetting;
  locationMode: LocationMode;
  /** Display-only labels (localized where a preset matches). */
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  /** IANA zone id, or the sentinel 'auto' = follow the OS timezone. */
  timezone: string;
  /** Tcalm/Aladhan calculation method id (1-15, 6 unused). */
  calculationMethod: number;
  asrMethod: AsrMethod;
  highLatitudeRule: HighLatitudeRule;
  notificationsEnabled: boolean;
  /** 0 = only at prayer time (Tcalm behavior). 1-30 = additional advance notice. */
  notificationMinutesBefore: number;
  notificationSoundEnabled: boolean;
  prayerNotifications: Record<MainPrayerName, boolean>;
  mediaPauseEnabled: boolean;
  /** Minutes to keep media paused. 0 = single pause (Tcalm default), no auto-resume. */
  mediaPauseDuration: number;
  mediaScope: MediaScope;
  /** Domains (lowercase, registrable host names) allowed when mediaScope = 'allowlist'. */
  mediaAllowedSites: string[];
  /** Day correction for the Hijri date display (-2..2). */
  hijriOffset: number;
  theme: ThemeSetting;
  /** Display-only clock format (12h AM/PM is the default since v1.0.6). */
  timeFormat: TimeFormat;
  /** v1.1.17: guaranteed-visible alert window mode ('never' by default since v1.1.21). */
  alertWindowMode: AlertWindowMode;
  /** v1.1.17: how long the alert window stays on screen (10–60 s). */
  alertWindowSeconds: number;
}

/** One computed prayer time for one local date. */
export interface PrayerTimeEntry {
  name: PrayerName;
  /** UTC epoch milliseconds, rounded to the minute. null = not computable (polar edge). */
  epochMs: number | null;
  /** "HH:MM" in the schedule's timezone (24h, matches Tcalm output). */
  timeStr: string | null;
}

/** Calculation inputs snapshot — guards the cache against stale settings. */
export interface ScheduleSource {
  latitude: number;
  longitude: number;
  timezone: string;
  calculationMethod: number;
  asrMethod: AsrMethod;
  highLatitudeRule: HighLatitudeRule;
}

export interface DaySchedule {
  /** Local calendar date in the schedule timezone, "YYYY-MM-DD". */
  date: string;
  source: ScheduleSource;
  prayers: PrayerTimeEntry[];
  generatedAt: number;
}

export interface NextPrayerInfo {
  name: MainPrayerName;
  epochMs: number;
  timeStr: string;
  date: string;
}

/** Active media-hold session (persisted so it survives browser restarts). */
export interface ActivePause {
  /**
   * Prayer that started the hold, or 'test' when the options page's
   * "Test media pause" button started it (v1.0.8) — display metadata only.
   */
  prayer: MainPrayerName | 'test';
  startedAt: number;
  /** When to auto-resume (only meaningful when mediaPauseDuration > 0). */
  resumeAt: number | null;
  /** Tabs in which we paused something and may restore it. */
  tabIds: number[];
  /** Epoch ms of the last re-pause sweep (hold mode). */
  lastSweepAt: number;
}

/**
 * v1.1.24: the LAST pause event that actually paused something — the only
 * thing "Resume paused media" restores. One record, overwritten by every
 * new restorable pause event (prayer or manual test), cleared when it is
 * resumed (manually or by an expiring hold). Sweep re-pauses are not
 * restorable and never touch it.
 */
export interface LastPauseRecord {
  /** Epoch ms of the pause event that wrote this record. */
  at: number;
  /** Tabs where that event paused restorable media. */
  tabIds: number[];
}

/** Prayer event dedupe ledger: `${date}#${prayer}` -> epoch ms when fired. */
export type FiredEvents = Record<string, number>;

/** Countdown parts for UI display. */
export interface CountdownParts {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

/** Result shape used by all internal async operations. */
export interface OperationResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}
