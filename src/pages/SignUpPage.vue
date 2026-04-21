<script setup lang="ts">
import { ref, reactive } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import Header from "../components/Header.vue";
import { useAuthStore } from "../stores/auth";

const { t } = useI18n();
const auth = useAuthStore();

const form = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const errors = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
});

const submitting = ref(false);
const serverError = ref<string | null>(null);
const registeredEmail = ref("");
const step = ref<"form" | "success">("form");

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(): boolean {
  errors.firstName = "";
  errors.lastName = "";
  errors.email = "";
  errors.password = "";
  errors.confirmPassword = "";

  if (!form.firstName.trim()) errors.firstName = t("auth.signUp.errFirstName");
  if (!form.lastName.trim()) errors.lastName = t("auth.signUp.errLastName");

  const e = form.email.trim();
  if (!e) errors.email = t("auth.signUp.errEmailRequired");
  else if (!emailRe.test(e)) errors.email = t("auth.signUp.errEmailInvalid");

  if (!form.password) errors.password = t("auth.signUp.errPasswordRequired");
  else if (form.password.length < 8)
    errors.password = t("auth.signUp.errPasswordMin");

  if (form.password !== form.confirmPassword)
    errors.confirmPassword = t("auth.signUp.errPasswordMismatch");

  return !Object.values(errors).some(Boolean);
}

async function onSubmit() {
  serverError.value = null;
  if (!validate()) return;
  submitting.value = true;
  try {
    await auth.register({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
    });
    registeredEmail.value = form.email.trim();
    step.value = "success";
  } catch (e) {
    serverError.value = (e as Error).message;
  } finally {
    submitting.value = false;
  }
}

async function resend() {
  serverError.value = null;
  submitting.value = true;
  try {
    await auth.resendVerification(registeredEmail.value);
  } catch (e) {
    serverError.value = (e as Error).message;
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
        class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.12)_0%,transparent_55%)]"
      />
      <div class="max-w-md mx-auto">
        <div
          v-if="step === 'form'"
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
          class="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 md:p-10 shadow-[0_12px_48px_-12px_rgba(220,38,38,0.15)]"
        >
          <h1 class="text-2xl md:text-3xl font-extralight text-center mb-2">
            {{ t("auth.signUp.title") }}
          </h1>
          <p class="text-white/50 text-sm text-center mb-8 font-light leading-relaxed">
            {{ t("auth.signUp.subtitle") }}
          </p>

          <p
            v-if="serverError"
            class="mb-6 text-sm text-red-400/95 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3"
          >
            {{ serverError }}
          </p>

          <form class="space-y-5" @submit.prevent="onSubmit">
            <div class="grid sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-xs text-white/45">{{ t("auth.signUp.firstName") }}</label>
                <input
                  v-model="form.firstName"
                  type="text"
                  autocomplete="given-name"
                  class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/50"
                  :class="errors.firstName ? 'border-red-500/40' : ''"
                />
                <p v-if="errors.firstName" class="text-xs text-red-400">
                  {{ errors.firstName }}
                </p>
              </div>
              <div class="space-y-1.5">
                <label class="text-xs text-white/45">{{ t("auth.signUp.lastName") }}</label>
                <input
                  v-model="form.lastName"
                  type="text"
                  autocomplete="family-name"
                  class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/50"
                  :class="errors.lastName ? 'border-red-500/40' : ''"
                />
                <p v-if="errors.lastName" class="text-xs text-red-400">
                  {{ errors.lastName }}
                </p>
              </div>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs text-white/45">{{ t("auth.signUp.email") }}</label>
              <input
                v-model="form.email"
                type="email"
                autocomplete="email"
                class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/50"
                :class="errors.email ? 'border-red-500/40' : ''"
              />
              <p v-if="errors.email" class="text-xs text-red-400">
                {{ errors.email }}
              </p>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs text-white/45">{{ t("auth.signUp.password") }}</label>
              <input
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/50"
                :class="errors.password ? 'border-red-500/40' : ''"
              />
              <p v-if="errors.password" class="text-xs text-red-400">
                {{ errors.password }}
              </p>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs text-white/45">{{ t("auth.signUp.confirmPassword") }}</label>
              <input
                v-model="form.confirmPassword"
                type="password"
                autocomplete="new-password"
                class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/50"
                :class="errors.confirmPassword ? 'border-red-500/40' : ''"
              />
              <p v-if="errors.confirmPassword" class="text-xs text-red-400">
                {{ errors.confirmPassword }}
              </p>
            </div>
            <button
              type="submit"
              class="w-full py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white font-light tracking-wide transition-colors border border-crimson-500/30 shadow-[0_8px_28px_-6px_rgba(220,38,38,0.35)]"
              :disabled="submitting"
            >
              {{ submitting ? t("auth.signUp.submitting") : t("auth.signUp.submit") }}
            </button>
          </form>

          <p class="text-center text-sm text-white/45 mt-8">
            {{ t("auth.signUp.hasAccount") }}
            <RouterLink to="/sign-in" class="text-crimson-400 hover:text-crimson-300 font-light"
              >{{ t("nav.signIn") }}</RouterLink
            >
          </p>
        </div>

        <div
          v-else
          v-motion
          :initial="{ opacity: 0, scale: 0.98 }"
          :enter="{ opacity: 1, scale: 1, transition: { duration: 450 } }"
          class="rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 md:p-10 text-center space-y-6"
        >
          <h2 class="text-2xl font-extralight">{{ t("auth.signUp.checkEmailTitle") }}</h2>
          <p class="text-white/55 font-light leading-relaxed">
            {{ t("auth.signUp.checkEmailBody") }}
          </p>
          <button
            type="button"
            class="w-full py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-white font-light disabled:opacity-50"
            :disabled="submitting"
            @click="resend"
          >
            {{ submitting ? t("common.sending") : t("auth.signUp.resendEmail") }}
          </button>
          <p v-if="serverError" class="text-sm text-red-400">{{ serverError }}</p>
          <RouterLink
            to="/sign-in"
            class="inline-block text-sm text-crimson-400/90 hover:text-crimson-300"
          >
            {{ t("auth.signUp.goSignIn") }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
