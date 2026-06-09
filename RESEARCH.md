# Research: competitors & data sources

## Competitor landscape

### Browser extensions
- **Fake Address Generator** (Chrome, since 2015): claims global coverage and
  one-click generate, but realism is shallow and there's no per-field clipboard
  granularity.
- **Fake Data — form filler**: the most advanced *form filler* (right-click
  insert, custom JS generators, keyboard shortcuts). Real address+city+state+zip
  combos and disposable email/VoIP exist only in paid tiers. It fills forms; it
  is not a copy-button tool.
- **FakerFill**: Faker.js-powered one-click autofill with smart field detection.
  Plausible-but-not-real data, autofill-oriented.
- **fake-location-filled-in** (GitHub): uses OpenStreetMap real addresses and
  smart dropdown matching, but only ~20 countries and autofill-focused.

### Web tools (the realism bar)
- **fakenamegenerator.com** (31 countries): plausible street name + random house
  number, but **real city/state/postal combos** and **valid phone area codes**.
- **fakexy.com** (~40 countries): per-country pages, matched profile + test card.
- **FormFiller web tool** (16 countries): locale-correct formatting, fully local.

### Takeaways that shaped this product
1. **Clipboard-first, per-field copy + regenerate** is an underserved niche —
   most rivals are form-fillers. → primary UX here.
2. **Coverage is shallow** (16–40 countries done well). "All ~250 done
   correctly" is the headline differentiator. → all ISO 3166-1 territories.
3. **"Real fake, not random"** means real city/region/postal combos, valid phone
   formats, and per-country address layouts — only the house number and the
   person are invented. → exactly the strategy implemented.

## Data sources & how they're combined

| Need | Source | Notes |
|---|---|---|
| Address **layout** (field order, required fields, region/zip label types) for all countries | Google **libaddressinput** / chromium-i18n Address Data Service | Backbone for correct per-country formatting |
| Real **city ↔ region ↔ postal ↔ lat/lng** | **GeoNames** `cities15000` + `allCountries` (postal) + `admin1CodesASCII` + `countryInfo` | Makes the address real, not random; postal matched to city by normalized name within the admin region, with in-region and in-country fallbacks |
| **Valid phone numbers** | **libphonenumber-js** `getExampleNumber` + region metadata | Keep country/area code + length, randomize the subscriber digits, re-validate |
| **Locale/gender/script names**, company, job | **@faker-js/faker** (70+ locales) | Country→locale map with `en` fallback |
| National ID / test card | local generators | US SSN uses never-issued 900–999 area; cards are Luhn-valid TEST BINs |
| Optional real street name | OpenStreetMap (Nominatim) | Opt-in only; not implemented as a hard dependency |

### Build pipeline (`scripts/build-data.ts`)
1. Download/cache the GeoNames dumps and fetch each country's chromium-i18n
   address format (cached under `.cache/`).
2. For each of 252 countries, emit:
   - an index row in `src/data/countries.json` (name, calling code, languages,
     `fmt`, `require`, zip format/regex, region/zip label types);
   - up to 200 population-ranked real cities in
     `public/data/cities/<CC>.json`, each with a matched real postal code,
     region name, coordinates and timezone.
3. Result: **252 countries**, **244 with real city data** (the remainder are
   tiny territories with no GeoNames city ≥ 15k population; they still get a
   correctly-*formatted* fallback address and never error).

## Consistency rules enforced
- gender ↔ first name ↔ title (single gendered draw)
- city ↔ region ↔ postal ↔ lat/lng ↔ timezone (one real GeoNames row)
- email / username derived from the generated name
- phone uses the country's real calling code and a valid length

These are covered by the test suite (`tests/generate.test.ts`) across a
continent/script-spanning sample (US, GB, DE, FR, JP, KR, CN, IN, BR, RU, SA,
NG, AU, MX, IT, ES), including libphonenumber validation and Luhn checks.

## Possible future enhancements
- Opt-in OSM real-street layer with caching.
- Code-split faker locales to shrink the popup bundle.
- More country-specific national-ID algorithms (with safe/reserved ranges).
