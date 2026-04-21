<template>
  <Teleport to="body">
    <Transition name="backdrop-fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-modal-title"
        @keydown.escape="close"
      >
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          aria-hidden="true"
          @click="close"
        />
        <Transition name="panel-zoom">
          <div
            v-if="modelValue"
            class="relative w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col rounded-2xl border border-white/12 bg-[#0c0c0c]/85 backdrop-blur-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
            @click.stop
          >
            <div
              class="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0"
            >
              <h2
                id="currency-modal-title"
                class="text-lg font-medium text-white tracking-tight"
              >
                {{ t("header.selectCurrency") }}
              </h2>
              <button
                type="button"
                class="p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                :aria-label="t('common.close')"
                @click="close"
              >
                <X class="w-5 h-5" />
              </button>
            </div>

            <div class="flex flex-col flex-1 min-h-0">
              <div class="px-5 pt-4 pb-2 shrink-0">
                <div class="relative">
                  <Search
                    class="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35 pointer-events-none"
                  />
                  <input
                    v-model="searchQuery"
                    type="search"
                    :placeholder="t('currency.search')"
                    class="w-full ps-10 pe-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/35 focus:outline-none focus:border-crimson-600/60 transition-colors"
                  />
                </div>
              </div>
              <div
                class="flex-1 overflow-y-auto px-5 pb-6 scrollbar-thin scrollbar-thumb-white/10"
              >
                <section v-if="filteredSuggested.length" class="mb-6">
                  <h3
                    class="text-[11px] uppercase tracking-wider text-white/40 mb-3 font-medium"
                  >
                    {{ t("currency.suggested") }}
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      v-for="c in filteredSuggested"
                      :key="c.code"
                      type="button"
                      class="currency-card text-start px-3 py-3 rounded-xl border transition-all duration-200"
                      :class="cardClass(c.code)"
                      @click="select(c.code)"
                    >
                      <span class="block text-sm text-white/95 font-medium leading-tight">{{
                        c.name
                      }}</span>
                      <span class="block text-xs text-white/45 mt-0.5">{{ c.code }}</span>
                    </button>
                  </div>
                </section>
                <section>
                  <h3
                    class="text-[11px] uppercase tracking-wider text-white/40 mb-3 font-medium"
                  >
                    {{ t("currency.all") }}
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      v-for="c in filteredAll"
                      :key="c.code"
                      type="button"
                      class="currency-card text-start px-3 py-3 rounded-xl border transition-all duration-200"
                      :class="cardClass(c.code)"
                      @click="select(c.code)"
                    >
                      <span class="block text-sm text-white/95 font-medium leading-tight">{{
                        c.name
                      }}</span>
                      <span class="block text-xs text-white/45 mt-0.5">{{ c.code }}</span>
                    </button>
                  </div>
                  <p
                    v-if="!filteredAll.length && !filteredSuggested.length"
                    class="text-center text-white/45 text-sm py-8"
                  >
                    {{ t("currency.none") }}
                  </p>
                </section>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { X, Search } from "lucide-vue-next";
import {
  ALL_CURRENCIES,
  SUGGESTED_CURRENCY_CODES,
  suggestedCurrencies,
  type CurrencyItem,
} from "../data/currencies";
import { useCurrencyStore } from "../stores/currency";

const { t } = useI18n();
const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ (e: "update:modelValue", v: boolean): void }>();

const currencyStore = useCurrencyStore();
const searchQuery = ref("");

const suggestedSet = new Set<string>([...SUGGESTED_CURRENCY_CODES]);

const allExcludingSuggested = computed(() =>
  ALL_CURRENCIES.filter((c) => !suggestedSet.has(c.code))
);

function matches(c: CurrencyItem, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  return (
    c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)
  );
}

const filteredSuggested = computed(() => {
  const q = searchQuery.value;
  return suggestedCurrencies.filter((c) => matches(c, q));
});

const filteredAll = computed(() => {
  const q = searchQuery.value;
  return allExcludingSuggested.value.filter((c) => matches(c, q));
});

function cardClass(code: string): string {
  const on = currencyStore.currencyCode === code;
  return on
    ? "border-crimson-500/90 bg-crimson-600/12 shadow-[0_0_0_1px_rgba(220,38,38,0.25)]"
    : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]";
}

function select(code: string) {
  currencyStore.setCurrency(code);
  close();
}

function close() {
  emit("update:modelValue", false);
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      searchQuery.value = "";
    }
  }
);
</script>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 6px;
}
.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.25s ease;
}
.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}
.panel-zoom-enter-active,
.panel-zoom-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.panel-zoom-enter-from,
.panel-zoom-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
</style>
