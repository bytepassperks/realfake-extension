import type { Identity } from "../generators/types.ts";

interface FillMessage {
  type: "REALFAKE_FILL";
  identity: Identity;
}

/** Heuristic mapping from field-name keywords to identity values. */
function valueForField(identity: Identity, hint: string): string | null {
  const h = hint.toLowerCase();
  const test = (...keys: string[]) => keys.some((k) => h.includes(k));

  if (test("firstname", "first-name", "first_name", "fname", "given")) return identity.firstName;
  if (test("lastname", "last-name", "last_name", "lname", "surname", "family")) return identity.lastName;
  if (test("fullname", "full-name", "your name") || h === "name") return identity.fullName;
  if (test("email", "e-mail")) return identity.email;
  if (test("phone", "tel", "mobile", "cell")) return identity.phone;
  if (test("address2", "address-2", "apt", "suite", "unit")) return "";
  if (test("address", "street", "addr")) return identity.street;
  if (test("city", "town", "locality")) return identity.city;
  if (test("state", "province", "region", "prefecture")) return identity.region;
  if (test("zip", "postal", "postcode", "pincode", "pin")) return identity.postal;
  if (test("country")) return identity.country;
  if (test("company", "organization", "organisation", "business")) return identity.company;
  if (test("job", "title", "occupation")) return identity.jobTitle;
  if (test("username", "user-name", "user_name", "login", "handle")) return identity.username;
  if (test("password", "passwd", "pwd")) return identity.password;
  if (test("birth", "dob", "dateofbirth")) return identity.dateOfBirth;
  if (test("card", "cc-number", "ccnumber")) return identity.creditCard.replace(/\s/g, "");
  if (test("cvv", "cvc", "security")) return identity.creditCardCVV;
  if (test("city")) return identity.city;
  return null;
}

function fieldHint(el: HTMLInputElement | HTMLTextAreaElement): string {
  const parts = [
    el.name,
    el.id,
    el.getAttribute("placeholder") ?? "",
    el.getAttribute("aria-label") ?? "",
    el.getAttribute("autocomplete") ?? "",
  ];
  // Associated <label>
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label?.textContent) parts.push(label.textContent);
  }
  const wrapLabel = el.closest("label");
  if (wrapLabel?.textContent) parts.push(wrapLabel.textContent);
  return parts.join(" ");
}

function setValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillForm(identity: Identity): number {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
  );
  let filled = 0;
  for (const el of inputs) {
    if (el instanceof HTMLInputElement) {
      const skip = ["checkbox", "radio", "file", "submit", "button", "hidden", "range", "color"];
      if (skip.includes(el.type)) continue;
    }
    if (el.disabled || el.readOnly || el.offsetParent === null) continue;
    const value = valueForField(identity, fieldHint(el));
    if (value) {
      setValue(el, value);
      filled++;
    }
  }
  return filled;
}

chrome.runtime.onMessage.addListener((msg: FillMessage, _sender, sendResponse) => {
  if (msg?.type === "REALFAKE_FILL") {
    const count = fillForm(msg.identity);
    sendResponse({ filled: count });
  }
  return true;
});
