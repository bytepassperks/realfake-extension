import type { CountryMeta, Identity } from "../generators/types.ts";
import type { RerollGroup } from "../generators/reroll.ts";

interface Props {
  identity: Identity;
  meta: CountryMeta;
  onCopy: (text: string, label: string) => void;
  onReroll: (group: RerollGroup) => void;
}

interface FieldDef {
  label: string;
  value: string;
  reroll?: RerollGroup;
  multiline?: boolean;
  mono?: boolean;
  badge?: string;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function IdentityCard({ identity, meta, onCopy, onReroll }: Props): JSX.Element {
  const regionLabel = capitalize(meta.stateNameType || "region");
  const zipLabel = capitalize(meta.zipNameType || "postal") + " code";

  const fields: FieldDef[] = [
    { label: "Full name", value: identity.fullName, reroll: "name" },
    { label: "First name", value: identity.firstName, reroll: "name" },
    { label: "Last name", value: identity.lastName, reroll: "name" },
    { label: "Gender", value: capitalize(identity.gender) },
    { label: "Email", value: identity.email, reroll: "email", mono: true },
    { label: "Phone", value: identity.phone, reroll: "phone", mono: true },
    { label: "Address line 1", value: identity.addressLine1, reroll: "address" },
    ...(identity.addressLine2
      ? [{ label: "Address line 2", value: identity.addressLine2 } as FieldDef]
      : []),
    ...(identity.addressLine3
      ? [{ label: "Address line 3", value: identity.addressLine3 } as FieldDef]
      : []),
    { label: "Street", value: identity.street, reroll: "address" },
    { label: "City", value: identity.city },
    ...(identity.region ? [{ label: regionLabel, value: identity.region } as FieldDef] : []),
    ...(identity.postal ? [{ label: zipLabel, value: identity.postal, mono: true } as FieldDef] : []),
    { label: "Country", value: identity.country },
    { label: "Full address", value: identity.formattedAddress, multiline: true },
    { label: "Date of birth", value: `${identity.dateOfBirth} (age ${identity.age})`, mono: true },
    { label: "National ID", value: identity.nationalId, reroll: "nationalId", mono: true, badge: "fake" },
    {
      label: "Credit card",
      value: `${identity.creditCard}  ·  ${identity.creditCardExpiry}  ·  CVV ${identity.creditCardCVV}`,
      reroll: "creditCard",
      mono: true,
      badge: "TEST",
    },
    { label: "Username", value: identity.username, reroll: "username", mono: true },
    { label: "Password", value: identity.password, reroll: "password", mono: true },
    { label: "Company", value: identity.company },
    { label: "Job title", value: identity.jobTitle },
    { label: "Coordinates", value: `${identity.lat}, ${identity.lng}`, mono: true },
    { label: "Timezone", value: identity.timezone, mono: true },
  ];

  return (
    <div className="card">
      {fields.map((f) => (
        <div className="field" key={f.label}>
          <div className="field-head">
            <span className="field-label">{f.label}</span>
            {f.badge && <span className={`badge ${f.badge === "TEST" ? "badge-test" : "badge-fake"}`}>{f.badge}</span>}
          </div>
          <div className="field-body">
            <span className={`field-value ${f.multiline ? "multiline" : ""} ${f.mono ? "mono" : ""}`}>
              {f.value}
            </span>
            <div className="field-actions">
              {f.reroll && (
                <button
                  className="icon-btn"
                  onClick={() => onReroll(f.reroll!)}
                  title={`Reroll ${f.label.toLowerCase()}`}
                  aria-label={`Reroll ${f.label}`}
                >
                  ↻
                </button>
              )}
              <button
                className="icon-btn"
                onClick={() => onCopy(f.value, f.label.toLowerCase())}
                title={`Copy ${f.label.toLowerCase()}`}
                aria-label={`Copy ${f.label}`}
              >
                ⧉
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
