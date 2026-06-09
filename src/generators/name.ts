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

export function generateName(
  countryCode: string,
  gender: Gender
): { firstName: string; lastName: string; fullName: string } {
  const faker = getFaker(countryCode);
  const sex = gender === "male" ? "male" : "female";
  const firstName = faker.person.firstName(sex);
  const lastName = faker.person.lastName(sex);
  const fullName = `${firstName} ${lastName}`;
  return { firstName, lastName, fullName };
}

export function generateCompany(countryCode: string): string {
  return getFaker(countryCode).company.name();
}

export function generateJobTitle(countryCode: string): string {
  return getFaker(countryCode).person.jobTitle();
}
