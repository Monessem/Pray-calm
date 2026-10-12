/**
 * Generate src/shared/geo/presets.ts from the country/city database
 * extracted out of the original Tcalm project (tcalm_core/tui.py).
 *
 * Run once during development:
 *   node scripts/gen-presets.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = '/home/z/my-project/research/countries.json';
const TARGET = '/home/z/my-project/tcalm-firefox/src/shared/geo/presets.ts';

const data = JSON.parse(readFileSync(SOURCE, 'utf-8'));

const header = `/**
 * Country & city presets — Tcalm Firefox Extension.
 *
 * Data faithfully carried over from the original Tcalm project
 * (tcalm_core/tui.py COUNTRIES_DATA): 16 countries, 80 cities, with the
 * default calculation method and timezone per country.
 * GENERATED FILE — regenerate with scripts/gen-presets.mjs, do not edit.
 */
import type { CountryPreset } from './types.ts';

export const COUNTRY_PRESETS: CountryPreset[] = ${JSON.stringify(data, null, 2)};

`;

writeFileSync(TARGET, header);
console.log(`Wrote ${TARGET}: ${data.length} countries, ${data.reduce((n, c) => n + c.cities.length, 0)} cities`);
