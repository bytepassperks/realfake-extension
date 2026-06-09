import { transliterate } from "transliteration";

/**
 * Romanize text from any script (Chinese, Cyrillic, Arabic, Greek, Thai,
 * Devanagari, Hebrew, …) into a lowercase [a-z0-9] handle suitable for
 * emails/usernames. Japanese and Korean are handled upstream via curated
 * romaji corpora (see name.ts) because generic transliteration mis-reads
 * their names; this is the fallback for every other non-Latin script.
 */
export function latinize(s: string): string {
  return transliterate(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
