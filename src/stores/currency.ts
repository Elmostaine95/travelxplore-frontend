import { defineStore } from "pinia";
import {
  ALL_CURRENCIES,
  isAllowedCurrencyCode,
} from "../data/currencies";

const STORAGE_KEY = "travelxplore:currency";
const DEFAULT_CODE = "USD";

function readStored(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)?.trim().toUpperCase();
    if (raw && raw.length === 3 && isAllowedCurrencyCode(raw)) {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CODE;
}

export const useCurrencyStore = defineStore("currency", {
  state: () => ({
    currencyCode: readStored() as string,
  }),
  getters: {
    /** ISO 4217 code for API calls */
    code: (s) => s.currencyCode,
  },
  actions: {
    setCurrency(code: string) {
      const c = code.trim().toUpperCase();
      if (c.length !== 3 || !isAllowedCurrencyCode(c)) {
        return;
      }
      this.currencyCode = c;
      try {
        localStorage.setItem(STORAGE_KEY, c);
      } catch {
        /* ignore */
      }
    },
    initFromStorage() {
      this.currencyCode = readStored();
    },
  },
});
