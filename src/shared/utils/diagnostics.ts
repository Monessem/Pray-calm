/**
 * Persistent diagnostics — Tcalm Firefox Extension.
 *
 * v1.0.4 lesson: three support rounds ("popup does not open") were spent
 * blind to what actually happened inside the user's browser, because
 * console output is invisible to most users. This module keeps a small
 * ring buffer of internal events in browser.storage.local so any future
 * failure explains itself: the options page renders the log with a
 * one-click "copy for support" action whose output can be pasted into a
 * bug report.
 *
 * v1.1.21 retention policy — one week, then self-cleanup:
 *  - every entry older than MAX_AGE_MS (7 days) is dropped on write, on
 *    read, and by the background's periodic pruneDiagnostics() sweep;
 *  - MAX_ENTRIES caps the buffer at 120 entries (≈ 45 KB worst case),
 *    so the buffer can never grow unbounded and never meaningfully
 *    affects storage size or add-on performance;
 *  - the prune rides the existing read-modify-write cycle (no extra
 *    storage round-trips) and the background sweep runs only on boot
 *    and on the 6-hourly integrity alarm.
 *
 * Contract: diagnostics must NEVER be able to break the code it
 * diagnoses — every failure here degrades to console-only logging and
 * swallowed rejections.
 */
import { log } from './log.ts';

export type DiagContext = 'popup' | 'options' | 'background' | 'notify' | 'onboarding';
export type DiagLevel = 'info' | 'error';

export interface DiagEntry {
  at: string;
  context: DiagContext;
  level: DiagLevel;
  message: string;
}

const KEY = '_diagnostics';
const MAX_ENTRIES = 120;
const MAX_MESSAGE = 300;
/** v1.1.21: one-week retention — entries expire and self-delete. */
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Accept only well-formed entries; stored data is untrusted input. */
function sanitizeEntries(raw: unknown): DiagEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is DiagEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as DiagEntry).at === 'string' &&
      typeof (entry as DiagEntry).context === 'string' &&
      typeof (entry as DiagEntry).level === 'string' &&
      typeof (entry as DiagEntry).message === 'string',
  );
}

/** Drop entries whose timestamp is missing, unparsable, or older than 7 days. */
function pruneByAge(entries: DiagEntry[], now = Date.now()): DiagEntry[] {
  return entries.filter((entry) => {
    const at = Date.parse(entry.at);
    return Number.isFinite(at) && now - at <= MAX_AGE_MS;
  });
}

/**
 * Append one entry to the ring buffer (never throws).
 *
 * v1.1.6: writes are SERIALIZED through a promise chain. The install event
 * demonstrated the race: onInstalled's marker, the notification-readiness
 * record and the boot "installed (…) vX" line all fired concurrently, each
 * doing get → push → set, so a later get could miss an earlier set and the
 * entry was lost. Queuing the read-modify-write guarantees nothing is
 * dropped within a context.
 */
let writeQueue: Promise<void> = Promise.resolve();

export function recordDiag(
  context: DiagContext,
  level: DiagLevel,
  message: unknown,
): Promise<void> {
  const text = String(message).slice(0, MAX_MESSAGE);
  writeQueue = writeQueue
    .then(async () => {
      try {
        const stored = (await browser.storage.local.get(KEY))[KEY];
        const entries = pruneByAge(sanitizeEntries(stored));
        entries.push({ at: new Date().toISOString(), context, level, message: text });
        await browser.storage.local.set({ [KEY]: entries.slice(-MAX_ENTRIES) });
      } catch (error) {
        log.warn(context, `diagnostics persist failed: ${String(error)}`);
      }
    })
    .catch(() => {
      /* never propagate — diagnostics must not break the caller */
    });
  return writeQueue;
}

/** Read the buffer (never throws; returns [] on any failure).
 *  Expired entries are filtered out of the result — the UI never shows
 *  anything older than the retention window. */
export async function readDiagnostics(): Promise<DiagEntry[]> {
  try {
    const stored = (await browser.storage.local.get(KEY))[KEY];
    return pruneByAge(sanitizeEntries(stored));
  } catch {
    return [];
  }
}

/**
 * v1.1.21: one cheap sweep (single get) that deletes expired entries from
 * storage so the buffer shrinks even when no new events are being written.
 * Writes back ONLY when something actually expired — a quiet week costs
 * one storage read, nothing more. Called on background boot and on the
 * integrity alarm; safe to call from anywhere, never throws.
 */
export async function pruneDiagnostics(): Promise<void> {
  try {
    const stored = (await browser.storage.local.get(KEY))[KEY];
    const sanitized = sanitizeEntries(stored);
    const entries = pruneByAge(sanitized);
    if (entries.length !== sanitized.length) {
      await browser.storage.local.set({ [KEY]: entries.slice(-MAX_ENTRIES) });
    }
  } catch (error) {
    log.warn('background', `diagnostics prune failed: ${String(error)}`);
  }
}

/** Clear the buffer (never throws). */
export async function clearDiagnostics(): Promise<void> {
  try {
    await browser.storage.local.remove(KEY);
  } catch (error) {
    log.warn('options', `diagnostics clear failed: ${String(error)}`);
  }
}
