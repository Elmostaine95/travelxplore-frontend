/** ISO 4217 codes supported in the currency picker (LiteAPI-compatible majors). */
export const SUGGESTED_CURRENCY_CODES = ["EUR", "GBP", "CAD"] as const;

export interface CurrencyItem {
  code: string;
  name: string;
}

/** Full list (unique by code). */
export const ALL_CURRENCIES: CurrencyItem[] = [
  { code: "USD", name: "US Dollar" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "AZN", name: "Azerbaijan Manat" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "THB", name: "Thai Baht" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "CVE", name: "Cabo Verde Escudo" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "XOF", name: "CFA Franc BCEAO" },
  { code: "XPF", name: "CFP Franc" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "COP", name: "Colombian Peso" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "DKK", name: "Danish Krone" },
  { code: "DOP", name: "Dominican Peso" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "EUR", name: "Euro" },
  { code: "FJD", name: "Fiji Dollar" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "GHS", name: "Ghana Cedi" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "ISK", name: "Iceland Krona" },
  { code: "INR", name: "Indian Rupee" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "MUR", name: "Mauritian Rupee" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "ILS", name: "Israeli Shekel" },
  { code: "TWD", name: "New Taiwan Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "GBP", name: "Pound Sterling" },
  { code: "QAR", name: "Qatari Rial" },
  { code: "ZAR", name: "South African Rand" },
  { code: "OMR", name: "Omani Rial" },
  { code: "RON", name: "Romanian Leu" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "MNT", name: "Mongolian Tugrik" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "AED", name: "UAE Dirham" },
  { code: "KRW", name: "South Korean Won" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CNY", name: "Chinese Yuan Renminbi" },
  { code: "PLN", name: "Polish Zloty" },
].sort((a, b) => a.name.localeCompare(b.name));

const codeSet = new Set(ALL_CURRENCIES.map((c) => c.code));

export function isAllowedCurrencyCode(code: string): boolean {
  return codeSet.has(code.trim().toUpperCase());
}

export function getCurrencyByCode(code: string): CurrencyItem | undefined {
  const u = code.trim().toUpperCase();
  return ALL_CURRENCIES.find((c) => c.code === u);
}

export const suggestedCurrencies: CurrencyItem[] = SUGGESTED_CURRENCY_CODES.map(
  (code) => getCurrencyByCode(code)
).filter((x): x is CurrencyItem => x != null);
