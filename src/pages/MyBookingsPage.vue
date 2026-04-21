<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { watchDebounced } from "@vueuse/core";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-vue-next";
import Header from "../components/Header.vue";
import { getUserBookings, type UserBookingItem } from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { formatMoney } from "../lib/formatMoney";

const { t, locale } = useI18n();
const auth = useAuthStore();
const router = useRouter();

function localeTag(): string {
  const l = (locale.value || "en").toLowerCase();
  if (l === "zh") return "zh-CN";
  return l;
}

function goDetail(id: string) {
  router.push({ name: "booking-detail", params: { bookingId: id } });
}

const loading = ref(true);
const errorMsg = ref<string | null>(null);
const bookings = ref<UserBookingItem[]>([]);
const total = ref(0);
const page = ref(1);
const limit = 6;
const searchInput = ref("");

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / limit))
);

function fmtBookingDate(iso: string) {
  if (!iso) return t("common.emDash");
  try {
    const d = new Date(iso);
    return d.toLocaleString(localeTag(), {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function dateRange(row: UserBookingItem) {
  const dash = t("common.emDash");
  const arrow = t("myBookings.dateRangeArrow");
  if (!row.checkin && !row.checkout) return dash;
  if (row.checkin && row.checkout)
    return `${row.checkin}${arrow}${row.checkout}`;
  return row.checkin || row.checkout || dash;
}

async function load() {
  if (!auth.token) return;
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await getUserBookings(auth.token, {
      page: page.value,
      limit,
      q: searchInput.value,
    });
    bookings.value = res.bookings;
    total.value = res.total;
  } catch (e) {
    errorMsg.value = (e as Error).message;
    bookings.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

watchDebounced(
  searchInput,
  () => {
    page.value = 1;
    load();
  },
  { debounce: 350 }
);

onMounted(() => {
  load();
});

function prevPage() {
  if (page.value <= 1) return;
  page.value--;
  load();
}

function nextPage() {
  if (page.value >= totalPages.value) return;
  page.value++;
  load();
}
function statusTagClasses(status: string | undefined): string {
  const s = (status || "").trim().toUpperCase();

  const base =
    "border backdrop-blur-sm shadow-[0_0_8px_rgba(255,255,255,0.05)]";

  if (!s) {
    return `${base} bg-white/5 border-white/10 text-white/70`;
  }

  if (s.includes("CANCEL")) {
    return `${base} bg-rose-400/10 border-rose-300/40 text-rose-200 shadow-[0_0_10px_rgba(251,113,133,0.25)]`;
  }

  if (s.includes("PENDING") || s.includes("PROCESS")) {
    return `${base} bg-amber-400/10 border-amber-300/40 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.25)]`;
  }

  if (s.includes("FAIL") || s.includes("ERROR") || s.includes("REJECT")) {
    return `${base} bg-red-400/10 border-red-300/40 text-red-200 shadow-[0_0_10px_rgba(248,113,113,0.25)]`;
  }

  if (
    s.includes("CONFIRM") ||
    s === "BOOKED" ||
    s === "OK" ||
    s.includes("COMPLETE")
  ) {
    return `${base} bg-emerald-400/10 border-emerald-300/40 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.25)]`;
  }

  return `${base} bg-white/5 border-white/15 text-white/85`;
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white">
    <Header />
    <main class="pt-28 pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <div class="mb-8">
        <h1 class="text-2xl md:text-3xl font-extralight tracking-tight mb-2">
          {{ t("nav.myBookings") }}
        </h1>
        <p class="text-white/45 text-sm font-light">
          {{ t("myBookings.subtitle") }}
        </p>
      </div>

      <div
        class="relative rounded-2xl border border-white/10 bg-black/35 backdrop-blur-2xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.75)] overflow-hidden"
      >
        <div
          class="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"
        >
          <div class="relative flex-1 max-w-md">
            <Search
              class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none"
            />
            <input
              v-model="searchInput"
              type="search"
              :placeholder="t('myBookings.searchPlaceholder')"
              class="w-full ps-10 pe-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-crimson-600/60 transition-colors"
              autocomplete="off"
            />
          </div>
        </div>

        <div v-if="loading" class="p-16 flex flex-col items-center justify-center gap-3 text-white/50">
          <Loader2 class="w-8 h-8 animate-spin text-crimson-500/80" />
          <span class="text-sm font-light">{{ t("myBookings.loading") }}</span>
        </div>

        <div
          v-else-if="errorMsg"
          class="p-10 text-center text-red-400 text-sm"
        >
          {{ errorMsg }}
        </div>

        <div
          v-else-if="!bookings.length"
          class="p-16 text-center"
        >
          <p class="text-lg font-light text-white/70">{{ t("myBookings.emptyTitle") }}</p>
          <p class="text-sm text-white/40 mt-2 font-light">
            {{ t("myBookings.emptyHint") }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[880px] text-start text-sm">
            <thead>
              <tr
                class="border-b border-white/10 text-white/45 font-light uppercase tracking-wider text-[11px]"
              >
                <th class="px-4 py-3">{{ t("myBookings.colHotel") }}</th>
                <th class="px-4 py-3">{{ t("myBookings.colBookingId") }}</th>
                <th class="px-4 py-3">{{ t("myBookings.colHolder") }}</th>
                <th class="px-4 py-3">{{ t("myBookings.colCity") }}</th>
                <th class="px-4 py-3">{{ t("myBookings.colDates") }}</th>
                <th class="px-4 py-3 text-end">{{ t("myBookings.colAmount") }}</th>
                <th class="px-4 py-3">{{ t("myBookings.colStatus") }}</th>
                <th class="px-4 py-3">{{ t("myBookings.colBookingDate") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in bookings"
                :key="row.id"
                class="border-b border-white/5 transition-colors duration-200 hover:bg-white/[0.04] cursor-pointer"
                @click="goDetail(row.id)"
              >
                <td class="px-4 py-3.5 text-white/90 font-light max-w-[220px]">
                  <div>{{ row.hotelName || t("common.emDash") }}</div>
                  <div
                    v-if="row.roomName || row.boardName"
                    class="mt-1 text-[11px] text-white/40 font-light leading-snug line-clamp-2"
                  >
                    <span v-if="row.roomName">{{ row.roomName }}</span>
                    <span v-if="row.roomName && row.boardName"> · </span>
                    <span v-if="row.boardName">{{ row.boardName }}</span>
                  </div>
                </td>
                <td class="px-4 py-3.5 text-white/70 font-mono text-xs">
                  {{ row.bookingId }}
                </td>
                <td class="px-4 py-3.5 text-white/75">
                  {{ row.holderName || t("common.emDash") }}
                </td>
                <td class="px-4 py-3.5 text-white/55">
                  {{ row.city || t("common.emDash") }}
                </td>
                <td class="px-4 py-3.5 text-white/65 whitespace-nowrap text-xs">
                  {{ dateRange(row) }}
                </td>
                <td class="px-4 py-3.5 text-end font-light tabular-nums">
                  {{ formatMoney(row.amount, row.currency) }}
                </td>
                <td class="px-4 py-3.5">
                  <span
                    class="inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border transition-colors"
                    :class="statusTagClasses(row.status)"
                  >
                    {{ row.status }}
                  </span>
                </td>
                <td class="px-4 py-3.5 text-white/50 text-xs whitespace-nowrap">
                  {{ fmtBookingDate(row.bookingDate) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="!loading && !errorMsg && bookings.length"
          class="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 border-t border-white/10 bg-black/20"
        >
          <p class="text-xs text-white/50 font-light">
            {{ t("myBookings.pageInfo", { page, totalPages, total }) }}
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white/80 hover:bg-white/10 hover:border-white/25 disabled:opacity-35 disabled:pointer-events-none transition-all"
              :disabled="page <= 1"
              @click="prevPage"
            >
              <ChevronLeft class="w-4 h-4" />
              {{ t("myBookings.previous") }}
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white/80 hover:bg-white/10 hover:border-white/25 disabled:opacity-35 disabled:pointer-events-none transition-all"
              :disabled="page >= totalPages"
              @click="nextPage"
            >
              {{ t("myBookings.next") }}
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
