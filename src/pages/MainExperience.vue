<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import {
  Sliders,
  Calendar,
  Filter,
  Users,
  Globe,
  MapPin,
} from "lucide-vue-next";
import Header from "../components/Header.vue";
import WorldMap from "../components/WorldMap.vue";
import HotelRevealCard, {
  type RevealHotel,
} from "../components/HotelRevealCard.vue";
import {
  postSearch,
  getMetaCountries,
  getMetaCities,
  type SearchBody,
  type MetaOption,
} from "../lib/api";
import { useCurrencyStore } from "../stores/currency";
import { formatMoney } from "../lib/formatMoney";

type Phase = "idle" | "scanning" | "revealed";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const router = useRouter();
const { t } = useI18n();
const currencyStore = useCurrencyStore();
const phase = ref<Phase>("idle");
const selectedHotel = ref<RevealHotel | null>(null);
const searchPayload = ref<Record<string, unknown> | null>(null);
const radarPosition = ref<[number, number] | null>(null);
const mapCenter = ref<[number, number]>([0, 20]);
const mapZoom = ref(1);
const budget = ref(300);
const errorMsg = ref<string | null>(null);

const defaultCheckin = addDays(new Date().toISOString().slice(0, 10), 14);
const checkIn = ref(defaultCheckin);
const checkOut = ref(addDays(defaultCheckin, 3));
const guests = ref(2);
/** ISO-3166-1 alpha-2 from LiteAPI; empty = any country */
const countryCode = ref("");
/** City name from LiteAPI list; empty = anywhere in country */
const city = ref("");
const countryOptions = ref<MetaOption[]>([]);
const cityOptions = ref<MetaOption[]>([]);
const countriesLoading = ref(false);
const citiesLoading = ref(false);

const showCityDropdown = computed(() => {
  const cc = countryCode.value.trim();
  return cc.length === 2;
});

onMounted(async () => {
  countriesLoading.value = true;
  try {
    const res = await getMetaCountries();
    countryOptions.value = res.items;
  } catch {
    errorMsg.value = t("main.errorCountries");
  } finally {
    countriesLoading.value = false;
  }
});

watch(countryCode, async (newCode, oldCode) => {
  if (newCode !== oldCode) {
    city.value = "";
  }
  const cc = newCode.trim();
  if (cc.length !== 2) {
    cityOptions.value = [];
    return;
  }
  citiesLoading.value = true;
  try {
    const res = await getMetaCities(cc.toUpperCase());
    cityOptions.value = res.items;
    errorMsg.value = null;
  } catch {
    cityOptions.value = [];
    errorMsg.value = t("main.errorCities");
  } finally {
    citiesLoading.value = false;
  }
});

const stayNights = computed(() => {
  const a = new Date(checkIn.value).getTime();
  const b = new Date(checkOut.value).getTime();
  return Math.max(0, Math.ceil((b - a) / (1000 * 60 * 60 * 24)));
});
const selectedVibes = ref<string[]>([]);

const vibeOptions = ["Beach", "Mountain", "Urban", "Cultural"];

function toggleVibe(v: string) {
  const i = selectedVibes.value.indexOf(v);
  if (i >= 0) selectedVibes.value.splice(i, 1);
  else selectedVibes.value.push(v);
}

function generateRandomCoordinates(): [number, number] {
  const lon = Math.random() * 360 - 180;
  const lat = Math.random() * 140 - 70;
  return [lon, lat];
}

async function startSelection() {
  errorMsg.value = null;
  if (new Date(checkOut.value) <= new Date(checkIn.value)) {
    errorMsg.value = t("main.errorDates");
    return;
  }
  if (stayNights.value < 1) {
    errorMsg.value = t("main.errorNights");
    return;
  }
  phase.value = "scanning";
  const positions: [number, number][] = [];
  for (let i = 0; i < 12; i++) positions.push(generateRandomCoordinates());
  let currentIndex = 0;
  const interval = setInterval(() => {
    if (currentIndex < positions.length) {
      radarPosition.value = positions[currentIndex];
      currentIndex++;
    }
  }, 250);

  const body: SearchBody = {
    budget: budget.value,
    checkin: checkIn.value,
    checkout: checkOut.value,
    adults: guests.value,
    filters:
      selectedVibes.value.length > 0
        ? { vibes: selectedVibes.value }
        : undefined,
  };
  const cc = countryCode.value.trim().toUpperCase();
  if (cc.length === 2) {
    body.countryCode = cc;
  }
  const cityTrim = city.value.trim();
  if (cityTrim) {
    body.city = cityTrim;
  }
  body.currency = currencyStore.currencyCode;

  const minWait = new Promise<void>((r) => setTimeout(r, 3000));
  let data: Record<string, unknown>;
  try {
    const p = postSearch(body);
    await minWait;
    data = await p;
  } catch (e) {
    clearInterval(interval);
    phase.value = "idle";
    radarPosition.value = null;
    errorMsg.value = (e as Error).message;
    return;
  }
  clearInterval(interval);

  const hotel = data.hotel as Record<string, unknown>;
  const lat = Number(data.lat ?? hotel.lat ?? 0);
  const lng = Number(data.lng ?? hotel.lng ?? 0);
  const pricePerNight = Number(data.pricePerNight ?? 0);
  const respCurrency = String(
    (data as { currency?: string }).currency || ""
  ).trim();
  const img = String(hotel.image || "");
  const propImgs = hotel.propertyImages as
    | { url?: string; urlHd?: string }[]
    | undefined;
  const fromGallery =
    Array.isArray(propImgs) && propImgs.length > 0
      ? propImgs
          .map((p) => String(p.urlHd || p.url || "").trim())
          .filter(Boolean)
      : [];
  const imageList = fromGallery.length > 0 ? fromGallery : img ? [img] : [];

  const reveal: RevealHotel = {
    id: String(hotel.id),
    name: String(hotel.name || "Hotel"),
    city: String(hotel.city || ""),
    country: String(hotel.country || ""),
    rating: Number(hotel.rating) || 4.5,
    vibe: (hotel.vibe as string[]) || ["discovered"],
    images: imageList,
    pricePerNight,
    currency:
      respCurrency.length === 3
        ? respCurrency.toUpperCase()
        : currencyStore.currencyCode,
  };

  selectedHotel.value = reveal;
  searchPayload.value = { ...data, _request: body };
  sessionStorage.setItem("travelxplore:lastSearch", JSON.stringify(searchPayload.value));

  radarPosition.value = [lng, lat];
  setTimeout(() => {
    mapCenter.value = [lng, lat];
    mapZoom.value = 4;
    setTimeout(() => {
      phase.value = "revealed";
    }, 2500);
  }, 800);
}

function handleBook() {
  if (!selectedHotel.value) return;
  router.push({
    path: `/booking/${selectedHotel.value.id}`,
    query: {
      checkin: checkIn.value,
      checkout: checkOut.value,
      adults: String(guests.value),
      budget: String(budget.value),
      currency: currencyStore.currencyCode,
    },
  });
}

function resetExperience() {
  phase.value = "idle";
  selectedHotel.value = null;
  searchPayload.value = null;
  radarPosition.value = null;
  mapCenter.value = [0, 20];
  mapZoom.value = 1;
  errorMsg.value = null;
  countryCode.value = "";
  city.value = "";
  cityOptions.value = [];
}

const markerPos = computed<[number, number] | undefined>(() =>
  selectedHotel.value && searchPayload.value
    ? [
        Number((searchPayload.value as { lng?: number }).lng),
        Number((searchPayload.value as { lat?: number }).lat),
      ]
    : undefined
);
</script>

<template>
  <div class="relative w-full h-screen bg-[#0a0a0a] overflow-hidden">
    <Header />
    <div class="absolute inset-0">
      <WorldMap
        :center="mapCenter"
        :zoom="mapZoom"
        :marker-position="markerPos"
        :show-marker="phase === 'revealed'"
        :radar-position="phase === 'scanning' ? radarPosition : null"
      />
    </div>

    <div
      v-if="phase === 'scanning'"
      class="absolute inset-0 pointer-events-none z-[5]"
    >
      <div
        class="absolute inset-0"
        style="
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(220, 38, 38, 0.15) 50%,
            transparent 100%
          );
          animation: sweepV 1.8s linear infinite;
        "
      />
      <div
        class="absolute inset-0"
        style="
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(220, 38, 38, 0.2) 50%,
            transparent 100%
          );
          animation: sweepH 2.5s linear infinite;
        "
      />
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border-2 border-crimson-600/50 shadow-[0_0_30px_rgba(220,38,38,0.4)] animate-ping opacity-80"
      />
      <div
        class="absolute inset-0 opacity-10"
        style="
          background-image: linear-gradient(
              rgba(220, 38, 38, 0.3) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(220, 38, 38, 0.3) 1px,
              transparent 1px
            );
          background-size: 50px 50px;
        "
      />
    </div>

    <div class="relative z-10 flex items-center justify-center h-full p-8 pt-20">
      <div v-if="phase === 'idle'" class="max-w-lg w-full">
        <div
          class="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <div
            class="absolute -inset-1 bg-gradient-to-br from-crimson-600/20 via-transparent to-crimson-600/20 rounded-3xl blur-xl"
          />
          <div class="relative space-y-3">
            <div class="text-center space-y-3 mb-8">
              <h1 class="text-4xl font-light tracking-wider text-white">
                {{ t("app.title") }}
              </h1>
              <p class="text-white/60 text-sm tracking-wide">
                {{ t("app.tagline") }}
              </p>
            </div>
            <p v-if="errorMsg" class="text-center text-sm text-red-400">
              {{ errorMsg }}
            </p>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label
                  class="flex items-center gap-2 text-white/80 text-sm"
                >
                  <Sliders class="w-4 h-4" />
                  {{ t("main.budgetNight") }}
                </label>
                <span class="text-white font-light">{{
                  formatMoney(budget, currencyStore.currencyCode)
                }}</span>
              </div>
              <input
                v-model.number="budget"
                type="range"
                min="100"
                max="1000"
                step="50"
                class="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-crimson-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-crimson-500 transition-all"
              />
            </div>
            <div class="space-y-3">
              <label
                class="flex items-center gap-2 text-white/80 text-sm mb-2"
              >
                <Calendar class="w-4 h-4" />
                {{ t("main.stayDates") }}
              </label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-white/50 mb-1">{{
                    t("main.checkin")
                  }}</label>
                  <input
                    v-model="checkIn"
                    type="date"
                    class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-crimson-600 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label class="block text-xs text-white/50 mb-1">{{
                    t("main.checkout")
                  }}</label>
                  <input
                    v-model="checkOut"
                    type="date"
                    :min="checkIn"
                    class="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-crimson-600 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              <p class="text-white/40 text-xs">
                {{
                  stayNights === 1
                    ? t("main.nightSingle", { n: stayNights })
                    : t("main.nightPlural", { n: stayNights })
                }}
              </p>
            </div>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <label
                  class="flex items-center gap-2 text-white/80 text-sm"
                >
                  <Users class="w-4 h-4" />
                  {{ t("main.guests") }}
                </label>
                <span class="text-white font-light">{{ guests }}</span>
              </div>
              <input
                v-model.number="guests"
                type="range"
                min="1"
                max="6"
                step="1"
                class="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-crimson-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-crimson-500 transition-all"
              />
            </div>
            <div class="space-y-2">
              <label
                class="flex items-center justify-between gap-2 text-white/80 text-sm mb-1"
              >
                <span class="flex items-center gap-2">
                  <Globe class="w-4 h-4 shrink-0" />
                  {{ t("main.countryOptional") }}
                </span>
                <span
                  v-if="countriesLoading"
                  class="text-[10px] uppercase tracking-wider text-crimson-400/90 animate-pulse"
                >
                  {{ t("common.loading") }}
                </span>
              </label>
              <select
                v-model="countryCode"
                :disabled="countriesLoading"
                class="glass-select country-select w-full px-3 py-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-crimson-600/80 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              >
                <option value="" class="bg-[#1a1a1a] text-white">
                  {{ t("main.anyCountry") }}
                </option>
                <option
                  v-for="opt in countryOptions"
                  :key="opt.value"
                  :value="opt.value"
                  class="bg-[#1a1a1a] text-white"
                >
                  {{ opt.label }}
                </option>
              </select>
              <p class="text-white/40 text-xs">
                {{ t("main.countryHint") }}
              </p>
            </div>
            <Transition name="city-reveal">
              <div
                v-if="showCityDropdown"
                class="space-y-2 overflow-hidden"
              >
                <label
                  class="flex items-center justify-between gap-2 text-white/80 text-sm mb-1"
                >
                  <span class="flex items-center gap-2">
                    <MapPin class="w-4 h-4 shrink-0" />
                    {{ t("main.cityOptional") }}
                  </span>
                  <span
                    v-if="citiesLoading"
                    class="text-[10px] uppercase tracking-wider text-crimson-400/90 animate-pulse"
                  >
                    {{ t("common.loading") }}
                  </span>
                </label>
                <select
                  v-model="city"
                  :disabled="citiesLoading"
                  class="glass-select country-select w-full px-3 py-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-crimson-600/80 transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  <option value="" class="bg-[#1a1a1a] text-white">
                    {{ t("main.anywhere") }}
                  </option>
                  <option
                    v-for="opt in cityOptions"
                    :key="opt.value"
                    :value="opt.value"
                    class="bg-[#1a1a1a] text-white"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <p class="text-white/40 text-xs">
                  {{ t("main.cityHint") }}
                </p>
              </div>
            </Transition>
            <div class="space-y-2">
              <label class="flex items-center gap-2 text-white/80 text-sm">
                <Filter class="w-4 h-4" />
                {{ t("main.vibeOptional") }}
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="v in vibeOptions"
                  :key="v"
                  type="button"
                  class="px-4 py-2 rounded-lg text-xs transition-all border"
                  :class="
                    selectedVibes.includes(v)
                      ? 'bg-crimson-600/30 border-crimson-600 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:border-white/20'
                  "
                  @click="toggleVibe(v)"
                >
                  {{ v }}
                </button>
              </div>
            </div>
            <button
              type="button"
              class="relative w-full mt-8 px-6 py-4 bg-crimson-600 hover:bg-crimson-700 text-white rounded-xl transition-all duration-300 overflow-hidden"
              @click="startSelection"
            >
              <span class="relative font-light tracking-wide">{{
                t("main.revealStay")
              }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="phase === 'scanning'" class="text-center space-y-4">
        <div
          class="w-16 h-16 mx-auto border-2 border-crimson-600 border-t-transparent rounded-full animate-spin"
        />
        <p class="text-white/80 text-lg tracking-wide">
          {{ t("main.scanning") }}
        </p>
      </div>

      <div v-else-if="phase === 'revealed' && selectedHotel" class="space-y-6">
        <HotelRevealCard :hotel="selectedHotel" @book="handleBook" />
        <button
          type="button"
          class="mx-auto block px-6 py-2 text-white/60 hover:text-white text-sm tracking-wide transition-colors"
          @click="resetExperience"
        >
          {{ t("main.tryAgain") }}
        </button>
      </div>
    </div>

    <div
      class="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40 z-[1]"
    />
  </div>
</template>

<style scoped>
.glass-select {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
}
.country-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(255,255,255,0.45)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  padding-inline-end: 2.5rem;
}
:global([dir="rtl"]) :deep(.country-select) {
  background-position: left 0.75rem center;
}
.city-reveal-enter-active,
.city-reveal-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease,
    max-height 0.32s ease;
}
.city-reveal-enter-from,
.city-reveal-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  max-height: 0;
}
.city-reveal-enter-to,
.city-reveal-leave-from {
  max-height: 8rem;
}
@keyframes sweepV {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
}
@keyframes sweepH {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
