import type { CityData, CountryMeta } from "../generators/types.ts";
import countriesData from "./countries.json";

export const COUNTRIES: CountryMeta[] = countriesData as CountryMeta[];

export function getCountry(code: string): CountryMeta | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

const cityCache = new Map<string, CityData[]>();

/**
 * Lazy-load the real city/region/postal rows for a country.
 * Uses the packaged JSON via chrome.runtime.getURL in the extension; tests
 * inject their own loader, so this only runs in the browser/extension.
 */
export async function loadCities(code: string): Promise<CityData[]> {
  if (cityCache.has(code)) return cityCache.get(code)!;
  try {
    const url =
      typeof chrome !== "undefined" && chrome.runtime?.getURL
        ? chrome.runtime.getURL(`data/cities/${code}.json`)
        : `/data/cities/${code}.json`;
    const res = await fetch(url);
    if (!res.ok) {
      cityCache.set(code, []);
      return [];
    }
    const data = (await res.json()) as CityData[];
    cityCache.set(code, data);
    return data;
  } catch {
    cityCache.set(code, []);
    return [];
  }
}
