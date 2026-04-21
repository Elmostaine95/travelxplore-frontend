<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Loader2 } from "lucide-vue-next";
import { postBooking } from "../lib/api";
import {
  BOOKING_SUCCESS_FLASH_KEY,
  LITEAPI_BOOKING_DRAFT_KEY,
} from "../lib/liteapiBookingDraft";
import { useAuthStore } from "../stores/auth";

const props = defineProps<{ hotelId: string }>();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

type BookingDraftV1 = {
  v: 1;
  hotelId: string;
  offerId: string;
  checkin: string;
  checkout: string;
  roomName?: string;
  boardName?: string;
  boardType?: string;
  prebookId?: string;
  transactionId?: string;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
};

const phase = ref<"loading" | "error">("loading");
const errorMessage = ref<string | null>(null);

function firstQuery(v: unknown): string {
  if (Array.isArray(v)) return String(v[0] ?? "").trim();
  return String(v ?? "").trim();
}

/** Some gateways append params to the hash instead of ?query (Vue Router may not expose them). */
function parseHashSearchParams(): Record<string, string> {
  const h = typeof window !== "undefined" ? window.location.hash : "";
  const qIdx = h.indexOf("?");
  if (qIdx === -1) return {};
  const sp = new URLSearchParams(h.slice(qIdx + 1));
  const out: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (v) out[k] = v;
  });
  return out;
}

function pickFromMaps(
  names: string[],
  routeQuery: Record<string, unknown>,
  hashQ: Record<string, string>
): string {
  for (const k of names) {
    const a = firstQuery(routeQuery[k]);
    if (a) return a;
    const b = hashQ[k];
    if (b) return b;
  }
  return "";
}

/** After external payment redirect, params may exist only on `location.search` before router sync. */
function pickFromLocationSearch(names: string[]): string {
  if (typeof window === "undefined") return "";
  const sp = new URLSearchParams(window.location.search);
  for (const k of names) {
    const v = sp.get(k);
    if (v?.trim()) return v.trim();
  }
  return "";
}

/** Rebuild stay search params after redirect (LiteAPI may append tid/pid only). */
function stayQueryFromRoute(draft: BookingDraftV1): Record<string, string> {
  return {
    checkin: firstQuery(route.query.checkin) || draft.checkin,
    checkout: firstQuery(route.query.checkout) || draft.checkout,
    adults: firstQuery(route.query.adults) || "2",
    budget: firstQuery(route.query.budget) || "300",
    currency: firstQuery(route.query.currency) || "USD",
  };
}

async function run() {
  const raw = sessionStorage.getItem(LITEAPI_BOOKING_DRAFT_KEY);
  if (!raw) {
    phase.value = "error";
    errorMessage.value =
      "Your booking session expired. If you were charged, contact support with your email address.";
    return;
  }

  let draft: BookingDraftV1;
  try {
    draft = JSON.parse(raw) as BookingDraftV1;
  } catch {
    sessionStorage.removeItem(LITEAPI_BOOKING_DRAFT_KEY);
    phase.value = "error";
    errorMessage.value = "Invalid booking session. Please start again.";
    return;
  }

  if (draft.hotelId !== props.hotelId) {
    phase.value = "error";
    errorMessage.value = "Hotel mismatch. Please start the booking again.";
    return;
  }

  const hashQ = parseHashSearchParams();
  const rq = route.query as Record<string, unknown>;
  const txNames = ["tid", "transactionId", "transaction_id", "tr"];
  const pbNames = ["pid", "prebookId", "prebook_id", "pb"];

  const tid =
    pickFromLocationSearch(txNames) ||
    pickFromMaps(txNames, rq, hashQ) ||
    (draft.transactionId?.trim() ?? "");
  const pid =
    pickFromLocationSearch(pbNames) ||
    pickFromMaps(pbNames, rq, hashQ) ||
    (draft.prebookId?.trim() ?? "");

  if (!tid || !pid) {
    phase.value = "error";
    errorMessage.value =
      "Missing payment confirmation. Please return to the booking page and try again.";
    return;
  }

  try {
    await postBooking(
      {
        hotelId: draft.hotelId,
        roomId: draft.offerId,
        prebookId: pid,
        transactionId: tid,
        guest: draft.guest,
        checkin: draft.checkin,
        checkout: draft.checkout,
        roomName: draft.roomName,
        boardName: draft.boardName,
        boardType: draft.boardType,
      },
      auth.token
    );
    sessionStorage.removeItem(LITEAPI_BOOKING_DRAFT_KEY);
    sessionStorage.setItem(BOOKING_SUCCESS_FLASH_KEY, "1");
    await router.replace({
      path: `/booking/${props.hotelId}`,
      query: stayQueryFromRoute(draft),
    });
  } catch (e) {
    phase.value = "error";
    errorMessage.value =
      (e as Error).message ||
      "We could not confirm your reservation. Please try again.";
  }
}

onMounted(() => {
  void run();
});

function goBackToBooking() {
  const raw = sessionStorage.getItem(LITEAPI_BOOKING_DRAFT_KEY);
  let draft: BookingDraftV1 | null = null;
  if (raw) {
    try {
      draft = JSON.parse(raw) as BookingDraftV1;
    } catch {
      draft = null;
    }
  }
  router.push({
    path: `/booking/${props.hotelId}`,
    query: draft
      ? stayQueryFromRoute(draft)
      : {
          checkin: firstQuery(route.query.checkin),
          checkout: firstQuery(route.query.checkout),
          adults: firstQuery(route.query.adults) || "2",
          budget: firstQuery(route.query.budget) || "300",
          currency: firstQuery(route.query.currency) || "USD",
        },
  });
}
</script>

<template>
  <div class="fixed inset-0 z-[100] min-h-screen overflow-hidden bg-[#0a0a0a]">
    <!-- Blurred backdrop (full viewport while confirming; see LiteAPI returnUrl step) -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-black/80 via-[#0a0a0a]/95 to-black/90 backdrop-blur-xl"
      aria-hidden="true"
    />
    <div
      class="absolute inset-0 opacity-[0.15] bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.35),_transparent_55%)]"
      aria-hidden="true"
    />

    <div
      v-if="phase === 'loading'"
      class="relative z-10 flex min-h-screen flex-col items-center justify-center gap-6 px-6"
      role="status"
      aria-live="polite"
    >
      <Loader2 class="h-12 w-12 animate-spin text-crimson-400" />
      <p class="max-w-sm text-center text-sm font-light tracking-wide text-white/75">
        Confirming your reservation…
      </p>
    </div>

    <Teleport to="body">
      <div
        v-if="phase === 'error'"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="booking-fail-title"
      >
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <div
          class="relative w-full max-w-md rounded-2xl border border-red-500/35 bg-[#111]/95 p-8 shadow-2xl"
        >
          <h2
            id="booking-fail-title"
            class="text-xl font-light tracking-wide text-white text-center"
          >
            Booking could not be completed
          </h2>
          <p class="mt-4 text-sm text-white/65 text-center leading-relaxed">
            {{ errorMessage }}
          </p>
          <div class="mt-8 flex flex-col gap-3">
            <button
              type="button"
              class="w-full rounded-xl bg-crimson-600 px-6 py-3 text-sm font-light tracking-wide text-white transition-colors hover:bg-crimson-500"
              @click="goBackToBooking"
            >
              Back to booking
            </button>
            <button
              type="button"
              class="w-full rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-light tracking-wide text-white/90 transition-colors hover:bg-white/10"
              @click="router.push('/')"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
