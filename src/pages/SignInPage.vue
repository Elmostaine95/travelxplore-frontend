<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import Header from "../components/Header.vue";
import { useAuthStore } from "../stores/auth";

const { t } = useI18n();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const form = reactive({
  email: "",
  password: "",
});

const errors = reactive({
  email: "",
  password: "",
});

const submitting = ref(false);
const serverError = ref<string | null>(null);
const showResend = ref(false);
const resendEmail = ref("");
const resendNotice = ref<string | null>(null);

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(): boolean {
  errors.email = "";
  errors.password = "";
  if (!form.email.trim()) errors.email = t("auth.signIn.errEmailRequired");
  else if (!emailRe.test(form.email.trim())) errors.email = t("auth.signIn.errEmailInvalid");
  if (!form.password) errors.password = t("auth.signIn.errPasswordRequired");
  return !errors.email && !errors.password;
}

onMounted(() => {
  const q = route.query.email;
  if (typeof q === "string" && q) form.email = q;
});

async function onSubmit() {
  serverError.value = null;
  showResend.value = false;
  if (!validate()) return;
  submitting.value = true;
  try {
    await auth.login(form.email.trim(), form.password);
    const redirect = route.query.redirect;
    router.push(typeof redirect === "string" ? redirect : "/");
  } catch (e) {
    const msg = (e as Error).message;
    serverError.value = msg;
    if (
      msg.toLowerCase().includes("verify") ||
      msg.toLowerCase().includes("verify your email")
    ) {
      showResend.value = true;
      resendEmail.value = form.email.trim();
    }
  } finally {
    submitting.value = false;
  }
}

async function resend() {
  serverError.value = null;
  resendNotice.value = null;
  submitting.value = true;
  try {
    await auth.resendVerification(resendEmail.value || form.email.trim());
    resendNotice.value = t("auth.signIn.resendNotice");
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
        class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(220,38,38,0.1)_0%,transparent_55%)]"
      />
      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
        class="max-w-md mx-auto rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 md:p-10 shadow-[0_12px_48px_-12px_rgba(220,38,38,0.12)]"
      >
        <h1 class="text-2xl md:text-3xl font-extralight text-center mb-2">
          {{ t("auth.signIn.title") }}
        </h1>
        <p class="text-white/50 text-sm text-center mb-8 font-light leading-relaxed">
          {{ t("auth.signIn.subtitle") }}
        </p>

        <div
          v-if="serverError && !showResend"
          class="mb-6 text-sm text-red-400/95 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3"
        >
          {{ serverError }}
        </div>
        <div
          v-if="showResend"
          class="mb-6 space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 text-amber-100/95"
        >
          <p class="text-sm text-white/85">
            {{ t("auth.signIn.verifyFirst") }}
          </p>
          <p
            v-if="resendNotice"
            class="text-xs text-emerald-300/90"
          >
            {{ resendNotice }}
          </p>
          <button
            type="button"
            class="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-light disabled:opacity-50"
            :disabled="submitting"
            @click="resend"
          >
            {{ submitting ? t("common.sending") : t("auth.signIn.resendVerification") }}
          </button>
        </div>

        <form class="space-y-5" @submit.prevent="onSubmit">
          <div class="space-y-1.5">
            <label class="text-xs text-white/45">{{ t("auth.signIn.email") }}</label>
            <input
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-crimson-600/50"
              :class="errors.email ? 'border-red-500/40' : ''"
            />
            <p v-if="errors.email" class="text-xs text-red-400">{{ errors.email }}</p>
          </div>
          <div class="space-y-1.5">
            <label class="text-xs text-white/45">{{ t("auth.signIn.password") }}</label>
            <input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-crimson-600/50"
              :class="errors.password ? 'border-red-500/40' : ''"
            />
            <p v-if="errors.password" class="text-xs text-red-400">
              {{ errors.password }}
            </p>
            <div class="flex justify-end pt-1">
              <RouterLink
                to="/forgot-password"
                class="text-xs text-crimson-400/90 hover:text-crimson-300 font-light"
              >
                {{ t("auth.signIn.forgotLink") }}
              </RouterLink>
            </div>
          </div>
          <button
            type="submit"
            class="w-full py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white font-light tracking-wide border border-crimson-500/30 shadow-[0_8px_28px_-6px_rgba(220,38,38,0.35)]"
            :disabled="submitting"
          >
            {{ submitting ? t("auth.signIn.submitting") : t("auth.signIn.continue") }}
          </button>
        </form>

        <p class="text-center text-sm text-white/45 mt-8">
          {{ t("auth.signIn.noAccount") }}
          <RouterLink to="/sign-up" class="text-crimson-400 hover:text-crimson-300 font-light"
            >{{ t("nav.signUp") }}</RouterLink
          >
        </p>
      </div>
    </div>
  </div>
</template>
