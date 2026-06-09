import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { generate } from "../generators/index.ts";
import { rerollField, type RerollGroup } from "../generators/reroll.ts";
import type { CityData, Gender, Identity } from "../generators/types.ts";
import { COUNTRIES, getCountry, loadCities } from "../data/loader.ts";
import {
  loadSettings,
  saveSettings,
  pushRecent,
  type Settings,
} from "./storage.ts";
import { CountryPicker } from "./CountryPicker.tsx";
import { IdentityCard } from "./IdentityCard.tsx";

export function App(): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cities, setCities] = useState<CityData[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [toast, setToast] = useState<string>("");
  const [fillStatus, setFillStatus] = useState<string>("");
  const toastTimer = useRef<number | undefined>(undefined);

  // Initial load.
  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  // Apply theme.
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const apply = (dark: boolean) => root.setAttribute("data-theme", dark ? "dark" : "light");
    if (settings.theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches);
    } else {
      apply(settings.theme === "dark");
    }
  }, [settings]);

  const meta = useMemo(
    () => (settings ? getCountry(settings.countryCode) : undefined),
    [settings]
  );

  const regenerate = useCallback(
    (cs: CityData[], s: Settings) => {
      const m = getCountry(s.countryCode);
      if (!m) return;
      const gender: Gender | undefined = s.gender === "any" ? undefined : s.gender;
      setIdentity(generate(m, cs, { countryCode: s.countryCode, gender }));
    },
    []
  );

  // Load cities whenever the country changes, then generate.
  useEffect(() => {
    if (!settings) return;
    let active = true;
    void loadCities(settings.countryCode).then((cs) => {
      if (!active) return;
      setCities(cs);
      regenerate(cs, settings);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.countryCode]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1400);
  }, []);

  const copy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast(`Copied ${label}`);
      } catch {
        showToast("Copy failed");
      }
    },
    [showToast]
  );

  const onSelectCountry = useCallback(
    (code: string) => {
      if (!settings) return;
      const next: Settings = {
        ...settings,
        countryCode: code,
        recents: pushRecent(settings.recents, code),
      };
      setSettings(next);
      void saveSettings(next);
    },
    [settings]
  );

  const toggleFavorite = useCallback(
    (code: string) => {
      if (!settings) return;
      const favorites = settings.favorites.includes(code)
        ? settings.favorites.filter((c) => c !== code)
        : [...settings.favorites, code];
      const next = { ...settings, favorites };
      setSettings(next);
      void saveSettings(next);
    },
    [settings]
  );

  const setGender = useCallback(
    (gender: Settings["gender"]) => {
      if (!settings) return;
      const next = { ...settings, gender };
      setSettings(next);
      void saveSettings(next);
      regenerate(cities, next);
    },
    [settings, cities, regenerate]
  );

  const cycleTheme = useCallback(() => {
    if (!settings) return;
    const order: Settings["theme"][] = ["auto", "light", "dark"];
    const theme = order[(order.indexOf(settings.theme) + 1) % order.length];
    const next = { ...settings, theme };
    setSettings(next);
    void saveSettings(next);
  }, [settings]);

  const onReroll = useCallback(
    (group: RerollGroup) => {
      if (!identity || !meta) return;
      setIdentity(rerollField(identity, group, meta, cities));
    },
    [identity, meta, cities]
  );

  const fillForm = useCallback(async () => {
    if (!identity) return;
    if (typeof chrome === "undefined" || !chrome.tabs) {
      setFillStatus("Autofill only works inside the extension");
      return;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "REALFAKE_FILL", identity });
      setFillStatus("Filled visible form fields");
    } catch {
      setFillStatus("No fillable form found on this page");
    }
    window.setTimeout(() => setFillStatus(""), 2200);
  }, [identity]);

  if (!settings || !meta || !identity) {
    return <div className="loading">Loading…</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img src="icons/icon32.png" alt="" className="logo" width={22} height={22} />
          <span className="brand-name">RealFake</span>
        </div>
        <button
          className="icon-btn theme-btn"
          onClick={cycleTheme}
          title={`Theme: ${settings.theme}`}
          aria-label="Toggle theme"
        >
          {settings.theme === "dark" ? "🌙" : settings.theme === "light" ? "☀️" : "🌗"}
        </button>
      </header>

      <div className="controls">
        <CountryPicker
          countries={COUNTRIES}
          selected={settings.countryCode}
          favorites={settings.favorites}
          recents={settings.recents}
          onSelect={onSelectCountry}
          onToggleFavorite={toggleFavorite}
        />
        <div className="gender-toggle" role="group" aria-label="Gender">
          {(["any", "male", "female"] as const).map((g) => (
            <button
              key={g}
              className={`seg ${settings.gender === g ? "active" : ""}`}
              onClick={() => setGender(g)}
            >
              {g === "any" ? "Any" : g === "male" ? "Male" : "Female"}
            </button>
          ))}
        </div>
      </div>

      <div className="actions">
        <button className="primary regen" onClick={() => regenerate(cities, settings)}>
          ↻ Change identity
        </button>
        <button
          className="secondary"
          onClick={() => copy(formatFullIdentity(identity), "full identity")}
        >
          ⧉ Copy all
        </button>
        <button className="secondary" onClick={fillForm} title="Autofill the form on the current page">
          ⤵ Fill form
        </button>
      </div>
      {fillStatus && <div className="fill-status">{fillStatus}</div>}

      <IdentityCard identity={identity} meta={meta} onCopy={copy} onReroll={onReroll} />

      <footer className="footer">
        <p className="disclaimer">
          All data is fictional and for testing/privacy only. It does not refer to any real
          person. IDs use reserved ranges; cards are Luhn-valid TEST numbers. Generated 100%
          locally on your device.
        </p>
        <p className="coverage">{COUNTRIES.length} countries · real city/region/postal data</p>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function formatFullIdentity(id: Identity): string {
  return [
    `Name: ${id.title} ${id.fullName}`,
    `Gender: ${id.gender}`,
    `Email: ${id.email}`,
    `Phone: ${id.phone}`,
    `Address: ${id.formattedAddress.replace(/\n/g, ", ")}`,
    `Date of birth: ${id.dateOfBirth} (age ${id.age})`,
    `National ID: ${id.nationalId}`,
    `Credit card (TEST): ${id.creditCard} exp ${id.creditCardExpiry} cvv ${id.creditCardCVV}`,
    `Username: ${id.username}`,
    `Password: ${id.password}`,
    `Company: ${id.company}`,
    `Job title: ${id.jobTitle}`,
    `Coordinates: ${id.lat}, ${id.lng}`,
  ].join("\n");
}
