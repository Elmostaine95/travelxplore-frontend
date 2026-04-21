<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Star,
  MapPin,
  Check,
  CreditCard,
  Sparkles,
  Info,
  Loader2,
} from "lucide-vue-next";
import Header from "../components/Header.vue";
import SafeHotelHtml from "../components/SafeHotelHtml.vue";
import ImageSlider, { type Slide } from "../components/ImageSlider.vue";
import RoomDetailsModal, {
  type RoomOfferRow,
  type RoomCatalogRow,
} from "../components/RoomDetailsModal.vue";
import PhoneCountryField from "../components/PhoneCountryField.vue";
import {
  getHotel,
  postBookingPrebook,
  postHotelRates,
  type RoomOffer,
} from "../lib/api";
import {
  buildE164Phone,
  validateBookingGuestFields,
  validateEmail,
  validateGuestFirstName,
  validateGuestLastName,
  validatePhoneParts,
  type BookingFormFieldErrors,
} from "../lib/bookingFormValidation";
import { useAuthStore } from "../stores/auth";
import { useCurrencyStore } from "../stores/currency";
import { isAllowedCurrencyCode } from "../data/currencies";
import { formatMoney } from "../lib/formatMoney";
import {
  BOOKING_SUCCESS_FLASH_KEY,
  LITEAPI_BOOKING_DRAFT_KEY,
} from "../lib/liteapiBookingDraft";

const props = defineProps<{ hotelId: string }>();
const auth = useAuthStore();
const currencyStore = useCurrencyStore();
const route = useRoute();
const router = useRouter();

const fallbackImg =
  "https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=1080";

const loading = ref(true);
const hotelError = ref<string | null>(null);
const ratesError = ref<string | null>(null);

const checkIn = ref("");
const checkOut = ref("");
const adults = ref(2);
const budget = ref(300);
const currencyCode = ref("USD");

const rateRooms = ref<RoomOffer[]>([]);
const roomsCatalogRows = ref<Record<string, unknown>[]>([]);

const hotel = ref<{
  id: string;
  name: string;
  city: string;
  country: string;
  rating: number;
  description: string;
  vibe: string[];
  propertySlides: Slide[];
  facilities: { facilityId?: number; name: string }[];
  lat?: number;
  lng?: number;
} | null>(null);

const selectedOfferId = ref<string | null>(null);
const bookingError = ref<string | null>(null);
const bookingBusy = ref(false);
const confirmOpen = ref(false);
const confirmLoggedIn = ref(false);

const roomDetailsOpen = ref(false);
const roomDetailsOffer = ref<RoomOfferRow | null>(null);
const roomDetailsCatalog = ref<RoomCatalogRow | null>(null);

type BookingDraftV1 = {
  v: 1;
  hotelId: string;
  offerId: string;
  checkin: string;
  checkout: string;
  roomName?: string;
  boardName?: string;
  boardType?: string;
  /** From prebook; required if return URL omits tid/pid (common with payment redirects). */
  prebookId?: string;
  transactionId?: string;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
};

const paymentPortalVisible = ref(false);
/** Guest details locked while LiteAPI payment form is active ([user payment](https://docs.liteapi.travel/docs/user-payment)). */
const paymentStepActive = ref(false);

const firstName = ref("");
const lastName = ref("");
const email = ref("");
const phoneDialCode = ref("+1");
const phoneNational = ref("");
const fieldErrors = ref<BookingFormFieldErrors>({});

function clearFieldError(key: keyof BookingFormFieldErrors) {
  if (!fieldErrors.value[key]) return;
  const next = { ...fieldErrors.value };
  delete next[key];
  fieldErrors.value = next;
}

function setFieldError(
  key: keyof BookingFormFieldErrors,
  message: string | null
) {
  const next = { ...fieldErrors.value };
  if (message) next[key] = message;
  else delete next[key];
  fieldErrors.value = next;
}

function onGuestFirstNameBlur() {
  setFieldError("firstName", validateGuestFirstName(firstName.value));
}

function onGuestLastNameBlur() {
  setFieldError("lastName", validateGuestLastName(lastName.value));
}

function onGuestEmailBlur() {
  setFieldError("email", validateEmail(email.value));
}

function onGuestPhoneBlur() {
  setFieldError(
    "phone",
    validatePhoneParts(phoneDialCode.value, phoneNational.value)
  );
}

/**
 * returnUrl for the payment SDK: dedicated route where we confirm the booking after Pay
 * (per LiteAPI user-payment: redirect with transaction/prebook identifiers).
 */
function liteAPIPaymentReturnUrl(): string {
  const u = new URL(
    `${window.location.origin}/booking/${props.hotelId}/payment-return`
  );
  u.searchParams.set("checkin", checkIn.value);
  u.searchParams.set("checkout", checkOut.value);
  u.searchParams.set("adults", String(adults.value));
  u.searchParams.set("budget", String(budget.value));
  u.searchParams.set("currency", currencyCode.value);
  return u.toString();
}

function consumeBookingSuccessFlash() {
  if (typeof sessionStorage === "undefined") return;
  if (!sessionStorage.getItem(BOOKING_SUCCESS_FLASH_KEY)) return;
  sessionStorage.removeItem(BOOKING_SUCCESS_FLASH_KEY);
  confirmLoggedIn.value = auth.isAuthenticated;
  confirmOpen.value = true;
}

function loadLiteAPIScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.LiteAPIPayment) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.liteapiPayment = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load payment SDK"));
    document.head.appendChild(s);
  });
}

watch([phoneDialCode, phoneNational], () => {
  clearFieldError("phone");
});

function readQuery() {
  checkIn.value = String(route.query.checkin || "").trim();
  checkOut.value = String(route.query.checkout || "").trim();
  const ad = Number(route.query.adults);
  adults.value = Number.isFinite(ad) && ad >= 1 ? Math.floor(ad) : 2;
  const b = Number(route.query.budget);
  budget.value = Number.isFinite(b) && b > 0 ? b : 300;
  const cur = String(route.query.currency || "").trim().toUpperCase();
  if (cur.length === 3 && isAllowedCurrencyCode(cur)) {
    currencyCode.value = cur;
  } else {
    currencyCode.value = currencyStore.currencyCode;
  }
}

watch(
  () => currencyStore.currencyCode,
  (c) => {
    currencyCode.value = c;
  }
);

/** Currency from API rates (first offer), fallback to user selection. */
const apiRatesCurrency = computed(() => {
  const c = rateRooms.value[0]?.currency?.trim().toUpperCase();
  return c && c.length === 3 ? c : currencyCode.value;
});

const cheapestPerNight = computed(() => {
  if (!rateRooms.value.length) return 0;
  let min = Infinity;
  const n = nights.value;
  for (const o of rateRooms.value) {
    const pn = o.priceTotal / n;
    if (pn < min) min = pn;
  }
  return Number.isFinite(min) ? min : 0;
});

const nights = computed(() => {
  if (!checkIn.value || !checkOut.value) return 1;
  const a = new Date(checkIn.value + "T12:00:00").getTime();
  const b = new Date(checkOut.value + "T12:00:00").getTime();
  return Math.max(1, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
});

const selectedOffer = computed(() =>
  rateRooms.value.find((r) => r.offerId === selectedOfferId.value)
);

const selectedCatalog = computed(() =>
  selectedOffer.value
    ? findCatalogForOffer(roomsCatalogRows.value, selectedOffer.value)
    : null
);

const groupedRooms = computed(() => {
  const offers = rateRooms.value;
  const map = new Map<string, RoomOffer[]>();
  for (const o of offers) {
    const k =
      o.mappedRoomId && o.mappedRoomId > 0
        ? `m-${o.mappedRoomId}`
        : `o-${o.offerId}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(o);
  }
  return Array.from(map.entries()).map(([key, offs]) => {
    const catalog = findCatalogForOffer(roomsCatalogRows.value, offs[0]);
    const displayName =
      catalog?.roomName?.trim() ||
      offs[0].name?.trim() ||
      "Room";
    return { key, offers: offs, catalog, displayName };
  });
});

const roomBaseBeforeTax = computed(() => {
  const o = selectedOffer.value;
  if (!o) return 0;
  const tax = o.taxesTotal ?? 0;
  const sub = o.priceTotal - tax;
  return sub > 0 ? sub : o.priceTotal;
});

function parseRoomsCatalog(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? (j as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function propertySlidesFromHotel(h: Record<string, unknown>): Slide[] {
  const prop = h.propertyImages as
    | { url?: string; urlHd?: string; caption?: string }[]
    | undefined;
  if (Array.isArray(prop) && prop.length) {
    return prop
      .map((p) => {
        const src = String(p.urlHd || p.url || "").trim();
        if (!src) return null;
        return {
          src,
          alt: String(h.name || "Hotel"),
          caption: p.caption,
        } as Slide;
      })
      .filter((s): s is Slide => s !== null);
  }
  const main = String(h.image || "").trim();
  if (main) return [{ src: main, alt: String(h.name || "Hotel") }];
  return [];
}

function normalizeCatalogRow(row: Record<string, unknown>): RoomCatalogRow {
  const rawAmenities = row.roomAmenities;
  let roomAmenities: { name?: string }[] | undefined;
  if (Array.isArray(rawAmenities)) {
    roomAmenities = rawAmenities.map((a) =>
      typeof a === "string"
        ? { name: a }
        : { name: String((a as { name?: string }).name || "") }
    );
  }
  const rawPhotos = row.photos;
  const photos = Array.isArray(rawPhotos)
    ? rawPhotos.map((p) => {
        if (!p || typeof p !== "object") return {};
        const o = p as Record<string, unknown>;
        return {
          url: String(o.url || ""),
          hd_url: String(o.hd_url || o.urlHd || o.url_hd || ""),
          imageDescription: String(
            o.imageDescription || o.caption || o.description || ""
          ),
        };
      })
    : undefined;

  return {
    id:
      typeof row.id === "number"
        ? row.id
        : Number(row.id || row.roomId || 0) || undefined,
    roomName: String(row.roomName || row.name || ""),
    description: row.description ? String(row.description) : undefined,
    roomSizeSquare:
      typeof row.roomSizeSquare === "number"
        ? row.roomSizeSquare
        : Number(row.roomSizeSquare) || undefined,
    roomSizeUnit: row.roomSizeUnit
      ? String(row.roomSizeUnit)
      : undefined,
    roomAmenities,
    photos,
  };
}

function findCatalogRowRaw(
  catalog: Record<string, unknown>[],
  offer: RoomOffer
): Record<string, unknown> | null {
  const mid = offer.mappedRoomId;
  if (mid != null && mid !== 0) {
    const hit = catalog.find(
      (r) =>
        Number(r.id) === mid ||
        Number(r.roomId) === mid ||
        Number(r.mappedRoomId) === mid
    );
    if (hit) return hit;
  }
  const want = (offer.name || "").trim().toLowerCase();
  if (!want) return null;
  return (
    catalog.find((r) => {
      const n = String(r.roomName || r.name || "")
        .trim()
        .toLowerCase();
      return n && n === want;
    }) || null
  );
}

function firstRoomPhotoFromCatalogRow(row: Record<string, unknown>): string {
  const rawPhotos = row.photos;
  if (Array.isArray(rawPhotos) && rawPhotos.length > 0) {
    const first = rawPhotos[0];
    if (first && typeof first === "object") {
      const o = first as Record<string, unknown>;
      const u = String(
        o.hd_url || o.urlHd || o.url_hd || o.url || o.image || ""
      ).trim();
      if (u) return u;
    }
  }
  return String(
    row.main_photo || row.mainPhoto || row.thumbnail || row.image || ""
  ).trim();
}

function roomSlidesFromCatalog(c: RoomCatalogRow | null): Slide[] {
  if (!c?.photos?.length) return [];
  return c.photos
    .map((p) => {
      const src = String(p.hd_url || p.url || "").trim();
      if (!src) return null;
      return {
        src,
        alt: c.roomName || "Room",
        caption: p.imageDescription,
      } as Slide;
    })
    .filter((s): s is Slide => s !== null);
}

function findCatalogForOffer(
  catalog: Record<string, unknown>[],
  offer: RoomOffer
): RoomCatalogRow | null {
  const raw = findCatalogRowRaw(catalog, offer);
  return raw ? normalizeCatalogRow(raw) : null;
}

function amenityNames(c: RoomCatalogRow | null, max = 6): string[] {
  const list = c?.roomAmenities;
  if (!list?.length) return [];
  return list
    .map((a) => (a.name || "").trim())
    .filter(Boolean)
    .slice(0, max);
}

function openRoomDetails(offer: RoomOffer, e?: Event) {
  e?.stopPropagation();
  if (paymentStepActive.value) return;
  roomDetailsOffer.value = {
    roomId: offer.roomId,
    name: offer.name,
    boardName: offer.boardName,
    cancellationSummary: offer.cancellationSummary,
    mappedRoomId: offer.mappedRoomId,
  };
  roomDetailsCatalog.value = findCatalogForOffer(roomsCatalogRows.value, offer);
  roomDetailsOpen.value = true;
}

function closeRoomDetails() {
  roomDetailsOpen.value = false;
}

function selectOffer(offerId: string) {
  if (paymentStepActive.value) return;
  selectedOfferId.value = offerId;
}

function formatStayDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function parseCancelDisplay(cancelTime: string): { date: string; time: string } {
  if (!cancelTime) return { date: "—", time: "" };
  const m = cancelTime.match(
    /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/
  );
  if (!m) return { date: cancelTime, time: "" };
  const d = new Date(m[1] + "T" + m[2] + "Z");
  if (Number.isNaN(d.getTime()))
    return { date: m[1], time: m[2].slice(0, 5) };
  return {
    date: d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

async function loadPage() {
  loading.value = true;
  hotelError.value = null;
  ratesError.value = null;
  hotel.value = null;
  rateRooms.value = [];
  paymentPortalVisible.value = false;
  paymentStepActive.value = false;
  readQuery();

  if (!checkIn.value || !checkOut.value) {
    hotelError.value = "Missing check-in or check-out in the URL.";
    loading.value = false;
    return;
  }

  try {
    const h = (await getHotel(props.hotelId)) as Record<string, unknown>;
    roomsCatalogRows.value = parseRoomsCatalog(h.roomsCatalog);
    const slides = propertySlidesFromHotel(h);
    const facRaw = h.facilities as { facilityId?: number; name?: string }[];
    const facilities = Array.isArray(facRaw)
      ? facRaw
          .filter((f) => f && String(f.name || "").trim())
          .map((f) => ({
            facilityId: f.facilityId,
            name: String(f.name).trim(),
          }))
      : [];

    hotel.value = {
      id: String(h.id),
      name: String(h.name),
      city: String(h.city || ""),
      country: String(h.country || ""),
      rating: Number(h.rating) || 4.5,
      description: String(h.description || ""),
      vibe: (h.vibe as string[]) || [],
      propertySlides: slides.length
        ? slides
        : [{ src: fallbackImg, alt: String(h.name) }],
      facilities,
      lat: h.lat as number | undefined,
      lng: h.lng as number | undefined,
    };
  } catch (e) {
    hotelError.value = (e as Error).message || "Could not load hotel.";
    loading.value = false;
    return;
  }

  try {
    const { rooms } = await postHotelRates(props.hotelId, {
      checkin: checkIn.value,
      checkout: checkOut.value,
      adults: adults.value,
      budget: budget.value,
      currency: currencyCode.value,
    });
    rateRooms.value = rooms;
    if (rooms.length && !selectedOfferId.value) {
      selectedOfferId.value = rooms[0].offerId;
    }
  } catch (e) {
    ratesError.value = (e as Error).message || "Rates unavailable.";
  } finally {
    loading.value = false;
    if (hotel.value) {
      consumeBookingSuccessFlash();
    }
  }
}

watch(
  () => rateRooms.value,
  (rooms) => {
    if (!rooms.length) {
      selectedOfferId.value = null;
      return;
    }
    if (!rooms.some((r) => r.offerId === selectedOfferId.value)) {
      selectedOfferId.value = rooms[0].offerId;
    }
  },
  { deep: true }
);

watch(
  () => ({
    id: props.hotelId,
    q: `${route.query.checkin}|${route.query.checkout}|${route.query.adults}|${route.query.budget}|${route.query.currency}`,
  }),
  () => loadPage(),
  { immediate: true }
);

async function confirmBooking() {
  bookingError.value = null;
  fieldErrors.value = {};
  const guestErrs = validateBookingGuestFields({
    firstName: firstName.value,
    lastName: lastName.value,
    email: email.value,
    dialCode: phoneDialCode.value,
    phoneNational: phoneNational.value,
  });
  if (Object.keys(guestErrs).length) {
    fieldErrors.value = guestErrs;
    bookingError.value = "Please correct the highlighted fields.";
    return;
  }
  if (!hotel.value || !selectedOfferId.value) return;

  const offer = selectedOffer.value;
  const catalog = selectedCatalog.value;
  const roomLabel = catalog?.roomName?.trim() || offer?.name?.trim() || "";
  const phoneDigits = buildE164Phone(
    phoneDialCode.value,
    phoneNational.value
  ).replace(/\D/g, "");

  const draft: BookingDraftV1 = {
    v: 1,
    hotelId: hotel.value.id,
    offerId: selectedOfferId.value,
    checkin: checkIn.value,
    checkout: checkOut.value,
    roomName: roomLabel || undefined,
    boardName: offer?.boardName?.trim() || undefined,
    boardType: offer?.boardType?.trim() || undefined,
    guest: {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      phone: phoneDigits,
    },
  };

  bookingBusy.value = true;
  try {
    const pre = await postBookingPrebook(
      {
        hotelId: hotel.value.id,
        roomId: selectedOfferId.value,
      },
      auth.token
    );
    draft.prebookId = pre.prebookId;
    draft.transactionId = pre.transactionId;
    sessionStorage.setItem(LITEAPI_BOOKING_DRAFT_KEY, JSON.stringify(draft));
    await loadLiteAPIScript(pre.paymentSdkScriptURL);
    if (!window.LiteAPIPayment) {
      throw new Error("Payment SDK failed to initialize.");
    }
    paymentPortalVisible.value = true;
    await nextTick();
    const pay = new window.LiteAPIPayment({
      publicKey: pre.paymentPublicKey,
      secretKey: pre.secretKey,
      returnUrl: liteAPIPaymentReturnUrl(),
      targetElement: "#liteapi-payment-target",
      appearance: { theme: "flat" },
      options: {
        business: {
          name: hotel.value.name || "TravelXplore",
        },
      },
    });
    pay.handlePayment();
    paymentStepActive.value = true;
  } catch (e) {
    sessionStorage.removeItem(LITEAPI_BOOKING_DRAFT_KEY);
    paymentPortalVisible.value = false;
    paymentStepActive.value = false;
    bookingError.value = (e as Error).message || "Payment could not be started.";
  } finally {
    bookingBusy.value = false;
  }
}

function closeBookingConfirm() {
  confirmOpen.value = false;
}

function goMyBookingsFromConfirm() {
  confirmOpen.value = false;
  router.push("/my-bookings");
}

function goHomeFromConfirm() {
  confirmOpen.value = false;
  router.push("/");
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white">
    <Header />

    <!-- Loading -->
    <div
      v-if="loading"
      class="max-w-7xl mx-auto px-6 pt-28 pb-16"
    >
      <div class="h-8 w-40 bg-white/10 rounded-lg animate-pulse mb-8" />
      <div class="grid lg:grid-cols-3 gap-10">
        <div class="lg:col-span-2 space-y-6">
          <div class="aspect-[21/9] rounded-2xl bg-white/5 animate-pulse" />
          <div class="h-48 rounded-2xl bg-white/5 animate-pulse" />
          <div class="h-48 rounded-2xl bg-white/5 animate-pulse" />
        </div>
        <div class="h-[480px] rounded-2xl bg-white/5 animate-pulse" />
      </div>
      <div class="flex justify-center mt-12 text-white/50 gap-2 text-sm">
        <Loader2 class="w-4 h-4 animate-spin" />
        Loading availability…
      </div>
    </div>

    <!-- Hotel error -->
    <div
      v-else-if="hotelError"
      class="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-6 pt-28"
    >
      <p class="text-white/90 text-center max-w-md">{{ hotelError }}</p>
      <button
        type="button"
        class="text-crimson-400 hover:text-crimson-300"
        @click="router.push('/')"
      >
        Back home
      </button>
    </div>

    <!-- Main -->
    <div
      v-else-if="hotel"
      class="pb-16"
    >
      <div class="max-w-7xl mx-auto px-6 pt-28 pb-4">
        <button
          type="button"
          class="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          @click="router.push('/')"
        >
          <ArrowLeft class="w-5 h-5" />
          <span class="text-sm tracking-wide">Back to map</span>
        </button>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-6">
        <div class="grid lg:grid-cols-3 gap-10 lg:gap-12">
          <div class="lg:col-span-2 space-y-10">
            <div class="space-y-5">
              <div
                class="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl"
              >
                <ImageSlider
                  :slides="hotel.propertySlides"
                  aspect-class="aspect-[21/9] md:aspect-[2/1] w-full min-h-[220px]"
                />
              </div>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h1 class="text-3xl font-light tracking-wide mb-2">
                    {{ hotel.name }}
                  </h1>
                  <p class="flex items-center gap-2 text-white/60">
                    <MapPin class="w-4 h-4 shrink-0" />
                    {{ hotel.city }}, {{ hotel.country }}
                  </p>
                </div>
                <div class="flex flex-col items-end gap-3 shrink-0">
                  <div
                    class="flex items-center gap-1 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10"
                  >
                    <Star class="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span class="text-lg">{{ hotel.rating }}</span>
                  </div>
                </div>
              </div>
              <SafeHotelHtml
                v-if="hotel.description"
                :html="hotel.description"
                content-class="text-white/70 leading-relaxed line-clamp-4"
              />
              <div
                v-if="hotel.vibe?.length"
                class="flex flex-wrap gap-2"
              >
                <span
                  v-for="(v, i) in hotel.vibe"
                  :key="i"
                  class="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-white/60"
                >
                  {{ v }}
                </span>
              </div>
              <div
                v-if="hotel.facilities.length"
                class="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-6 space-y-4"
              >
                <div class="flex items-center gap-2 text-white/90">
                  <Sparkles class="w-5 h-5 text-crimson-400 shrink-0" />
                  <h2 class="text-lg font-light tracking-wide">
                    Popular facilities
                  </h2>
                </div>
                <ul
                  class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-white/75"
                >
                  <li
                    v-for="(f, i) in hotel.facilities.slice(0, 16)"
                    :key="f.facilityId ?? `${f.name}-${i}`"
                    class="flex items-start gap-2"
                  >
                    <Check class="w-4 h-4 text-crimson-500 shrink-0 mt-0.5" />
                    <span>{{ f.name }}</span>
                  </li>
                </ul>
              </div>
            </div>

            <p
              v-if="ratesError"
              class="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
            >
              {{ ratesError }}
              <button
                type="button"
                class="ml-2 underline text-white"
                @click="loadPage"
              >
                Retry
              </button>
            </p>

            <section v-else class="space-y-6">
              <h2 class="text-xl font-light tracking-wide">
                Select a room
              </h2>

              <div
                v-if="!rateRooms.length"
                class="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl px-8 py-16 text-center"
              >
                <p class="text-white/80 text-lg font-light">
                  No rooms available within your budget
                </p>
                <p class="text-white/45 text-sm mt-2 max-w-md mx-auto">
                  Try raising your budget or choosing different dates from the home
                  search, then open this page again.
                </p>
              </div>

              <TransitionGroup
                v-else
                name="fade-slide"
                tag="div"
                class="space-y-8"
              >
                <article
                  v-for="group in groupedRooms"
                  :key="group.key"
                  class="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl overflow-hidden shadow-[0_24px_80px_-24px_rgba(0,0,0,0.7)] transition-shadow hover:border-white/15"
                >
                  <div
                    class="grid lg:grid-cols-[minmax(0,300px)_1fr] gap-0"
                  >
                    <div
                      class="bg-black/25 border-b lg:border-b-0 lg:border-r border-white/10 p-4 space-y-3"
                    >
                      <p class="text-sm font-medium text-white/90">
                        {{ group.displayName }}
                      </p>
                      <div
                        class="rounded-xl overflow-hidden border border-white/10"
                      >
                        <ImageSlider
                          v-if="roomSlidesFromCatalog(group.catalog).length"
                          :slides="roomSlidesFromCatalog(group.catalog)"
                          aspect-class="aspect-[4/3] w-full"
                        />
                        <div
                          v-else
                          class="aspect-[4/3] bg-white/5 flex items-center justify-center"
                        >
                          <img
                            :src="fallbackImg"
                            alt=""
                            class="w-full h-full object-cover opacity-80"
                          />
                        </div>
                      </div>
                      <div class="flex flex-wrap gap-3 text-xs text-white/55">
                        <span
                          v-if="group.catalog?.roomSizeSquare"
                          class="inline-flex items-center gap-1"
                        >
                          {{ group.catalog.roomSizeSquare }}
                          {{ group.catalog.roomSizeUnit || "sqm" }}
                        </span>
                        <span class="inline-flex items-center gap-1">
                          Sleeps {{ adults }}
                        </span>
                      </div>
                      <ul
                        v-if="amenityNames(group.catalog).length"
                        class="flex flex-wrap gap-1.5"
                      >
                        <li
                          v-for="(a, i) in amenityNames(group.catalog)"
                          :key="i"
                          class="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/70"
                        >
                          {{ a }}
                        </li>
                      </ul>
                      <button
                        type="button"
                        class="text-sm text-crimson-400 hover:text-crimson-300 underline underline-offset-2"
                        @click="openRoomDetails(group.offers[0], $event)"
                      >
                        Room details
                      </button>
                    </div>

                    <div class="divide-y divide-white/10">
                      <div
                        v-for="offer in group.offers"
                        :key="offer.offerId"
                        class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors"
                        :class="
                          selectedOfferId === offer.offerId
                            ? 'bg-crimson-600/15 ring-1 ring-inset ring-crimson-500/50'
                            : 'hover:bg-white/[0.02]'
                        "
                      >
                        <div class="min-w-0 space-y-2 flex-1">
                          <h3 class="font-medium text-white/95">
                            {{ offer.boardName || offer.name }}
                          </h3>
                          <p class="text-sm text-white/55 flex items-center gap-1.5">
                            <Check
                              v-if="
                                offer.boardName &&
                                offer.boardName.toLowerCase().includes('breakfast')
                              "
                              class="w-3.5 h-3.5 text-emerald-400 shrink-0"
                            />
                            <span v-if="offer.boardName">{{
                              offer.boardName
                            }}</span>
                            <span v-else>No meals included</span>
                          </p>
                          <p
                            class="text-sm flex items-start gap-1.5"
                            :class="
                              offer.refundableTag === 'RFN'
                                ? 'text-emerald-400/90'
                                : 'text-white/55'
                            "
                          >
                            <Info class="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
                            {{
                              offer.cancellationSummary ||
                                "See rate conditions"
                            }}
                          </p>
                        </div>
                        <div
                          class="flex sm:flex-col items-end gap-3 shrink-0 w-full sm:w-auto"
                        >
                          <div class="text-right">
                            <p class="text-xl font-light tracking-tight">
                              {{
                                formatMoney(
                                  offer.priceTotal / nights,
                                  offer.currency || currencyCode
                                )
                              }}
                              <span class="text-sm text-white/45 font-normal"
                                >/ night</span
                              >
                            </p>
                            <p class="text-[11px] text-white/40 mt-0.5">
                              ({{ nights }} night{{
                                nights === 1 ? "" : "s"
                              }}, 1 room incl. taxes)
                            </p>
                          </div>
                          <button
                            type="button"
                            class="w-full sm:w-auto px-5 py-2.5 rounded-lg border text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            :class="
                              paymentStepActive
                                ? 'border-white/10 bg-white/5 text-white/50'
                                : 'bg-crimson-600 hover:bg-crimson-500 border-crimson-500/40'
                            "
                            :disabled="paymentStepActive"
                            @click="selectOffer(offer.offerId)"
                          >
                            Choose room
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </TransitionGroup>
            </section>
          </div>

          <!-- Summary -->
          <div class="lg:col-span-1">
            <div
              class="lg:sticky lg:top-28 space-y-6 rounded-2xl border border-white/10 bg-black/35 backdrop-blur-2xl p-6 shadow-2xl"
            >
              <h2
                class="text-lg font-light tracking-wide pb-3 border-b border-white/10"
              >
                Booking summary
              </h2>

              <div class="space-y-3 text-sm">
                <div class="flex justify-between text-white/55">
                  <span>Check-in</span>
                  <span class="text-white/90">{{ formatStayDate(checkIn) }}</span>
                </div>
                <div class="flex justify-between text-white/55">
                  <span>Check-out</span>
                  <span class="text-white/90">{{
                    formatStayDate(checkOut)
                  }}</span>
                </div>
                <div class="flex justify-between text-white/55">
                  <span>Guests</span>
                  <span class="text-white/90">{{ adults }}</span>
                </div>
                <div class="flex justify-between text-white/55">
                  <span>Budget / night</span>
                  <span class="text-white/90">{{
                    formatMoney(budget, currencyCode)
                  }}</span>
                </div>
              </div>

              <template v-if="selectedOffer">
                <div
                  class="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3"
                >
                  <h3 class="text-sm font-medium text-white/90">
                    Cancellation policy
                  </h3>
                  <p class="text-xs text-white/45">
                    How much will it cost to cancel the rooms?
                  </p>
                  <template
                    v-if="selectedOffer.cancelPolicyInfos?.length"
                  >
                    <div
                      v-for="(row, idx) in selectedOffer.cancelPolicyInfos"
                      :key="idx"
                      class="space-y-2"
                    >
                      <div
                        v-if="idx > 0"
                        class="border-t border-white/10"
                      />
                      <div
                        class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 pt-2"
                      >
                        <div class="text-xs text-white/60">
                          <template v-if="idx === 0">
                            Cancel by {{ parseCancelDisplay(row.cancelTime || "").date }}
                          </template>
                          <template v-else>
                            Cancel after {{ parseCancelDisplay(row.cancelTime || "").date }}
                          </template>
                          <div
                            v-if="parseCancelDisplay(row.cancelTime || '').time"
                            class="text-white/40"
                          >
                            {{ parseCancelDisplay(row.cancelTime || "").time }}
                          </div>
                        </div>
                        <div class="text-right text-sm">
                          <span
                            v-if="!row.amount || row.amount === 0"
                            class="text-emerald-400 font-medium"
                          >
                            Free cancellation (full refund)
                          </span>
                          <span
                            v-else
                            class="text-white font-medium"
                          >
                            {{
                              formatMoney(
                                row.amount,
                                row.currency || selectedOffer.currency
                              )
                            }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </template>
                  <p
                    v-else
                    class="text-sm text-white/70"
                  >
                    {{ selectedOffer.cancellationSummary || "—" }}
                  </p>
                  <p class="flex items-start gap-1.5 text-[11px] text-white/35 pt-1">
                    <Info class="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Cancellation costs are based on the total booking value. Dates
                    and times are in GMT unless the rate states otherwise.
                  </p>
                </div>

                <div class="border-t border-dashed border-white/15 pt-5 space-y-4">
                  <span
                    class="inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/55"
                  >
                    Room 1
                  </span>
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-sm font-medium text-white leading-snug">
                      {{
                        selectedCatalog?.roomName?.trim() || selectedOffer.name
                      }},
                      {{ selectedOffer.boardName || "Room rate" }}
                    </p>
                    <button
                      type="button"
                      class="text-xs text-crimson-400 hover:text-crimson-300 shrink-0"
                      @click="openRoomDetails(selectedOffer)"
                    >
                      Room details
                    </button>
                  </div>
                  <p class="text-xs text-white/50">
                    {{ adults }} Adults ·
                    {{
                      formatMoney(
                        selectedOffer.priceTotal / nights,
                        selectedOffer.currency || currencyCode
                      )
                    }}
                    average per night
                  </p>
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between gap-4">
                      <span class="text-white/55"
                        >1 room × {{ nights }} night{{
                          nights === 1 ? "" : "s"
                        }}</span
                      >
                      <span class="font-medium text-white">{{
                        formatMoney(
                          roomBaseBeforeTax,
                          selectedOffer.currency || currencyCode
                        )
                      }}</span>
                    </div>
                    <div
                      v-if="(selectedOffer.taxesTotal ?? 0) > 0"
                      class="flex justify-between gap-4"
                    >
                      <span class="text-white/55 inline-flex items-center gap-1"
                        >Included taxes and fees
                        <Info class="w-3 h-3 opacity-50" />
                      </span>
                      <span class="font-medium text-white">{{
                        formatMoney(
                          selectedOffer.taxesTotal!,
                          selectedOffer.currency || currencyCode
                        )
                      }}</span>
                    </div>
                  </div>
                  <div
                    class="flex justify-between items-baseline pt-3 border-t border-white/10"
                  >
                    <span class="text-base font-medium">Total</span>
                    <span class="text-xl font-light tracking-tight">{{
                      formatMoney(
                        selectedOffer.priceTotal,
                        selectedOffer.currency || currencyCode
                      )
                    }}</span>
                  </div>
                </div>
              </template>
              <p
                v-else-if="rateRooms.length"
                class="text-sm text-white/45"
              >
                Select a room to see pricing and policies.
              </p>

              <div class="space-y-3 pt-4 border-t border-white/10">
                <p
                  v-if="paymentStepActive"
                  class="text-xs text-amber-200/90"
                >
                  Guest details are locked while you complete payment in the form
                  below.
                </p>
                <div>
                  <label
                    class="mb-1.5 block text-sm font-medium text-white/80"
                    for="booking-guest-first-name"
                    >Guest First Name</label
                  >
                  <input
                    id="booking-guest-first-name"
                    v-model="firstName"
                    type="text"
                    name="guestFirstName"
                    autocomplete="given-name"
                    placeholder="Enter first name"
                    :readonly="paymentStepActive"
                    class="w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-white/35 placeholder:italic focus:outline-none"
                    :class="
                      paymentStepActive
                        ? 'cursor-not-allowed border-white/10 bg-white/[0.04] text-white/85 opacity-95'
                        : fieldErrors.firstName
                        ? 'border-red-500/55 bg-red-500/5 focus:border-red-500/70'
                        : 'border-white/10 bg-white/5 focus:border-crimson-600/60'
                    "
                    :aria-invalid="fieldErrors.firstName ? 'true' : 'false'"
                    :aria-describedby="
                      fieldErrors.firstName
                        ? 'booking-guest-first-name-error'
                        : undefined
                    "
                    @input="clearFieldError('firstName')"
                    @blur="onGuestFirstNameBlur"
                  />
                  <p
                    v-if="fieldErrors.firstName"
                    id="booking-guest-first-name-error"
                    role="alert"
                    class="mt-1.5 text-xs text-red-400/95"
                  >
                    {{ fieldErrors.firstName }}
                  </p>
                </div>
                <div>
                  <label
                    class="mb-1.5 block text-sm font-medium text-white/80"
                    for="booking-guest-last-name"
                    >Guest Last Name</label
                  >
                  <input
                    id="booking-guest-last-name"
                    v-model="lastName"
                    type="text"
                    name="guestLastName"
                    autocomplete="family-name"
                    placeholder="Enter last name"
                    :readonly="paymentStepActive"
                    class="w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-white/35 placeholder:italic focus:outline-none"
                    :class="
                      paymentStepActive
                        ? 'cursor-not-allowed border-white/10 bg-white/[0.04] text-white/85 opacity-95'
                        : fieldErrors.lastName
                        ? 'border-red-500/55 bg-red-500/5 focus:border-red-500/70'
                        : 'border-white/10 bg-white/5 focus:border-crimson-600/60'
                    "
                    :aria-invalid="fieldErrors.lastName ? 'true' : 'false'"
                    :aria-describedby="
                      fieldErrors.lastName
                        ? 'booking-guest-last-name-error'
                        : undefined
                    "
                    @input="clearFieldError('lastName')"
                    @blur="onGuestLastNameBlur"
                  />
                  <p
                    v-if="fieldErrors.lastName"
                    id="booking-guest-last-name-error"
                    role="alert"
                    class="mt-1.5 text-xs text-red-400/95"
                  >
                    {{ fieldErrors.lastName }}
                  </p>
                </div>
                <div>
                  <label
                    class="mb-1.5 block text-sm font-medium text-white/80"
                    for="booking-guest-email"
                    >Email</label
                  >
                  <input
                    id="booking-guest-email"
                    v-model="email"
                    type="email"
                    name="email"
                    autocomplete="email"
                    placeholder="Enter email"
                    :readonly="paymentStepActive"
                    class="w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-white/35 placeholder:italic focus:outline-none"
                    :class="
                      paymentStepActive
                        ? 'cursor-not-allowed border-white/10 bg-white/[0.04] text-white/85 opacity-95'
                        : fieldErrors.email
                        ? 'border-red-500/55 bg-red-500/5 focus:border-red-500/70'
                        : 'border-white/10 bg-white/5 focus:border-crimson-600/60'
                    "
                    :aria-invalid="fieldErrors.email ? 'true' : 'false'"
                    :aria-describedby="
                      fieldErrors.email ? 'booking-guest-email-error' : undefined
                    "
                    @input="clearFieldError('email')"
                    @blur="onGuestEmailBlur"
                  />
                  <p
                    v-if="fieldErrors.email"
                    id="booking-guest-email-error"
                    role="alert"
                    class="mt-1.5 text-xs text-red-400/95"
                  >
                    {{ fieldErrors.email }}
                  </p>
                </div>
                <div>
                  <label
                    class="mb-1.5 block text-sm font-medium text-white/80"
                    for="booking-guest-phone-national"
                    >Phone Number</label
                  >
                  <PhoneCountryField
                    v-model:dial-code="phoneDialCode"
                    v-model:national-number="phoneNational"
                    national-input-id="booking-guest-phone-national"
                    error-id="booking-guest-phone-error"
                    :error="fieldErrors.phone"
                    :read-only="paymentStepActive"
                    @national-blur="onGuestPhoneBlur"
                  />
                </div>
              </div>

              <div class="space-y-3 pt-4 border-t border-white/10">
                <h3 class="text-sm text-white/80 flex items-center gap-2">
                  <CreditCard class="w-4 h-4" />
                  Payment
                </h3>
                <p class="text-xs text-white/45 leading-relaxed">
                  Card numbers and wallet details are entered in LiteAPI’s secure
                  payment form below. TravelXplore never receives or stores your
                  card data on our servers.
                </p>
                <div
                  v-show="paymentPortalVisible"
                  id="liteapi-payment-target"
                  class="min-h-[280px] rounded-xl border border-white/10 bg-white/[0.03] p-3"
                />
                <p v-if="!paymentPortalVisible" class="text-xs text-white/35">
                  After guest details are complete, continue to open the
                  hosted payment step for this rate.
                </p>
              </div>

              <p
                v-if="bookingError"
                class="text-sm text-red-400"
              >
                {{ bookingError }}
              </p>
              <button
                v-if="!paymentStepActive"
                type="button"
                class="relative w-full px-6 py-4 bg-crimson-600 hover:bg-crimson-700 disabled:opacity-40 text-white rounded-xl transition-all duration-300"
                :disabled="bookingBusy || !selectedOffer"
                @click="confirmBooking"
              >
                <span class="relative font-light tracking-wide">{{
                  bookingBusy ? "Starting secure payment…" : "Continue to payment"
                }}</span>
              </button>
              <p class="text-xs text-white/35 text-center">
                Payments processed by LiteAPI (PCI‑compliant)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="confirmOpen"
          class="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-confirm-title"
        >
          <div
            class="absolute inset-0 bg-black/75 backdrop-blur-sm"
            @click="closeBookingConfirm"
          />
          <div
            class="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.8)] p-8 space-y-6 scale-in"
          >
            <h2
              id="booking-confirm-title"
              class="text-xl font-light tracking-wide text-white text-center"
            >
              Booking Confirmed
            </h2>
            <p class="text-sm text-white/65 text-center leading-relaxed">
              Your booking is confirmed. A confirmation email will be sent
              shortly.
            </p>
            <div
              class="flex flex-col sm:flex-row gap-3 justify-center pt-2"
            >
              <template v-if="confirmLoggedIn">
                <button
                  type="button"
                  class="px-6 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-sm font-light tracking-wide transition-colors"
                  @click="goMyBookingsFromConfirm"
                >
                  My Bookings
                </button>
                <button
                  type="button"
                  class="px-6 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-sm font-light tracking-wide transition-colors"
                  @click="closeBookingConfirm"
                >
                  Close
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="w-full px-6 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-sm font-light tracking-wide transition-colors"
                  @click="goHomeFromConfirm"
                >
                  Continue Exploring
                </button>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <RoomDetailsModal
      :open="roomDetailsOpen"
      :offer="roomDetailsOffer"
      :catalog="roomDetailsCatalog"
      @close="closeRoomDetails"
    />
  </div>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-active .scale-in,
.modal-fade-leave-active .scale-in {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .scale-in,
.modal-fade-leave-to .scale-in {
  transform: scale(0.94);
  opacity: 0;
}
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.35s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-slide-leave-to {
  opacity: 0;
}
</style>
