/**
 * Options page controller — Tcalm Firefox Extension.
 *
 * Renders and edits the typed Settings model. Validation happens in
 * shared/storage/settings.ts (normalizeSettings) before anything is saved;
 * this file only collects input and wires buttons. Saving triggers the
 * background reschedule via the storage.onChanged listener.
 */
import type { Settings } from '../shared/types.ts';
import type { CountryPreset } from '../shared/geo/types.ts';
import { getSettings, saveSettings, clearRuntimeData } from '../shared/storage/storage.ts';
import {
  buildExportPayload,
  normalizeSettings,
  parseImportedSettings,
} from '../shared/storage/settings.ts';
import { CALCULATION_METHODS, DEFAULT_SETTINGS, LIMITS } from '../shared/constants.ts';
import { COUNTRY_PRESETS, WORLD_STATS } from '../shared/geo/presets.ts';
import { findNearestCity } from '../shared/geo/nearest.ts';
import {
  hasIpPermission,
  locateViaIp,
  methodHintForCountry,
  requestIpPermission,
} from '../shared/geo/ip.ts';
import { knownTimezones, resolveTimezone } from '../shared/time/tz.ts';
import { formatClock } from '../shared/time/format.ts';
import { applyDomI18n, methodName, resolveLanguage, t } from '../shared/i18n/i18n.ts';
import { sanitizeHostname } from '../shared/utils/validate.ts';
import { clearDiagnostics, readDiagnostics, recordDiag } from '../shared/utils/diagnostics.ts';
import { log } from '../shared/utils/log.ts';

type MainPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
const MAIN_PRAYERS: MainPrayer[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

/*
 * Hide the static boot warning synchronously, before any await (see
 * src/popup/popup.ts for rationale): a running bundle proves the code
 * started, so the "source folder without built JS" hint no longer applies.
 */
document.getElementById('boot-warning')?.setAttribute('hidden', '');

/* Stamp the real manifest version into the footer badge (see popup.ts). */
try {
  const badge = document.getElementById('version-badge');
  if (badge) badge.textContent = `v${browser.runtime.getManifest().version}`;
} catch {
  /* keep the static HTML text */
}

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
 * v1.0.4: persistent diagnostics (see popup.ts). Uncaught errors in the
 * options page are recorded too, and the Diagnostics card below renders
 * the buffer with a copy-for-support action.
 */
window.addEventListener(
  'error',
  (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target !== (window as unknown as HTMLElement)) {
      const src =
        (target as HTMLScriptElement).src ??
        (target as HTMLLinkElement).href ??
        (target as HTMLImageElement).src ??
        '';
      void recordDiag('options', 'error', `resource failed: ${src || target.nodeName}`);
      return;
    }
    void recordDiag(
      'options',
      'error',
      `${event.message} @ ${(event as ErrorEvent).filename}:${(event as ErrorEvent).lineno}`,
    );
  },
  true,
);
window.addEventListener('unhandledrejection', (event) => {
  void recordDiag('options', 'error', `unhandled rejection: ${String((event as PromiseRejectionEvent).reason)}`);
});

const controls = {
  language: byId<HTMLSelectElement>('language'),
  theme: byId<HTMLSelectElement>('theme'),
  timeFormat: byId<HTMLSelectElement>('time-format'),
  locationAuto: byId<HTMLInputElement>('location-mode-auto'),
  locationManual: byId<HTMLInputElement>('location-mode-manual'),
  autoLocationBox: byId<HTMLElement>('auto-location-box'),
  gpsButton: byId<HTMLButtonElement>('gps-button'),
  gpsStatus: byId<HTMLElement>('gps-status'),
  ipButton: byId<HTMLButtonElement>('ip-button'),
  ipStatus: byId<HTMLElement>('ip-status'),
  country: byId<HTMLSelectElement>('country'),
  city: byId<HTMLSelectElement>('city'),
  worldHint: byId<HTMLElement>('world-hint'),
  latitude: byId<HTMLInputElement>('latitude'),
  longitude: byId<HTMLInputElement>('longitude'),
  coordsStatus: byId<HTMLElement>('coords-status'),
  timezone: byId<HTMLSelectElement>('timezone'),
  method: byId<HTMLSelectElement>('method'),
  asr: byId<HTMLSelectElement>('asr'),
  highlat: byId<HTMLSelectElement>('highlat'),
  hijriOffset: byId<HTMLSelectElement>('hijri-offset'),
  notificationsEnabled: byId<HTMLInputElement>('notifications-enabled'),
  minutesBefore: byId<HTMLInputElement>('minutes-before'),
  soundEnabled: byId<HTMLInputElement>('sound-enabled'),
  /* v1.1.22: the alert-window select became a 3-way iOS segment (radios). */
  alertWindowModes: {
    always: byId<HTMLInputElement>('alert-window-mode-always'),
    auto: byId<HTMLInputElement>('alert-window-mode-auto'),
    never: byId<HTMLInputElement>('alert-window-mode-never'),
  } as Record<Settings['alertWindowMode'], HTMLInputElement>,
  alertWindowSeconds: byId<HTMLInputElement>('alert-window-seconds'),
  prayerToggles: {} as Record<MainPrayer, HTMLInputElement>,
  testNotification: byId<HTMLButtonElement>('test-notification'),
  notifyTestStatus: byId<HTMLElement>('notify-test-status'),
  toastTestStatus: byId<HTMLElement>('toast-test-status'),
  mediaEnabled: byId<HTMLInputElement>('media-enabled'),
  mediaScopeAll: byId<HTMLInputElement>('media-scope-all'),
  mediaScopeAllowlist: byId<HTMLInputElement>('media-scope-allowlist'),
  allowlistBox: byId<HTMLElement>('allowlist-box'),
  newSite: byId<HTMLInputElement>('new-site'),
  addSite: byId<HTMLButtonElement>('add-site'),
  siteList: byId<HTMLElement>('site-list'),
  siteStatus: byId<HTMLElement>('site-status'),
  mediaDuration: byId<HTMLInputElement>('media-duration'),
  permCard: byId<HTMLElement>('perm-card'),
  permissionStatus: byId<HTMLElement>('permission-status'),
  grantPermission: byId<HTMLButtonElement>('grant-permission'),
  openSetup: byId<HTMLButtonElement>('open-setup'),
  testMedia: byId<HTMLButtonElement>('test-media'),
  resumeMedia: byId<HTMLButtonElement>('resume-media'),
  mediaTestStatus: byId<HTMLElement>('media-test-status'),
  recalculate: byId<HTMLButtonElement>('recalculate'),
  clearCache: byId<HTMLButtonElement>('clear-cache'),
  export: byId<HTMLButtonElement>('export'),
  import: byId<HTMLButtonElement>('import'),
  importFile: byId<HTMLInputElement>('import-file'),
  reset: byId<HTMLButtonElement>('reset'),
  toast: byId<HTMLElement>('toast'),
  diagList: byId<HTMLElement>('diag-list'),
  diagCopy: byId<HTMLButtonElement>('diag-copy'),
  diagClear: byId<HTMLButtonElement>('diag-clear'),
};

for (const prayer of MAIN_PRAYERS) {
  controls.prayerToggles[prayer] = byId<HTMLInputElement>(`prayer-${prayer}`);
}

let settings: Settings = DEFAULT_SETTINGS;
let language: 'en' | 'ar' = 'en';
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// --- i18n / theme -----------------------------------------------------------

function uiLanguage(): 'en' | 'ar' {
  try {
    return resolveLanguage(settings.language, browser.i18n.getUILanguage());
  } catch {
    return resolveLanguage(settings.language, 'en');
  }
}

function applyShell(): void {
  const root = document.documentElement;
  root.dataset['theme'] = settings.theme;
  root.lang = language;
  root.dir = language === 'ar' ? 'rtl' : 'ltr';
  applyDomI18n(document, language);
  rebuildCountrySelect();
  rebuildMethodSelect();
  rebuildTimezoneSelect();
  // v1.1.22: the permission card's status is state-dependent (granted /
  // warning), so it is set imperatively rather than via data-i18n — after
  // a LANGUAGE change it must be re-rendered in the new language too.
  void refreshPermissionStatus();
}

// --- Selection builders (no innerHTML anywhere) ------------------------------

function option(label: string, value: string): HTMLOptionElement {
  const opt = document.createElement('option');
  opt.textContent = label;
  opt.value = value;
  return opt;
}

/*
 * v1.1.21: the world database holds 194 countries — a flat <select> is only
 * usable when it is alphabetized in the DISPLAY language (Arabic sort order
 * ≠ English sort order), so the options are re-sorted per locale with
 * Intl.Collator. Built once per applyShell; 194 rows cost < 2 ms.
 */
const countryCollators: Record<'en' | 'ar', Intl.Collator> = {
  en: new Intl.Collator('en', { sensitivity: 'base' }),
  ar: new Intl.Collator('ar', { sensitivity: 'base' }),
};

function sortedCountries(): CountryPreset[] {
  return [...COUNTRY_PRESETS].sort((a, b) =>
    countryCollators[language].compare(a[language], b[language]),
  );
}

function rebuildCountrySelect(): void {
  const current = controls.country.value;
  while (controls.country.firstChild) controls.country.removeChild(controls.country.firstChild);
  controls.country.appendChild(option('—', ''));
  for (const country of sortedCountries()) {
    controls.country.appendChild(option(country[language], country.en));
  }
  controls.country.value = current;
  rebuildCitySelect();
  renderWorldHint();
}

/* "… countries / … cities worldwide" hint under the Country row. */
function renderWorldHint(): void {
  controls.worldHint.textContent = t(language, 'options_worldHint', {
    countries: WORLD_STATS.countries,
    cities: WORLD_STATS.cities,
  });
}

function rebuildCitySelect(): void {
  const countryName = controls.country.value;
  const current = controls.city.value;
  while (controls.city.firstChild) controls.city.removeChild(controls.city.firstChild);
  controls.city.appendChild(option('—', ''));
  const preset = COUNTRY_PRESETS.find((c) => c.en === countryName);
  if (preset) {
    for (const city of preset.cities) {
      controls.city.appendChild(option(city[language], city.en));
    }
  }
  controls.city.value = current;
}

function rebuildMethodSelect(): void {
  const current = controls.method.value;
  while (controls.method.firstChild) controls.method.removeChild(controls.method.firstChild);
  for (const method of CALCULATION_METHODS) {
    controls.method.appendChild(option(methodName(language, method.id), String(method.id)));
  }
  controls.method.value = current;
}

function rebuildTimezoneSelect(): void {
  const current = controls.timezone.value;
  while (controls.timezone.firstChild) controls.timezone.removeChild(controls.timezone.firstChild);
  const auto = option(t(language, 'options_timezone_auto'), 'auto');
  controls.timezone.appendChild(auto);
  for (const tz of knownTimezones()) {
    controls.timezone.appendChild(option(tz, tz));
  }
  controls.timezone.value = current;
}

// --- Rendering ----------------------------------------------------------------

function renderSettings(): void {
  controls.language.value = settings.language;
  controls.theme.value = settings.theme;
  controls.timeFormat.value = settings.timeFormat;
  controls.locationAuto.checked = settings.locationMode === 'auto';
  controls.locationManual.checked = settings.locationMode === 'manual';
  controls.autoLocationBox.hidden = settings.locationMode !== 'auto';

  const matchingCountry =
    COUNTRY_PRESETS.find((c) => c.en === settings!.country)?.en ?? settings.country;
  controls.country.value = matchingCountry;
  rebuildCitySelect();
  const matchingCity = COUNTRY_PRESETS.find((c) => c.en === matchingCountry)?.cities.find(
    (c) => c.en === settings!.city,
  )?.en;
  controls.city.value = matchingCity ?? '';
  controls.latitude.value = String(settings.latitude);
  controls.longitude.value = String(settings.longitude);
  controls.timezone.value = settings.timezone === 'auto' ? 'auto' : resolveTimezone(settings.timezone);
  controls.method.value = String(settings.calculationMethod);
  controls.asr.value = settings.asrMethod;
  controls.highlat.value = settings.highLatitudeRule;
  controls.hijriOffset.value = String(settings.hijriOffset);

  controls.notificationsEnabled.checked = settings.notificationsEnabled;
  controls.minutesBefore.value = String(settings.notificationMinutesBefore);
  controls.soundEnabled.checked = settings.notificationSoundEnabled;
  /* v1.1.22: segment radiogroup — check the current mode (exactly one is
     always checked; normalizeSettings guarantees a valid value). */
  controls.alertWindowModes[settings.alertWindowMode].checked = true;
  controls.alertWindowSeconds.value = String(settings.alertWindowSeconds);
  for (const prayer of MAIN_PRAYERS) {
    controls.prayerToggles[prayer].checked = settings.prayerNotifications[prayer];
  }

  controls.mediaEnabled.checked = settings.mediaPauseEnabled;
  controls.mediaScopeAll.checked = settings.mediaScope === 'all';
  controls.mediaScopeAllowlist.checked = settings.mediaScope === 'allowlist';
  controls.allowlistBox.hidden = settings.mediaScope !== 'allowlist';
  controls.mediaDuration.value = String(settings.mediaPauseDuration);
  renderSiteList();
  void refreshPermissionStatus();
}

function renderSiteList(): void {
  while (controls.siteList.firstChild) controls.siteList.removeChild(controls.siteList.firstChild);
  for (const site of settings.mediaAllowedSites) {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = site;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = t(language, 'options_mediaRemoveSite');
    remove.setAttribute('aria-label', `${t(language, 'options_mediaRemoveSite')} ${site}`);
    remove.addEventListener('click', () => {
      settings = {
        ...settings,
        mediaAllowedSites: settings.mediaAllowedSites.filter((s) => s !== site),
      };
      renderSiteList();
      scheduleSave();
    });
    li.append(label, remove);
    controls.siteList.appendChild(li);
  }
}

// --- Saving --------------------------------------------------------------------

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void save();
  }, 300);
}

async function save(): Promise<void> {
  const lat = Number(controls.latitude.value);
  const lng = Number(controls.longitude.value);
  const validLat = Number.isFinite(lat) && lat >= LIMITS.latMin && lat <= LIMITS.latMax;
  const validLng = Number.isFinite(lng) && lng >= LIMITS.lngMin && lng <= LIMITS.lngMax;
  controls.coordsStatus.hidden = validLat && validLng;
  if (!validLat || !validLng) {
    controls.coordsStatus.textContent = t(language, 'options_invalidCoords');
    return; // do not persist invalid coordinates
  }

  const next: Settings = normalizeSettings({
    ...settings,
    language: controls.language.value as Settings['language'],
    theme: controls.theme.value as Settings['theme'],
    timeFormat: controls.timeFormat.value as Settings['timeFormat'],
    locationMode: controls.locationAuto.checked ? 'auto' : 'manual',
    country: controls.country.value || settings.country,
    city: controls.city.value || settings.city,
    latitude: lat,
    longitude: lng,
    timezone: controls.timezone.value,
    calculationMethod: Number(controls.method.value),
    asrMethod: controls.asr.value as Settings['asrMethod'],
    highLatitudeRule: controls.highlat.value as Settings['highLatitudeRule'],
    hijriOffset: Number(controls.hijriOffset.value),
    notificationsEnabled: controls.notificationsEnabled.checked,
    notificationMinutesBefore: Number(controls.minutesBefore.value),
    notificationSoundEnabled: controls.soundEnabled.checked,
    /* v1.1.22: read the segment radiogroup; fall back to the current value
       if the DOM somehow lost its checked radio (defensive — never fires
       on the shipped page). */
    alertWindowMode: (Object.values(controls.alertWindowModes).find((radio) => radio.checked)?.value ??
      settings.alertWindowMode) as Settings['alertWindowMode'],
    alertWindowSeconds: Number(controls.alertWindowSeconds.value),
    prayerNotifications: {
      fajr: controls.prayerToggles['fajr'].checked,
      dhuhr: controls.prayerToggles['dhuhr'].checked,
      asr: controls.prayerToggles['asr'].checked,
      maghrib: controls.prayerToggles['maghrib'].checked,
      isha: controls.prayerToggles['isha'].checked,
    },
    mediaPauseEnabled: controls.mediaEnabled.checked,
    mediaScope: controls.mediaScopeAll.checked ? 'all' : 'allowlist',
    mediaPauseDuration: Number(controls.mediaDuration.value),
  });

  const languageChanged = next.language !== settings.language;
  settings = next;
  await saveSettings(settings);
  if (languageChanged) {
    language = uiLanguage();
    applyShell();
  }
  document.documentElement.dataset['theme'] = settings.theme;
  showToast(t(language, 'options_saved'));
}

function showToast(message: string): void {
  controls.toast.textContent = message;
  controls.toast.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    controls.toast.hidden = true;
  }, 2200);
}

function setStatus(node: HTMLElement, message: string, kind: '' | 'ok' | 'error'): void {
  node.textContent = message;
  node.className = `status${kind ? ` ${kind}` : ''}`;
}

// --- Location sources -----------------------------------------------------------

function onGps(): void {
  setStatus(controls.gpsStatus, t(language, 'options_gpsWorking'), '');
  if (!navigator.geolocation) {
    setStatus(controls.gpsStatus, t(language, 'options_gpsFailed'), 'error');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      controls.latitude.value = String(lat);
      controls.longitude.value = String(lng);
      const nearest = findNearestCity(lat, lng);
      if (nearest) {
        controls.country.value = nearest.countryEn;
        rebuildCitySelect();
        const cityEn = nearest.city.en;
        controls.city.value = cityEn;
        controls.timezone.value = nearest.timezone;
        setStatus(
          controls.gpsStatus,
          t(language, 'options_gpsSuccess', {
            place: `${language === 'ar' ? nearest.city.ar : nearest.city.en}, ${
              language === 'ar' ? nearest.countryAr : nearest.countryEn
            }`,
          }),
          'ok',
        );
      } else {
        setStatus(controls.gpsStatus, t(language, 'options_gpsSuccess', { place: `${lat}, ${lng}` }), 'ok');
      }
      scheduleSave();
    },
    (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setStatus(controls.gpsStatus, t(language, 'options_gpsDenied'), 'error');
      } else {
        setStatus(controls.gpsStatus, t(language, 'options_gpsFailed'), 'error');
      }
    },
    { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
  );
}

async function onIpLocate(): Promise<void> {
  try {
    if (!(await hasIpPermission())) {
      const granted = await requestIpPermission();
      if (!granted) {
        setStatus(controls.ipStatus, t(language, 'options_ipFailed'), 'error');
        return;
      }
    }
    const location = await locateViaIp();
    controls.latitude.value = String(location.latitude);
    controls.longitude.value = String(location.longitude);
    if (location.city && location.country) {
      controls.country.value = location.country;
      rebuildCitySelect();
      controls.city.value = '';
      settings = { ...settings, city: location.city, country: location.country };
    }
    if (location.timezone !== 'auto') controls.timezone.value = location.timezone;
    const hint = methodHintForCountry(location.country);
    if (hint) controls.method.value = String(hint);
    setStatus(
      controls.ipStatus,
      t(language, 'options_ipSuccess', { place: `${location.city}, ${location.country}` }),
      'ok',
    );
    scheduleSave();
  } catch (error) {
    log.warn('options', `IP locate failed: ${String(error)}`);
    setStatus(controls.ipStatus, t(language, 'options_ipFailed'), 'error');
  }
}

// --- Preset selection behavior ----------------------------------------------------

controls.country.addEventListener('change', () => {
  const preset = COUNTRY_PRESETS.find((c) => c.en === controls.country.value);
  if (!preset) return;
  rebuildCitySelect();
  const hint = methodHintForCountry(preset.en) ?? preset.method;
  controls.method.value = String(hint);
  controls.timezone.value = preset.timezone;
  const capital = preset.cities[0];
  if (capital) {
    controls.city.value = capital.en;
    controls.latitude.value = String(capital.lat);
    controls.longitude.value = String(capital.lng);
  }
  scheduleSave();
});

controls.city.addEventListener('change', () => {
  const preset = COUNTRY_PRESETS.find((c) => c.en === controls.country.value);
  const city = preset?.cities.find((c) => c.en === controls.city.value);
  if (!city) return;
  controls.latitude.value = String(city.lat);
  controls.longitude.value = String(city.lng);
  // v1.1.21: cities in multi-timezone countries (US, Russia, Brazil, …)
  // carry their own zone — apply it so the displayed times match the city.
  if (city.tz) controls.timezone.value = city.tz;
  scheduleSave();
});

// --- Permissions (v1.1.22: status CARD + warning state + setup entry) ----

/* Media pause needs BOTH the optional "scripting" API permission and the
   host origins (all requested together by the grant button). */
async function hasMediaPermission(): Promise<boolean> {
  try {
    return await browser.permissions.contains({
      origins: ['<all_urls>'],
      permissions: ['scripting'],
    });
  } catch {
    return false;
  }
}

/* One attribute write flips the whole card between the amber warning and
   the green confirmation (see .perm-card[data-state] in options.css). */
function setPermCardState(granted: boolean): void {
  controls.permCard.dataset['state'] = granted ? 'granted' : 'denied';
  setStatus(
    controls.permissionStatus,
    t(language, granted ? 'options_mediaGranted' : 'options_mediaNotGranted'),
    granted ? 'ok' : '',
  );
}

async function refreshPermissionStatus(): Promise<void> {
  setPermCardState(await hasMediaPermission());
}

async function onGrantPermission(): Promise<void> {
  try {
    const granted = await browser.permissions.request({
      origins: ['<all_urls>'],
      permissions: ['scripting'],
    });
    await refreshPermissionStatus();
    if (!granted) showToast(t(language, 'options_mediaNotGranted'));
  } catch {
    await refreshPermissionStatus();
  }
}

/* v1.1.22: "Permission setup" reopens the first-install onboarding page —
   the same guided permission flow, available anytime. tabs.create needs
   no extra permission for extension pages. */
controls.openSetup.addEventListener('click', () => {
  void browser.tabs.create({ url: browser.runtime.getURL('onboarding/onboarding.html') });
});

/* v1.1.22: keep the permission card live while this page is open — a
   grant or revoke made in about:addons (or the onboarding tab) reflects
   here immediately. Feature-detected: permission events exist on Firefox
   115+. */
const permissionsEvents = (browser as unknown as {
  permissions?: {
    onAdded?: { addListener: (cb: (perm: unknown) => void) => void };
    onRemoved?: { addListener: (cb: (perm: unknown) => void) => void };
  };
}).permissions;
permissionsEvents?.onAdded?.addListener(() => void refreshPermissionStatus());
permissionsEvents?.onRemoved?.addListener(() => void refreshPermissionStatus());

// --- Media / notification tests -------------------------------------------------------

async function send(message: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  try {
    return (await browser.runtime.sendMessage(message)) as Record<string, unknown> | undefined;
  } catch (error) {
    log.warn('options', `message failed: ${String(error)}`);
    return undefined;
  }
}

/*
 * v1.1.6: verified notification test. The background answers with
 * { ok, shown } — `shown` comes from Firefox's notifications.onShown, i.e.
 * the banner was really painted on screen. The three outcomes map to:
 *   ok + shown=true  -> PASS (notifications working);
 *   ok + shown=false -> created but SUPPRESSED by the OS (banners off /
 *                      Focus-Assist) -> actionable OS guidance;
 *   ok=false         -> creation failed (permission/API) -> the raw error.
 */
async function onTestNotification(): Promise<void> {
  setStatus(controls.notifyTestStatus, t(language, 'options_notifyTesting'), '');
  controls.notifyTestStatus.hidden = false;
  controls.toastTestStatus.hidden = true;
  const result = await send({ type: 'tcalm:test-notification' });
  if (!result) {
    setStatus(controls.notifyTestStatus, t(language, 'options_mediaNoResponse'), 'error');
    return;
  }
  const ok = result['ok'] === true;
  const shown = result['shown'];
  const error = typeof result['error'] === 'string' ? result['error'] : '';

  // v1.1.17: layer 2 — the guaranteed alert-window verdict.
  const toast = result['toast'] as { opened?: boolean; mode?: string; reason?: string } | undefined;
  if (toast) {
    controls.toastTestStatus.hidden = false;
    if (toast['opened'] === true) {
      setStatus(controls.toastTestStatus, t(language, 'options_toastTestOpened'), 'ok');
    } else if (toast['reason'] === 'disabled' || toast['mode'] === 'never') {
      setStatus(controls.toastTestStatus, t(language, 'options_toastTestDisabled'), '');
    } else {
      setStatus(controls.toastTestStatus, t(language, 'options_toastTestFailed'), 'error');
    }
  }

  if (!ok) {
    setStatus(
      controls.notifyTestStatus,
      t(language, 'options_notifyTestFail', { error: error || 'unknown' }),
      'error',
    );
    return;
  }
  if (shown === true) {
    setStatus(controls.notifyTestStatus, t(language, 'options_notifyTestOk'), 'ok');
  } else if (shown === false) {
    setStatus(controls.notifyTestStatus, t(language, 'options_notifyTestSuppressed'), 'error');
  } else {
    setStatus(controls.notifyTestStatus, t(language, 'options_notifyTestUnknown'), '');
  }
}

async function onTestMedia(): Promise<void> {
  // v1.1.22: no permission -> NO test, no background sweep. The warning
  // tells the user exactly what to do first (the owner's order: the test
  // must never answer "no playing media" when the real cause is a missing
  // permission).
  if (!(await hasMediaPermission())) {
    setStatus(controls.mediaTestStatus, t(language, 'options_mediaPermissionMissing'), 'error');
    controls.mediaTestStatus.title = '';
    return;
  }
  setStatus(controls.mediaTestStatus, '…', '');
  const result = await send({ type: 'tcalm:test-media-pause' });
  if (!result) {
    setStatus(controls.mediaTestStatus, t(language, 'options_mediaNoResponse'), 'error');
    return;
  }
  const paused = Number(result['paused'] ?? 0);
  const contexts = Number(result['contexts'] ?? 0);
  const tabs = Number(result['tabs'] ?? 0);
  if (paused + contexts === 0) {
    // v1.1.23: tell "nothing playing" apart from "a player resisted every
    // reach" — the latter is fixable by reloading the tab once.
    const resistant = asStringList(result['resistant']);
    if (resistant.length > 0) {
      setStatus(
        controls.mediaTestStatus,
        t(language, 'options_testResistant', { hosts: resistant.slice(0, 3).join(', ') }),
        'error',
      );
      controls.mediaTestStatus.title = resistant.join('\n');
      return;
    }
    setStatus(
      controls.mediaTestStatus,
      t(language, 'options_testNoMedia', {
        candidates: Number(result['candidates'] ?? 0),
        unreachable: Number(result['unreachable'] ?? 0),
      }),
      '',
    );
    controls.mediaTestStatus.title = '';
    return;
  }

  // v1.0.8: name the tabs where media was paused (title first, hostname as
  // fallback for pages with an empty document.title).
  const titles = asStringList(result['tabTitles']);
  const hosts = asStringList(result['tabHosts']);
  const names: string[] = [];
  for (let i = 0; i < Math.max(titles.length, hosts.length); i += 1) {
    names.push(titles[i] || hosts[i] || `Tab ${i + 1}`);
  }
  const shown = names.slice(0, 3).map((name) => (name.length > 36 ? `${name.slice(0, 35)}…` : name));
  const extra = names.length > shown.length ? ` +${names.length - shown.length}` : '';
  const where = shown.length > 0 ? ` — ${shown.join(', ')}${extra}` : '';
  // v1.1.23: suspended Web Audio contexts join the count.
  const webAudio = contexts > 0 ? t(language, 'options_testWebAudio', { count: contexts }) : '';

  // v1.0.8: the test honors mediaPauseDuration exactly — say which mode ran.
  const resumeAt = Number(result['resumeAt'] ?? 0);
  const mode =
    resumeAt > 0
      ? ` — ${t(language, 'options_testAutoResume', {
          time: formatClock(new Date(resumeAt), settings.timezone, settings.timeFormat, language),
        })}`
      : ` — ${t(language, 'options_testSinglePause')}`;

  setStatus(
    controls.mediaTestStatus,
    `${t(language, 'options_testMedia')}: ${paused}${webAudio} / ${tabs}${where}${mode}`,
    'ok',
  );
  controls.mediaTestStatus.title = names.length > 1 ? names.join('\n') : names[0] ?? '';
}

async function onResumeMedia(): Promise<void> {
  const result = await send({ type: 'tcalm:resume-media' });
  if (!result) {
    setStatus(controls.mediaTestStatus, t(language, 'options_mediaNoResponse'), 'error');
    return;
  }
  const resumed = Number(result['resumed'] ?? 0);
  setStatus(
    controls.mediaTestStatus,
    resumed > 0
      ? t(language, 'options_mediaResumed', { count: resumed })
      : t(language, 'options_mediaNothingToResume'),
    resumed > 0 ? 'ok' : '',
  );
  controls.mediaTestStatus.title = '';
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

// --- Allowlist -----------------------------------------------------------------------

controls.addSite.addEventListener('click', () => {
  const host = sanitizeHostname(controls.newSite.value);
  if (!host) {
    controls.siteStatus.hidden = false;
    controls.siteStatus.textContent = t(language, 'options_mediaInvalidSite');
    return;
  }
  controls.siteStatus.hidden = true;
  if (!settings.mediaAllowedSites.includes(host)) {
    settings = { ...settings, mediaAllowedSites: [...settings.mediaAllowedSites, host] };
    renderSiteList();
    scheduleSave();
  }
  controls.newSite.value = '';
});

controls.newSite.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') controls.addSite.click();
});

// --- Advanced ---------------------------------------------------------------------------

controls.recalculate.addEventListener('click', () => {
  void send({ type: 'tcalm:recalculate' }).then(() => {
    showToast(t(language, 'options_recalculated'));
  });
});

controls.clearCache.addEventListener('click', () => {
  void clearRuntimeData()
    .then(() => send({ type: 'tcalm:recalculate' }))
    .then(() => showToast(t(language, 'options_cacheCleared')));
});

controls.export.addEventListener('click', () => {
  const payload = JSON.stringify(buildExportPayload(settings), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tcalm-settings.json';
  link.click();
  URL.revokeObjectURL(url);
});

controls.import.addEventListener('click', () => controls.importFile.click());

controls.importFile.addEventListener('change', () => {
  const file = controls.importFile.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    const text = String(reader.result ?? '');
    const parsed = parseImportedSettings(text);
    if (!parsed.ok) {
      showToast(t(language, 'options_importInvalid'));
      return;
    }
    settings = parsed.settings;
    renderSettings();
    void saveSettings(settings).then(() => showToast(t(language, 'options_importSuccess')));
  });
  reader.readAsText(file);
  controls.importFile.value = '';
});

controls.reset.addEventListener('click', () => {
  const message = t(language, 'options_resetConfirm');
  if (!window.confirm(message)) return;
  settings = DEFAULT_SETTINGS;
  language = uiLanguage();
  applyShell();
  renderSettings();
  void saveSettings(settings).then(() => showToast(t(language, 'options_resetDone')));
});

// --- Wiring -----------------------------------------------------------------------------

controls.language.addEventListener('change', scheduleSave);
controls.theme.addEventListener('change', () => {
  document.documentElement.dataset['theme'] = controls.theme.value;
  scheduleSave();
});
controls.timeFormat.addEventListener('change', scheduleSave);
for (const radio of [controls.locationAuto, controls.locationManual]) {
  radio.addEventListener('change', () => {
    controls.autoLocationBox.hidden = controls.locationManual.checked;
    scheduleSave();
  });
}
controls.latitude.addEventListener('input', scheduleSave);
controls.longitude.addEventListener('input', scheduleSave);
controls.timezone.addEventListener('change', scheduleSave);
controls.method.addEventListener('change', scheduleSave);
controls.asr.addEventListener('change', scheduleSave);
controls.highlat.addEventListener('change', scheduleSave);
controls.hijriOffset.addEventListener('change', scheduleSave);
controls.notificationsEnabled.addEventListener('change', scheduleSave);
controls.minutesBefore.addEventListener('input', scheduleSave);
controls.soundEnabled.addEventListener('change', scheduleSave);
for (const radio of Object.values(controls.alertWindowModes)) {
  radio.addEventListener('change', scheduleSave);
}
controls.alertWindowSeconds.addEventListener('input', scheduleSave);
for (const prayer of MAIN_PRAYERS) {
  controls.prayerToggles[prayer].addEventListener('change', scheduleSave);
}
controls.testNotification.addEventListener('click', () => void onTestNotification());
controls.mediaEnabled.addEventListener('change', scheduleSave);
controls.mediaScopeAll.addEventListener('change', () => {
  controls.allowlistBox.hidden = !controls.mediaScopeAllowlist.checked;
  scheduleSave();
});
controls.mediaScopeAllowlist.addEventListener('change', () => {
  controls.allowlistBox.hidden = !controls.mediaScopeAllowlist.checked;
  scheduleSave();
});
controls.mediaDuration.addEventListener('input', scheduleSave);
controls.grantPermission.addEventListener('click', () => void onGrantPermission());
controls.testMedia.addEventListener('click', () => void onTestMedia());
controls.resumeMedia.addEventListener('click', () => void onResumeMedia());
controls.gpsButton.addEventListener('click', onGps);
controls.ipButton.addEventListener('click', () => void onIpLocate());

// --- Diagnostics (v1.0.4; v1.1.21: one-week retention + summary) ----------

/** How many entries the card renders — the full week stays copyable. */
const DIAG_RENDER_LIMIT = 60;

/** Render the persistent diagnostics ring buffer (newest last). */
async function renderDiagnostics(): Promise<void> {
  const list = controls.diagList;
  while (list.firstChild) list.removeChild(list.firstChild);
  const entries = await readDiagnostics();
  const summary = document.createElement('li');
  summary.className = 'diag-summary';
  summary.textContent =
    entries.length > 0
      ? t(language, 'diag_summary', {
          shown: Math.min(entries.length, DIAG_RENDER_LIMIT),
          total: entries.length,
        })
      : t(language, 'diag_empty');
  list.appendChild(summary);
  for (const entry of entries.slice(-DIAG_RENDER_LIMIT)) {
    const li = document.createElement('li');
    li.className = entry.level === 'error' ? 'error' : '';
    li.textContent = `${entry.at} [${entry.context}] ${entry.message}`;
    list.appendChild(li);
  }
}

async function onDiagCopy(): Promise<void> {
  const entries = await readDiagnostics();
  const text =
    entries
      .map((e) => `${e.at} [${e.context}] ${e.level}: ${e.message}`)
      .join('\n') || 'no diagnostic entries';
  try {
    await navigator.clipboard.writeText(text);
    showToast(t(language, 'diag_copied'));
  } catch {
    // Clipboard denied: fall back to downloading the log as a file.
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tcalm-diagnostics.txt';
    link.click();
    URL.revokeObjectURL(url);
  }
}

async function onDiagClear(): Promise<void> {
  await clearDiagnostics();
  await renderDiagnostics();
}

controls.diagCopy.addEventListener('click', () => void onDiagCopy());
controls.diagClear.addEventListener('click', () => void onDiagClear());

// --- Bootstrap -----------------------------------------------------------------------------

async function bootstrap(): Promise<void> {
  settings = await getSettings();
  language = uiLanguage();
  applyShell();
  renderSettings();
  await renderDiagnostics();
}

void bootstrap().catch((error) => {
  log.error('options', `bootstrap failed: ${String(error)}`);
  showBootError(error);
  void recordDiag('options', 'error', `bootstrap failed: ${String(error)}`);
});

/*
 * --- v1.1.18: iOS 18 section navigation (presentation only) ----------------
 *
 * The sidebar / mobile pill bar switches which .ios-section is visible.
 * Purely additive: it never touches settings state, saving, or any
 * control above — hidden sections keep their live DOM state, so every
 * control id stays reachable by the controller exactly as before.
 */
function initSectionNav(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.nav-item'));
  if (buttons.length === 0) return;
  const sections = new Map<string, HTMLElement>();
  for (const button of buttons) {
    const target = button.dataset['navTarget'] ?? '';
    const section = target ? document.getElementById(target) : null;
    if (!section) continue;
    sections.set(target, section);
    button.addEventListener('click', () => showSection(target));
  }

  function showSection(id: string): void {
    for (const [key, section] of sections) {
      section.classList.toggle('is-active', key === id);
    }
    for (const button of buttons) {
      const active = (button.dataset['navTarget'] ?? '') === id;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    window.scrollTo(0, 0);
  }

  const preferred =
    document.querySelector('.ios-section.is-active')?.id ?? buttons[0]?.dataset['navTarget'];
  if (preferred) showSection(preferred);
}

initSectionNav();
