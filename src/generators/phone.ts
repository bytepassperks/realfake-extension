import {
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

/**
 * Generate a realistic, valid-format phone number for the given country.
 *
 * Strategy: take the example mobile number from libphonenumber, then
 * randomize the subscriber portion (last 4-6 digits) while keeping the
 * prefix (country code + area/operator code) intact.
 */
export function generatePhone(countryCode: string): {
  phone: string;
  phoneNational: string;
} {
  const cc = countryCode as CountryCode;
  const example = getExampleNumber(cc, examples);
  if (!example) {
    const fallback = `+${Math.floor(Math.random() * 9e9 + 1e9)}`;
    return { phone: fallback, phoneNational: fallback };
  }

  const national = example.formatNational();
  // Randomize last 4-6 digit positions to create a plausible but fake number.
  const digitsOnly = national.replace(/\D/g, "");
  const randomizeCount = Math.min(4, Math.max(2, Math.floor(digitsOnly.length / 2)));
  const prefix = digitsOnly.slice(0, digitsOnly.length - randomizeCount);
  let suffix = "";
  for (let i = 0; i < randomizeCount; i++) {
    suffix += Math.floor(Math.random() * 10).toString();
  }
  const newNational = prefix + suffix;
  const parsed = parsePhoneNumberFromString(newNational, cc);
  if (parsed && parsed.isValid()) {
    return {
      phone: parsed.format("E.164"),
      phoneNational: parsed.formatNational(),
    };
  }

  return {
    phone: example.format("E.164"),
    phoneNational: example.formatNational(),
  };
}
