/** Data shape of the country/city preset database. */
export interface CityPreset {
  en: string;
  ar: string;
  lat: number;
  lng: number;
  /** v1.1.21: the city's own IANA zone when it differs from the country
   * default — required for correct display in multi-timezone countries
   * (United States, Russia, Brazil, Indonesia, …). */
  tz?: string;
}

export interface CountryPreset {
  en: string;
  ar: string;
  /** Tcalm's suggested method for this country (tcalm_core/geo.py parity). */
  method: number;
  timezone: string;
  lat: number;
  lng: number;
  cities: CityPreset[];
}
