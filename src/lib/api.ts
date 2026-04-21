import { getAppLocaleCode } from "./localeHeader";

const base = import.meta.env.VITE_API_URL;

/** ISO-3166-1 alpha-2 hint from browser locale (backend uses this when no CDN geo headers). */
function clientOriginCountryHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const loc =
      Intl.DateTimeFormat().resolvedOptions().locale || navigator.language;
    const parts = loc.split(/[-_]/);
    if (parts.length >= 2) {
      const r = parts[parts.length - 1].toUpperCase();
      if (/^[A-Z]{2}$/.test(r)) {
        return { "X-Client-Country": r };
      }
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Sent on API calls so the backend and LiteAPI can localize content. */
export function localeHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const code = getAppLocaleCode();
  return {
    "X-App-Language": code,
    "Accept-Language": code,
  };
}

function mergeHeaders(
  ...parts: Array<Record<string, string>>
): Record<string, string> {
  return Object.assign({}, ...parts);
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

export async function postRegister(body: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const r = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: mergeHeaders(
      { "Content-Type": "application/json" },
      localeHeaders()
    ),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ message: string }>;
}

export async function postLogin(body: { email: string; password: string }) {
  const r = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: mergeHeaders(
      { "Content-Type": "application/json" },
      localeHeaders()
    ),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ token: string; user: AuthUser }>;
}

export async function verifyEmail(token: string) {
  const r = await fetch(
    `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    { headers: mergeHeaders(localeHeaders()) }
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ message: string }>;
}

export async function postResendVerification(body: { email: string }) {
  const r = await fetch(`${base}/api/auth/resend-verification`, {
    method: "POST",
    headers: mergeHeaders(
      { "Content-Type": "application/json" },
      localeHeaders()
    ),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ message: string }>;
}

export async function postForgotPassword(body: { email: string }) {
  const r = await fetch(`${base}/api/auth/forgot-password`, {
    method: "POST",
    headers: mergeHeaders(
      { "Content-Type": "application/json" },
      localeHeaders()
    ),
    body: JSON.stringify(body),
  });
  if (r.status === 429) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || "Too many requests");
  }
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ message: string }>;
}

export async function postResetPassword(body: { token: string; password: string }) {
  const r = await fetch(`${base}/api/auth/reset-password`, {
    method: "POST",
    headers: mergeHeaders(
      { "Content-Type": "application/json" },
      localeHeaders()
    ),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ message: string }>;
}

export async function getAuthMe(token: string) {
  const r = await fetch(`${base}/api/auth/me`, {
    headers: mergeHeaders(
      { Authorization: `Bearer ${token}` },
      localeHeaders()
    ),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ user: AuthUser }>;
}

export interface MetaOption {
  label: string;
  value: string;
}

export async function getMetaCountries() {
  const r = await fetch(`${base}/api/meta/countries`, {
    headers: mergeHeaders(localeHeaders()),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ items: MetaOption[] }>;
}

export async function getMetaCities(countryCode: string) {
  const r = await fetch(
    `${base}/api/meta/cities?countryCode=${encodeURIComponent(countryCode)}`,
    { headers: mergeHeaders(localeHeaders()) }
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ items: MetaOption[] }>;
}

export interface SearchBody {
  budget: number;
  checkin: string;
  checkout: string;
  adults: number;
  /** Optional ISO 3166-1 alpha-2 country code (e.g. US, FR). Limits discovery to that country. */
  country?: string;
  /** Preferred: ISO-3166-1 alpha-2 from LiteAPI country list. */
  countryCode?: string;
  /** Optional city name (with country) to narrow search. */
  city?: string;
  /** ISO 4217 currency for LiteAPI rates (e.g. USD, EUR). */
  currency?: string;
  /** ISO 639-1 language code for LiteAPI content (defaults from app locale). */
  language?: string;
  filters?: { vibes?: string[] };
}

export async function postSearch(body: SearchBody) {
  const lang = getAppLocaleCode();
  const payload = { ...body, language: body.language ?? lang };
  const r = await fetch(`${base}/api/search`, {
    method: "POST",
    headers: mergeHeaders(
      { "Content-Type": "application/json" },
      clientOriginCountryHeaders(),
      localeHeaders()
    ),
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json();
}

export async function getHotel(id: string) {
  const r = await fetch(`${base}/api/hotel/${encodeURIComponent(id)}`, {
    headers: mergeHeaders(localeHeaders()),
  });
  if (!r.ok) throw new Error("Hotel not found");
  return r.json();
}

export interface CancelPolicyInfo {
  cancelTime?: string;
  amount?: number;
  currency?: string;
  type?: string;
  timezone?: string;
}

export interface RoomOffer {
  roomId: string;
  name: string;
  priceTotal: number;
  currency: string;
  offerId: string;
  roomTypeId?: string;
  boardName?: string;
  boardType?: string;
  cancellationSummary?: string;
  refundableTag?: string;
  mappedRoomId?: number;
  taxesTotal?: number;
  cancelPolicyInfos?: CancelPolicyInfo[];
}

export async function postHotelRates(
  hotelId: string,
  body: {
    checkin: string;
    checkout: string;
    adults: number;
    budget: number;
    currency: string;
    language?: string;
  }
) {
  const lang = getAppLocaleCode();
  const payload = { ...body, language: body.language ?? lang };
  const r = await fetch(
    `${base}/api/hotel/${encodeURIComponent(hotelId)}/rates`,
    {
      method: "POST",
      headers: mergeHeaders(
        { "Content-Type": "application/json" },
        clientOriginCountryHeaders(),
        localeHeaders()
      ),
      body: JSON.stringify(payload),
    }
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ rooms: RoomOffer[] }>;
}

export interface ContactPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function postContact(body: ContactPayload) {
  const r = await fetch(`${base}/api/contact`, {
    method: "POST",
    headers: mergeHeaders(
      { "Content-Type": "application/json" },
      localeHeaders()
    ),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{ ok: boolean; id: string }>;
}

export async function postBookingPrebook(
  payload: {
    hotelId: string;
    roomId: string;
    voucherCode?: string;
  },
  token?: string | null
) {
  const headers: Record<string, string> = mergeHeaders(
    { "Content-Type": "application/json" },
    localeHeaders()
  );
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const r = await fetch(`${base}/api/booking/prebook`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{
    prebookId: string;
    secretKey: string;
    transactionId: string;
    paymentPublicKey: string;
    paymentSdkScriptURL: string;
  }>;
}

/** Finalize booking after LiteAPI payment SDK success (payment handled in browser; server uses TRANSACTION_ID only). */
export async function postBooking(
  payload: {
    hotelId: string;
    roomId: string;
    prebookId: string;
    transactionId: string;
    guest: Record<string, unknown>;
    checkin?: string;
    checkout?: string;
    /** Display name of the physical room (from catalog). */
    roomName?: string;
    /** Rate plan label, e.g. breakfast included (from offer). */
    boardName?: string;
    boardType?: string;
  },
  token?: string | null
) {
  const headers: Record<string, string> = mergeHeaders(
    { "Content-Type": "application/json" },
    localeHeaders()
  );
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const r = await fetch(`${base}/api/booking`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{
    bookingId: string;
    liteapiBookingId: string;
    status: string;
    internalBookingId?: string;
  }>;
}

export interface UserBookingItem {
  id: string;
  bookingId: string;
  hotelName: string;
  city: string;
  holderName: string;
  checkin?: string;
  checkout?: string;
  amount: number;
  currency: string;
  status: string;
  bookingDate: string;
  roomName?: string;
  boardName?: string;
  boardType?: string;
}

export async function getUserBookings(
  token: string,
  params: { page?: number; limit?: number; q?: string }
) {
  const u = new URLSearchParams();
  if (params.page != null) u.set("page", String(params.page));
  if (params.limit != null) u.set("limit", String(params.limit));
  if (params.q?.trim()) u.set("q", params.q.trim());
  const r = await fetch(`${base}/api/user/bookings?${u}`, {
    headers: mergeHeaders(
      { Authorization: `Bearer ${token}` },
      localeHeaders()
    ),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{
    bookings: UserBookingItem[];
    total: number;
    page: number;
    limit: number;
  }>;
}

export interface BookingInternalDetail {
  id: string;
  bookingId: string;
  hotelId: string;
  hotelName: string;
  city: string;
  holderName: string;
  checkin?: string;
  checkout?: string;
  status: string;
  totalPrice: number;
  currency: string;
  createdAt: string;
  refundAmount?: number;
  cancellationFee?: number;
  roomName?: string;
  boardName?: string;
  boardType?: string;
}

export async function getBookingDetail(token: string, bookingId: string) {
  const r = await fetch(
    `${base}/api/bookings/${encodeURIComponent(bookingId)}`,
    {
      headers: mergeHeaders(
        { Authorization: `Bearer ${token}` },
        localeHeaders()
      ),
    }
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{
    internal: BookingInternalDetail;
    lite: unknown;
  }>;
}

export async function putBookingCancel(token: string, bookingId: string) {
  const r = await fetch(
    `${base}/api/bookings/${encodeURIComponent(bookingId)}/cancel`,
    {
      method: "PUT",
      headers: mergeHeaders(
        { Authorization: `Bearer ${token}` },
        localeHeaders()
      ),
    }
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{
    internal?: BookingInternalDetail;
    lite: unknown;
  }>;
}

export async function putBookingAmend(
  token: string,
  bookingId: string,
  body: { firstName: string; lastName: string; email: string }
) {
  const r = await fetch(
    `${base}/api/bookings/${encodeURIComponent(bookingId)}/amend`,
    {
      method: "PUT",
      headers: mergeHeaders(
        {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        localeHeaders()
      ),
      body: JSON.stringify(body),
    }
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error((j as { error?: string }).error || r.statusText);
  }
  return r.json() as Promise<{
    internal?: BookingInternalDetail;
    lite: unknown;
  }>;
}
