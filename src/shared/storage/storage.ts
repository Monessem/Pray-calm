/**
 * Typed storage access layer — Tcalm Firefox Extension.
 *
 * Thin, typed wrappers over browser.storage.local. Every read normalizes
 * through the validation layer, so corrupted or hand-edited storage can
 * never inject invalid state into the scheduler.
 *
 * Replaces Tcalm's config.json / cache.json / PID file handling.
 */
import type { ActivePause, DaySchedule, FiredEvents, LastPauseRecord, Settings } from '../types.ts';
import { STORAGE_KEYS } from '../constants.ts';
import { normalizeSettings } from './settings.ts';

/**
 * browser.storage.local (or an injected mock in tests). Accessed lazily so
 * importing this module never touches browser APIs at load time.
 * Global typing comes from src/globals.d.ts.
 */

async function readKey<T>(key: string): Promise<T | null> {
  const bag = await browser.storage.local.get(key);
  const value = bag[key];
  return (value === undefined || value === null ? null : value) as T | null;
}

export async function getSettings(): Promise<Settings> {
  const raw = await readKey<unknown>(STORAGE_KEYS.settings);
  return normalizeSettings(raw);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}

export interface ScheduleCache {
  today: DaySchedule | null;
  tomorrow: DaySchedule | null;
}

export async function getScheduleCache(): Promise<ScheduleCache> {
  const raw = await readKey<ScheduleCache>(STORAGE_KEYS.schedule);
  if (!raw || typeof raw !== 'object') return { today: null, tomorrow: null };
  const today = isDaySchedule(raw.today) ? raw.today : null;
  const tomorrow = isDaySchedule(raw.tomorrow) ? raw.tomorrow : null;
  return { today, tomorrow };
}

export async function saveScheduleCache(cache: ScheduleCache): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.schedule]: cache });
}

export async function getFiredEvents(): Promise<FiredEvents> {
  const raw = await readKey<FiredEvents>(STORAGE_KEYS.firedEvents);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: FiredEvents = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

export async function saveFiredEvents(events: FiredEvents): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.firedEvents]: events });
}

export async function getActivePause(): Promise<ActivePause | null> {
  const raw = await readKey<ActivePause>(STORAGE_KEYS.activePause);
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw['prayer'] !== 'string' || typeof raw['startedAt'] !== 'number') return null;
  const tabIds = Array.isArray(raw['tabIds'])
    ? raw['tabIds'].filter((id): id is number => typeof id === 'number')
    : [];
  return {
    prayer: raw['prayer'] as ActivePause['prayer'],
    startedAt: raw['startedAt'],
    resumeAt: typeof raw['resumeAt'] === 'number' ? raw['resumeAt'] : null,
    tabIds,
    lastSweepAt: typeof raw['lastSweepAt'] === 'number' ? raw['lastSweepAt'] : raw['startedAt'],
  };
}

export async function saveActivePause(pause: ActivePause | null): Promise<void> {
  if (pause === null) {
    await browser.storage.local.remove(STORAGE_KEYS.activePause);
  } else {
    await browser.storage.local.set({ [STORAGE_KEYS.activePause]: pause });
  }
}

/** v1.1.24: the last restorable pause event — resume target for the manual button. */
export async function getLastPauseRecord(): Promise<LastPauseRecord | null> {
  const raw = await readKey<unknown>(STORAGE_KEYS.lastPause);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  if (typeof v['at'] !== 'number' || !Number.isFinite(v['at'])) return null;
  const tabIds = Array.isArray(v['tabIds'])
    ? v['tabIds'].filter((id): id is number => typeof id === 'number' && Number.isFinite(id)).slice(0, 500)
    : [];
  return { at: v['at'], tabIds };
}

export async function saveLastPauseRecord(record: LastPauseRecord): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.lastPause]: record });
}

export async function clearLastPauseRecord(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEYS.lastPause);
}

/** Remove schedule cache + fired ledger + pause state (settings preserved). */
export async function clearRuntimeData(): Promise<void> {
  await browser.storage.local.remove([
    STORAGE_KEYS.schedule,
    STORAGE_KEYS.firedEvents,
    STORAGE_KEYS.activePause,
    STORAGE_KEYS.lastPause,
  ]);
}

function isDaySchedule(value: unknown): value is DaySchedule {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['date'] === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v['date']) &&
    Array.isArray(v['prayers']) &&
    typeof v['generatedAt'] === 'number'
  );
}
