export interface Settings {
  countryCode: string;
  gender: "male" | "female" | "any";
  favorites: string[];
  recents: string[];
  theme: "light" | "dark" | "auto";
}

const DEFAULTS: Settings = {
  countryCode: "US",
  gender: "any",
  favorites: [],
  recents: [],
  theme: "auto",
};

const KEY = "realfake.settings";

function hasChromeStorage(): boolean {
  return typeof chrome !== "undefined" && !!chrome.storage?.local;
}

export async function loadSettings(): Promise<Settings> {
  if (!hasChromeStorage()) {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }
  return new Promise((resolve) => {
    chrome.storage.local.get(KEY, (res) => {
      resolve({ ...DEFAULTS, ...(res[KEY] ?? {}) });
    });
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!hasChromeStorage()) {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
    return;
  }
  return new Promise((resolve) => {
    chrome.storage.local.set({ [KEY]: settings }, () => resolve());
  });
}

export function pushRecent(recents: string[], code: string, max = 5): string[] {
  return [code, ...recents.filter((c) => c !== code)].slice(0, max);
}
