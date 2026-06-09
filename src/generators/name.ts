import { allFakers, Faker } from "@faker-js/faker";
import type { Gender } from "./types.ts";
import { COUNTRY_TO_FAKER_LOCALE } from "./locale-map.ts";

function getFaker(countryCode: string): Faker {
  const locale = COUNTRY_TO_FAKER_LOCALE[countryCode];
  if (locale && locale in allFakers) {
    return (allFakers as Record<string, Faker>)[locale];
  }
  return allFakers.en;
}

const TITLES: Record<Gender, string[]> = {
  male: ["Mr.", "Mr."],
  female: ["Ms.", "Mrs.", "Miss"],
};

export function generateName(
  countryCode: string,
  gender: Gender
): { firstName: string; lastName: string; fullName: string; title: string } {
  const faker = getFaker(countryCode);
  const sex = gender === "male" ? "male" : "female";
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName(sex);
  const fullName = `${firstName} ${lastName}`;
  const titles = TITLES[gender];
  const title = titles[Math.floor(Math.random() * titles.length)];
  return { firstName, lastName, fullName, title };
}

export function generateCompany(countryCode: string): string {
  return getFaker(countryCode).company.name();
}

export function generateJobTitle(countryCode: string): string {
  return getFaker(countryCode).person.jobTitle();
}
