<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink } from "vue-router";
import Header from "../components/Header.vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();

onMounted(() => {
  auth.fetchMe();
});
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white">
    <Header />
    <div class="pt-28 pb-16 px-6 max-w-2xl mx-auto">
      <div
        class="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-xl p-8 md:p-10"
      >
        <h1 class="text-2xl font-extralight mb-2">Your account</h1>
        <p class="text-white/50 text-sm mb-8">
          Signed in as
          <span class="text-white/80">{{ auth.user?.email }}</span>
        </p>
        <p v-if="auth.user" class="text-white/70 font-light mb-8">
          {{ auth.user.firstName }} {{ auth.user.lastName }}
        </p>
        <p class="text-white/45 text-sm mb-6">
          Member-only features will appear here as we grow TravelXplore.
        </p>
        <RouterLink
          to="/"
          class="inline-flex px-6 py-3 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white font-light border border-crimson-500/30"
        >
          Back to home
        </RouterLink>
      </div>
    </div>
  </div>
</template>
