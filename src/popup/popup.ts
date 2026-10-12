/**
 * Popup UI controller — Tcalm Firefox Extension.
 *
 * View-only code: it reads state (storage + background), renders, and sends
 * intent messages. No business logic lives here — scheduling, notifications
 * and media control belong to the background page.
 *
 * v1.0.5: the next-prayer card follows the next prayer's own theme
 * (gradient + glyph + animation via [data-prayer]), a progress bar fills in
 * sync with the time window between the previous and the next prayer, and
 * the per-second work is limited to the countdown/progress while clock,
 * dates and row statuses refresh once per minute.
 * v1.0.6: displayed times honor the 12/24-hour setting (12h is the default);
 * the hold banner and the version footer are gone — version identity now
 * lives in the options page About card.
 */
import type { DaySchedule, MainPrayerName, NextPrayerInfo, Settings } from '../shared/types.ts';
import { getScheduleCache, getSettings } from '../shared/storage/storage.ts';
import {
  findNextPrayer,
  isScheduleFresh,
  localDateFor,
  prayerEntry,
} from '../shared/schedule.ts';
import { resolveTimezone, zonedTimeToUtc } from '../shared/time/tz.ts';
import {
  countdown,
  countdownLabel,
  formatClock,
  formatDateLabel,
  formatHijriLabel,
  formatTimeForDisplay,
} from '../shared/time/format.ts';
import { applyDomI18n, prayerName, resolveLanguage, t } from '../shared/i18n/i18n.ts';
import { recordDiag } from '../shared/utils/diagnostics.ts';
import { log } from '../shared/utils/log.ts';

type RowKey = MainPrayerName | 'sunrise';

interface Elements {
  statusChip: HTMLElement;
  toggle: HTMLButtonElement;
  openOptions: HTMLButtonElement;
  nextCard: HTMLElement;
  cardIcon: HTMLElement;
  nextName: HTMLElement;
  nextTime: HTMLElement;
  nextCountdown: HTMLElement;
  nextProgress: HTMLElement;
  dateLine: HTMLElement;
  hijriLine: HTMLElement;
  locationLine: HTMLElement;
  nowLine: HTMLElement;
  timetableList: HTMLElement;
}

const el = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing element #${id}`);
  return node;
};

/*
 * Per-prayer glyphs (stroke style, 24-unit grid). Each prayer keeps its own
 * mark in the timetable and as the watermark on the next-prayer card:
 * fajr = sun about to rise, sunrise = risen sun, dhuhr = high sun,
 * asr = slanted afternoon rays, maghrib = setting sun, isha = night moon.
 */
const PRAYER_ICONS: Record<RowKey, readonly string[]> = {
  fajr: ['M3.5 18h17', 'M7.5 18a4.5 4.5 0 0 1 9 0', 'M12 8.6V3.6', 'M9 6.2 12 3.2 15 6.2'],
  sunrise: [
    'M3.5 18h17',
    'M12 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    'M12 9.6V7.2',
    'M7.9 11 6 9.1',
    'M16.1 11 18 9.1',
  ],
  dhuhr: [
    'M12 7.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4',
    'M12 2.5v2.3',
    'M12 19.2v2.3',
    'M2.5 12h2.3',
    'M19.2 12h2.3',
    'M5.3 5.3l1.6 1.6',
    'M17.1 17.1l1.6 1.6',
    'M5.3 18.7l1.6-1.6',
    'M17.1 6.9l1.6-1.6',
  ],
  asr: [
    'M12 7.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4',
    'M5.2 5.2l1.7 1.7',
    'M15.4 15.4l1.7 1.7',
    'M5.2 18.8l1.7-1.7',
    'M15.4 8.6l1.7-1.7',
  ],
  maghrib: ['M3.5 18h17', 'M7.5 18a4.5 4.5 0 0 1 9 0', 'M12 3.4v5.2', 'M9 5.6 12 8.6 15 5.6'],
  isha: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z', 'M19.5 3v4', 'M21.5 5h-4'],
};

/** Build a stroke-style SVG glyph for a prayer (XSS-safe: no innerHTML). */
function prayerIcon(key: RowKey): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const d of PRAYER_ICONS[key]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

/*
 * Hide the static boot warning synchronously, before any await: while this
 * script runs, the popup is definitely not the "code did not start" state.
 * (The box lives in popup.html and is visible by default so that a missing
 * or crashing bundle still yields an actionable message, not a blank popup.)
 */
document.getElementById('boot-warning')?.setAttribute('hidden', '');

/** Re-show the boot warning with an error detail line (never fail silently). */
function showBootError(error: unknown): void {
  const box = document.getElementById('boot-warning');
  if (!box) return;
  const detail = document.getElementById('boot-error-detail');
  if (detail) {
    detail.textContent = `startup error: ${String(error)}`;
    detail.removeAttribute('hidden');
  }
  box.removeAttribute('hidden');
}

/*
 * v1.0.4: persistent diagnostics. The v1.0.0–v1.0.3 support loop ("the
 * popup does not open") was blind — console output cannot be read by most
 * users. Every uncaught error, unhandled rejection and failed resource
 * load in the popup is now persisted to storage.local and shown in the
 * options page Diagnostics card, so a future failure explains itself.
 */
window.addEventListener(
  'error',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target !== (window as unknown as HTMLElement)) {
      // Resource load failure (script / stylesheet / image): error events
      // for these do not bubble but DO reach a capture-phase listener.
      const src =
        (target as HTMLScriptElement).src ??
        (target as HTMLLinkElement).href ??
        (target as HTMLImageElement).src ??
        '';
      void recordDiag('popup', 'error', `resource failed: ${src || target.nodeName}`);
      return;
    }
    void recordDiag(
      'popup',
      'error',
      `${event.message} @ ${(event as ErrorEvent).filename}:${(event as ErrorEvent).lineno}`,
    );
  },
  true,
);
window.addEventListener('unhandledrejection', (event) => {
  void recordDiag('popup', 'error', `unhandled rejection: ${String((event as PromiseRejectionEvent).reason)}`);
});

let bootCompleted = false;
const bootWatchdog = setTimeout(() => {
  if (bootCompleted) return;
  showBootError('startup timeout: the popup did not finish booting');
  void recordDiag('popup', 'error', 'bootstrap watchdog: did not complete within 6s');
}, 6000);

const elements: Elements = {
  statusChip: el('status-chip'),
  toggle: el('toggle-enabled') as HTMLButtonElement,
  openOptions: el('open-options') as HTMLButtonElement,
  nextCard: el('next-card'),
  cardIcon: el('card-icon'),
  nextName: el('next-name'),
  nextTime: el('next-time'),
  nextCountdown: el('next-countdown'),
  nextProgress: el('next-progress'),
  dateLine: el('date-line'),
  hijriLine: el('hijri-line'),
  locationLine: el('location-line'),
  nowLine: el('now-line'),
  timetableList: el('timetable-list'),
};

let settings: Settings | null = null;
let language: 'en' | 'ar' = 'en';
let today: DaySchedule | null = null;
let tomorrow: DaySchedule | null = null;
let next: NextPrayerInfo | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
let lastMinuteKey = -1;

function uiLanguage(): 'en' | 'ar' {
  try {
    return resolveLanguage(settings?.language ?? 'auto', browser.i18n.getUILanguage());
  } catch {
    return resolveLanguage(settings?.language ?? 'auto', 'en');
  }
}

function applyThemeAndDirection(): void {
  const root = document.documentElement;
  root.dataset['theme'] = settings?.theme ?? 'system';
  root.lang = language;
  root.dir = language === 'ar' ? 'rtl' : 'ltr';
}

async function loadState(): Promise<void> {
  settings = await getSettings();
  language = uiLanguage();
  applyThemeAndDirection();
  applyDomI18n(document, language);

  const cache = await getScheduleCache();
  today = cache.today;
  tomorrow = cache.tomorrow;

  const now = Date.now();
  if (!isScheduleFresh(today, settings, now)) {
    // Stale cache (first run, date rollover, settings change): ask the
    // background page — this also wakes it — then re-read.
    try {
      await browser.runtime.sendMessage({ type: 'tcalm:recalculate' });
      const refreshed = await getScheduleCache();
      today = refreshed.today;
      tomorrow = refreshed.tomorrow;
    } catch (error) {
      log.warn('popup', `recalculate failed: ${String(error)}`);
    }
  }
  next = findNextPrayer(Date.now(), [today, tomorrow]);
}

/** Rebuild static rows once per data load. */
function renderTimetable(): void {
  const list = elements.timetableList;
  while (list.firstChild) list.removeChild(list.firstChild);
  if (!today) {
    const li = document.createElement('li');
    li.className = 'prayer-row unavailable';
    li.textContent = t(language, 'status_calculating');
    list.appendChild(li);
    return;
  }

  const rows: Array<{ key: RowKey; secondary: boolean }> = [
    { key: 'fajr', secondary: false },
    { key: 'sunrise', secondary: true },
    { key: 'dhuhr', secondary: false },
    { key: 'asr', secondary: false },
    { key: 'maghrib', secondary: false },
    { key: 'isha', secondary: false },
  ];

  for (const row of rows) {
    const entry = prayerEntry(today, row.key);
    const li = document.createElement('li');
    li.className = `prayer-row${row.secondary ? ' secondary' : ''}`;
    li.dataset['prayer'] = row.key;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'prayer-icon';
    iconSpan.appendChild(prayerIcon(row.key));

    const nameSpan = document.createElement('span');
    nameSpan.className = 'prayer-name';
    nameSpan.textContent = t(language, `prayer_${row.key}`);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'prayer-time';
    timeSpan.textContent =
      entry?.timeStr != null
        ? formatTimeForDisplay(entry.timeStr, settings?.timeFormat ?? '12h', language)
        : '—';

    const statusSpan = document.createElement('span');
    statusSpan.className = 'prayer-status';
    statusSpan.textContent = '';

    li.append(iconSpan, nameSpan, timeSpan, statusSpan);
    list.appendChild(li);
  }
}

/*
 * Card theme sync: the [data-prayer] attribute on the next-card selects the
 * prayer's own gradient + animation, and the watermark glyph follows it.
 * Only touched when the next prayer actually changes (no per-second DOM work).
 */
function updateNextCardTheme(): void {
  const key = next?.name ?? '';
  if (elements.nextCard.dataset['prayer'] === key) return;
  elements.nextCard.dataset['prayer'] = key;
  const holder = elements.cardIcon;
  while (holder.firstChild) holder.removeChild(holder.firstChild);
  if (key !== '') holder.appendChild(prayerIcon(key));
}

/*
 * Progress bar: fills from the PREVIOUS prayer (or local midnight before
 * Fajr) to the NEXT prayer — the card stays visibly in sync with the clock
 * every second. Pure transform update (compositor-only, no layout work).
 */
function updateProgress(nowMs: number): void {
  if (!next || !today || !settings) {
    elements.nextProgress.style.transform = 'scaleX(0)';
    return;
  }
  let startMs: number | null = null;
  for (const entry of today.prayers) {
    if (
      entry.epochMs !== null &&
      entry.epochMs <= nowMs &&
      (startMs === null || entry.epochMs > startMs)
    ) {
      startMs = entry.epochMs;
    }
  }
  if (startMs === null) {
    const tz = resolveTimezone(settings.timezone);
    startMs = zonedTimeToUtc(localDateFor(settings, nowMs), 0, tz);
  }
  const span = next.epochMs - startMs;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (nowMs - startMs) / span)) : 0;
  elements.nextProgress.style.transform = `scaleX(${ratio.toFixed(4)})`;
}

/** Once-per-minute surface: clock, dates, location, chip, row statuses. */
function renderSlowParts(now: Date, tz: string): void {
  if (!settings) return;

  elements.nowLine.textContent = formatClock(
    now,
    tz,
    settings.timeFormat,
    language,
  );
  elements.dateLine.textContent = formatDateLabel(now, language, { timeZone: tz });

  const hijri = formatHijriLabel(now, language, settings.hijriOffset, tz);
  elements.hijriLine.textContent = hijri ?? '';

  const location =
    settings.city || settings.country
      ? [settings.city, settings.country].filter(Boolean).join(', ')
      : t(language, 'popup_locationFallback');
  elements.locationLine.textContent = location;

  // Status chip + switch state: green capsule when running, red when paused.
  const on = settings.enabled;
  elements.statusChip.textContent = t(language, on ? 'popup_enabledLabel' : 'popup_disabledLabel');
  elements.statusChip.classList.toggle('on', on);
  elements.statusChip.classList.toggle('off', !on);
  elements.toggle.setAttribute('aria-checked', String(on));

  // Row statuses.
  if (today) {
    for (const li of Array.from(elements.timetableList.children)) {
      const key = (li as HTMLElement).dataset['prayer'];
      if (!key) continue;
      const entry = prayerEntry(today, key);
      const statusEl = li.querySelector('.prayer-status');
      if (!statusEl) continue;
      li.classList.remove('passed', 'next');
      if (entry === undefined || entry.epochMs === null) {
        statusEl.textContent = '—';
        li.classList.add('unavailable');
        continue;
      }
      const isNext = next !== null && entry.epochMs === next.epochMs;
      if (isNext) {
        li.classList.add('next');
        statusEl.textContent = t(language, 'popup_statusNext');
      } else if (entry.epochMs <= now.getTime()) {
        li.classList.add('passed');
        statusEl.textContent = t(language, 'popup_statusPassed');
      } else {
        statusEl.textContent = '';
      }
    }
  }
}

/**
 * Per-tick refresh. `force` re-renders the once-per-minute surface
 * immediately (after a toggle or a data reload).
 */
function renderTick(force = false): void {
  if (!settings) return;
  const nowMs = Date.now();
  const now = new Date(nowMs);
  const tz = resolveTimezone(settings.timezone);

  // Every second: countdown + theme + synced progress bar.
  next = findNextPrayer(nowMs, [today, tomorrow]);
  if (next) {
    elements.nextName.textContent = prayerName(language, next.name);
    elements.nextTime.textContent = formatTimeForDisplay(
      next.timeStr,
      settings.timeFormat,
      language,
    );
    const parts = countdown(nowMs, next.epochMs);
    elements.nextCountdown.textContent = countdownLabel(parts, language);
  } else {
    elements.nextName.textContent = t(language, 'popup_nextPrayerNone');
    elements.nextTime.textContent = '--:--';
    elements.nextCountdown.textContent = '—';
  }
  updateNextCardTheme();
  updateProgress(nowMs);

  // Once per minute (Intl formatters are comparatively expensive; the
  // displayed values only change at the minute boundary anyway).
  const minuteKey = Math.floor(nowMs / 60_000);
  if (force || minuteKey !== lastMinuteKey) {
    lastMinuteKey = minuteKey;
    renderSlowParts(now, tz);
  }
}

async function onToggle(): Promise<void> {
  if (!settings) return;
  const target = !settings.enabled;
  try {
    const response = (await browser.runtime.sendMessage({
      type: 'tcalm:set-enabled',
      enabled: target,
    })) as { ok?: boolean; enabled?: boolean } | undefined;
    if (response?.ok) {
      settings = { ...settings, enabled: response.enabled === true };
      renderTick(true);
    }
  } catch (error) {
    log.warn('popup', `toggle failed: ${String(error)}`);
  }
}

function onOpenOptions(): void {
  void browser.runtime.openOptionsPage();
}

async function bootstrap(): Promise<void> {
  elements.toggle.addEventListener('click', () => void onToggle());
  elements.openOptions.addEventListener('click', onOpenOptions);

  await loadState();
  renderTimetable();
  renderTick();

  // The current date rolled over (or will) while the popup is open.
  if (settings) {
    const shownDate = today?.date ?? '';
    const nowDate = localDateFor(settings, Date.now());
    if (shownDate && shownDate !== `${nowDate.year}-${String(nowDate.month).padStart(2, '0')}-${String(nowDate.day).padStart(2, '0')}`) {
      await loadState();
      renderTimetable();
      renderTick(true);
    }
  }

  tickTimer = setInterval(() => {
    renderTick();
    // Midnight rollover while open: reload data.
    if (settings && today) {
      const local = localDateFor(settings, Date.now());
      const expected = `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
      if (today.date !== expected) {
        void loadState().then(() => {
          renderTimetable();
          renderTick(true);
        });
      }
    }
  }, 1000);

  bootCompleted = true;
  clearTimeout(bootWatchdog);
}

window.addEventListener('unload', () => {
  if (tickTimer) clearInterval(tickTimer);
});

void bootstrap().catch((error) => {
  log.error('popup', `bootstrap failed: ${String(error)}`);
  showBootError(error);
  void recordDiag('popup', 'error', `bootstrap failed: ${String(error)}`);
});
