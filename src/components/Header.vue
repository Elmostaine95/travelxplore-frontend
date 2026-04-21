<template>
  <header
    v-motion
    :initial="{ y: -100, opacity: 0 }"
    :enter="{ y: 0, opacity: 1, transition: { duration: 800, ease: 'easeOut' } }"
    class="fixed top-0 left-0 right-0 z-50 px-8 py-6"
  >
    <div class="max-w-7xl mx-auto">
      <div
        class="relative bg-black/30 backdrop-blur-xl border border-white/10 rounded-full px-8 py-4 shadow-2xl"
      >
        <div
          class="absolute -inset-1 bg-gradient-to-r from-crimson-600/10 via-transparent to-crimson-600/10 rounded-full blur-xl"
        />
        <div class="relative flex items-center justify-between">
          <RouterLink
            to="/"
            class="flex items-center gap-2 text-left"
          >
            <div
              class="w-8 h-8 bg-gradient-to-br from-crimson-600 to-crimson-700 rounded-full flex items-center justify-center"
            >
              <div class="w-3 h-3 bg-white rounded-full" />
            </div>
            <span class="text-white font-light tracking-widest text-lg">
              TravelXplore
            </span>
          </RouterLink>
          <nav class="hidden md:flex items-center gap-8">
            <RouterLink
              to="/"
              class="text-white/70 hover:text-white text-sm tracking-wide transition-colors relative group"
            >
              {{ t("nav.home") }}
              <span
                class="absolute -bottom-1 start-0 w-0 h-px bg-crimson-600 group-hover:w-full transition-all duration-300"
              />
            </RouterLink>
            <RouterLink
              to="/about"
              class="text-white/70 hover:text-white text-sm tracking-wide transition-colors relative group"
            >
              {{ t("nav.about") }}
              <span
                class="absolute -bottom-1 start-0 w-0 h-px bg-crimson-600 group-hover:w-full transition-all duration-300"
              />
            </RouterLink>
            <a
              :href="staysExternalUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="text-white/70 hover:text-white text-sm tracking-wide transition-colors relative group"
            >
              {{ t("nav.stays") }}
              <span
                class="absolute -bottom-1 start-0 w-0 h-px bg-crimson-600 group-hover:w-full transition-all duration-300"
              />
            </a>
            <RouterLink
              to="/contact"
              class="text-white/70 hover:text-white text-sm tracking-wide transition-colors relative group"
            >
              {{ t("nav.contact") }}
              <span
                class="absolute -bottom-1 start-0 w-0 h-px bg-crimson-600 group-hover:w-full transition-all duration-300"
              />
            </RouterLink>
          </nav>
          <div class="flex items-center gap-2 sm:gap-3">
            <LanguageSelector />
            <button
              type="button"
              class="shrink-0 p-2.5 rounded-full text-white/65 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all duration-200"
              :title="t('header.selectCurrency')"
              :aria-label="t('header.selectCurrency')"
              @click="localeModalOpen = true"
            >
              <Globe class="w-[1.15rem] h-[1.15rem] sm:w-5 sm:h-5" stroke-width="1.75" />
            </button>
            <CurrencyLanguageModal v-model="localeModalOpen" />
            <template v-if="auth.isAuthenticated && auth.user">
              <div
                ref="userMenuRef"
                class="relative flex items-center"
              >
                <button
                  type="button"
                  class="flex items-center gap-2.5 max-w-[min(100vw-8rem,220px)] rounded-full pl-1 pr-2 py-1 hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors"
                  :aria-expanded="menuOpen"
                  aria-haspopup="true"
                  @click="menuOpen = !menuOpen"
                >
                  <span
                    class="text-sm text-white/90 font-light tracking-wide truncate min-w-0"
                    :title="auth.displayName"
                  >
                    {{ truncatedDisplayName }}
                  </span>
                  <div
                    class="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-crimson-600 to-crimson-800 border border-crimson-500/40 flex items-center justify-center text-white text-xs font-medium shadow-[0_2px_12px_rgba(220,38,38,0.35)]"
                    aria-hidden="true"
                  >
                    {{ initials }}
                  </div>
                </button>

                <Transition
                  enter-active-class="transition duration-150 ease-out"
                  enter-from-class="opacity-0 scale-95 -translate-y-1"
                  enter-to-class="opacity-100 scale-100 translate-y-0"
                  leave-active-class="transition duration-100 ease-in"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <div
                    v-if="menuOpen"
                    class="absolute end-0 top-[calc(100%+10px)] w-[min(calc(100vw-2rem),280px)] rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-[0_16px_48px_-8px_rgba(0,0,0,0.6),0_0_0_1px_rgba(220,38,38,0.08)] py-2 z-[100]"
                    role="menu"
                  >
                    <div class="px-4 py-3">
                      <p class="text-white font-light text-sm leading-snug">
                        {{ auth.displayName }}
                      </p>
                      <p class="text-white/50 text-xs mt-1 truncate" :title="auth.user.email">
                        {{ auth.user.email }}
                      </p>
                    </div>
                    <div class="border-t border-white/10 mx-2" role="separator" aria-hidden="true" />
                    <div class="py-1">
                      <RouterLink
                        to="/my-bookings"
                        class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/85 hover:bg-white/5 font-light transition-colors"
                        role="menuitem"
                        @click="closeMenu"
                      >
                        <Calendar class="w-4 h-4 shrink-0 text-white/55" aria-hidden="true" />
                        {{ t("nav.myBookings") }}
                      </RouterLink>
                      <button
                        type="button"
                        class="flex w-full items-center gap-2.5 text-left px-4 py-2.5 text-sm text-white/85 hover:bg-white/5 font-light transition-colors"
                        role="menuitem"
                        @click="onLogout"
                      >
                        <LogOut class="w-4 h-4 shrink-0 text-white/55" aria-hidden="true" />
                        {{ t("nav.logout") }}
                      </button>
                    </div>
                  </div>
                </Transition>
              </div>
            </template>
            <template v-else>
              <RouterLink
                to="/sign-in"
                class="px-4 py-2 text-white/60 hover:text-white text-sm tracking-wide transition-colors"
              >
                {{ t("nav.signIn") }}
              </RouterLink>
              <RouterLink
                to="/sign-up"
                class="flex items-center gap-2 px-5 py-2 bg-crimson-600/90 hover:bg-crimson-600 border border-crimson-500/30 rounded-full text-white text-sm tracking-wide transition-all"
              >
                <User class="w-4 h-4" />
                <span>{{ t("nav.signUp") }}</span>
              </RouterLink>
            </template>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { RouterLink, useRouter, useRoute } from "vue-router";
import { onClickOutside } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import { User, Calendar, LogOut, Globe } from "lucide-vue-next";
import { useAuthStore } from "../stores/auth";
import { useCurrencyStore } from "../stores/currency";
import { useLocaleStore } from "../stores/locale";
import CurrencyLanguageModal from "./CurrencyLanguageModal.vue";
import LanguageSelector from "./LanguageSelector.vue";

const { t } = useI18n();
const auth = useAuthStore();
const localeStore = useLocaleStore();
const currencyStore = useCurrencyStore();
const localeModalOpen = ref(false);

/** Nuitee stays site: pass current UI language and currency as query params. */
const staysExternalUrl = computed(() => {
  const u = new URL("https://travelxplore.nuitee.link");
  u.searchParams.set("language", localeStore.code);
  u.searchParams.set("currency", currencyStore.code);
  return u.toString();
});
const router = useRouter();
const route = useRoute();

const menuOpen = ref(false);
const userMenuRef = ref<HTMLElement | null>(null);

const truncatedDisplayName = computed(() => {
  const name = auth.displayName;
  const max = 22;
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + "…";
});

const initials = computed(() => {
  const u = auth.user;
  if (!u) return "?";
  const fn = (u.firstName || "").trim();
  const ln = (u.lastName || "").trim();
  const a = fn[0]?.toUpperCase() ?? "";
  const b = ln[0]?.toUpperCase() ?? "";
  if (a && b) return a + b;
  if (fn.length >= 2) return (fn[0] + fn[1]).toUpperCase();
  if (a) return a;
  return (u.email?.[0] || "?").toUpperCase();
});

function closeMenu() {
  menuOpen.value = false;
}

function onLogout() {
  closeMenu();
  auth.logout();
  router.push("/");
}

onClickOutside(userMenuRef, () => {
  menuOpen.value = false;
});

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false;
  }
);
</script>
