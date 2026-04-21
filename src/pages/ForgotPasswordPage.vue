<script setup lang="ts">
import { ref, reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import Header from "../components/Header.vue";
import { postForgotPassword } from "../lib/api";

const { t } = useI18n();

const form = reactive({ email: "" });
const errors = reactive({ email: "" });
const submitting = ref(false);
const serverError = ref<string | null>(null);
const success = ref(false);

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(): boolean {
  errors.email = "";
  const e = form.email.trim();
  if (!e) {
    errors.email = t("auth.forgot.errEmailRequired");
    return false;
  }
  if (!emailRe.test(e)) {
    errors.email = t("auth.forgot.errEmailInvalid");
    return false;
  }
  return true;
}

async function onSubmit() {
  serverError.value = null;
  if (!validate()) return;
  submitting.value = true;
  try {
    await postForgotPassword({ email: form.email.trim() });
    success.value = true;
  } catch (e) {
    const msg = ((e as Error).message || "").toLowerCase();
    if (msg.includes("too many")) {
      serverError.value = t("auth.forgot.errRateLimit");
    } else if (msg.includes("valid email")) {
      serverError.value = t("auth.forgot.errEmailInvalid");
    } else {
      serverError.value = t("auth.forgot.errServerGeneric");
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white">
    <Header />
    <div class="relative pt-28 pb-16 px-6">
      <div
        class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.1)_0%,transparent_55%)]"
      />
      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
        class="max-w-md mx-auto rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 md:p-10 shadow-[0_12px_48px_-12px_rgba(220,38,38,0.12)]"
      >
        <template v-if="!success">
          <h1 class="text-2xl md:text-3xl font-extralight text-center mb-2">
            {{ t("auth.forgot.title") }}
          </h1>
          <p class="text-white/50 text-sm text-center mb-8 font-light leading-relaxed">
            {{ t("auth.forgot.subtitle") }}
          </p>

          <p
            v-if="serverError"
            class="mb-6 text-sm text-red-400/95 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3"
          >
            {{ serverError }}
          </p>

          <form class="space-y-5" @submit.prevent="onSubmit">
            <div class="space-y-1.5">
              <label class="text-xs text-white/45">{{ t("auth.forgot.email") }}</label>
              <input
                v-model="form.email"
                type="email"
                autocomplete="email"
                class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-crimson-600/50"
                :class="errors.email ? 'border-red-500/40' : ''"
              />
              <p v-if="errors.email" class="text-xs text-red-400">{{ errors.email }}</p>
            </div>
            <button
              type="submit"
              class="w-full py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white font-light tracking-wide border border-crimson-500/30 shadow-[0_8px_28px_-6px_rgba(220,38,38,0.35)]"
              :disabled="submitting"
            >
              {{ submitting ? t("auth.forgot.submitting") : t("auth.forgot.submit") }}
            </button>
          </form>

          <p class="text-center text-sm text-white/45 mt-8">
            <RouterLink
              to="/sign-in"
              class="text-crimson-400 hover:text-crimson-300 font-light"
              >{{ t("auth.forgot.backSignIn") }}</RouterLink
            >
          </p>
        </template>

        <template v-else>
          <h1 class="text-2xl md:text-3xl font-extralight text-center mb-2">
            {{ t("auth.forgot.successTitle") }}
          </h1>
          <p class="text-white/55 text-sm text-center mb-8 font-light leading-relaxed">
            {{ t("auth.forgot.successBody") }}
          </p>
          <RouterLink
            to="/sign-in"
            class="flex justify-center w-full py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white font-light tracking-wide border border-crimson-500/30 shadow-[0_8px_28px_-6px_rgba(220,38,38,0.35)]"
          >
            {{ t("auth.forgot.backSignIn") }}
          </RouterLink>
        </template>
      </div>
    </div>
  </div>
</template>
