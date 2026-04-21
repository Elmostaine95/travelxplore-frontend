<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div
          class="absolute inset-0 bg-black/80 backdrop-blur-sm"
          @click="emit('close')"
        />
        <div
          class="relative w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
        >
          <button
            type="button"
            class="absolute top-3 right-3 z-20 w-10 h-10 rounded-full bg-black/50 border border-white/20 text-white flex items-center justify-center hover:bg-black/70"
            aria-label="Close"
            @click="emit('close')"
          >
            <X class="w-5 h-5" />
          </button>

          <div class="overflow-y-auto flex-1 min-h-0">
            <ImageSlider
              v-if="roomSlides.length"
              :slides="roomSlides"
              aspect-class="aspect-video w-full"
            />
            <div v-else class="aspect-video bg-white/5 flex items-center justify-center text-white/40 text-sm">
              No room photos from supplier
            </div>

            <div class="p-6 space-y-6 text-white">
              <h3 :id="titleId" class="text-xl font-light tracking-wide pr-10">
                {{ roomTitle }}
              </h3>

              <div
                v-if="offer?.boardName || offer?.cancellationSummary"
                class="flex flex-wrap gap-2 text-sm"
              >
                <span
                  v-if="offer?.boardName"
                  class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80"
                >
                  {{ offer.boardName }}
                </span>
                <span
                  v-if="offer?.cancellationSummary"
                  class="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80"
                >
                  {{ offer.cancellationSummary }}
                </span>
              </div>

              <section v-if="sizeLine" class="space-y-2">
                <h4 class="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Room size
                </h4>
                <p class="text-white/90">{{ sizeLine }}</p>
              </section>

              <section v-if="amenityChips.length" class="space-y-2">
                <h4 class="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Amenities
                </h4>
                <ul class="flex flex-wrap gap-2">
                  <li
                    v-for="(a, i) in amenityChips"
                    :key="i"
                    class="px-2.5 py-1 rounded-md bg-crimson-600/15 border border-crimson-600/30 text-xs text-white/85"
                  >
                    {{ a }}
                  </li>
                </ul>
              </section>

              <section v-if="catalog?.description" class="space-y-2">
                <h4 class="text-sm font-medium text-white/50 uppercase tracking-wider">
                  General information
                </h4>
                <SafeHotelHtml
                  :html="String(catalog.description)"
                  content-class="text-white/80 text-sm leading-relaxed"
                />
              </section>

              <section v-if="internetAmenities.length" class="space-y-2">
                <h4 class="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Internet
                </h4>
                <ul class="list-disc list-inside text-sm text-white/80 space-y-1">
                  <li v-for="(line, i) in internetAmenities" :key="i">
                    {{ line }}
                  </li>
                </ul>
              </section>

              <section v-if="serviceAmenities.length" class="space-y-2">
                <h4 class="text-sm font-medium text-white/50 uppercase tracking-wider">
                  Services
                </h4>
                <ul class="flex flex-wrap gap-2">
                  <li
                    v-for="(a, i) in serviceAmenities"
                    :key="i"
                    class="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/75"
                  >
                    {{ a }}
                  </li>
                </ul>
              </section>

            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { X } from "lucide-vue-next";
import ImageSlider, { type Slide } from "./ImageSlider.vue";
import SafeHotelHtml from "./SafeHotelHtml.vue";

export interface RoomOfferRow {
  roomId: string;
  name: string;
  boardName?: string;
  cancellationSummary?: string;
  mappedRoomId?: number;
}

export interface RoomCatalogRow {
  id?: number;
  roomName?: string;
  description?: string;
  roomSizeSquare?: number;
  roomSizeUnit?: string;
  roomAmenities?: { name?: string }[];
  photos?: {
    url?: string;
    hd_url?: string;
    imageDescription?: string;
  }[];
}

const props = defineProps<{
  open: boolean;
  offer: RoomOfferRow | null;
  catalog: RoomCatalogRow | null;
}>();
const emit = defineEmits<{ close: [] }>();

const titleId = "room-details-title";

const roomTitle = computed(
  () =>
    props.catalog?.roomName ||
    props.offer?.name ||
    "Room details"
);

function photoSrc(p: Record<string, unknown>): string {
  return String(
    p.hd_url ||
      p.urlHd ||
      p.url_hd ||
      p.url ||
      ""
  ).trim();
}

const roomSlides = computed<Slide[]>(() => {
  const photos = props.catalog?.photos;
  if (!photos?.length) return [];
  return photos
    .map((raw) => {
      const p = raw as Record<string, unknown>;
      const src = photoSrc(p);
      if (!src) return null;
      const cap = p.imageDescription || p.caption || p.description;
      return {
        src,
        alt: (typeof cap === "string" ? cap : props.offer?.name) || "Room",
        caption: typeof cap === "string" ? cap : undefined,
      } as Slide;
    })
    .filter((s): s is Slide => s !== null);
});

const sizeLine = computed(() => {
  const c = props.catalog;
  if (!c?.roomSizeSquare) return "";
  const u = c.roomSizeUnit || "m²";
  return `${c.roomSizeSquare} ${u}`;
});

const amenityNames = computed(() => {
  const raw = props.catalog?.roomAmenities;
  if (!raw?.length) return [];
  return raw
    .map((a) => {
      if (typeof a === "string") return a.trim();
      const o = a as { name?: string };
      return (o.name || "").trim();
    })
    .filter(Boolean);
});

const internetAmenities = computed(() => {
  const net = amenityNames.value.filter((n) =>
    /wifi|wi-fi|internet|wlan|broadband/i.test(n)
  );
  return net.length ? net : [];
});

const serviceAmenities = computed(() => {
  const skip = new Set(internetAmenities.value.map((x) => x.toLowerCase()));
  return amenityNames.value.filter(
    (n) => !skip.has(n.toLowerCase()) && !/wifi|wi-fi|internet|wlan|broadband/i.test(n)
  );
});

const amenityChips = computed(() => {
  if (!amenityNames.value.length) return [];
  return amenityNames.value;
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
