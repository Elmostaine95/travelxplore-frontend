import rawList from "./countryDialCodes.json";

export interface CountryDialEntry {
  name: string;
  iso2: string;
  /** Normalized E.164 country calling code, e.g. "+212" */
  dial: string;
}

/** Normalize dial codes from source data (handles spaces like "+ 345"). */
export function normalizeDialCode(dial: string): string {
  const digits = dial.replace(/\D/g, "");
  if (!digits) return "+1";
  return "+" + digits;
}

export const COUNTRY_DIAL_LIST: CountryDialEntry[] = (
  rawList as { name: string; dial_code: string; code: string }[]
)
  .map((x) => ({
    name: String(x.name || "").trim(),
    iso2: String(x.code || "").trim().toUpperCase(),
    dial: normalizeDialCode(String(x.dial_code || "")),
  }))
  .filter((x) => x.name && x.iso2 && x.dial.length > 1)
  .sort((a, b) => a.name.localeCompare(b.name));

export function findCountryByDial(dial: string): CountryDialEntry | undefined {
  const d = normalizeDialCode(dial);
  return COUNTRY_DIAL_LIST.find((c) => c.dial === d);
}
