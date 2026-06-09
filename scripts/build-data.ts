/**
 * build-data.ts
 *
 * Fuses three open data sources into the compact, committed datasets the
 * extension ships with:
 *   1. GeoNames cities15000  -> real cities (name, admin1 code, lat/lng, tz)
 *   2. GeoNames allCountries (postal) -> real postal codes per place/region
 *   3. GeoNames admin1CodesASCII -> human region names for admin1 codes
 *   4. GeoNames countryInfo  -> calling code, postal format/regex, languages
 *   5. Google chromium-i18n Address Data Service -> per-country address LAYOUT
 *      (field order + required fields), region/zip label types.
 *
 * Output (committed):
 *   src/data/countries.json          (index + per-country format rules)
 *   public/data/cities/<CC>.json     (lazy-loaded real city/region/postal rows)
 *
 * Raw sources are cached under .cache/ so re-runs are offline-friendly.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const ROOT = join(import.meta.dirname, "..");
const CACHE = join(ROOT, ".cache");
const OUT_COUNTRIES = join(ROOT, "src", "data", "countries.json");
const OUT_CITIES_DIR = join(ROOT, "public", "data", "cities");

const MAX_CITIES_PER_COUNTRY = 200;

const SOURCES: Record<string, string> = {
  "cities15000.zip": "https://download.geonames.org/export/dump/cities15000.zip",
  "admin1CodesASCII.txt": "https://download.geonames.org/export/dump/admin1CodesASCII.txt",
  "countryInfo.txt": "https://download.geonames.org/export/dump/countryInfo.txt",
  "allCountriesZip.zip": "https://download.geonames.org/export/zip/allCountries.zip",
};

function ensureCache(): void {
  mkdirSync(CACHE, { recursive: true });
  // Allow seeding from a pre-downloaded dir (used in CI / first build).
  const seed = process.env.GEODATA_DIR;
  if (seed && existsSync(seed)) {
    for (const f of readdirSync(seed)) {
      const dest = join(CACHE, f);
      if (!existsSync(dest)) copyFileSync(join(seed, f), dest);
    }
  }
  for (const [file, url] of Object.entries(SOURCES)) {
    const dest = join(CACHE, file);
    if (!existsSync(dest)) {
      console.log(`downloading ${file} ...`);
      execSync(`curl -sL -o "${dest}" "${url}"`, { stdio: "inherit" });
    }
  }
  if (!existsSync(join(CACHE, "cities15000.txt"))) {
    execSync(`unzip -o "${join(CACHE, "cities15000.zip")}" -d "${CACHE}"`, { stdio: "ignore" });
  }
  if (!existsSync(join(CACHE, "allCountries.txt"))) {
    execSync(`unzip -o "${join(CACHE, "allCountriesZip.zip")}" -d "${CACHE}"`, { stdio: "ignore" });
  }
}

interface AddressFormat {
  fmt?: string;
  require?: string;
  zip?: string;
  state_name_type?: string;
  zip_name_type?: string;
  locality_name_type?: string;
  sublocality_name_type?: string;
  sub_keys?: string;
  upper?: string;
  name?: string;
}

async function fetchAddressFormat(cc: string): Promise<AddressFormat | null> {
  const cached = join(CACHE, "address", `${cc}.json`);
  mkdirSync(join(CACHE, "address"), { recursive: true });
  if (existsSync(cached)) {
    try {
      return JSON.parse(readFileSync(cached, "utf8")) as AddressFormat;
    } catch {
      /* refetch */
    }
  }
  try {
    const res = await fetch(`https://chromium-i18n.appspot.com/ssl-address/data/${cc}`);
    if (!res.ok) return null;
    const json = (await res.json()) as AddressFormat;
    writeFileSync(cached, JSON.stringify(json));
    return json;
  } catch {
    return null;
  }
}

interface CityRow {
  city: string;
  region: string;
  regionCode: string;
  postal: string;
  lat: number;
  lng: number;
  tz: string;
}

interface CountryEntry {
  code: string;
  name: string;
  callingCode: string;
  languages: string[];
  fmt: string;
  require: string;
  zipFormat: string;
  zipRegex: string;
  stateNameType: string;
  zipNameType: string;
  localityNameType: string;
  cityCount: number;
}

function parseAdmin1(): Map<string, string> {
  const map = new Map<string, string>();
  const raw = readFileSync(join(CACHE, "admin1CodesASCII.txt"), "utf8");
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const [code, name] = line.split("\t");
    if (code) map.set(code, name);
  }
  return map;
}

interface CountryInfo {
  name: string;
  callingCode: string;
  zipFormat: string;
  zipRegex: string;
  languages: string[];
}

function parseCountryInfo(): Map<string, CountryInfo> {
  const map = new Map<string, CountryInfo>();
  const raw = readFileSync(join(CACHE, "countryInfo.txt"), "utf8");
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const f = line.split("\t");
    const iso = f[0];
    if (!iso) continue;
    map.set(iso, {
      name: f[4] ?? iso,
      callingCode: (f[12] ?? "").trim(),
      zipFormat: (f[13] ?? "").trim(),
      zipRegex: (f[14] ?? "").trim(),
      languages: (f[15] ?? "")
        .split(",")
        .map((l: string) => l.trim())
        .filter(Boolean),
    });
  }
  return map;
}

/** Normalize a place name for fuzzy matching across data sources. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(city|town|cct|district)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Build per-country postal lookups: admin1code -> place -> postal, and a country fallback list. */
function parsePostal(): {
  byCountryAdmin: Map<string, Map<string, string>>; // key: `${cc}|${admin1}` -> place(lowercased) -> postal
  byCountryAdminAny: Map<string, string[]>; // key: `${cc}|${admin1}` -> postals
  byCountry: Map<string, string[]>; // cc -> postals
} {
  const byCountryAdmin = new Map<string, Map<string, string>>();
  const byCountryAdminAny = new Map<string, string[]>();
  const byCountry = new Map<string, string[]>();
  const raw = readFileSync(join(CACHE, "allCountries.txt"), "utf8");
  let count = 0;
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const f = line.split("\t");
    const cc = f[0];
    const postal = f[1];
    const place = norm(f[2] ?? "");
    const admin1 = f[4] ?? "";
    if (!cc || !postal) continue;
    const key = `${cc}|${admin1}`;
    if (!byCountryAdmin.has(key)) byCountryAdmin.set(key, new Map());
    if (place && !byCountryAdmin.get(key)!.has(place)) byCountryAdmin.get(key)!.set(place, postal);
    if (!byCountryAdminAny.has(key)) byCountryAdminAny.set(key, []);
    const arr = byCountryAdminAny.get(key)!;
    if (arr.length < 50) arr.push(postal);
    if (!byCountry.has(cc)) byCountry.set(cc, []);
    const carr = byCountry.get(cc)!;
    if (carr.length < 50) carr.push(postal);
    count++;
  }
  console.log(`parsed ${count} postal rows`);
  return { byCountryAdmin, byCountryAdminAny, byCountry };
}

interface RawCity {
  name: string;
  admin1: string;
  lat: number;
  lng: number;
  population: number;
  tz: string;
  cc: string;
}

function parseCities(): Map<string, RawCity[]> {
  const byCountry = new Map<string, RawCity[]>();
  const raw = readFileSync(join(CACHE, "cities15000.txt"), "utf8");
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const f = line.split("\t");
    const cc = f[8];
    if (!cc) continue;
    const city: RawCity = {
      name: f[1] || f[2] || "",
      admin1: f[10] ?? "",
      lat: Number(f[4]),
      lng: Number(f[5]),
      population: Number(f[14] ?? 0),
      tz: f[17] ?? "",
      cc,
    };
    if (!byCountry.has(cc)) byCountry.set(cc, []);
    byCountry.get(cc)!.push(city);
  }
  return byCountry;
}

async function main(): Promise<void> {
  ensureCache();
  mkdirSync(OUT_CITIES_DIR, { recursive: true });

  console.log("parsing sources...");
  const admin1 = parseAdmin1();
  const info = parseCountryInfo();
  const postal = parsePostal();
  const cities = parseCities();

  const allCodes = new Set<string>([...info.keys()]);
  const countriesIndex: CountryEntry[] = [];

  let processed = 0;
  for (const cc of [...allCodes].sort()) {
    const ci = info.get(cc)!;
    const af = await fetchAddressFormat(cc);

    // Build city rows for this country (population-sorted, capped).
    const rawCities = (cities.get(cc) ?? []).sort((a, b) => b.population - a.population);
    const cityRows: CityRow[] = [];
    const adminAny = postal.byCountryAdminAny;
    const admAll = postal.byCountryAdmin;
    for (const rc of rawCities.slice(0, MAX_CITIES_PER_COUNTRY)) {
      const regionCode = rc.admin1 ? `${cc}.${rc.admin1}` : "";
      const region = admin1.get(regionCode) ?? "";
      const key = `${cc}|${rc.admin1}`;
      let pc = admAll.get(key)?.get(norm(rc.name));
      if (!pc) {
        const any = adminAny.get(key);
        if (any && any.length) pc = any[Math.floor(rc.population) % any.length];
      }
      if (!pc) {
        const cany = postal.byCountry.get(cc);
        if (cany && cany.length) pc = cany[rc.name.length % cany.length];
      }
      cityRows.push({
        city: rc.name,
        region,
        regionCode: rc.admin1,
        postal: pc ?? "",
        lat: Math.round(rc.lat * 1e5) / 1e5,
        lng: Math.round(rc.lng * 1e5) / 1e5,
        tz: rc.tz,
      });
    }

    if (cityRows.length) {
      writeFileSync(join(OUT_CITIES_DIR, `${cc}.json`), JSON.stringify(cityRows));
    }

    countriesIndex.push({
      code: cc,
      name: af?.name ?? ci.name,
      callingCode: ci.callingCode,
      languages: ci.languages,
      fmt: af?.fmt ?? "%N%n%O%n%A%n%C%n%S %Z",
      require: af?.require ?? "AC",
      zipFormat: ci.zipFormat,
      zipRegex: ci.zipRegex,
      stateNameType: af?.state_name_type ?? "province",
      zipNameType: af?.zip_name_type ?? "postal",
      localityNameType: af?.locality_name_type ?? "city",
      cityCount: cityRows.length,
    });

    processed++;
    if (processed % 25 === 0) console.log(`processed ${processed}/${allCodes.size} countries`);
  }

  countriesIndex.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(OUT_COUNTRIES, JSON.stringify(countriesIndex, null, 0));
  console.log(`\nWrote ${countriesIndex.length} countries to countries.json`);
  console.log(`Wrote city files for ${countriesIndex.filter((c) => c.cityCount > 0).length} countries`);
  const withCities = countriesIndex.filter((c) => c.cityCount > 0).length;
  console.log(`Coverage: ${withCities}/${countriesIndex.length} countries have real city data`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
