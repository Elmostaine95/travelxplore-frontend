<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import Header from "../components/Header.vue";
import { postResetPassword } from "../lib/api";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const token = computed(() => {
  const q = route.query.token;
  return typeof q === "string" && q.trim() ? q.trim() : null;
});

const form = reactive({ password: "", confirm: "" });
const errors = reactive({ password: "", confirm: "" });
const submitting = ref(false);
const serverError = ref<string | null>(null);
const success = ref(false);

function validate(): boolean {
  errors.password = "";
  errors.confirm = "";
  if (!form.password) {
    errors.password = t("auth.signUp.errPasswordRequired");
    return false;
  }
  if (form.password.length < 8) {
    errors.password = t("auth.reset.errPasswordMin");
    return false;
  }
  if (form.password !== form.confirm) {
    errors.confirm = t("auth.reset.errMismatch");
    return false;
  }
  return true;
}

async function onSubmit() {
  serverError.value = null;
  const tok = token.value;
  if (!tok) {
    serverError.value = t("auth.reset.errToken");
    return;
  }
  if (!validate()) return;
  submitting.value = true;
  try {
    await postResetPassword({ token: tok, password: form.password });
    success.value = true;
  } catch (e) {
    const msg = ((e as Error).message || "").toLowerCase();
    if (
      msg.includes("invalid") ||
      msg.includes("expired") ||
      msg.includes("at least 8")
    ) {
      serverError.value = msg.includes("at least 8")
        ? t("auth.reset.errPasswordMin")
        : t("auth.reset.errToken");
    } else {
      serverError.value = t("auth.reset.errServerGeneric");
    }
  } finally {
    submitting.value = false;
  }
}

function goSignIn() {
  router.push("/sign-in");
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
        <template v-if="!token && !success">
          <h1 class="text-2xl font-extralight text-center mb-4">
            {{ t("auth.reset.errToken") }}
          </h1>
          <RouterLink
            to="/forgot-password"
            class="block text-center text-crimson-400 hover:text-crimson-300 text-sm font-light"
            >{{ t("auth.forgot.title") }}</RouterLink
          >
        </template>

        <template v-else-if="success">
          <h1 class="text-2xl md:text-3xl font-extralight text-center mb-2">
            {{ t("auth.reset.successTitle") }}
          </h1>
          <p class="text-white/55 text-sm text-center mb-8 font-light leading-relaxed">
            {{ t("auth.reset.successBody") }}
          </p>
          <button
            type="button"
            class="w-full py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white font-light tracking-wide border border-crimson-500/30 shadow-[0_8px_28px_-6px_rgba(220,38,38,0.35)]"
            @click="goSignIn"
          >
            {{ t("auth.reset.goSignIn") }}
          </button>
        </template>

        <template v-else>
          <h1 class="text-2xl md:text-3xl font-extralight text-center mb-2">
            {{ t("auth.reset.title") }}
          </h1>
          <p class="text-white/50 text-sm text-center mb-8 font-light leading-relaxed">
            {{ t("auth.reset.subtitle") }}
          </p>

          <p
            v-if="serverError"
            class="mb-6 text-sm text-red-400/95 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3"
          >
            {{ serverError }}
          </p>

          <form class="space-y-5" @submit.prevent="onSubmit">
            <div class="space-y-1.5">
              <label class="text-xs text-white/45">{{ t("auth.reset.password") }}</label>
              <input
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-crimson-600/50"
                :class="errors.password ? 'border-red-500/40' : ''"
              />
              <p v-if="errors.password" class="text-xs text-red-400">{{ errors.password }}</p>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs text-white/45">{{ t("auth.reset.confirmPassword") }}</label>
              <input
                v-model="form.confirm"
                type="password"
                autocomplete="new-password"
                class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-crimson-600/50"
                :class="errors.confirm ? 'border-red-500/40' : ''"
              />
              <p v-if="errors.confirm" class="text-xs text-red-400">{{ errors.confirm }}</p>
            </div>
            <button
              type="submit"
              class="w-full py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 text-white font-light tracking-wide border border-crimson-500/30 shadow-[0_8px_28px_-6px_rgba(220,38,38,0.35)]"
              :disabled="submitting"
            >
              {{ submitting ? t("auth.reset.submitting") : t("auth.reset.submit") }}
            </button>
          </form>
        </template>
      </div>
    </div>
  </div>
</template>
