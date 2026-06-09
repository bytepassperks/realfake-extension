# RealFake — Realistic Fake Identities for Every Country

A privacy-first **Chrome (Manifest V3)** extension that generates *realistic but
entirely fictional* personal data — names, postal addresses, phone numbers,
emails, dates of birth, national-ID-style numbers and test credit cards — for
**every country in the world (252 ISO 3166-1 territories)**.

Every field has a **one-click copy** button, plus **Copy all** and a prominent
**Change identity** button. The defining quality bar is **"real fake, not
random"**: data is locale-correct and internally consistent, not random strings.

![icon](public/icons/icon128.png)

## Why it's different

Most "fake data" extensions are **form-fillers**, and the good ones only cover
16–40 countries well. RealFake is **clipboard-first** and covers **all
countries**, with:

- **Correct per-country address formatting** (field order + required fields)
  from Google's libaddressinput address-format data — e.g. Japan puts the
  postcode first, Germany/France put the ZIP before the city, India uses
  PIN + state.
- **Real city ↔ region ↔ postal ↔ lat/lng** combinations from GeoNames — the
  geographic skeleton is real; only the house number and the person are invented.
- **Valid-format phone numbers** via `libphonenumber-js` (real country/area
  code, correct length; validated, then the subscriber digits are randomized).
- **Locale- and gender-correct names** via `@faker-js/faker` (70+ locales,
  incl. non-Latin scripts like Japanese, Korean, Arabic, Cyrillic).
- **Internal consistency**: gender ↔ first name ↔ title; city ↔ region ↔
  postal ↔ timezone ↔ coordinates; email/username derived from the name.

## Safety

Generated identities **do not correspond to real people**:

- **National IDs** use reserved/never-issued ranges where known (US SSNs use the
  900–999 area range, which the SSA has never issued).
- **Credit cards** are **Luhn-valid TEST numbers** built from public processor
  test BINs (e.g. `4242…`) and clearly labelled **TEST**.
- A visible disclaimer states the data is fictional, for testing/privacy only.

## Privacy

- **100% local.** All generation happens in your browser from bundled data.
- **No account, no analytics, no network calls** in the default flow.
- The only optional network permission (`nominatim.openstreetmap.org`) is an
  opt-in real-street enhancement and is **off** unless granted.

## Permissions

| Permission | Why |
|---|---|
| `clipboardWrite` | Copy a field / the full identity to the clipboard |
| `storage` | Remember your country, gender, favorites, recents and theme |
| `activeTab` + `scripting` | The optional "Fill form" button injects values into the current page's form |
| `content_scripts` (`<all_urls>`) | Receives the "Fill form" message to fill fields on the page you choose |
| `optional_host_permissions` (Nominatim) | Opt-in only: fetch a real street name; never required |

## Develop / build

```bash
npm install
npm run build:data   # (optional) regenerate bundled datasets from open sources
npm run test         # vitest — consistency, valid phones, safe ids/cards
npm run lint
npm run typecheck
npm run build        # outputs an unpacked MV3 extension to dist/
```

### Load the unpacked extension

1. `npm run build`
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder.
4. Pin **RealFake** and click the toolbar icon.

## Data & licenses

| Source | Use | License |
|---|---|---|
| [GeoNames](https://www.geonames.org/) | cities, regions, postal codes, coordinates | CC BY 4.0 |
| [Google libaddressinput / chromium-i18n](https://github.com/google/libaddressinput) | per-country address formats | Apache-2.0 |
| [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js) | valid phone formats | MIT |
| [@faker-js/faker](https://github.com/faker-js/faker) | locale names / company / job | MIT |
| OpenStreetMap (optional) | opt-in real street names | ODbL |

If you ship this publicly, keep attribution for GeoNames (CC BY) and
OpenStreetMap (ODbL).

## Architecture

```
src/
  generators/        framework-agnostic, fully unit-tested
    types.ts         Identity / CountryMeta / CityData
    name.ts          locale + gender names (faker)
    phone.ts         valid numbers (libphonenumber-js)
    address.ts       per-country address formatting
    identity-fields.ts  email, DOB, national id, test card, username, password
    index.ts         generate() — one consistent identity
    reroll.ts        per-field regenerate, keeping the rest stable
  data/
    countries.json   252 countries + format rules (committed)
    loader.ts        lazy-loads public/data/cities/<CC>.json
  popup/             React UI (picker, card, copy/reroll, theme)
  content/           "Fill form" autofill content script
  background/        minimal MV3 service worker
public/data/cities/  244 per-country real city datasets (committed)
scripts/build-data.ts  fuses the open sources into the committed datasets
```

See [RESEARCH.md](./RESEARCH.md) for the competitor analysis and data-source
design decisions.
