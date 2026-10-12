/**
 * Generate src/shared/geo/presets.ts from the world-data region modules.
 *
 * Run after editing any region file:
 *   node scripts/gen-world-presets.mjs
 *
 * Validates every row (unique names, coordinate bounds, IANA tz syntax,
 * known method ids, non-empty Arabic) BEFORE writing, then emits the
 * database in a compact tuple encoding ([en, ar, lat, lng, tz?]) that
 * decodes into the public CountryPreset[] shape at module load.
 * The tuple encoding keeps the bundled options.js roughly half the size
 * of the equivalent object literal.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENA } from './world-data/mena.mjs';
import { AFRICA } from './world-data/africa.mjs';
import { ASIA_SOUTH } from './world-data/asia-south.mjs';
import { ASIA_EAST } from './world-data/asia-east.mjs';
import { EUROPE } from './world-data/europe.mjs';
import { AMERICAS } from './world-data/americas.mjs';
import { OCEANIA } from './world-data/oceania.mjs';

const TARGET = resolve(dirname(fileURLToPath(import.meta.url)), '../src/shared/geo/presets.ts');
const VALID_METHODS = new Set([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
const TZ_RE = /^[A-Za-z]+(\/[A-Za-z0-9_+-]+)+$/;

const REGIONS = [
  ['MENA', MENA],
  ['AFRICA', AFRICA],
  ['ASIA_SOUTH', ASIA_SOUTH],
  ['ASIA_EAST', ASIA_EAST],
  ['EUROPE', EUROPE],
  ['AMERICAS', AMERICAS],
  ['OCEANIA', OCEANIA],
];

const errors = [];
const warnings = [];
const seenCountries = new Set();
const countries = [];

for (const [regionName, rows] of REGIONS) {
  for (const country of rows) {
    const tag = `${regionName}/${country.en}`;
    if (seenCountries.has(country.en)) errors.push(`${tag}: duplicate country en name`);
    seenCountries.add(country.en);
    if (!country.en || !country.ar) errors.push(`${tag}: missing en/ar name`);
    if (!VALID_METHODS.has(country.method)) errors.push(`${tag}: unknown method ${country.method}`);
    if (!TZ_RE.test(country.tz ?? '')) errors.push(`${tag}: bad country tz "${country.tz}"`);
    if (typeof country.lat !== 'number' || Math.abs(country.lat) > 90) errors.push(`${tag}: bad lat`);
    if (typeof country.lng !== 'number' || Math.abs(country.lng) > 180) errors.push(`${tag}: bad lng`);
    if (!Array.isArray(country.cities) || country.cities.length === 0) {
      errors.push(`${tag}: no cities`);
      continue;
    }
    const seenCities = new Set();
    for (const city of country.cities) {
      const [en, ar, lat, lng, tz] = city;
      const ctag = `${tag}/${en}`;
      if (seenCities.has(en)) errors.push(`${ctag}: duplicate city name inside country`);
      seenCities.add(en);
      if (typeof en !== 'string' || typeof ar !== 'string' || ar.length === 0) errors.push(`${ctag}: bad names`);
      if (typeof lat !== 'number' || lat < -90 || lat > 90) errors.push(`${ctag}: bad lat ${lat}`);
      if (typeof lng !== 'number' || lng < -180 || lng > 180) errors.push(`${ctag}: bad lng ${lng}`);
      if (tz !== undefined && !TZ_RE.test(tz)) errors.push(`${ctag}: bad city tz "${tz}"`);
    }
    // Country coords should sit near cities[0] (the default selection).
    const [capEn, , capLat, capLng] = country.cities[0];
    if (Math.abs(capLat - country.lat) > 0.5 || Math.abs(capLng - country.lng) > 0.5) {
      warnings.push(`${tag}: country coords differ from "${capEn}" by >0.5deg`);
    }
    countries.push(country);
  }
}

// Alphabetical order (English) makes the file predictable to maintain;
// the options page re-sorts per display locale anyway.
countries.sort((a, b) => a.en.localeCompare(b.en));

const cityCount = countries.reduce((n, c) => n + c.cities.length, 0);

if (errors.length > 0) {
  console.error('VALIDATION FAILED:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
for (const w of warnings) console.warn(`  warn: ${w}`);

const json = countries.map((c) => [
  c.en,
  c.ar,
  c.method,
  c.tz,
  c.lat,
  c.lng,
  c.cities,
]);

const header = `/**
 * Country & city presets — Tcalm Firefox Extension.
 *
 * World database: ${countries.length} countries, ${cityCount} cities, bilingual
 * (en/ar) names, coordinates, country-suggested calculation method and
 * IANA timezone; cities in multi-timezone countries carry their own zone.
 * Original 16-country/80-city data was carried over from the Tcalm project
 * (tcalm_core/tui.py COUNTRIES_DATA) and preserved verbatim.
 *
 * GENERATED FILE — regenerate with scripts/gen-world-presets.mjs
 * (source data: scripts/world-data/*.mjs), do not edit.
 */
import type { CityPreset, CountryPreset } from './types.ts';

/**
 * Compact storage encoding (about half the bundle size of object literals):
 *   city    = [en, ar, lat, lng, tz?]  (tz only when it differs from the
 *                                    country default)
 *   country = [en, ar, method, tz, lat, lng, cities]
 */
type CityTuple = readonly [string, string, number, number, string?];
type CountryTuple = readonly [
  string,
  string,
  number,
  string,
  number,
  number,
  readonly CityTuple[],
];

const WORLD: readonly CountryTuple[] = ${JSON.stringify(json)};

function decodeCity(t: CityTuple): CityPreset {
  return t[4] === undefined
    ? { en: t[0], ar: t[1], lat: t[2], lng: t[3] }
    : { en: t[0], ar: t[1], lat: t[2], lng: t[3], tz: t[4] };
}

function decodeCountry(t: CountryTuple): CountryPreset {
  return {
    en: t[0],
    ar: t[1],
    method: t[2],
    timezone: t[3],
    lat: t[4],
    lng: t[5],
    cities: t[6].map(decodeCity),
  };
}

/** The decoded world database (alphabetic by English name). */
export const COUNTRY_PRESETS: CountryPreset[] = WORLD.map(decodeCountry);

/** Size of the bundled database — surfaced in the options page hint. */
export const WORLD_STATS: { countries: number; cities: number } = {
  countries: ${countries.length},
  cities: ${cityCount},
};
`;

writeFileSync(TARGET, header);
console.log(`OK: ${TARGET} — ${countries.length} countries, ${cityCount} cities`);
