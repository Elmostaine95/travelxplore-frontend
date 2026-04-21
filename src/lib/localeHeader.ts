import { DEFAULT_LOCALE } from "../constants/languages";

const STORAGE_KEY = "travelxplore:locale";

/** ISO 639-1 code for X-App-Language (synced with persisted locale). */
export function getAppLocaleCode(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.trim().toLowerCase();
    if (raw && raw.length >= 2) {
      return raw.slice(0, 2);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}
