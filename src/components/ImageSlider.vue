<template>
  <div
    class="relative group rounded-xl overflow-hidden bg-black/40"
    :class="aspectClass"
  >
    <div
      ref="scroller"
      class="flex h-full w-full overflow-x-auto scroll-smooth snap-x snap-mandatory touch-pan-x scrollbar-none"
      @scroll="onScroll"
    >
      <div
        v-for="(slide, i) in slides"
        :key="i"
        class="min-w-full h-full snap-center shrink-0 relative"
      >
        <img
          :src="slide.src"
          :alt="slide.alt || 'Property image'"
          class="w-full h-full object-cover select-none pointer-events-none"
          loading="lazy"
          decoding="async"
          draggable="false"
        />
        <div
          v-if="slide.caption"
          class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2"
        >
          <p class="text-white/90 text-xs truncate">{{ slide.caption }}</p>
        </div>
      </div>
    </div>

    <template v-if="slides.length > 1">
      <button
        type="button"
        class="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-opacity opacity-90 hover:opacity-100 backdrop-blur-sm"
        aria-label="Previous image"
        @click="go(-1)"
      >
        <ChevronLeft class="w-6 h-6" />
      </button>
      <button
        type="button"
        class="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center transition-opacity opacity-90 hover:opacity-100 backdrop-blur-sm"
        aria-label="Next image"
        @click="go(1)"
      >
        <ChevronRight class="w-6 h-6" />
      </button>
      <div
        class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10"
      >
        <button
          v-for="(_, i) in slides"
          :key="i"
          type="button"
          class="h-1.5 rounded-full transition-all"
          :class="
            i === activeIndex ? 'bg-white w-6' : 'bg-white/40 w-1.5 hover:bg-white/60'
          "
          :aria-label="`Go to image ${i + 1}`"
          @click="goTo(i)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";

export interface Slide {
  src: string;
  alt?: string;
  caption?: string;
}

const props = withDefaults(
  defineProps<{
    slides: Slide[];
    aspectClass?: string;
  }>(),
  {
    aspectClass: "aspect-[4/3] md:aspect-video",
  }
);

const scroller = ref<HTMLElement | null>(null);
const activeIndex = ref(0);

function onScroll() {
  const el = scroller.value;
  if (!el || !el.clientWidth) return;
  const i = Math.round(el.scrollLeft / el.clientWidth);
  activeIndex.value = Math.min(Math.max(0, i), props.slides.length - 1);
}

function go(delta: number) {
  const el = scroller.value;
  if (!el || !props.slides.length) return;
  const w = el.clientWidth;
  const next = Math.round(el.scrollLeft / w) + delta;
  const clamped = Math.min(Math.max(0, next), props.slides.length - 1);
  el.scrollTo({ left: clamped * w, behavior: "smooth" });
}

function goTo(i: number) {
  const el = scroller.value;
  if (!el) return;
  el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
}

function onKey(e: KeyboardEvent) {
  if (e.key === "ArrowLeft") go(-1);
  if (e.key === "ArrowRight") go(1);
}

watch(
  () => props.slides.length,
  () => {
    activeIndex.value = 0;
    if (scroller.value) scroller.value.scrollLeft = 0;
  }
);

onMounted(() => {
  window.addEventListener("keydown", onKey);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
});
</script>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
