/**
 * Popup render-test harness builder — Tcalm Firefox Extension.
 *
 * Prepares a REAL browser render test of the built popup:
 *   1. Copies dist/ to /tmp/tcalm-render-test/
 *   2. Generates a genuine schedule cache (today + tomorrow, Cairo,
 *      Egyptian method) with the production engine code
 *   3. Writes popup/popup-test-harness.html — a copy of the real
 *      popup.html with an inline `browser` API mock (seeded storage,
 *      runtime messages) injected BEFORE popup.js
 *
 * The harness is then served over HTTP and loaded in headless Chromium.
 */
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const STAGE = '/tmp/tcalm-render-test';

const { buildSchedulePair } = await import('../src/shared/schedule.ts');
const { DEFAULT_SETTINGS } = await import('../src/shared/constants.ts');
const { STORAGE_KEYS } = await import('../src/shared/constants.ts');

const now = Date.now();
const pair = buildSchedulePair(DEFAULT_SETTINGS, now);

const store = {
  [STORAGE_KEYS.settings]: DEFAULT_SETTINGS,
  [STORAGE_KEYS.schedule]: { today: pair.today, tomorrow: pair.tomorrow },
  [STORAGE_KEYS.firedEvents]: {},
};

console.log(`[harness] schedule for ${pair.today.date} (Cairo, method ${DEFAULT_SETTINGS.calculationMethod})`);
for (const p of pair.today.prayers) {
  console.log(`[harness]   ${p.name.padEnd(8)} ${p.timeStr ?? '—'}`);
}

rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });
cpSync(DIST, STAGE, { recursive: true });

const popupHtml = readFileSync(resolve(STAGE, 'popup/popup.html'), 'utf-8');

const mockScript = `
<script>
/* Test-only mock of the WebExtensions "browser" API. The harness page is a
   plain local HTTP page, so an inline script is allowed here (the shipped
   extension itself keeps its strict CSP — this mock never ships). */
(function () {
  var STORE = ${JSON.stringify(store)};
  var sentMessages = [];
  window.__tcalmSentMessages = sentMessages;
  function respond(msg) {
    if (!msg || typeof msg !== 'object') return undefined;
    return { ok: true };
  }
  window.browser = {
    storage: {
      local: {
        get: function (keys) {
          return Promise.resolve().then(function () {
            var out = {};
            var list = Array.isArray(keys) ? keys : keys == null ? Object.keys(STORE) : [keys];
            for (var i = 0; i < list.length; i++) {
              var k = list[i];
              if (Object.prototype.hasOwnProperty.call(STORE, k)) out[k] = STORE[k];
            }
            return out;
          });
        },
        set: function () { return Promise.resolve(); },
        remove: function () { return Promise.resolve(); },
        clear: function () { return Promise.resolve(); },
      },
    },
    i18n: { getUILanguage: function () { return 'en'; } },
    runtime: {
      sendMessage: function (msg) {
        sentMessages.push(msg);
        return Promise.resolve(respond(msg));
      },
      openOptionsPage: function () { return Promise.resolve(); },
    },
  };
})();
</script>
`;

const harness = popupHtml.replace(
  '<script src="popup.js"></script>',
  `${mockScript}\n  <script src="popup.js"></script>`,
);
if (harness === popupHtml) throw new Error('popup.js script tag not found in popup.html');

writeFileSync(resolve(STAGE, 'popup/popup-test-harness.html'), harness);

/* A second harness WITHOUT popup.js — proves the boot warning stays visible
   when the bundle is missing (the v1.0.0 “blank white popup” failure mode). */
const noJs = popupHtml
  .replace('<script src="popup.js"></script>', '<!-- popup.js intentionally absent -->')
  .replace('<link rel="stylesheet" href="popup.css" />', '<link rel="stylesheet" href="popup.css" />');
writeFileSync(resolve(STAGE, 'popup/popup-test-nojs.html'), noJs);

console.log('[harness] wrote popup/popup-test-harness.html and popup/popup-test-nojs.html');
console.log('[harness] serve with: python3 -m http.server 8931 --directory /tmp/tcalm-render-test');
