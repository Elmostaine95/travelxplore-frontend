<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import Header from "../components/Header.vue";
import { RouterLink } from "vue-router";
import { verifyEmail, postResendVerification } from "../lib/api";

const route = useRoute();

type State = "loading" | "success" | "error";
const state = ref<State>("loading");
const resendEmail = ref("");
const resending = ref(false);
const resendNotice = ref<string | null>(null);

onMounted(async () => {
  const token = route.query.token;
  if (typeof token !== "string" || !token) {
    state.value = "error";
    return;
  }
  try {
    await verifyEmail(token);
    state.value = "success";
  } catch {
    state.value = "error";
  }
});

async function resend() {
  if (!resendEmail.value.trim()) return;
  resending.value = true;
  resendNotice.value = null;
  try {
    await postResendVerification({ email: resendEmail.value.trim() });
    resendNotice.value = "If an account exists, we sent a new link.";
  } catch {
    resendNotice.value = "Could not send. Try again later.";
  } finally {
    resending.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white">
    <Header />
    <div class="relative pt-28 pb-16 px-6 min-h-[60vh] flex items-center justify-center">
      <div
        class="max-w-md w-full rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl p-10 text-center space-y-6"
      >
        <template v-if="state === 'loading'">
          <div
            class="w-10 h-10 mx-auto border-2 border-crimson-600 border-t-transparent rounded-full animate-spin"
          />
          <p class="text-white/70 font-light">Verifying your email…</p>
        </template>

        <template v-else-if="state === 'success'">
          <h1 class="text-2xl font-extralight">Email Verified</h1>
          <p class="text-white/55 font-light leading-relaxed">
            Your account is now active.
          </p>
          <RouterLink
            to="/sign-in"
            class="inline-flex justify-center px-8 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white font-light border border-crimson-500/30"
          >
            Go to Sign In
          </RouterLink>
        </template>

        <template v-else>
          <h1 class="text-2xl font-extralight">Verification Failed</h1>
          <p class="text-white/55 font-light leading-relaxed">
            This link is invalid or has expired.
          </p>
          <div class="space-y-2 text-left pt-2">
            <label class="text-xs text-white/45">Email for resend</label>
            <input
              v-model="resendEmail"
              type="email"
              class="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white focus:outline-none focus:border-crimson-600/50"
              placeholder="your@email.com"
            />
          </div>
          <p v-if="resendNotice" class="text-sm text-white/60">{{ resendNotice }}</p>
          <button
            type="button"
            class="w-full py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 font-light disabled:opacity-50"
            :disabled="resending || !resendEmail.trim()"
            @click="resend"
          >
            {{ resending ? "Sending…" : "Resend Email" }}
          </button>
          <RouterLink to="/sign-in" class="block text-sm text-crimson-400/90 hover:text-crimson-300"
            >Back to Sign in</RouterLink
          >
        </template>
      </div>
    </div>
  </div>
</template>
