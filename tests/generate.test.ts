import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../src/generators/index.ts";
import { COUNTRIES, getCountry } from "../src/data/loader.ts";
import type { CityData } from "../src/generators/types.ts";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { transliterate } from "transliteration";

const ROOT = join(import.meta.dirname, "..");

function loadCities(cc: string): CityData[] {
  const p = join(ROOT, "public", "data", "cities", `${cc}.json`);
  if (!existsSync(p)) return [];
  return JSON.parse(readFileSync(p, "utf8")) as CityData[];
}

// Representative spread across continents, scripts and address formats.
const SAMPLE = ["US", "GB", "DE", "FR", "JP", "KR", "CN", "IN", "BR", "RU", "SA", "NG", "AU", "MX", "IT", "ES"];

describe("country dataset", () => {
  it("covers all ISO countries with format rules", () => {
    expect(COUNTRIES.length).toBeGreaterThan(240);
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.fmt.length).toBeGreaterThan(0);
    }
  });

  it("has real city data for the sample countries", () => {
    for (const cc of SAMPLE) {
      expect(loadCities(cc).length).toBeGreaterThan(0);
    }
  });
});

describe("generate() consistency", () => {
  for (const cc of SAMPLE) {
    it(`produces a consistent identity for ${cc}`, () => {
      const meta = getCountry(cc)!;
      const cities = loadCities(cc);
      const id = generate(meta, cities, { countryCode: cc });

      // Names & derived fields are present.
      expect(id.firstName.length).toBeGreaterThan(0);
      expect(id.lastName.length).toBeGreaterThan(0);
      expect(id.email).toContain("@");

      // City row is one of the real rows; region/postal/geo come from that row.
      // Match on coordinates since some countries reuse city names across regions.
      const match = cities.find((c) => c.lat === id.lat && c.lng === id.lng);
      expect(match).toBeTruthy();
      expect(id.city).toBe(match!.city);
      expect(id.region).toBe(match!.region);
      expect(id.postal).toBe(match!.postal || id.postal);
      expect(id.timezone).toBe(match!.tz);

      // Country name appears in the formatted block.
      expect(id.formattedAddress.toLowerCase()).toContain(id.country.toLowerCase());

      // The person's name must appear intact (guards against token-substitution
      // bugs corrupting letters inside the name, e.g. a surname containing "Z").
      if (meta.fmt.includes("%N")) expect(id.formattedAddress).toContain(id.fullName);
      // City/postal appear only when the country's format includes those tokens.
      if (meta.fmt.includes("%C")) expect(id.formattedAddress).toContain(id.city);
      if (meta.fmt.includes("%Z") && id.postal) {
        expect(id.formattedAddress).toContain(id.postal);
      }

      // Address line 1 is always present and is the street for most countries.
      expect(id.addressLine1.length).toBeGreaterThan(0);

      // Age within default bounds.
      expect(id.age).toBeGreaterThanOrEqual(21);
      expect(id.age).toBeLessThanOrEqual(65);
    });
  }
});

describe("phone numbers are valid for their region", () => {
  for (const cc of SAMPLE) {
    it(`${cc} phone validates via libphonenumber`, () => {
      const meta = getCountry(cc)!;
      const id = generate(meta, loadCities(cc), { countryCode: cc });
      const parsed = parsePhoneNumberFromString(id.phone, cc as CountryCode);
      expect(parsed).toBeTruthy();
      expect(parsed!.country).toBe(cc);
      expect(parsed!.isValid()).toBe(true);
    });
  }
});

describe("safety: ids and cards are non-real", () => {
  it("US national id uses the never-issued 900-999 SSA area range", () => {
    const meta = getCountry("US")!;
    for (let i = 0; i < 30; i++) {
      const id = generate(meta, loadCities("US"), { countryCode: "US" });
      const area = Number(id.nationalId.split("-")[0]);
      expect(area).toBeGreaterThanOrEqual(900);
    }
  });

  it("credit card numbers are Luhn-valid", () => {
    const meta = getCountry("US")!;
    const id = generate(meta, loadCities("US"), { countryCode: "US" });
    const digits = id.creditCard.replace(/\D/g, "");
    let sum = 0;
    let dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = Number(digits[i]);
      if (dbl) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      dbl = !dbl;
    }
    expect(sum % 10).toBe(0);
  });
});

describe("gender consistency", () => {
  it("respects requested gender", () => {
    const meta = getCountry("US")!;
    const male = generate(meta, loadCities("US"), { countryCode: "US", gender: "male" });
    const female = generate(meta, loadCities("US"), { countryCode: "US", gender: "female" });
    expect(male.gender).toBe("male");
    expect(female.gender).toBe("female");
  });

  it("never includes a title or Jr/Sr suffix in the name", () => {
    const meta = getCountry("US")!;
    for (let i = 0; i < 40; i++) {
      const id = generate(meta, loadCities("US"), { countryCode: "US" });
      expect(id.fullName).not.toMatch(/\b(Mr|Mrs|Ms|Miss|Dr|Jr|Sr|II|III|IV)\b\.?/);
      expect(id.fullName).toBe(`${id.firstName} ${id.lastName}`);
    }
  });
});

describe("email & username are Latin and name-derived for any script", () => {
  // Countries whose names are written in non-Latin scripts.
  const NON_LATIN = ["JP", "CN", "KR", "RU", "SA", "GR", "TH", "IN"];
  const romanize = (s: string) =>
    transliterate(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  for (const cc of NON_LATIN) {
    it(`${cc}: email/username are ASCII latin derived from the romanized name`, () => {
      const meta = getCountry(cc)!;
      const cities = loadCities(cc);
      for (let i = 0; i < 15; i++) {
        const id = generate(meta, cities, { countryCode: cc });
        const local = id.email.split("@")[0];

        // Handles are pure Latin (no leftover native-script characters).
        expect(local).toMatch(/^[a-z0-9.]+$/);
        expect(id.username).toMatch(/^[a-z0-9._]+$/);

        // Not the bare placeholder fallback (the original bug: "username@…").
        expect(local).not.toMatch(/^user[._0-9]/);
        expect(id.username).not.toMatch(/^user_[0-9]/);

        // Must be derived from the romanized first or last name.
        const rf = romanize(id.firstName);
        const rl = romanize(id.lastName);
        expect(rf.length + rl.length).toBeGreaterThan(0);
        const derived =
          (!!rf && (local.includes(rf) || id.username.includes(rf))) ||
          (!!rl && (local.includes(rl) || id.username.includes(rl)));
        expect(derived).toBe(true);
      }
    });
  }
});
