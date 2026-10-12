/**
 * Toast alert window page — Tcalm Firefox Extension (v1.1.17).
 *
 * Deliberately dumb: the background controller (shared/notify/toastWindow.ts)
 * prebuilds every display string and passes them as query parameters, so
 * this page only renders, counts down, and closes. It trusts nothing:
 * every parameter is validated/clamped, and a total parameter failure
 * still renders a minimal, closable Tcalm card (never a blank window).
 *
 * Closing is triple-redundant:
 *   1. click anywhere / the × button / Esc → window.close()
 *   2. this page's own setTimeout → window.close()
 *   3. the background's toast-close alarm → browser.windows.remove
 * (allowScriptsToClose: true is set on the window at creation time.)
 */

interface ToastParams {
  kind: string;
  title: string;
  body: string;
  time: string;
  closeLabel: string;
  lang: string;
  theme: string;
  autoSeconds: number;
}

const MAX_TITLE = 120;
const MAX_BODY = 180;
const MAX_TIME = 24;
/** Hard clamp (the settings layer allows 10–60; tolerate drift, never break). */
const AUTO_MIN = 5;
const AUTO_MAX = 120;
const AUTO_DEFAULT = 25;

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value) || value < min || value > max) return fallback;
  return Math.round(value);
}

function cleanText(value: string | null, maxLength: number, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function readParams(): ToastParams {
  const params = new URLSearchParams(window.location.search);
  const lang = params.get('l') === 'ar' ? 'ar' : 'en';
  return {
    kind: params.get('k') ?? 'test',
    title: cleanText(params.get('ti'), MAX_TITLE, 'Tcalm'),
    body: cleanText(params.get('bo'), MAX_BODY, ''),
    time: cleanText(params.get('tm'), MAX_TIME, ''),
    closeLabel: cleanText(params.get('cl'), 24, '×'),
    lang,
    theme: ['light', 'dark', 'system'].includes(params.get('th') ?? '')
      ? (params.get('th') as string)
      : 'system',
    autoSeconds: clampInt(Number(params.get('a')), AUTO_MIN, AUTO_MAX, AUTO_DEFAULT),
  };
}

function render(params: ToastParams): void {
  const root = document.documentElement;
  root.lang = params.lang;
  root.dir = params.lang === 'ar' ? 'rtl' : 'ltr';
  root.dataset['theme'] = params.theme;

  const title = document.getElementById('toast-title');
  if (title) title.textContent = params.title;

  const time = document.getElementById('toast-time');
  if (time) {
    if (params.time) {
      time.textContent = params.time;
      time.removeAttribute('hidden');
    } else {
      time.setAttribute('hidden', '');
    }
  }

  const body = document.getElementById('toast-body');
  if (body) {
    body.textContent = params.body;
    if (!params.body) body.setAttribute('hidden', '');
  }

  const close = document.getElementById('toast-close');
  if (close) {
    close.textContent = '×';
    close.setAttribute('aria-label', params.closeLabel);
    close.setAttribute('title', params.closeLabel);
  }

  const bar = document.getElementById('toast-bar');
  if (bar) {
    bar.style.setProperty('animation-duration', `${params.autoSeconds}s`);
  }
}

function closeNow(): void {
  try {
    window.close();
  } catch {
    // window.close can throw before load completes — the background's
    // toast-close alarm is the independent fallback.
  }
}

function wire(params: ToastParams): void {
  document.addEventListener('click', (event) => {
    // The close button handles itself; any other click dismisses too.
    if ((event.target as HTMLElement)?.id === 'toast-close') return;
    closeNow();
  });
  const close = document.getElementById('toast-close');
  close?.addEventListener('click', closeNow);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closeNow();
    }
  });
  window.setTimeout(closeNow, params.autoSeconds * 1000 + 500);
}

const params = readParams();
render(params);
wire(params);
