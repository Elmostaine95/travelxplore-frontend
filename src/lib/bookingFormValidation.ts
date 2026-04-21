import { normalizeDialCode } from "../data/countryDialCodes";

/**
 * RFC 5322–style practical pattern (local + domain; not full RFC 5322 grammar).
 */
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/** Letters (Unicode), spaces, hyphens only — no digits or punctuation. */
const NAME_LETTERS_ONLY_RE = /^[\p{L}\s-]+$/u;

const MIN_NAME_LEN = 2;
const MAX_NAME_LEN = 80;

/** E.164: max 15 digits total; practical minimum for a valid international number. */
const PHONE_TOTAL_MIN = 8;
const PHONE_TOTAL_MAX = 15;
/** Minimum subscriber digits (after country code). */
const PHONE_NATIONAL_MIN = 6;

/** E.164-style full number with leading + */
export function buildE164Phone(dial: string, nationalDigits: string): string {
  const cc = normalizeDialCode(dial).replace(/\D/g, "");
  const n = nationalDigits.replace(/\D/g, "").replace(/^0+/, "");
  return "+" + cc + n;
}

export function validateGuestFirstName(v: string): string | null {
  const s = v.trim();
  if (!s) return "First name is required.";
  if (s.length < MIN_NAME_LEN)
    return "First name must be at least 2 characters.";
  if (s.length > MAX_NAME_LEN) return "First name is too long.";
  if (!NAME_LETTERS_ONLY_RE.test(s))
    return "Only letters, spaces, and hyphens are allowed.";
  return null;
}

export function validateGuestLastName(v: string): string | null {
  const s = v.trim();
  if (!s) return "Last name is required.";
  if (s.length < MIN_NAME_LEN)
    return "Last name must be at least 2 characters.";
  if (s.length > MAX_NAME_LEN) return "Last name is too long.";
  if (!NAME_LETTERS_ONLY_RE.test(s))
    return "Only letters, spaces, and hyphens are allowed.";
  return null;
}

export function validateEmail(v: string): string | null {
  const s = v.trim();
  if (!s) return "Email is required.";
  if (s.length > 254) return "Email is too long.";
  if (!EMAIL_RE.test(s))
    return "Enter a valid email address in the correct format.";
  return null;
}

/**
 * Validates national digits with country calling code.
 * National part: digits only, 6–15 digits; total (country + national): 8–15 digits (E.164).
 */
export function validatePhoneParts(dial: string, nationalDigits: string): string | null {
  const cc = normalizeDialCode(dial).replace(/\D/g, "");
  const n = nationalDigits.replace(/\D/g, "");
  if (!n) return "Phone number is required.";
  if (!/^\d+$/.test(n)) return "Phone number must contain only digits.";
  if (n.length < PHONE_NATIONAL_MIN)
    return "Phone number must be at least 6 digits (after the country code).";
  const total = cc.length + n.length;
  if (total < PHONE_TOTAL_MIN)
    return "Phone number is too short (minimum 8 digits including country code).";
  if (total > PHONE_TOTAL_MAX)
    return "Phone number is too long (maximum 15 digits including country code).";
  return null;
}

export interface BookingFormFieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
}

/** @deprecated Use BookingFormFieldErrors */
export type BookingGuestFieldErrors = Pick<
  BookingFormFieldErrors,
  "firstName" | "lastName" | "email" | "phone"
>;

export function validateBookingGuestFields(input: {
  firstName: string;
  lastName: string;
  email: string;
  dialCode: string;
  phoneNational: string;
}): Pick<
  BookingFormFieldErrors,
  "firstName" | "lastName" | "email" | "phone"
> {
  const out: BookingFormFieldErrors = {};
  const e1 = validateGuestFirstName(input.firstName);
  if (e1) out.firstName = e1;
  const e2 = validateGuestLastName(input.lastName);
  if (e2) out.lastName = e2;
  const e3 = validateEmail(input.email);
  if (e3) out.email = e3;
  const e4 = validatePhoneParts(input.dialCode, input.phoneNational);
  if (e4) out.phone = e4;
  return out;
}

// ——— Payment ———

const CARD_DIGITS_MIN = 13;
const CARD_DIGITS_MAX = 19;

/** Digits only from a card field (strip spaces/formatting). */
export function getCardDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Group digits in blocks of 4 for display (max 19 digits). */
export function formatCardNumberDisplay(raw: string): string {
  const d = getCardDigits(raw).slice(0, CARD_DIGITS_MAX);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Luhn check on a string of digits. */
export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits) || digits.length < CARD_DIGITS_MIN) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(raw: string): string | null {
  const d = getCardDigits(raw);
  if (!d.length) return "Card number is required.";
  if (d.length < CARD_DIGITS_MIN || d.length > CARD_DIGITS_MAX)
    return "Invalid card number.";
  if (!luhnCheck(d)) return "Invalid card number.";
  return null;
}

/**
 * Amex: 15 digits starting with 34 or 37 → 4-digit CVC.
 * Other known lengths → 3-digit CVC.
 * Incomplete number → accept either 3 or 4 until card is identifiable.
 */
export function expectedCvcLength(cardDigits: string): 3 | 4 | "either" {
  const d = getCardDigits(cardDigits);
  if (d.length === 15 && /^3[47]/.test(d)) return 4;
  if (d.length < CARD_DIGITS_MIN) return "either";
  return 3;
}

export function validateCardExpiry(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "Expiry date is required.";
  const m = /^(\d{2})\/(\d{2})$/.exec(t);
  if (!m) return "Invalid expiry date.";
  const mm = parseInt(m[1]!, 10);
  const yy = parseInt(m[2]!, 10);
  if (mm < 1 || mm > 12) return "Invalid expiry date.";
  const now = new Date();
  const nowY = now.getFullYear();
  const nowM = now.getMonth() + 1;
  const expY = 2000 + yy;
  if (expY < nowY || (expY === nowY && mm < nowM)) return "Card has expired.";
  return null;
}

export function validateCardCvc(raw: string, cardDigits: string): string | null {
  const c = getCardDigits(raw);
  if (!c.length) return "CVC is required.";
  if (!/^\d+$/.test(c)) return "CVC must contain only digits.";
  const exp = expectedCvcLength(cardDigits);
  if (exp === "either") {
    if (c.length !== 3 && c.length !== 4) return "Invalid CVC.";
    return null;
  }
  if (c.length !== exp) return "Invalid CVC.";
  return null;
}

export function validateBookingPaymentFields(input: {
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
}): Pick<
  BookingFormFieldErrors,
  "cardNumber" | "cardExpiry" | "cardCvc"
> {
  const out: BookingFormFieldErrors = {};
  const e1 = validateCardNumber(input.cardNumber);
  if (e1) out.cardNumber = e1;
  const e2 = validateCardExpiry(input.cardExpiry);
  if (e2) out.cardExpiry = e2;
  const e3 = validateCardCvc(input.cardCvc, getCardDigits(input.cardNumber));
  if (e3) out.cardCvc = e3;
  return out;
}
