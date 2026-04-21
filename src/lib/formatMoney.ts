/**
 * Format monetary amounts: common currencies use locale symbol (€, $, …);
 * others use a localized number plus ISO code (e.g. "1,234.56 MAD").
 */

/** Currencies where we prefer "amount + ISO code" over a local symbol. */
const PREFER_ISO_CODE = new Set([
  "MAD",
  "CVE",
  "XOF",
  "XPF",
  "BHD",
  "OMR",
  "KWD",
  "JOD",
  "MNT",
  "AMD",
  "AZN",
  "ISK",
  "BGN",
]);

function normalizeCode(currency: string): string {
  const c = (currency || "USD").trim().toUpperCase();
  return c.length === 3 ? c : "USD";
}

function fractionDigitsFor(code: string): { min: number; max: number } {
  const zero = new Set([
    "BIF",
    "CLP",
    "DJF",
    "GNF",
    "JPY",
    "KMF",
    "KRW",
    "MGA",
    "PYG",
    "RWF",
    "UGX",
    "VND",
    "VUV",
    "XAF",
    "XOF",
    "XPF",
  ]);
  const three = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);
  if (zero.has(code)) return { min: 0, max: 0 };
  if (three.has(code)) return { min: 3, max: 3 };
  return { min: 0, max: 2 };
}

function formatAmountPlain(amount: number, code: string): string {
  const { min, max } = fractionDigitsFor(code);
  try {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(amount);
  } catch {
    return amount.toFixed(max);
  }
}

/**
 * Format `amount` in `currencyCode` (ISO 4217).
 * Uses symbol via Intl for most major currencies; uses "n,nnn.nn CODE" when clearer.
 */
export function formatMoney(amount: number, currencyCode: string): string {
  const code = normalizeCode(currencyCode);
  if (!Number.isFinite(amount)) {
    return `${formatAmountPlain(0, code)} ${code}`;
  }

  if (PREFER_ISO_CODE.has(code)) {
    return `${formatAmountPlain(amount, code)} ${code}`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    }).format(amount);
  } catch {
    return `${formatAmountPlain(amount, code)} ${code}`;
  }
}
