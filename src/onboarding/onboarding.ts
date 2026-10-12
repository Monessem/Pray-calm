/**
 * Onboarding page controller — Tcalm Firefox Extension (v1.1.26).
 *
 * The first-install landing page. Opened automatically by the background
 * page on `runtime.onInstalled` (reason === 'install') and reachable
 * anytime via Settings -> Media pause -> "Permission setup".
 *
 * v1.1.26: the single page became a 3-step wizard —
 *   1. Welcome:  what Tcalm does (times, media pause, privacy) and the
 *      platform palette the media pause reaches;
 *   2. Location: country/city quick-setup so prayer times are RIGHT from
 *      the first minute (defaults to the current settings; saving applies
 *      the country-suggested calculation method and timezone, exactly like
 *      the original Tcalm's country picker);
 *   3. Permissions: request ALL optional permissions in ONE user-gesture
 *      prompt (scripting API + <all_urls> host access + the ipwho.is
 *      origin), reflecting the live state even when the user grants or
 *      revokes from about:addons while this tab is open.
 *
 * Responsibilities (UI only — no business logic): the wizard never
 * computes prayer times or touches tabs; it writes settings through the
 * same normalizeSettings gate as the options page, and the background
 * reacts via its storage.onChanged listener.
 *
 * Security posture: identical to the options page — no remote code, no
 * eval, no innerHTML; every string comes from the bundled i18n catalogs.
 */
import { getSettings, saveSettings } from '../shared/storage/storage.ts';
import { normalizeSettings, settingsEqual } from '../shared/storage/settings.ts';
import { COUNTRY_PRESETS } from '../shared/geo/presets.ts';
import type { CountryPreset } from '../shared/geo/types.ts';
import { applyDomI18n, resolveLanguage, t } from '../shared/i18n/i18n.ts';
import { recordDiag } from '../shared/utils/diagnostics.ts';
import { log } from '../shared/utils/log.ts';

type Language = 'en' | 'ar';

/** Everything the optional grant covers — one prompt, full feature set. */
const OPTIONAL_GRANT = {
  permissions: ['scripting'],
  origins: ['<all_urls>', 'https://ipwho.is/*'],
} as const;

const TOTAL_STEPS = 3;

const el = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing element #${id}`);
  return node;
};

/* Hide the static boot warning synchronously, before any await — a running
   bundle proves the code started (same contract as popup/options). */
document.getElementById('boot-warning')?.setAttribute('hidden', '');

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

/* Uncaught errors are recorded to Diagnostics like on every other page. */
window.addEventListener('error', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && target !== (window as unknown as HTMLElement)) {
    const src =
      (target as HTMLScriptElement).src ??
      (target as HTMLLinkElement).href ??
      (target as HTMLImageElement).src ??
      '';
    void recordDiag('onboarding', 'error', `resource failed: ${src || target.nodeName}`);
    return;
  }
  void recordDiag(
    'onboarding',
    'error',
    `${event.message} @ ${(event as ErrorEvent).filename}:${(event as ErrorEvent).lineno}`,
  );
});
window.addEventListener('unhandledrejection', (event) => {
  void recordDiag('onboarding', 'error', `unhandled rejection: ${String((event as PromiseRejectionEvent).reason)}`);
});

const grantBtn = el('grant-btn') as HTMLButtonElement;
const verdict = el('grant-verdict');
const backBtn = el('onb-back') as HTMLButtonElement;
const continueBtn = el('onb-continue') as HTMLButtonElement;
// Typed handle for showStep; the settings-button listener wiring stays
// BELOW onGrant (the v1.1.22 contract test slices exactly that region).
function requireButton(selector: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (!node) throw new Error(`missing element ${selector}`);
  return node;
}
const settingsBtn = requireButton('#open-settings-btn');
const doneBtn = el('done-btn') as HTMLButtonElement;
const countrySel = el('onb-country') as HTMLSelectElement;
const citySel = el('onb-city') as HTMLSelectElement;
const locationVerdict = el('location-verdict');
const stepSections = [el('onb-step-1'), el('onb-step-2'), el('onb-step-3')];
const stepDots = [el('dot-1'), el('dot-2'), el('dot-3')];

let language: Language = 'en';
let currentStep = 1;
let hasRenderedOnce = false;

/** Current optional-permission state — false when the API is unavailable. */
async function hasOptionalGrant(): Promise<boolean> {
  try {
    return await browser.permissions.contains({
      permissions: [...OPTIONAL_GRANT.permissions],
      origins: [...OPTIONAL_GRANT.origins],
    });
  } catch {
    return false;
  }
}

// --- Step wizard ----------------------------------------------------------------

/**
 * Show one step, hide the others, and move keyboard/screen-reader focus
 * to the step's heading — the standard wizard contract, so focus never
 * lands in a hidden section. Buttons swap per step: 1–2 navigate, 3 is
 * the permission grant + the terminal actions.
 */
function showStep(n: number): void {
  currentStep = Math.min(Math.max(n, 1), TOTAL_STEPS);
  stepSections.forEach((section, index) => {
    section.hidden = index + 1 !== currentStep;
  });
  stepDots.forEach((dot, index) => {
    if (index + 1 === currentStep) {
      dot.setAttribute('aria-current', 'step');
    } else {
      dot.removeAttribute('aria-current');
    }
  });
  backBtn.hidden = currentStep === 1;
  continueBtn.hidden = currentStep === TOTAL_STEPS;
  grantBtn.hidden = currentStep !== TOTAL_STEPS;
  settingsBtn.hidden = currentStep !== TOTAL_STEPS;
  doneBtn.hidden = currentStep !== TOTAL_STEPS;
  const heading = stepSections[currentStep - 1]!.querySelector('h2') as HTMLHeadingElement | null;
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: false });
  }
}

backBtn.addEventListener('click', () => {
  showStep(currentStep - 1);
});

continueBtn.addEventListener('click', () => {
  if (currentStep === 2) {
    void saveLocation();
  }
  showStep(currentStep + 1);
});

// --- Location quick-setup (step 2) ------------------------------------------------

/* 194 countries: a flat <select> is only usable when alphabetized in the
   DISPLAY language (Arabic sort order ≠ English) — same Intl.Collator
   approach as the options page. */
const countryCollators: Record<'en' | 'ar', Intl.Collator> = {
  en: new Intl.Collator('en', { sensitivity: 'base' }),
  ar: new Intl.Collator('ar', { sensitivity: 'base' }),
};

function option(label: string, value: string): HTMLOptionElement {
  const node = document.createElement('option');
  node.textContent = label;
  node.value = value;
  return node;
}

function buildCountrySelect(selected: string): void {
  while (countrySel.firstChild) countrySel.removeChild(countrySel.firstChild);
  const sorted = [...COUNTRY_PRESETS].sort((a, b) =>
    countryCollators[language].compare(a[language], b[language]),
  );
  for (const country of sorted) {
    countrySel.appendChild(option(country[language], country.en));
  }
  countrySel.value = selected;
}

/**
 * Fill the city list for a country. `preferred` is kept when it still
 * exists in that country; otherwise the first city is auto-selected so
 * the whole flow stays a two-click affair (country → Continue).
 */
function buildCitySelect(countryEn: string, preferred: string): void {
  while (citySel.firstChild) citySel.removeChild(citySel.firstChild);
  const preset = COUNTRY_PRESETS.find((c) => c.en === countryEn);
  if (!preset) return;
  for (const city of preset.cities) {
    citySel.appendChild(option(city[language], city.en));
  }
  const hasPreferred = preferred !== '' && preset.cities.some((c) => c.en === preferred);
  citySel.value = hasPreferred ? preferred : (preset.cities[0]?.en ?? '');
}

countrySel.addEventListener('change', () => {
  buildCitySelect(countrySel.value, citySel.value);
});

/**
 * Persist the chosen place through the SAME validation gate as the options
 * page. The country preset contributes its suggested calculation method
 * and the city's timezone — the original Tcalm's behavior — so first-run
 * times are correct without the user ever seeing a "method" dropdown.
 * Identical selections are not re-saved (no pointless reschedule).
 */
async function saveLocation(): Promise<void> {
  const settings = await getSettings();
  const countryEn = countrySel.value;
  const preset = COUNTRY_PRESETS.find((c) => c.en === countryEn) as CountryPreset | undefined;
  if (!preset) return; // no sensible selection — keep current settings
  const cityEn = citySel.value || preset.cities[0]?.en || '';
  const city = preset.cities.find((c) => c.en === cityEn) ?? null;
  const next = normalizeSettings({
    ...settings,
    locationMode: 'manual',
    country: countryEn,
    city: cityEn,
    latitude: city ? city.lat : preset.lat,
    longitude: city ? city.lng : preset.lng,
    timezone: city && city.tz ? city.tz : preset.timezone,
    calculationMethod: preset.method,
  });
  if (settingsEqual(settings, next)) return;
  try {
    await saveSettings(next);
    locationVerdict.hidden = false;
    locationVerdict.className = 'onb-verdict ok';
    locationVerdict.textContent = t(language, 'onboarding_locationSaved');
  } catch (error) {
    log.warn('onboarding', `location save failed: ${String(error)}`);
  }
}

// --- Permission grant (step 3) ----------------------------------------------------

/** Render the grant button + verdict line from the live permission state. */
async function renderState(): Promise<void> {
  const granted = await hasOptionalGrant();
  grantBtn.disabled = granted;
  grantBtn.setAttribute('aria-pressed', granted ? 'true' : 'false');
  if (granted) {
    verdict.hidden = false;
    verdict.className = 'onb-verdict ok';
    verdict.textContent = `${t(language, 'onboarding_grantedTitle')} — ${t(language, 'onboarding_grantedNote')}`;
  } else {
    // Show the revoked note only AFTER a first render implied granted
    // (fresh installs keep the clean state — the button speaks for itself).
    if (hasRenderedOnce) {
      verdict.hidden = false;
      verdict.className = 'onb-verdict warn';
      verdict.textContent = t(language, 'onboarding_revokedNote');
    } else {
      verdict.hidden = true;
    }
  }
  hasRenderedOnce = true;
}

async function applyShell(): Promise<void> {
  const settings = await getSettings();
  const root = document.documentElement;
  root.dataset['theme'] = settings.theme;
  try {
    language = resolveLanguage(settings.language, browser.i18n.getUILanguage());
  } catch {
    language = resolveLanguage(settings.language, 'en');
  }
  root.lang = language;
  root.dir = language === 'ar' ? 'rtl' : 'ltr';
  applyDomI18n(document, language);
  // Location selects start from the CURRENT settings — a reinstall or a
  // re-opened setup page never forgets what was already configured.
  const matchingCountry = COUNTRY_PRESETS.find((c) => c.en === settings.country)?.en ?? settings.country;
  buildCountrySelect(matchingCountry);
  buildCitySelect(matchingCountry, settings.city);
}

async function onGrant(): Promise<void> {
  // Feedback while the native Firefox prompt is on screen.
  grantBtn.disabled = true;
  grantBtn.textContent = t(language, 'onboarding_grantWorking');
  try {
    await browser.permissions.request({
      permissions: [...OPTIONAL_GRANT.permissions],
      origins: [...OPTIONAL_GRANT.origins],
    });
  } catch (error) {
    log.warn('onboarding', `permission request failed: ${String(error)}`);
  } finally {
    // applyDomI18n restores the label, renderState restores the button state.
    applyDomI18n(document, language);
    await renderState();
  }
}

grantBtn.addEventListener('click', () => {
  void onGrant();
});

el('open-settings-btn').addEventListener('click', () => {
  void browser.runtime.openOptionsPage();
});

el('done-btn').addEventListener('click', () => {
  // Close this tab — the extension is fully usable either way.
  try {
    window.close();
  } catch {
    // window.close() may be blocked for non-script-opened tabs; the
    // settings button one row up is the fallback.
  }
});

/* Live updates: if the user grants/revokes from about:addons (or another
   extension page) while this tab is open, the state follows. */
const permissionsEvents = (browser as unknown as {
  permissions?: {
    onAdded?: { addListener: (cb: (perm: unknown) => void) => void };
    onRemoved?: { addListener: (cb: (perm: unknown) => void) => void };
  };
}).permissions;
permissionsEvents?.onAdded?.addListener(() => void renderState());
permissionsEvents?.onRemoved?.addListener(() => void renderState());

async function bootstrap(): Promise<void> {
  await applyShell();
  showStep(1);
  await renderState();
  void recordDiag('onboarding', 'info', 'onboarding page opened');
}

void bootstrap().catch((error) => {
  log.error('onboarding', `bootstrap failed: ${String(error)}`);
  showBootError(error);
  void recordDiag('onboarding', 'error', `bootstrap failed: ${String(error)}`);
});
