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
  const replaced = fmt
    .replace(/%N/g, parts.fullName)
    .replace(/%O/g, "")
    .replace(/%A/g, parts.street)
    .replace(/%C/g, parts.city)
    .replace(/%S/g, parts.region)
    .replace(/%Z/g, parts.postal)
    .replace(/%D/g, "")
    .replace(/%X/g, "")
    .replace(/Z/g, parts.postal); // JP literal 〒Z prefix
  const lines = replaced
    .split("%n")
    .map((l) => l.replace(/\s{2,}/g, " ").replace(/^[ ,]+|[ ,]+$/g, "").trim())
    .filter((l) => l.length > 0);
  lines.push(parts.countryName);
  return lines.join("\n");
}

export function buildAddress(
  meta: CountryMeta,
  city: CityData,
  fullName: string
): {
  street: string;
  city: string;
  region: string;
  postal: string;
  formattedAddress: string;
} {
  const street = generateStreet(meta.code);
  const postal = city.postal || postalFromFormat(meta.zipFormat);
  const region = city.region || "";
  const formattedAddress = formatAddress(meta, {
    fullName,
    street,
    city: city.city,
    region,
    postal,
    countryName: titleCase(meta.name),
  });
  return { street, city: city.city, region, postal, formattedAddress };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
