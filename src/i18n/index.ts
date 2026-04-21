import { createI18n } from "vue-i18n";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isRTL,
} from "../constants/languages";

const STORAGE_KEY = "travelxplore:locale";

/** Eager-load every `locales/<code>.json` present at build time; add a new file and it is picked up automatically. */
const localeModules = import.meta.glob<{ default: Record<string, string> }>(
  "../locales/*.json",
  { eager: true }
);

function localeCodeFromPath(path: string): string {
  const base = path.split("/").pop() ?? "";
  return base.replace(/\.json$/i, "").toLowerCase();
}

const loadedByCode: Record<string, Record<string, string>> = {};
for (const [path, mod] of Object.entries(localeModules)) {
  const code = localeCodeFromPath(path);
  if (code) {
    loadedByCode[code] = mod.default;
  }
}

const englishMessages =
  loadedByCode[DEFAULT_LOCALE] ?? Object.values(loadedByCode)[0] ?? {};

if (!loadedByCode[DEFAULT_LOCALE] && Object.keys(loadedByCode).length > 0) {
  console.warn(
    "[i18n] Missing locales/en.json — using another file as fallback until en.json exists."
  );
}

function readInitialLocale(): string {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.trim().toLowerCase();
    if (raw && SUPPORTED_LOCALES.some((l) => l.code === raw)) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

/** Per supported UI locale: use `<code>.json` when present, otherwise English (or sole available bundle). */
const messages: Record<string, Record<string, string>> = {};
for (const { code } of SUPPORTED_LOCALES) {
  messages[code] = loadedByCode[code] ?? englishMessages;
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: readInitialLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages,
});

export function applyDocumentLocale(code: string): void {
  if (typeof document === "undefined") return;
  const c = code.toLowerCase();
  document.documentElement.lang = c;
  document.documentElement.dir = isRTL(c) ? "rtl" : "ltr";
  document.documentElement.classList.toggle("rtl", isRTL(c));
}

applyDocumentLocale(readInitialLocale());
