<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Calendar,
  Users,
  CreditCard,
  Shield,
  Pencil,
  Ban,
  Info,
} from "lucide-vue-next";
import Header from "../components/Header.vue";
import {
  getBookingDetail,
  putBookingCancel,
  putBookingAmend,
  type BookingInternalDetail,
} from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { formatMoney } from "../lib/formatMoney";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const errorMsg = ref<string | null>(null);
const internal = ref<BookingInternalDetail | null>(null);
const lite = ref<unknown>(null);

const cancelOpen = ref(false);
const cancelBusy = ref(false);
const cancelResult = ref<{
  refund?: number;
  fee?: number;
  currency?: string;
  status?: string;
} | null>(null);

const editOpen = ref(false);
const editBusy = ref(false);
const editFirst = ref("");
const editLast = ref("");
const editEmail = ref("");

const toastMsg = ref("");
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string) {
  toastMsg.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMsg.value = "";
    toastTimer = null;
  }, 4000);
}

function liteRoot(l: unknown): Record<string, unknown> | null {
  if (!l || typeof l !== "object") return null;
  const o = l as Record<string, unknown>;
  const d = o.data;
  if (d && typeof d === "object") return d as Record<string, unknown>;
  return o;
}

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}

const liteD = computed(() => liteRoot(lite.value));

const hotelTitle = computed(() => {
  const d = liteD.value;
  const h =
    (d?.hotel as Record<string, unknown> | undefined) ||
    (d?.property as Record<string, unknown> | undefined);
  return (
    str(h?.name) ||
    str(d?.hotelName) ||
    internal.value?.hotelName ||
    "Hotel"
  );
});

const cityDisplay = computed(() => {
  const d = liteD.value;
  const h = d?.hotel as Record<string, unknown> | undefined;
  return str(h?.city) || str(d?.city) || internal.value?.city || "";
});

const roomLabel = computed(() => {
  const int = internal.value;
  if (int?.roomName?.trim()) {
    const rate = int.boardName?.trim() || int.boardType?.trim() || "";
    return rate ? `${int.roomName.trim()} (${rate})` : int.roomName.trim();
  }
  const d = liteD.value;
  return (
    str(d?.roomName) ||
    str(d?.room?.name) ||
    str((d?.room as Record<string, unknown>)?.roomName) ||
    str(d?.rateName) ||
    "—"
  );
});

const hotelImages = computed((): string[] => {
  const d = liteD.value;
  const h = d?.hotel as Record<string, unknown> | undefined;
  const imgs = h?.images ?? h?.hotelImages ?? d?.hotelImages;
  if (!Array.isArray(imgs)) return [];
  return imgs
    .map((x) => {
      if (!x || typeof x !== "object") return "";
      const o = x as Record<string, unknown>;
      return str(o.urlHd || o.url_hd || o.url || o.image);
    })
    .filter(Boolean)
    .slice(0, 8);
});

const guestFirst = computed(() => {
  const d = liteD.value;
  const holder = d?.holder as Record<string, unknown> | undefined;
  return str(holder?.firstName) || str(d?.firstName) || "";
});

const guestLast = computed(() => {
  const d = liteD.value;
  const holder = d?.holder as Record<string, unknown> | undefined;
  return str(holder?.lastName) || str(d?.lastName) || "";
});

const guestEmail = computed(() => {
  const d = liteD.value;
  const holder = d?.holder as Record<string, unknown> | undefined;
  return str(holder?.email) || str(d?.email) || "";
});

const checkInOut = computed(() => {
  const d = liteD.value;
  return {
    in: str(d?.checkIn || d?.checkin || internal.value?.checkin),
    out: str(d?.checkOut || d?.checkout || internal.value?.checkout),
  };
});

const occupancy = computed(() => {
  const d = liteD.value;
  const occ = d?.occupancies ?? d?.occupancy;
  if (Array.isArray(occ) && occ[0] && typeof occ[0] === "object") {
    const o = occ[0] as Record<string, unknown>;
    const a = Number(o.adults ?? o.adultCount);
    if (a > 0) return `${a} adult${a === 1 ? "" : "s"}`;
  }
  const a = Number(d?.adults ?? d?.adultCount);
  if (a > 0) return `${a} adult${a === 1 ? "" : "s"}`;
  return "—";
});

const priceTotal = computed(() => {
  const d = liteD.value;
  const n = Number(d?.price ?? d?.totalPrice ?? internal.value?.totalPrice);
  return Number.isFinite(n) ? n : internal.value?.totalPrice ?? 0;
});

const priceCurrency = computed(() => {
  const d = liteD.value;
  return str(d?.currency) || internal.value?.currency || "USD";
});

const taxesLines = computed(() => {
  const d = liteD.value;
  const raw =
    d?.taxesAndFees ??
    d?.taxes ??
    (d?.priceBreakdown as Record<string, unknown> | undefined)?.taxes;
  if (!Array.isArray(raw)) return [] as { label: string; amount: number }[];
  return raw
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const o = t as Record<string, unknown>;
      const amt = Number(o.amount ?? o.value);
      const label = str(o.description || o.name || "Tax / fee");
      if (!Number.isFinite(amt)) return null;
      return { label, amount: amt };
    })
    .filter((x): x is { label: string; amount: number } => x !== null);
});

const statusDisplay = computed(() => {
  const d = liteD.value;
  return (
    str(d?.status) ||
    internal.value?.status ||
    "—"
  );
});

const cancelPolicyLines = computed(() => {
  const d = liteD.value;
  const pol =
    d?.cancellationPolicies ??
    (d?.cancellationPolicy as Record<string, unknown> | undefined);
  const infos =
    (pol as Record<string, unknown> | undefined)?.cancelPolicyInfos ??
    d?.cancelPolicyInfos;
  if (!Array.isArray(infos)) return [] as Record<string, unknown>[];
  return infos.filter((x) => x && typeof x === "object") as Record<
    string,
    unknown
  >[];
});

const canCancel = computed(() => {
  const s = (statusDisplay.value || "").toUpperCase();
  return !s.includes("CANCEL");
});

const canEditGuest = computed(() => canCancel.value);

async function load() {
  const id = String(route.params.bookingId || "").trim();
  if (!id || !auth.token) {
    errorMsg.value = "Missing booking.";
    loading.value = false;
    return;
  }
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await getBookingDetail(auth.token, id);
    internal.value = res.internal;
    lite.value = res.lite;
    editFirst.value =
      guestFirst.value ||
      res.internal.holderName.split(/\s+/)[0] ||
      "";
    editLast.value =
      guestLast.value ||
      res.internal.holderName.split(/\s+/).slice(1).join(" ") ||
      "";
    editEmail.value = guestEmail.value || "";
  } catch (e) {
    errorMsg.value = (e as Error).message;
    internal.value = null;
    lite.value = null;
  } finally {
    loading.value = false;
  }
}

watch(
  () => route.params.bookingId,
  () => load(),
  { immediate: true }
);

function openEdit() {
  editOpen.value = true;
  if (internal.value) {
    const parts = internal.value.holderName.trim().split(/\s+/);
    editFirst.value = guestFirst.value || parts[0] || "";
    editLast.value =
      guestLast.value || parts.slice(1).join(" ") || "";
    editEmail.value = guestEmail.value || "";
  }
}

async function saveGuest() {
  if (!auth.token || !internal.value) return;
  editBusy.value = true;
  try {
    const res = await putBookingAmend(auth.token, internal.value.id, {
      firstName: editFirst.value.trim(),
      lastName: editLast.value.trim(),
      email: editEmail.value.trim(),
    });
    if (res.internal) internal.value = res.internal;
    lite.value = res.lite;
    editOpen.value = false;
    showToast("Guest details updated.");
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    editBusy.value = false;
  }
}

async function doCancel() {
  if (!auth.token || !internal.value) return;
  cancelBusy.value = true;
  cancelResult.value = null;
  try {
    const res = await putBookingCancel(auth.token, internal.value.id);
    if (res.internal) internal.value = res.internal;
    lite.value = res.lite;
    const L = liteRoot(res.lite);
    const d = (L?.data || L) as Record<string, unknown> | undefined;
    cancelResult.value = {
      status: str(d?.status),
      refund: Number(d?.refund_amount ?? d?.refundAmount),
      fee: Number(d?.cancellation_fee ?? d?.cancellationFee),
      currency: str(d?.currency) || internal.value.currency,
    };
    cancelOpen.value = false;
    showToast("Booking cancelled.");
  } catch (e) {
    showToast((e as Error).message);
  } finally {
    cancelBusy.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white">
    <Header />

    <div class="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20">
      <button
        type="button"
        class="flex items-center gap-2 text-white/55 hover:text-white transition-colors mb-8"
        @click="router.push('/my-bookings')"
      >
        <ArrowLeft class="w-5 h-5" />
        <span class="text-sm tracking-wide">Back to My Bookings</span>
      </button>

      <div
        v-if="loading"
        class="space-y-6 animate-pulse"
      >
        <div class="h-10 w-2/3 max-w-md bg-white/10 rounded-lg" />
        <div class="h-48 rounded-2xl bg-white/5" />
        <div class="h-32 rounded-2xl bg-white/5" />
      </div>

      <div
        v-else-if="errorMsg"
        class="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-8 text-center text-red-200"
      >
        {{ errorMsg }}
      </div>

      <div
        v-else-if="internal"
        class="space-y-8"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-extralight tracking-tight">
              Booking details
            </h1>
            <p class="text-white/45 text-sm mt-1 font-mono">
              {{ internal.bookingId }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-if="canEditGuest"
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm transition-colors"
              @click="openEdit"
            >
              <Pencil class="w-4 h-4" />
              Edit guest info
            </button>
            <button
              v-if="canCancel"
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-sm text-red-200 transition-colors"
              @click="cancelOpen = true"
            >
              <Ban class="w-4 h-4" />
              Cancel booking
            </button>
          </div>
        </div>

        <div
          v-if="cancelResult"
          class="rounded-2xl border border-white/10 bg-emerald-500/10 px-5 py-4 text-sm"
        >
          <p class="text-white/90 font-light">
            Cancellation processed:
            <span class="text-white">{{ cancelResult.status }}</span>
          </p>
          <p
            v-if="Number.isFinite(cancelResult.refund)"
            class="text-emerald-300/90 mt-1"
          >
            Refund:
            {{
              formatMoney(
                cancelResult.refund!,
                cancelResult.currency || priceCurrency
              )
            }}
          </p>
          <p
            v-if="Number.isFinite(cancelResult.fee) && cancelResult.fee! > 0"
            class="text-amber-200/90 mt-1"
          >
            Fee:
            {{
              formatMoney(
                cancelResult.fee!,
                cancelResult.currency || priceCurrency
              )
            }}
          </p>
        </div>

        <!-- Hotel -->
        <section
          class="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8 shadow-xl"
        >
          <h2 class="text-sm uppercase tracking-[0.2em] text-white/45 mb-4">
            Hotel
          </h2>
          <div
            v-if="hotelImages.length"
            class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5"
          >
            <div
              v-for="(src, i) in hotelImages"
              :key="i"
              class="aspect-[4/3] rounded-lg overflow-hidden border border-white/10"
            >
              <img
                :src="src"
                alt=""
                class="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          </div>
          <p class="text-xl font-light text-white">
            {{ hotelTitle }}
          </p>
          <p
            v-if="cityDisplay"
            class="text-white/55 mt-1"
          >
            {{ cityDisplay }}
          </p>
          <p class="text-white/70 mt-4">
            <span class="text-white/45">Room:</span>
            {{ roomLabel }}
          </p>
        </section>

        <!-- Guest -->
        <section
          class="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8"
        >
          <h2 class="text-sm uppercase tracking-[0.2em] text-white/45 mb-4">
            Guest
          </h2>
          <p class="text-lg font-light">
            {{
              [guestFirst, guestLast].filter(Boolean).join(" ") ||
              internal.holderName
            }}
          </p>
          <p class="text-white/60 text-sm mt-2">
            {{ guestEmail || "—" }}
          </p>
        </section>

        <!-- Stay -->
        <section
          class="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8"
        >
          <h2 class="text-sm uppercase tracking-[0.2em] text-white/45 mb-4 flex items-center gap-2">
            <Calendar class="w-4 h-4" />
            Stay
          </h2>
          <div class="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-white/45">Check-in</p>
              <p class="text-white/90 mt-1">
                {{ checkInOut.in || "—" }}
              </p>
            </div>
            <div>
              <p class="text-white/45">Check-out</p>
              <p class="text-white/90 mt-1">
                {{ checkInOut.out || "—" }}
              </p>
            </div>
            <div class="sm:col-span-2 flex items-center gap-2 text-white/80">
              <Users class="w-4 h-4 text-white/45" />
              {{ occupancy }}
            </div>
          </div>
        </section>

        <!-- Pricing -->
        <section
          class="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8"
        >
          <h2 class="text-sm uppercase tracking-[0.2em] text-white/45 mb-4 flex items-center gap-2">
            <CreditCard class="w-4 h-4" />
            Pricing
          </h2>
          <div class="flex justify-between items-baseline gap-4">
            <span class="text-white/55">Total</span>
            <span class="text-2xl font-light tabular-nums">{{
              formatMoney(priceTotal, priceCurrency)
            }}</span>
          </div>
          <ul
            v-if="taxesLines.length"
            class="mt-4 space-y-2 border-t border-white/10 pt-4"
          >
            <li
              v-for="(t, i) in taxesLines"
              :key="i"
              class="flex justify-between text-sm text-white/65"
            >
              <span>{{ t.label }}</span>
              <span>{{ formatMoney(t.amount, priceCurrency) }}</span>
            </li>
          </ul>
        </section>

        <!-- Status -->
        <section
          class="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8"
        >
          <h2 class="text-sm uppercase tracking-[0.2em] text-white/45 mb-3 flex items-center gap-2">
            <Shield class="w-4 h-4" />
            Status
          </h2>
          <p
            class="inline-flex px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white/90"
          >
            {{ statusDisplay }}
          </p>
          <p
            v-if="internal.refundAmount != null || internal.cancellationFee != null"
            class="text-sm text-white/50 mt-4"
          >
            <span v-if="internal.refundAmount != null"
              >Refund recorded:
              {{ formatMoney(internal.refundAmount, internal.currency) }}</span
            >
            <span
              v-if="internal.cancellationFee != null"
              class="block mt-1"
              >Fee recorded:
              {{ formatMoney(internal.cancellationFee, internal.currency) }}</span
            >
          </p>
        </section>

        <!-- Cancellation policy -->
        <section
          class="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 md:p-8"
        >
          <h2 class="text-sm uppercase tracking-[0.2em] text-white/45 mb-4 flex items-center gap-2">
            <Info class="w-4 h-4" />
            Cancellation policy
          </h2>
          <ul
            v-if="cancelPolicyLines.length"
            class="space-y-3 text-sm text-white/70"
          >
            <li
              v-for="(line, i) in cancelPolicyLines"
              :key="i"
              class="border-b border-white/5 pb-3 last:border-0"
            >
              <template v-if="line.cancelTime">
                {{ str(line.cancelTime) }}
              </template>
              <span
                v-if="line.amount != null"
                class="block text-white/55 mt-1"
              >
                Amount:
                {{
                  formatMoney(
                    Number(line.amount),
                    str(line.currency) || priceCurrency
                  )
                }}
              </span>
            </li>
          </ul>
          <p
            v-else
            class="text-white/45 text-sm"
          >
            See your confirmation email or supplier terms for cancellation rules.
          </p>
        </section>
      </div>
    </div>

    <!-- Cancel confirm -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="cancelOpen"
          class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/80 backdrop-blur-sm"
            @click="cancelOpen = false"
          />
          <div
            class="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl p-8 space-y-5"
          >
            <h3 class="text-lg font-light">Cancel this booking?</h3>
            <p class="text-sm text-white/55">
              Supplier cancellation policies apply. You may receive a refund or
              be charged a fee depending on timing.
            </p>
            <div class="flex gap-3 justify-end pt-2">
              <button
                type="button"
                class="px-4 py-2 rounded-lg border border-white/15 text-sm hover:bg-white/5"
                @click="cancelOpen = false"
              >
                Keep booking
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm disabled:opacity-50"
                :disabled="cancelBusy"
                @click="doCancel"
              >
                {{ cancelBusy ? "Cancelling…" : "Confirm cancel" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit guest -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="editOpen"
          class="fixed inset-0 z-[200] flex items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-black/80 backdrop-blur-sm"
            @click="editOpen = false"
          />
          <div
            class="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl p-8 space-y-4"
          >
            <h3 class="text-lg font-light">Edit guest (holder)</h3>
            <div class="space-y-3">
              <input
                v-model="editFirst"
                type="text"
                placeholder="First name"
                class="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              />
              <input
                v-model="editLast"
                type="text"
                placeholder="Last name"
                class="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              />
              <input
                v-model="editEmail"
                type="email"
                placeholder="Email"
                class="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
              />
            </div>
            <div class="flex gap-3 justify-end pt-2">
              <button
                type="button"
                class="px-4 py-2 rounded-lg border border-white/15 text-sm"
                @click="editOpen = false"
              >
                Close
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-crimson-600 text-sm disabled:opacity-50"
                :disabled="editBusy"
                @click="saveGuest"
              >
                {{ editBusy ? "Saving…" : "Save" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-200"
      leave-to-class="opacity-0"
    >
      <div
        v-if="toastMsg"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-xl bg-white/10 border border-white/20 backdrop-blur-xl text-sm text-white shadow-xl"
      >
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
