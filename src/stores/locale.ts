import { defineStore } from "pinia";
import { i18n, applyDocumentLocale } from "../i18n";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isRTL,
} from "../constants/languages";

const STORAGE_KEY = "travelxplore:locale";

function readStored(): string {
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

export const useLocaleStore = defineStore("locale", {
  state: () => ({
    code: readStored() as string,
  }),
  getters: {
    isRTL: (s) => isRTL(s.code),
  },
  actions: {
    setLocale(code: string) {
      const c = code.trim().toLowerCase();
      if (!SUPPORTED_LOCALES.some((l) => l.code === c)) {
        return;
      }
      this.code = c;
      try {
        localStorage.setItem(STORAGE_KEY, c);
      } catch {
        /* ignore */
      }
      i18n.global.locale.value = c;
      applyDocumentLocale(c);
    },
    init() {
      const c = readStored();
      this.code = c;
      i18n.global.locale.value = c;
      applyDocumentLocale(c);
    },
  },
});
