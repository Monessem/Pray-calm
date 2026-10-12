/**
 * Nearest-city lookup — Tcalm Firefox Extension.
 *
 * Gives the browser-geolocation result a friendly label entirely offline,
 * by matching coordinates against Tcalm's bundled city database.
 */
import type { CityPreset } from './types.ts';
import { COUNTRY_PRESETS } from './presets.ts';

export interface NearestCity {
  city: CityPreset;
  countryEn: string;
  countryAr: string;
  countryMethod: number;
  timezone: string;
  distanceKm: number;
}

/** Great-circle distance in km (haversine). */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Find the nearest preset city within `maxKm` (default 300 km). */
export function findNearestCity(
  latitude: number,
  longitude: number,
  maxKm = 300,
): NearestCity | null {
  let best: NearestCity | null = null;
  for (const country of COUNTRY_PRESETS) {
    for (const city of country.cities) {
      const d = distanceKm(latitude, longitude, city.lat, city.lng);
      if (d <= maxKm && (best === null || d < best.distanceKm)) {
        best = {
          city,
          countryEn: country.en,
          countryAr: country.ar,
          countryMethod: country.method,
          // v1.1.21: a city in a multi-timezone country carries its own
          // zone; otherwise fall back to the country default.
          timezone: city.tz ?? country.timezone,
          distanceKm: d,
        };
      }
    }
  }
  return best;
}
