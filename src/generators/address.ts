import { allFakers, Faker } from "@faker-js/faker";
import type { CityData, CountryMeta } from "./types.ts";
import { COUNTRY_TO_FAKER_LOCALE } from "./locale-map.ts";

function getFaker(countryCode: string): Faker {
  const locale = COUNTRY_TO_FAKER_LOCALE[countryCode];
  if (locale && locale in allFakers) {
    return (allFakers as Record<string, Faker>)[locale];
  }
  return allFakers.en;
}

/** Generate a postal code matching the country's `#`/`@` format pattern. */
export function postalFromFormat(format: string): string {
  if (!format) return String(Math.floor(10000 + Math.random() * 89999));
  return format.replace(/#/g, () => String(Math.floor(Math.random() * 10))).replace(
    /@/g,
    () => String.fromCharCode(65 + Math.floor(Math.random() * 26))
  );
}

export function generateStreet(countryCode: string): string {
  return getFaker(countryCode).location.streetAddress(false);
}

interface AddressParts {
  fullName: string;
  street: string;
  city: string;
  region: string;
  postal: string;
  countryName: string;
}

/**
 * Render a postal address block following the country's libaddressinput
 * format string. Placeholders: %N name, %O org, %A street, %C city,
 * %S state/region, %Z zip, %D dependent locality, %X sorting code, %n newline.
 */
export function formatAddress(meta: CountryMeta, parts: AddressParts): string {
  const fmt = meta.fmt || "%N%n%A%n%C, %S %Z";
  // Replace each token in a single pass so substituted values (e.g. a surname
  // containing the letter used by another token) are never re-processed.
  const replaced = fmt.replace(/%[NOACSZDX]/g, (token) => {
    switch (token) {
      case "%N":
        return parts.fullName;
      case "%A":
        return parts.street;
      case "%C":
        return parts.city;
      case "%S":
        return parts.region;
      case "%Z":
        return parts.postal;
      default:
        return ""; // %O org, %D dependent locality, %X sorting code
    }
  });
  const lines = replaced
    .split("%n")
    .map((l) => l.replace(/\s{2,}/g, " ").replace(/^[ ,]+|[ ,]+$/g, "").trim())
    .filter((l) => l.length > 0);
  lines.push(parts.countryName);
  return lines.join("\n");
}

/**
 * The country-correct address lines *excluding* the recipient name and the
 * country, in the order they appear on a real envelope for that country.
 * This is what populates the Address line 1/2/3 form fields.
 */
export function addressLines(meta: CountryMeta, parts: Omit<AddressParts, "fullName" | "countryName">): string[] {
  const fmt = meta.fmt || "%A%n%C, %S %Z";
  const replaced = fmt.replace(/%[NOACSZDX]/g, (token) => {
    switch (token) {
      case "%A":
        return parts.street;
      case "%C":
        return parts.city;
      case "%S":
        return parts.region;
      case "%Z":
        return parts.postal;
      default:
        return ""; // drop %N (name), %O, %D, %X
    }
  });
  return replaced
    .split("%n")
    .map((l) => l.replace(/\s{2,}/g, " ").replace(/^[ ,]+|[ ,]+$/g, "").trim())
    .filter((l) => l.length > 0);
}

export function buildAddress(
  meta: CountryMeta,
  city: CityData,
  fullName: string
): {
  street: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  region: string;
  postal: string;
  formattedAddress: string;
} {
  const street = generateStreet(meta.code);
  const postal = city.postal || postalFromFormat(meta.zipFormat);
  const region = city.region || "";
  const parts = { street, city: city.city, region, postal };
  const formattedAddress = formatAddress(meta, {
    ...parts,
    fullName,
    countryName: titleCase(meta.name),
  });
  const lines = addressLines(meta, parts);
  return {
    street,
    addressLine1: lines[0] ?? street,
    addressLine2: lines[1] ?? "",
    addressLine3: lines.slice(2).join(", "),
    city: city.city,
    region,
    postal,
    formattedAddress,
  };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
