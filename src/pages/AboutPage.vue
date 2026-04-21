<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import Header from "../components/Header.vue";
import { Sparkles, MapPin, ShieldCheck, Compass } from "lucide-vue-next";

const { t } = useI18n();

const steps = computed(() => [
  {
    title: t("about.step1Title"),
    body: t("about.step1Body"),
    icon: Sparkles,
  },
  {
    title: t("about.step2Title"),
    body: t("about.step2Body"),
    icon: Compass,
  },
  {
    title: t("about.step3Title"),
    body: t("about.step3Body"),
    icon: MapPin,
  },
]);
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-crimson-600/40">
    <Header />

    <main class="relative">
      <!-- Ambient layers (cinematic depth, no image assets required) -->
      <div
        class="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          class="absolute -top-1/4 left-1/2 h-[70vh] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.2)_0%,transparent_68%)] blur-3xl shadow-[0_0_120px_40px_rgba(220,38,38,0.08)]"
        />
        <div
          class="absolute bottom-0 right-0 h-[50vh] w-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(120,40,40,0.14)_0%,transparent_60%)] blur-3xl shadow-[0_0_80px_30px_rgba(220,38,38,0.06)]"
        />
        <div
          class="absolute inset-0 opacity-[0.35]"
          style="
            background-image: linear-gradient(
                rgba(255, 255, 255, 0.03) 1px,
                transparent 1px
              ),
              linear-gradient(
                90deg,
                rgba(255, 255, 255, 0.03) 1px,
                transparent 1px
              );
            background-size: 72px 72px;
          "
        />
      </div>

      <!-- 1. Hero -->
      <section
        v-motion
        :initial="{ opacity: 0, y: 28 }"
        :enter="{
          opacity: 1,
          y: 0,
          transition: { duration: 900, ease: [0.22, 1, 0.36, 1] },
        }"
        class="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6"
      >
        <div class="max-w-4xl mx-auto text-center space-y-8">
          <p
            class="text-xs md:text-sm uppercase tracking-[0.35em] text-white/45 font-light"
          >
            {{ t("about.brand") }}
          </p>
          <h1
            class="text-[clamp(2.25rem,6vw,3.75rem)] font-extralight tracking-tight text-white leading-[1.08] [text-shadow:0_4px_56px_rgba(220,38,38,0.18),0_2px_24px_rgba(220,38,38,0.1)]"
          >
            {{ t("about.heroTitle") }}
          </h1>
          <p
            class="text-lg md:text-xl text-white/55 font-light max-w-2xl mx-auto leading-relaxed"
          >
            {{ t("about.heroSubtitle") }}
          </p>
        </div>
      </section>

      <!-- 2. Story -->
      <section
        class="relative py-20 md:py-28 px-6 border-t border-white/[0.06] shadow-[0_-1px_0_0_rgba(255,255,255,0.06),0_-6px_32px_-4px_rgba(220,38,38,0.14),0_-2px_16px_-2px_rgba(220,38,38,0.08)]"
      >
        <div
          v-motion
          :initial="{ opacity: 0, y: 24 }"
          :visible-once="{
            opacity: 1,
            y: 0,
            transition: { duration: 800, ease: [0.22, 1, 0.36, 1] },
          }"
          class="max-w-2xl mx-auto"
        >
          <h2
            class="text-xs uppercase tracking-[0.28em] text-white/40 mb-10 font-light"
          >
            {{ t("about.storyHeading") }}
          </h2>
          <div
            class="space-y-8 text-lg md:text-xl text-white/70 font-light leading-[1.75] font-serif"
          >
            <p class="whitespace-pre-line">
              {{ t("about.storyP1") }}
            </p>
            <p class="text-white/85 whitespace-pre-line">
              {{ t("about.storyP2") }}
            </p>
            <p class="text-white/60 italic">
              {{ t("about.storyP3") }}
            </p>
          </div>
        </div>
      </section>

      <!-- 3. Mission -->
      <section
        class="relative py-20 md:py-24 px-6 bg-white/[0.02] border-y border-white/[0.06] shadow-[0_-1px_0_0_rgba(255,255,255,0.06),0_1px_0_0_rgba(255,255,255,0.06),0_-6px_32px_-4px_rgba(220,38,38,0.12),0_6px_32px_-4px_rgba(220,38,38,0.12),0_-2px_14px_-2px_rgba(220,38,38,0.06),0_2px_14px_-2px_rgba(220,38,38,0.06)]"
      >
        <div
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :visible-once="{
            opacity: 1,
            y: 0,
            transition: { duration: 750 },
          }"
          class="max-w-3xl mx-auto text-center space-y-6"
        >
          <h2 class="text-2xl md:text-3xl font-extralight tracking-tight">
            {{ t("about.missionHeading") }}
          </h2>
          <p
            class="text-lg md:text-xl text-white/65 font-light leading-relaxed max-w-xl mx-auto"
          >
            {{ t("about.missionBody") }}
          </p>
        </div>
      </section>

      <!-- 4. How it works -->
      <section class="relative py-20 md:py-28 px-6">
        <div class="max-w-3xl mx-auto">
          <h2
            class="text-xs uppercase tracking-[0.28em] text-white/40 mb-14 md:mb-16 font-light text-center"
          >
            {{ t("about.howHeading") }}
          </h2>
          <ol class="space-y-12 md:space-y-16">
            <li
              v-for="(step, i) in steps"
              :key="i"
              v-motion
              :initial="{ opacity: 0, x: -16 }"
              :visible-once="{
                opacity: 1,
                x: 0,
                transition: { duration: 650, delay: i * 80 },
              }"
              class="flex gap-6 md:gap-10"
            >
              <div
                class="shrink-0 w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.04] flex items-center justify-center text-crimson-400 shadow-[0_6px_28px_-4px_rgba(220,38,38,0.22)]"
              >
                <component :is="step.icon" class="w-5 h-5" stroke-width="1.25" />
              </div>
              <div class="space-y-2 pt-0.5">
                <p
                  class="text-[0.65rem] uppercase tracking-[0.2em] text-white/35 mb-1"
                >
                  {{ t("about.stepLabel", { n: i + 1 }) }}
                </p>
                <h3 class="text-xl font-light text-white tracking-wide">
                  {{ step.title }}
                </h3>
                <p class="text-white/55 font-light leading-relaxed max-w-md">
                  {{ step.body }}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- 5. Trust -->
      <section
        class="relative py-20 md:py-24 px-6 border-t border-white/[0.06] shadow-[0_-1px_0_0_rgba(255,255,255,0.06),0_-6px_32px_-4px_rgba(220,38,38,0.14),0_-2px_16px_-2px_rgba(220,38,38,0.08)]"
      >
        <div
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :visible-once="{ opacity: 1, y: 0, transition: { duration: 700 } }"
          class="max-w-2xl mx-auto rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm p-10 md:p-12 shadow-[0_12px_48px_-12px_rgba(220,38,38,0.2),0_4px_24px_-8px_rgba(220,38,38,0.12)]"
        >
          <div class="flex items-start gap-4 mb-6">
            <div
              class="shrink-0 w-10 h-10 rounded-xl bg-crimson-600/15 border border-crimson-600/25 flex items-center justify-center text-crimson-400 shadow-[0_4px_20px_-2px_rgba(220,38,38,0.35)]"
            >
              <ShieldCheck class="w-5 h-5" stroke-width="1.25" />
            </div>
            <div>
              <h2 class="text-xl md:text-2xl font-extralight tracking-tight mb-4">
                {{ t("about.trustTitle") }}
              </h2>
              <p class="text-white/60 font-light leading-relaxed">
                {{ t("about.trustBody") }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 6. CTA -->
      <section
        class="relative py-24 md:py-32 px-6 pb-32 border-t border-white/[0.06] shadow-[0_-1px_0_0_rgba(255,255,255,0.06),0_-6px_32px_-4px_rgba(220,38,38,0.12),0_-2px_16px_-2px_rgba(220,38,38,0.07)]"
      >
        <div
          v-motion
          :initial="{ opacity: 0, scale: 0.98 }"
          :visible-once="{
            opacity: 1,
            scale: 1,
            transition: { duration: 800 },
          }"
          class="max-w-xl mx-auto text-center space-y-10"
        >
          <h2 class="text-2xl md:text-3xl font-extralight tracking-tight">
            {{ t("about.ctaTitle") }}
          </h2>
          <RouterLink
            to="/"
            class="inline-flex items-center justify-center px-10 py-4 rounded-xl bg-crimson-600 hover:bg-crimson-700 text-white font-light tracking-wide transition-colors duration-300 border border-crimson-500/30 shadow-[0_10px_40px_-6px_rgba(220,38,38,0.5),0_4px_20px_-4px_rgba(220,38,38,0.35),0_0_0_1px_rgba(220,38,38,0.15)_inset]"
          >
            {{ t("main.revealStay") }}
          </RouterLink>
        </div>
      </section>
    </main>
  </div>
</template>
