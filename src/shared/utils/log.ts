/**
 * Namespaced logger with an in-memory ring buffer — Tcalm Firefox Extension.
 * Replaces Tcalm's log file (~/.config/tcalm/tcalm.log). The ring is kept
 * only for the lifetime of the background page (not persisted, not sent
 * anywhere); it exists purely to aid debugging via the console.
 */
const RING_SIZE = 50;
const ring: string[] = [];

function stamp(): string {
  return new Date().toISOString();
}

function record(level: string, scope: string, message: string): string {
  const line = `${stamp()} [${level}] [${scope}] ${message}`;
  ring.push(line);
  if (ring.length > RING_SIZE) ring.shift();
  return line;
}

export const log = {
  info(scope: string, message: string): void {
    console.info(record('INFO', scope, message));
  },
  warn(scope: string, message: string): void {
    console.warn(record('WARN', scope, message));
  },
  error(scope: string, message: string): void {
    console.error(record('ERROR', scope, message));
  },
  /** Last log lines (for support/debugging). */
  tail(count = RING_SIZE): string[] {
    return ring.slice(-count);
  },
};
