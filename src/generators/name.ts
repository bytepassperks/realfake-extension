import { allFakers, Faker } from "@faker-js/faker";
import type { Gender } from "./types.ts";
import { COUNTRY_TO_FAKER_LOCALE } from "./locale-map.ts";
import { latinize } from "./latin.ts";
import { JP_NAMES, KO_NAMES, type NameCorpus } from "../data/jp-ko-names.ts";

function getFaker(countryCode: string): Faker {
  const locale = COUNTRY_TO_FAKER_LOCALE[countryCode];
  if (locale && locale in allFakers) {
    return (allFakers as Record<string, Faker>)[locale];
  }
  return allFakers.en;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface GeneratedName {
  firstName: string;
  lastName: string;
  fullName: string;
  /** Romanized given/family name, used to derive realistic emails/usernames. */
  latinFirst: string;
  latinLast: string;
}

/**
 * Build a name from a curated native-script ↔ romaji corpus (Japanese,
 * Korean). The displayed name stays in native script while the paired romaji
 * gives authentic email/username handles (e.g. 秀雄 篠原 → "hideo"/"sato").
 */
function fromCorpus(corpus: NameCorpus, gender: Gender): GeneratedName {
  const given = pick(gender === "male" ? corpus.male : corpus.female);
  const family = pick(corpus.surnames);
  return {
    firstName: given.s,
    lastName: family.s,
    fullName: `${given.s} ${family.s}`,
    latinFirst: given.r.toLowerCase(),
    latinLast: family.r.toLowerCase(),
  };
}

export function generateName(countryCode: string, gender: Gender): GeneratedName {
  if (countryCode === "JP") return fromCorpus(JP_NAMES, gender);
  if (countryCode === "KR") return fromCorpus(KO_NAMES, gender);

  const faker = getFaker(countryCode);
  const sex = gender === "male" ? "male" : "female";
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName(sex);
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    latinFirst: latinize(firstName),
    latinLast: latinize(lastName),
  };
}

export function generateCompany(countryCode: string): string {
  return getFaker(countryCode).company.name();
}

export function generateJobTitle(countryCode: string): string {
  return getFaker(countryCode).person.jobTitle();
}
