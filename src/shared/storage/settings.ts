/**
 * Settings normalization, validation, import/export — Tcalm Firefox Extension.
 *
 * All unknown settings data (storage, imports, message payloads) is run
 * through normalizeSettings(), which type-checks and clamps every field.
 * Invalid fields fall back to defaults — the same "merge onto defaults"
 * strategy as Tcalm's load_config(), hardened for untrusted input.
 */
import type {
  AlertWindowMode,
  AsrMethod,
  LanguageSetting,
  MainPrayerName,
  MediaScope,
  Settings,
  ThemeSetting,
  TimeFormat,
} from '../types.ts';
import { SETTINGS_SCHEMA_VERSION } from '../types.ts';
import {
  ALL_MAIN_PRAYERS,
  CALCULATION_METHODS,
  DEFAULT_SETTINGS,
  HIGH_LATITUDE_RULES,
  LIMITS,
} from '../constants.ts';
import {
  clamp,
  isBoolean,
  isFiniteNumber,
  isIntInRange,
  isNonEmptyString,
  sanitizeHostname,
} from '../utils/validate.ts';

const LANGUAGES: LanguageSetting[] = ['auto', 'en', 'ar'];
const THEMES: ThemeSetting[] = ['light', 'dark', 'system'];
const ASR_METHODS: AsrMethod[] = ['standard', 'hanafi'];
const MEDIA_SCOPES: MediaScope[] = ['all', 'allowlist'];
const TIME_FORMATS: TimeFormat[] = ['12h', '24h'];
const ALERT_WINDOW_MODES: AlertWindowMode[] = ['always', 'auto', 'never'];

function pickEnum<T extends string>(value: unknown, allowed: ReadonlyArray<T>, fallback: T): T {
  return typeof value === 'string' && (allowed as ReadonlyArray<string>).includes(value)
    ? (value as T)
    : fallback;
}

function pickString(value: unknown, fallback: string, maxLength = 80): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) return fallback;
  return trimmed;
}

/**
 * Coerce arbitrary data into a valid Settings object.
 * Tolerant: unknown/invalid fields fall back to defaults; nothing throws.
 */
export function normalizeSettings(input: unknown): Settings {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;

  const latitude = isFiniteNumber(src['latitude']) ? clamp(src['latitude'], LIMITS.latMin, LIMITS.latMax) : DEFAULT_SETTINGS.latitude;
  const longitude = isFiniteNumber(src['longitude']) ? clamp(src['longitude'], LIMITS.lngMin, LIMITS.lngMax) : DEFAULT_SETTINGS.longitude;

  // Timezone: 'auto' sentinel, or a syntactically plausible IANA id.
  // (Semantic validation happens in tz.ts via Intl when resolved.)
  const rawTz = typeof src['timezone'] === 'string' ? src['timezone'].trim() : '';
  const timezone =
    rawTz === 'auto' || (rawTz.length > 0 && rawTz.length <= 64 && /^[\w/+_-]+$/.test(rawTz))
      ? rawTz
      : DEFAULT_SETTINGS.timezone;

  const prayerNotifications: Settings['prayerNotifications'] = {
    ...DEFAULT_SETTINGS.prayerNotifications,
  };
  const rawPrayers = src['prayerNotifications'];
  if (typeof rawPrayers === 'object' && rawPrayers !== null) {
    for (const prayer of ALL_MAIN_PRAYERS as MainPrayerName[]) {
      const v = (rawPrayers as Record<string, unknown>)[prayer];
      if (isBoolean(v)) prayerNotifications[prayer] = v;
    }
  }

  const mediaAllowedSites: string[] = [];
  if (Array.isArray(src['mediaAllowedSites'])) {
    const seen = new Set<string>();
    for (const item of src['mediaAllowedSites'].slice(0, LIMITS.maxAllowedSites)) {
      const host = typeof item === 'string' ? sanitizeHostname(item) : null;
      if (host && !seen.has(host)) {
        seen.add(host);
        mediaAllowedSites.push(host);
      }
    }
  }

  const methodRaw = src['calculationMethod'];
  const methodOk =
    typeof methodRaw === 'number' && CALCULATION_METHODS.some((m) => m.id === methodRaw);

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    enabled: isBoolean(src['enabled']) ? src['enabled'] : DEFAULT_SETTINGS.enabled,
    language: pickEnum(src['language'], LANGUAGES, DEFAULT_SETTINGS.language),
    locationMode: pickEnum(src['locationMode'], ['auto', 'manual'] as const, DEFAULT_SETTINGS.locationMode),
    country: pickString(src['country'], DEFAULT_SETTINGS.country),
    city: pickString(src['city'], DEFAULT_SETTINGS.city),
    latitude,
    longitude,
    timezone,
    calculationMethod: methodOk ? (methodRaw as number) : DEFAULT_SETTINGS.calculationMethod,
    asrMethod: pickEnum(src['asrMethod'], ASR_METHODS, DEFAULT_SETTINGS.asrMethod),
    highLatitudeRule: pickEnum(src['highLatitudeRule'], HIGH_LATITUDE_RULES, DEFAULT_SETTINGS.highLatitudeRule),
    notificationsEnabled: isBoolean(src['notificationsEnabled']) ? src['notificationsEnabled'] : DEFAULT_SETTINGS.notificationsEnabled,
    notificationMinutesBefore: isFiniteNumber(src['notificationMinutesBefore'])
      ? clamp(Math.round(src['notificationMinutesBefore']), 0, LIMITS.minutesBeforeMax)
      : DEFAULT_SETTINGS.notificationMinutesBefore,
    notificationSoundEnabled: isBoolean(src['notificationSoundEnabled']) ? src['notificationSoundEnabled'] : DEFAULT_SETTINGS.notificationSoundEnabled,
    prayerNotifications,
    mediaPauseEnabled: isBoolean(src['mediaPauseEnabled']) ? src['mediaPauseEnabled'] : DEFAULT_SETTINGS.mediaPauseEnabled,
    mediaPauseDuration: isFiniteNumber(src['mediaPauseDuration'])
      ? clamp(Math.round(src['mediaPauseDuration']), 0, LIMITS.pauseDurationMax)
      : DEFAULT_SETTINGS.mediaPauseDuration,
    mediaScope: pickEnum(src['mediaScope'], MEDIA_SCOPES, DEFAULT_SETTINGS.mediaScope),
    mediaAllowedSites,
    hijriOffset: isIntInRange(src['hijriOffset'], LIMITS.hijriOffsetMin, LIMITS.hijriOffsetMax)
      ? src['hijriOffset']
      : DEFAULT_SETTINGS.hijriOffset,
    theme: pickEnum(src['theme'], THEMES, DEFAULT_SETTINGS.theme),
    timeFormat: pickEnum(src['timeFormat'], TIME_FORMATS, DEFAULT_SETTINGS.timeFormat),
    alertWindowMode: pickEnum(src['alertWindowMode'], ALERT_WINDOW_MODES, DEFAULT_SETTINGS.alertWindowMode),
    alertWindowSeconds: isFiniteNumber(src['alertWindowSeconds'])
      ? clamp(Math.round(src['alertWindowSeconds']), LIMITS.alertSecondsMin, LIMITS.alertSecondsMax)
      : DEFAULT_SETTINGS.alertWindowSeconds,
  };
}

/** How many recognizable settings keys a payload contains (import sniffing). */
function recognizedKeyCount(input: Record<string, unknown>): number {
  const known = new Set(Object.keys(DEFAULT_SETTINGS));
  return Object.keys(input).filter((k) => known.has(k)).length;
}

export interface ImportResult {
  ok: boolean;
  settings: Settings;
  error?: 'not-json' | 'not-object' | 'unrecognized';
}

/**
 * Import an exported settings file (our own format, or a Tcalm config.json).
 * Always returns normalized settings on success.
 */
export function parseImportedSettings(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, settings: DEFAULT_SETTINGS, error: 'not-json' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, settings: DEFAULT_SETTINGS, error: 'not-object' };
  }
  const obj = data as Record<string, unknown>;
  const inner = (obj['settings'] as Record<string, unknown> | undefined) ?? obj;
  if (recognizedKeyCount(inner) < 3) {
    return { ok: false, settings: DEFAULT_SETTINGS, error: 'unrecognized' };
  }
  return { ok: true, settings: normalizeSettings(inner) };
}

/** Export payload shape. */
export function buildExportPayload(settings: Settings): Record<string, unknown> {
  return {
    app: 'tcalm-firefox',
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings,
  };
}

/**
 * Migrate a Tcalm (Python daemon) config.json into extension settings.
 * Key mapping is documented in MIGRATION.md.
 */
export function normalizeTcalmConfig(input: unknown): Settings {
  const src = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const tcalmPrayers = Array.isArray(src['prayers'])
    ? src['prayers'].filter((p): p is string => typeof p === 'string')
    : [];
  const prayerNotifications = { ...DEFAULT_SETTINGS.prayerNotifications };
  if (tcalmPrayers.length > 0) {
    for (const prayer of ALL_MAIN_PRAYERS) {
      const cap = prayer.charAt(0).toUpperCase() + prayer.slice(1);
      prayerNotifications[prayer] = tcalmPrayers.includes(cap) || tcalmPrayers.includes(prayer);
    }
  }
  return normalizeSettings({
    enabled: true,
    language: src['language'] === 'ar' ? 'ar' : src['language'] === 'en' ? 'en' : 'auto',
    locationMode: src['auto_detect'] === true ? 'auto' : 'manual',
    country: src['country'],
    city: src['city'],
    latitude: src['latitude'],
    longitude: src['longitude'],
    timezone: isNonEmptyString(src['timezone']) ? src['timezone'] : 'auto',
    calculationMethod: src['method'],
    notificationsEnabled: src['notifications'],
    prayerNotifications,
    mediaPauseEnabled: false, // desktop pause is a new, permission-gated capability
    mediaPauseDuration: src['pause_duration_minutes'],
  });
}

/** Deep equality for change detection (settings only). */
export function settingsEqual(a: Settings, b: Settings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
