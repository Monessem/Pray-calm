/**
 * Recently-audible tab tracker — Tcalm v1.1.24.
 *
 * The pause sweep no longer visits every tab (the v1.1.23 design iterated
 * all tabs sequentially — with 140+ open tabs that took seconds). It now
 * targets only tabs that can plausibly be making noise:
 *
 *   1. tabs.query({ audible: true }) — tabs producing sound RIGHT NOW;
 *   2. this module's cache — tabs that produced sound RECENTLY (last
 *      RECENT_MS), covering track gaps and buffering stalls where a
 *      still-"playing" tab briefly goes non-audible (SoundCloud between
 *      tracks is the canonical case);
 *   3. the active tab of every window (wired in the controller) — the
 *      user is often watching the thing they want paused, and a just
 *      started video is not audible for its first silent seconds.
 *
 * The cache is deliberately IN-MEMORY: it is a best-effort accelerator,
 * not state. The Firefox event page suspends when idle, which simply
 * resets it — the next pause then relies on the live audible query,
 * which is always the source of truth. No storage writes, no privacy
 * surface: tab IDs never reach disk.
 *
 * tabs.onUpdated delivers `audible` transitions without any extra
 * permission (only url/title/favIconUrl are permission-gated in Firefox
 * Tab objects), but the tracker is defensive: if a browser build does
 * not deliver the field, the cache stays empty and the controller still
 * works through the direct query.
 */

/** How long a tab stays "recently audible" after its last sound. */
const RECENT_MS = 3 * 60_000;

/** tabId -> epoch ms of the last observed audible transition. */
const lastAudibleAt = new Map<number, number>();

function prune(now: number): void {
  for (const [tabId, at] of lastAudibleAt) {
    if (now - at > RECENT_MS) lastAudibleAt.delete(tabId);
  }
}

/** Record that a tab is (or was just) producing sound. Idempotent. */
export function markAudible(tabId: number, now: number = Date.now()): void {
  if (!Number.isInteger(tabId) || tabId < 0) return;
  lastAudibleAt.set(tabId, now);
  if (lastAudibleAt.size > 200) prune(now);
}

/** Drop a tab from the cache (tab closed or navigated away). */
export function forgetTab(tabId: number): void {
  lastAudibleAt.delete(tabId);
}

/** Tab IDs that produced sound within the retention window. */
export function recentAudibleTabIds(now: number = Date.now()): number[] {
  prune(now);
  return Array.from(lastAudibleAt.keys());
}

/** Test hook: wipe the cache between unit runs. */
export function resetAudibleCache(): void {
  lastAudibleAt.clear();
}

/**
 * Wire the browser events that keep the cache warm. Call once per
 * event-page load (listeners re-register on every wake; the module-level
 * cache dies with the page, which is by design).
 */
export function attachAudibleTracking(): void {
  try {
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      const audibleNow = changeInfo?.audible === true || tab?.audible === true;
      if (audibleNow) markAudible(tabId);
    });
  } catch {
    // tabs.onUpdated unavailable — the live query still covers the sweep.
  }
  try {
    browser.tabs.onRemoved.addListener((tabId) => {
      forgetTab(tabId);
    });
  } catch {
    // ignore
  }
}
