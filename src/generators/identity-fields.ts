import { latinize } from "./latin.ts";

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n: number, len: number): string {
  return n.toString().padStart(len, "0");
}

export function generateDOB(minAge = 21, maxAge = 65): { dateOfBirth: string; age: number } {
  const age = randInt(minAge, maxAge);
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  const dateOfBirth = `${year}-${pad(month, 2)}-${pad(day, 2)}`;
  return { dateOfBirth, age };
}

const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "proton.me", "icloud.com"];

export function generateEmail(firstName: string, lastName: string): string {
  let f = latinize(firstName);
  let l = latinize(lastName);
  // If a name romanizes to nothing (e.g. unusual glyphs), keep the email
  // name-derived by reusing whichever part survived rather than a placeholder.
  if (!f && !l) {
    f = "user";
    l = `${randInt(1000, 99999)}`;
  } else if (!f) {
    f = l;
  } else if (!l) {
    l = f;
  }
  const domain = EMAIL_DOMAINS[randInt(0, EMAIL_DOMAINS.length - 1)];
  const patterns = [
    `${f}.${l}`,
    `${f}${l}`,
    `${f}.${l}${randInt(1, 99)}`,
    `${f}${randInt(10, 9999)}`,
    `${f.charAt(0)}${l}`,
  ];
  return `${patterns[randInt(0, patterns.length - 1)]}@${domain}`;
}

export function generateUsername(firstName: string, lastName: string): string {
  let f = latinize(firstName);
  let l = latinize(lastName);
  if (!f && !l) {
    f = "user";
    l = `${randInt(1000, 99999)}`;
  } else if (!f) {
    f = l;
  } else if (!l) {
    l = f;
  }
  return `${f}_${l}${randInt(1, 999)}`;
}

export function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => set[randInt(0, set.length - 1)];
  let pw = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 8; i++) pw += pick(all);
  return pw
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * National-ID-style number.
 *
 * SAFETY: For the US we deliberately use the 900-999 area range, which the
 * SSA has *never* issued as an SSN (it is reserved for ITINs), guaranteeing
 * the value is format-shaped but cannot be a real person's SSN. For other
 * countries we emit a generic format-valid numeric string of a plausible
 * length — never validated against any real registry.
 */
export function generateNationalId(countryCode: string): string {
  if (countryCode === "US") {
    return `${randInt(900, 999)}-${pad(randInt(10, 99), 2)}-${pad(randInt(1, 9999), 4)}`;
  }
  if (countryCode === "GB") {
    const letters = "ABCEGHJKLMNPRSTWXYZ";
    const l = () => letters[randInt(0, letters.length - 1)];
    return `${l()}${l()} ${pad(randInt(0, 99), 2)} ${pad(randInt(0, 99), 2)} ${pad(
      randInt(0, 99),
      2
    )} ${"ABCD"[randInt(0, 3)]}`;
  }
  const len = randInt(9, 11);
  let id = "";
  for (let i = 0; i < len; i++) id += randInt(0, 9).toString();
  return id;
}

/** Luhn check digit for a numeric string (without the check digit). */
function luhnCheckDigit(num: string): number {
  let sum = 0;
  let dbl = true;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Luhn-valid TEST credit-card number.
 *
 * SAFETY: Built from the standard public test BINs published by payment
 * processors (e.g. Visa 4242…, Mastercard 5555…) and labelled as TEST in the
 * UI. These are not real, issued cards.
 */
export function generateCreditCard(): { number: string; expiry: string; cvv: string } {
  const testPrefixes = ["4242424242", "4000000000", "5555555555", "5105105105", "378282246"];
  const prefix = testPrefixes[randInt(0, testPrefixes.length - 1)];
  const isAmex = prefix.startsWith("37");
  const targetLen = isAmex ? 15 : 16;
  let body = prefix;
  while (body.length < targetLen - 1) body += randInt(0, 9).toString();
  const number = body + luhnCheckDigit(body).toString();
  const grouped = isAmex
    ? `${number.slice(0, 4)} ${number.slice(4, 10)} ${number.slice(10)}`
    : number.replace(/(.{4})/g, "$1 ").trim();
  const now = new Date();
  const expMonth = pad(randInt(1, 12), 2);
  const expYear = (now.getFullYear() + randInt(1, 5)).toString().slice(2);
  const cvv = isAmex ? pad(randInt(0, 9999), 4) : pad(randInt(0, 999), 3);
  return { number: grouped, expiry: `${expMonth}/${expYear}`, cvv };
}
