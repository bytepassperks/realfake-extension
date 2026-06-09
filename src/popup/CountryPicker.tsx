import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CountryMeta } from "../generators/types.ts";

interface Props {
  countries: CountryMeta[];
  selected: string;
  favorites: string[];
  recents: string[];
  onSelect: (code: string) => void;
  onToggleFavorite: (code: string) => void;
}

function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function CountryPicker({
  countries,
  selected,
  favorites,
  recents,
  onSelect,
  onToggleFavorite,
}: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedMeta = countries.find((c) => c.code === selected);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? countries.filter(
          (c) => titleCase(c.name).toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
        )
      : countries;
    return base;
  }, [countries, query]);

  const favList = countries.filter((c) => favorites.includes(c.code));
  const recentList = recents
    .map((code) => countries.find((c) => c.code === code))
    .filter((c): c is CountryMeta => !!c);

  const choose = (code: string) => {
    onSelect(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="country-picker" ref={ref}>
      <button
        className="country-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flag">{flagEmoji(selected)}</span>
        <span className="country-label">
          {selectedMeta ? titleCase(selectedMeta.name) : selected}
        </span>
        <span className="chevron">▾</span>
      </button>

      {open && (
        <div className="country-dropdown" role="listbox">
          <input
            ref={inputRef}
            className="country-search"
            placeholder="Search 250+ countries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="country-list">
            {!query && favList.length > 0 && (
              <Section title="Favorites">
                {favList.map((c) => (
                  <Row
                    key={`f-${c.code}`}
                    c={c}
                    selected={c.code === selected}
                    fav={favorites.includes(c.code)}
                    onChoose={choose}
                    onFav={onToggleFavorite}
                  />
                ))}
              </Section>
            )}
            {!query && recentList.length > 0 && (
              <Section title="Recent">
                {recentList.map((c) => (
                  <Row
                    key={`r-${c.code}`}
                    c={c}
                    selected={c.code === selected}
                    fav={favorites.includes(c.code)}
                    onChoose={choose}
                    onFav={onToggleFavorite}
                  />
                ))}
              </Section>
            )}
            <Section title={query ? "Results" : "All countries"}>
              {filtered.map((c) => (
                <Row
                  key={c.code}
                  c={c}
                  selected={c.code === selected}
                  fav={favorites.includes(c.code)}
                  onChoose={choose}
                  onFav={onToggleFavorite}
                />
              ))}
              {filtered.length === 0 && <div className="empty">No matches</div>}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="country-section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

function Row({
  c,
  selected,
  fav,
  onChoose,
  onFav,
}: {
  c: CountryMeta;
  selected: boolean;
  fav: boolean;
  onChoose: (code: string) => void;
  onFav: (code: string) => void;
}): JSX.Element {
  return (
    <div className={`country-row ${selected ? "selected" : ""}`} role="option" aria-selected={selected}>
      <button className="country-choose" onClick={() => onChoose(c.code)}>
        <span className="flag">{flagEmoji(c.code)}</span>
        <span className="cname">{titleCase(c.name)}</span>
        <span className="ccode">{c.code}</span>
      </button>
      <button
        className={`star ${fav ? "on" : ""}`}
        onClick={() => onFav(c.code)}
        aria-label={fav ? "Remove favorite" : "Add favorite"}
        title={fav ? "Remove favorite" : "Add favorite"}
      >
        {fav ? "★" : "☆"}
      </button>
    </div>
  );
}
