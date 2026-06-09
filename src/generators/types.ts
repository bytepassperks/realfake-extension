export type Gender = "male" | "female";

export interface CityData {
  city: string;
  region: string;
  regionCode: string;
  postal: string;
  lat: number;
  lng: number;
  tz: string;
}

export interface CountryMeta {
  code: string;
  name: string;
  callingCode: string;
  languages: string[];
  fmt: string;
  require: string;
  zipFormat: string;
  zipRegex: string;
  stateNameType: string;
  zipNameType: string;
  localityNameType: string;
  cityCount: number;
}

export interface Identity {
  firstName: string;
  lastName: string;
  fullName: string;
  gender: Gender;
  email: string;
  phone: string;
  phoneNational: string;
  dateOfBirth: string;
  age: number;
  street: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  region: string;
  postal: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  timezone: string;
  formattedAddress: string;
  nationalId: string;
  creditCard: string;
  creditCardExpiry: string;
  creditCardCVV: string;
  username: string;
  password: string;
  company: string;
  jobTitle: string;
}

export interface GenerateOptions {
  countryCode: string;
  gender?: Gender;
  minAge?: number;
  maxAge?: number;
}
