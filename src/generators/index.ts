import type { CityData, CountryMeta, GenerateOptions, Gender, Identity } from "./types.ts";
import { generateName, generateCompany, generateJobTitle } from "./name.ts";
import { generatePhone } from "./phone.ts";
import { buildAddress } from "./address.ts";
import {
  generateDOB,
  generateEmail,
  generateUsername,
  generatePassword,
  generateNationalId,
  generateCreditCard,
} from "./identity-fields.ts";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Generate a single, internally-consistent fake identity.
 *
 * Consistency guarantees:
 *  - gender ↔ first name ↔ title come from the same gendered draw
 *  - city ↔ region ↔ postal ↔ lat/lng ↔ timezone are one real GeoNames row
 *  - email/username are derived from the generated name
 *  - phone uses the country's real calling code + valid number length
 */
export function generate(
  meta: CountryMeta,
  cities: CityData[],
  options: GenerateOptions
): Identity {
  const gender: Gender = options.gender ?? (Math.random() < 0.5 ? "male" : "female");
  const { firstName, lastName, fullName } = generateName(meta.code, gender);

  const city: CityData =
    cities.length > 0
      ? pick(cities)
      : {
          city: "Capital City",
          region: "",
          regionCode: "",
          postal: "",
          lat: 0,
          lng: 0,
          tz: "UTC",
        };

  const address = buildAddress(meta, city, fullName);
  const { phone, phoneNational } = generatePhone(meta.code);
  const { dateOfBirth, age } = generateDOB(options.minAge, options.maxAge);
  const email = generateEmail(firstName, lastName);
  const card = generateCreditCard();

  return {
    firstName,
    lastName,
    fullName,
    gender,
    email,
    phone,
    phoneNational,
    dateOfBirth,
    age,
    street: address.street,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    addressLine3: address.addressLine3,
    city: address.city,
    region: address.region,
    postal: address.postal,
    country: titleCase(meta.name),
    countryCode: meta.code,
    lat: city.lat,
    lng: city.lng,
    timezone: city.tz,
    formattedAddress: address.formattedAddress,
    nationalId: generateNationalId(meta.code),
    creditCard: card.number,
    creditCardExpiry: card.expiry,
    creditCardCVV: card.cvv,
    username: generateUsername(firstName, lastName),
    password: generatePassword(),
    company: generateCompany(meta.code),
    jobTitle: generateJobTitle(meta.code),
  };
}

export type { Identity, CountryMeta, CityData, GenerateOptions, Gender };
