/**
 * Input validation helpers — Tcalm Firefox Extension.
 *
 * Every value that crosses a trust boundary (imported files, message
 * payloads, storage contents) passes through these before use.
 */

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Sanitize a user-entered host name for the media allowlist.
 * Accepts "youtube.com" / "music.youtube.com"; strips scheme/path/query and
 * rejects anything that is not a plain dotted host (no ports, no wildcards,
 * no schemes — those would be meaningless or dangerous as stored data).
 */
export function sanitizeHostname(input: string): string | null {
  let value = String(input ?? '').trim().toLowerCase();
  // Tolerate "https://youtube.com/watch" style input by keeping the host part.
  const schemeMatch = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/.exec(value);
  if (schemeMatch) value = schemeMatch[1]!;
  const slash = value.indexOf('/');
  if (slash >= 0) value = value.slice(0, slash);
  const label = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  if (value.length === 0 || value.length > 253) return null;
  if (value.includes(':')) return null; // no ports
  const parts = value.split('.');
  if (parts.length < 2) return null; // require at least a registrable-looking domain
  for (const part of parts) {
    if (!label.test(part)) return null;
  }
  return value;
}

/**
 * Does a page hostname match an allowlist domain?
 * "music.youtube.com" matches allowlist entry "youtube.com"
 * (suffix rule: equal, or ends with "." + entry).
 */
export function hostMatchesAllowed(allowList: ReadonlyArray<string>, hostname: string): boolean {
  const host = String(hostname ?? '').toLowerCase();
  for (const raw of allowList) {
    const entry = String(raw ?? '').trim().toLowerCase();
    if (entry.length === 0) continue;
    if (host === entry) return true;
    if (host.endsWith(`.${entry}`)) return true;
  }
  return false;
}

/** Integer in range (inclusive). */
export function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
