<template>
  <div
    v-motion
    :initial="{ opacity: 0, y: 100, filter: 'blur(20px)' }"
    :enter="{
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 1200, ease: [0.25, 0.1, 0.25, 1], delay: 500 },
    }"
    class="relative max-w-md w-full"
  >
    <div
      class="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
    >
      <div
        class="absolute inset-0 rounded-2xl pointer-events-none"
        style="
          background: linear-gradient(
            135deg,
            rgba(220, 38, 38, 0.3),
            transparent 50%
          );
          animation: pulseGlow 3s ease-in-out infinite;
        "
      />
      <div class="relative">
        <div class="relative h-64 overflow-hidden">
          <ImageSlider
            v-if="gallerySlides.length"
            :slides="gallerySlides"
            aspect-class="h-full w-full min-h-[16rem]"
          />
          <img
            v-else
            :src="heroImage"
            :alt="hotel.name"
            class="w-full h-full object-cover transition-transform duration-[1.5s] ease-out scale-100 min-h-[16rem]"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"
          />
          <div
            class="absolute top-4 start-4 z-10 flex items-center gap-1 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/20 pointer-events-none"
          >
            <Star class="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span class="text-sm text-white">{{ hotel.rating }}</span>
          </div>
          <div
            class="absolute top-4 end-4 z-10 p-2 bg-crimson-600/80 backdrop-blur-md rounded-full border border-white/20 pointer-events-none"
          >
            <MapPin class="w-5 h-5 text-white" />
          </div>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <h2 class="text-2xl font-light tracking-wide text-white mb-1">
              {{ hotel.name }}
            </h2>
            <p class="text-white/60 text-sm">
              {{ hotel.city }}, {{ hotel.country }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(v, i) in hotel.vibe"
              :key="i"
              class="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/60"
            >
              {{ v }}
            </span>
          </div>
          <div class="flex items-baseline gap-2 flex-wrap pt-2">
            <Coins class="w-5 h-5 text-crimson-500 shrink-0 self-center" />
            <span class="text-3xl font-light text-white tracking-tight">{{
              formattedPrice
            }}</span>
            <span class="text-white/50 text-sm">{{ t("main.perNight") }}</span>
          </div>
          <button
            type="button"
            class="relative w-full mt-4 px-6 py-4 bg-crimson-600 hover:bg-crimson-700 text-white rounded-xl transition-all duration-300 overflow-hidden"
            @click="emit('book')"
          >
            <span class="relative font-light tracking-wide">{{
              t("main.bookStay")
            }}</span>
          </button>
        </div>
      </div>
    </div>
    <div
      class="absolute inset-0 -z-10 bg-crimson-600/20 blur-3xl rounded-2xl"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { MapPin, Star, Coins } from "lucide-vue-next";

const { t } = useI18n();
import ImageSlider, { type Slide } from "./ImageSlider.vue";
import { formatMoney } from "../lib/formatMoney";

export interface RevealHotel {
  id: string;
  name: string;
  city: string;
  country: string;
  rating: number;
  vibe: string[];
  images: string[];
  pricePerNight: number;
  /** ISO 4217 from search API */
  currency?: string;
}

const props = defineProps<{ hotel: RevealHotel }>();
const emit = defineEmits<{ book: [] }>();

const formattedPrice = computed(() =>
  formatMoney(
    props.hotel.pricePerNight,
    props.hotel.currency || "USD"
  )
);

const heroImage = computed(
  () =>
    props.hotel.images[0] ||
    "https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=1080"
);

const gallerySlides = computed<Slide[]>(() => {
  const urls = props.hotel.images.filter(Boolean);
  if (!urls.length) return [];
  return urls.map((src) => ({
    src,
    alt: props.hotel.name,
  }));
});
</script>

<style scoped>
@keyframes pulseGlow {
  0%,
  100% {
    opacity: 0.3;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
