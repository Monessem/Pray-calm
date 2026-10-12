/**
 * Optional IP-based location — Tcalm Firefox Extension.
 *
 * Faithful port of Tcalm's geo.py IP detection, converted to an explicit
 * opt-in action:
 *  - Only runs when the user clicks "Approximate location via IP".
 *  - Requires the optional host permission https://ipwho.is/* (granted via
 *    a user gesture in the options page). Only the HTTPS endpoint of
 *    Tcalm's second provider is used; the plain-HTTP ip-api.com endpoint
 *    from the original is intentionally NOT ported.
 *  - One GET request; no retry loop, no background polling.
 */
import { COUNTRY_PRESETS } from './presets.ts';

const ENDPOINT = 'https://ipwho.is/';

export interface IpLocationResult {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  timezone: string;
}

/** Whether the optional origin permission has been granted. */
export async function hasIpPermission(): Promise<boolean> {
  try {
    return await browser.permissions.contains({ origins: [`${ENDPOINT}*`] });
  } catch {
    return false;
  }
}

/** Request the optional origin permission (must run in a user gesture). */
export async function requestIpPermission(): Promise<boolean> {
  try {
    return await browser.permissions.request({ origins: [`${ENDPOINT}*`] });
  } catch {
    return false;
  }
}

/**
 * Perform the lookup. Throws on network/parse failure — the caller shows a
 * localized error. Response fields are validated before use.
 */
export async function locateViaIp(): Promise<IpLocationResult> {
  const response = await fetch(ENDPOINT, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) {
    throw new Error(`ipwho.is HTTP ${response.status}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  if (data['success'] !== true) {
    throw new Error('ipwho.is reported failure');
  }
  const latitude = Number(data['latitude']);
  const longitude = Number(data['longitude']);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('ipwho.is returned invalid coordinates');
  }
  const timezoneRaw = data['timezone'];
  const timezone =
    typeof timezoneRaw === 'object' && timezoneRaw !== null
      ? String((timezoneRaw as Record<string, unknown>)['id'] ?? '')
      : String(timezoneRaw ?? '');
  const city = typeof data['city'] === 'string' ? data['city'] : '';
  const country = typeof data['country'] === 'string' ? data['country'] : '';
  return {
    latitude,
    longitude,
    city: city.slice(0, 80),
    country: country.slice(0, 80),
    timezone: /^[A-Za-z_/+\\-]{3,64}$/.test(timezone) ? timezone : 'auto',
  };
}

/**
 * v1.1.21: country name -> suggested method id, derived from the bundled
 * world database (all 194 countries, both English and Arabic names) plus a
 * small alias table for the short forms geo/IP services commonly return
 * ("USA", "UK", "UAE", …). Replaces the old hand-written six-row list.
 */
const NAME_ALIASES: ReadonlyArray<readonly [string, string]> = [
  ['usa', 'united states'],
  ['u.s.a', 'united states'],
  ['u.s.', 'united states'],
  ['america', 'united states'],
  ['uk', 'united kingdom'],
  ['u.k.', 'united kingdom'],
  ['great britain', 'united kingdom'],
  ['uae', 'united arab emirates'],
  ['u.a.e', 'united arab emirates'],
  ['ksa', 'saudi arabia'],
  ['saudi', 'saudi arabia'],
  ['holland', 'netherlands'],
  ['the netherlands', 'netherlands'],
  ['czech republic', 'czechia'],
  ['burma', 'myanmar'],
  ['ivory coast', 'ivory coast'],
  ['cape verde', 'cabo verde'],
  ['swaziland', 'eswatini'],
  ['macedonia', 'north macedonia'],
  ['east timor', 'east timor'],
  ['democratic republic of the congo', 'dr congo'],
  ['congo-kinshasa', 'dr congo'],
  ['palestine state', 'palestine'],
  ['state of palestine', 'palestine'],
  ['north korea', 'north korea'],
];

const METHOD_BY_EN = new Map<string, number>();
const METHOD_BY_AR = new Map<string, number>();
for (const country of COUNTRY_PRESETS) {
  METHOD_BY_EN.set(country.en.toLowerCase(), country.method);
  METHOD_BY_AR.set(country.ar, country.method);
}

/** Country name (English or Arabic) -> Tcalm method hint, or null. */
export function methodHintForCountry(countryName: string): number | null {
  const raw = String(countryName ?? '')
    .trim()
    .toLowerCase();
  if (raw.length === 0) return null;
  const stripped = raw.startsWith('the ') ? raw.slice(4) : raw;
  for (const key of [raw, stripped]) {
    const direct = METHOD_BY_EN.get(key);
    if (direct !== undefined) return direct;
    for (const [alias, canonical] of NAME_ALIASES) {
      if (key === alias) return METHOD_BY_EN.get(canonical) ?? null;
    }
  }
  // Arabic country name (the options page passes localized labels too).
  const byAr = METHOD_BY_AR.get(String(countryName ?? '').trim());
  if (byAr !== undefined) return byAr;
  return null;
}
