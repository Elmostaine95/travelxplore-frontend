<template>
  <div ref="rootRef" class="relative shrink-0">
    <button
      type="button"
      class="flex items-center gap-1.5 sm:gap-2 pl-2 pr-2.5 py-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all duration-200"
      :aria-expanded="open"
      aria-haspopup="listbox"
      :aria-label="t('header.selectLanguage')"
      @click="open = !open"
    >
      <span class="text-base leading-none" aria-hidden="true">{{ current.flag }}</span>
      <span class="hidden sm:inline text-[11px] font-medium tracking-wide uppercase text-white/85">{{
        current.code
      }}</span>
      <ChevronDown
        class="w-3.5 h-3.5 text-white/45 transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      />
    </button>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="absolute end-0 top-[calc(100%+8px)] w-[min(calc(100vw-2rem),320px)] max-h-[min(70vh,420px)] overflow-y-auto rounded-2xl border border-white/12 bg-[#0f0f0f]/95 backdrop-blur-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.75)] py-2 z-[120]"
        role="listbox"
      >
        <button
          v-for="lang in SUPPORTED_LOCALES"
          :key="lang.code"
          type="button"
          role="option"
          :aria-selected="localeStore.code === lang.code"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-start transition-colors"
          :class="
            localeStore.code === lang.code
              ? 'bg-crimson-600/20 text-white'
              : 'text-white/85 hover:bg-white/5'
          "
          @click="select(lang.code)"
        >
          <span class="text-xl shrink-0" aria-hidden="true">{{ lang.flag }}</span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium truncate">{{ lang.native }}</span>
            <span class="block text-[11px] text-white/40 uppercase tracking-wider">{{
              lang.code
            }}</span>
          </span>
          <Check
            v-if="localeStore.code === lang.code"
            class="w-4 h-4 text-crimson-400 shrink-0"
          />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { onClickOutside } from "@vueuse/core";
import { ChevronDown, Check } from "lucide-vue-next";
import { SUPPORTED_LOCALES } from "../constants/languages";
import { useLocaleStore } from "../stores/locale";

const { t } = useI18n();
const localeStore = useLocaleStore();
const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const current = computed(() => {
  const hit = SUPPORTED_LOCALES.find((l) => l.code === localeStore.code);
  return hit ?? SUPPORTED_LOCALES[0];
});

function select(code: string) {
  localeStore.setLocale(code);
  open.value = false;
}

onClickOutside(rootRef, () => {
  open.value = false;
});

watch(
  () => localeStore.code,
  () => {
    open.value = false;
  }
);
</script>
