import type { CityData, CountryMeta, Identity } from "./types.ts";
import { generateName } from "./name.ts";
import { generatePhone } from "./phone.ts";
import { buildAddress } from "./address.ts";
import {
  generateEmail,
  generateUsername,
  generatePassword,
  generateNationalId,
  generateCreditCard,
} from "./identity-fields.ts";

export type RerollGroup =
  | "name"
  | "email"
  | "phone"
  | "address"
  | "nationalId"
  | "creditCard"
  | "username"
  | "password";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Regenerate a single logical group of an identity while keeping everything
 * else stable and consistent. Address reroll moves to a new real city (which
 * updates region/postal/geo together as one unit).
 */
export function rerollField(
  identity: Identity,
  group: RerollGroup,
  meta: CountryMeta,
  cities: CityData[]
): Identity {
  const next = { ...identity };
  switch (group) {
    case "name": {
      const { firstName, lastName, fullName, title } = generateName(meta.code, identity.gender);
      next.firstName = firstName;
      next.lastName = lastName;
      next.fullName = fullName;
      next.title = title;
      next.email = generateEmail(firstName, lastName);
      next.username = generateUsername(firstName, lastName);
      // Keep the same city; refresh the formatted block with the new name.
      const addr = buildAddress(meta, currentCity(identity, cities), fullName);
      next.formattedAddress = addr.formattedAddress;
      next.street = addr.street;
      break;
    }
    case "email":
      next.email = generateEmail(identity.firstName, identity.lastName);
      break;
    case "phone": {
      const { phone, phoneNational } = generatePhone(meta.code);
      next.phone = phone;
      next.phoneNational = phoneNational;
      break;
    }
    case "address": {
      const city = cities.length ? pick(cities) : currentCity(identity, cities);
      const addr = buildAddress(meta, city, identity.fullName);
      next.street = addr.street;
      next.city = addr.city;
      next.region = addr.region;
      next.postal = addr.postal;
      next.lat = city.lat;
      next.lng = city.lng;
      next.timezone = city.tz;
      next.formattedAddress = addr.formattedAddress;
      break;
    }
    case "nationalId":
      next.nationalId = generateNationalId(meta.code);
      break;
    case "creditCard": {
      const card = generateCreditCard();
      next.creditCard = card.number;
      next.creditCardExpiry = card.expiry;
      next.creditCardCVV = card.cvv;
      break;
    }
    case "username":
      next.username = generateUsername(identity.firstName, identity.lastName);
      break;
    case "password":
      next.password = generatePassword();
      break;
  }
  return next;
}

function currentCity(identity: Identity, cities: CityData[]): CityData {
  return (
    cities.find((c) => c.lat === identity.lat && c.lng === identity.lng) ?? {
      city: identity.city,
      region: identity.region,
      regionCode: "",
      postal: identity.postal,
      lat: identity.lat,
      lng: identity.lng,
      tz: identity.timezone,
    }
  );
}
