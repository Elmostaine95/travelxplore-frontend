/**
 * UI locales aligned with LiteAPI `GET /data/languages` (hotel/rates `language` param).
 * English (`en`) is included as the app default; LiteAPI serves English content by default.
 * Locales not returned by LiteAPI (e.g. ko, ms) were removed to avoid invalid language API errors.
 */
export const SUPPORTED_LOCALES = [
  { code: "en", label: "English", native: "English", flag: "🇬🇧" },
  { code: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "bg", label: "Bulgarian", native: "Български", flag: "🇧🇬" },
  { code: "ca", label: "Catalan", native: "Català", flag: "🇪🇸" },
  { code: "cs", label: "Czech", native: "Čeština", flag: "🇨🇿" },
  { code: "da", label: "Danish", native: "Dansk", flag: "🇩🇰" },
  { code: "de", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "el", label: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "es", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "et", label: "Estonian", native: "Eesti", flag: "🇪🇪" },
  { code: "fi", label: "Finnish", native: "Suomi", flag: "🇫🇮" },
  { code: "fr", label: "French", native: "Français", flag: "🇫🇷" },
  { code: "hr", label: "Croatian", native: "Hrvatski", flag: "🇭🇷" },
  { code: "hu", label: "Hungarian", native: "Magyar", flag: "🇭🇺" },
  { code: "it", label: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "ja", label: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "lt", label: "Lithuanian", native: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", label: "Latvian", native: "Latviešu", flag: "🇱🇻" },
  { code: "nb", label: "Norwegian", native: "Norsk Bokmål", flag: "🇳🇴" },
  { code: "nl", label: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "pt", label: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "ro", label: "Romanian", native: "Română", flag: "🇷🇴" },
  { code: "ru", label: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "sk", label: "Slovak", native: "Slovenčina", flag: "🇸🇰" },
  { code: "sl", label: "Slovenian", native: "Slovenščina", flag: "🇸🇮" },
  { code: "sv", label: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "tr", label: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "uk", label: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "zh", label: "Chinese", native: "中文", flag: "🇨🇳" },

  /* Not in LiteAPI `GET /data/languages` — invalid `language` on hotel/rates. Re-enable if API adds them or map server-side to `en`.
  { code: "ko", label: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "ms", label: "Malay", native: "Bahasa Malaysia", flag: "🇲🇾" },
  */
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

export const RTL_LOCALES = new Set<string>(["ar"]);

export function isRTL(code: string): boolean {
  return RTL_LOCALES.has(code.toLowerCase());
}
