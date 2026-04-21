<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { onClickOutside, useEventListener } from "@vueuse/core";
import { ChevronDown, Filter } from "lucide-vue-next";
import {
  COUNTRY_DIAL_LIST,
  type CountryDialEntry,
  normalizeDialCode,
} from "@/data/countryDialCodes";

const props = defineProps<{
  dialCode: string;
  nationalNumber: string;
  error?: string;
  /** For label `for` + input `id` (accessibility). */
  nationalInputId?: string;
  /** Id of the error message element when `error` is set. */
  errorId?: string;
  /** Locks country code and number (e.g. during LiteAPI payment step). */
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  "update:dialCode": [value: string];
  "update:nationalNumber": [value: string];
  nationalBlur: [];
}>();

const open = ref(false);
const search = ref("");
const wrapperRef = ref<HTMLElement | null>(null);
onClickOutside(wrapperRef, () => {
  open.value = false;
});

useEventListener(
  () => (open.value ? document.body : null),
  "keydown",
  (e: KeyboardEvent) => {
    if (e.key === "Escape") open.value = false;
  }
);

const currentDial = computed(() => normalizeDialCode(props.dialCode || "+1"));

const filteredCountries = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return COUNTRY_DIAL_LIST;
  return COUNTRY_DIAL_LIST.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true;
    if (c.dial.toLowerCase().includes(q)) return true;
    const qDigits = q.replace(/\D/g, "");
    if (qDigits && c.dial.replace(/\D/g, "").startsWith(qDigits)) return true;
    return c.iso2.toLowerCase() === q;
  });
});

function pick(c: CountryDialEntry) {
  emit("update:dialCode", c.dial);
  open.value = false;
  search.value = "";
}

function onNationalInput(e: Event) {
  if (props.readOnly) return;
  const raw = (e.target as HTMLInputElement).value.replace(/\D/g, "");
  emit("update:nationalNumber", raw);
}

function toggleOpen() {
  if (props.readOnly) return;
  open.value = !open.value;
  if (open.value) {
    search.value = "";
  }
}

watch(open, (v) => {
  if (v) {
    setTimeout(() => {
      const el = wrapperRef.value?.querySelector(
        "[data-phone-search]"
      ) as HTMLInputElement | null;
      el?.focus();
    }, 0);
  }
});
</script>

<template>
  <div ref="wrapperRef" class="relative w-full">
    <div class="flex gap-2 items-stretch">
      <div class="relative shrink-0 min-w-[6.25rem]">
        <button
          v-if="!readOnly"
          type="button"
          class="flex h-full w-full min-w-[6.25rem] items-center justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-left text-sm text-white transition-colors"
          :class="
            open
              ? 'border-crimson-500/70 bg-white/[0.08] ring-1 ring-crimson-500/35'
              : error
                ? 'border-red-500/55 bg-red-500/5'
                : 'border-white/10 bg-white/5 hover:border-white/20'
          "
          :aria-expanded="open"
          aria-haspopup="listbox"
          aria-label="Country calling code"
          @click="toggleOpen"
        >
          <span class="tabular-nums font-medium tracking-tight">{{
            currentDial
          }}</span>
          <ChevronDown
            class="h-4 w-4 shrink-0 text-white/45"
            :class="{ 'rotate-180': open }"
          />
        </button>
        <div
          v-else
          class="flex h-full min-h-[2.75rem] w-full min-w-[6.25rem] cursor-not-allowed items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white/85 opacity-90"
          aria-label="Country calling code"
        >
          <span class="tabular-nums font-medium tracking-tight">{{
            currentDial
          }}</span>
        </div>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="open"
            class="absolute left-0 top-[calc(100%+6px)] z-[120] flex max-h-[min(22rem,70vh)] w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#141414] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.85)] sm:w-[20rem]"
            role="listbox"
          >
            <div
              class="flex items-center gap-2 border-b border-white/10 px-3 py-2.5"
            >
              <Filter class="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
              <input
                data-phone-search
                v-model="search"
                type="search"
                autocomplete="off"
                placeholder="Search country or code"
                class="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
                @keydown.stop
              />
            </div>
            <div
              class="max-h-[min(16rem,50vh)] overflow-y-auto overscroll-contain py-1"
            >
              <button
                v-for="c in filteredCountries"
                :key="c.iso2 + c.dial + c.name"
                type="button"
                role="option"
                class="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06]"
                :class="
                  c.dial === currentDial
                    ? 'bg-crimson-500/15 text-white'
                    : 'text-white/90'
                "
                @click="pick(c)"
              >
                <span class="shrink-0 tabular-nums font-semibold text-white/95">{{
                  c.dial
                }}</span>
                <span class="min-w-0 flex-1 break-words text-white/70">{{
                  c.name
                }}</span>
              </button>
              <p
                v-if="!filteredCountries.length"
                class="px-3 py-6 text-center text-sm text-white/40"
              >
                No countries match your search.
              </p>
            </div>
          </div>
        </Transition>
      </div>

      <div class="min-w-0 flex-1">
        <input
          :id="nationalInputId"
          :value="nationalNumber"
          type="tel"
          inputmode="numeric"
          autocomplete="tel-national"
          placeholder="Enter phone number"
          :readonly="readOnly"
          class="w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder:text-white/35 placeholder:italic focus:outline-none"
          :class="
            readOnly
              ? 'cursor-not-allowed border-white/10 bg-white/[0.04] text-white/85 opacity-90'
              : error
                ? 'border-red-500/55 bg-red-500/5 focus:border-red-500/70'
                : 'border-white/10 bg-white/5 focus:border-crimson-600/60'
          "
          :aria-invalid="error ? 'true' : 'false'"
          :aria-describedby="error && errorId ? errorId : undefined"
          @input="onNationalInput"
          @blur="emit('nationalBlur')"
        />
      </div>
    </div>
    <p
      v-if="error"
      :id="errorId"
      role="alert"
      class="mt-1.5 text-xs text-red-400/95"
    >
      {{ error }}
    </p>
  </div>
</template>
