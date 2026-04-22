<script setup lang="ts">
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import Header from "../components/Header.vue";
import { MessageSquare, Send, CheckCircle2, AlertCircle } from "lucide-vue-next";
import { postContact } from "../lib/api";

const { t } = useI18n();

const SUPPORT_EMAIL = "support@travelxplore.com";

const form = reactive({
  name: "",
  email: "",
  subject: "",
  message: "",
});

const errors = reactive({
  name: "",
  email: "",
  subject: "",
  message: "",
});

const submitting = ref(false);
const serverError = ref<string | null>(null);
const success = ref(false);

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(): boolean {
  errors.name = "";
  errors.email = "";
  errors.subject = "";
  errors.message = "";

  const n = form.name.trim();
  if (!n) errors.name = t("contact.errNameRequired");
  else if (n.length < 2) errors.name = t("contact.errNameShort");

  const e = form.email.trim();
  if (!e) errors.email = t("contact.errEmailRequired");
  else if (!emailRe.test(e)) errors.email = t("contact.errEmailInvalid");

  const s = form.subject.trim();
  if (!s) errors.subject = t("contact.errSubjectRequired");
  else if (s.length < 2) errors.subject = t("contact.errSubjectShort");

  const m = form.message.trim();
  if (!m) errors.message = t("contact.errMessageRequired");
  else if (m.length < 10) errors.message = t("contact.errMessageShort");

  return !errors.name && !errors.email && !errors.subject && !errors.message;
}

async function onSubmit() {
  serverError.value = null;
  success.value = false;
  if (!validate()) return;

  submitting.value = true;
  try {
    await postContact({
      name: form.name.trim(),
      email: form.email.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    });
    success.value = true;
    form.name = "";
    form.email = "";
    form.subject = "";
    form.message = "";
  } catch (e) {
    serverError.value =
      (e as Error).message || t("contact.errGeneric");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-crimson-600/40">
    <Header />

    <main class="relative pt-28 pb-24 md:pt-36 md:pb-32 px-6">
      <div
        class="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          class="absolute top-0 left-1/2 h-[55vh] w-[110vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.12)_0%,transparent_70%)] blur-3xl"
        />
        <div
          class="absolute bottom-0 right-0 h-[40vh] w-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(80,30,30,0.1)_0%,transparent_60%)] blur-3xl"
        />
      </div>

      <div class="max-w-3xl mx-auto space-y-14 md:space-y-20">
        <!-- Hero -->
        <header
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{
            opacity: 1,
            y: 0,
            transition: { duration: 700, ease: [0.22, 1, 0.36, 1] },
          }"
          class="text-center space-y-4"
        >
          <h1
            class="text-[clamp(2rem,5vw,3rem)] font-extralight tracking-tight text-white"
          >
            {{ t("contact.title") }}
          </h1>
          <p class="text-lg text-white/55 font-light max-w-md mx-auto leading-relaxed">
            {{ t("contact.subtitle") }}
          </p>
        </header>

        <!-- Contact detail + form -->
        <div class="grid gap-10 md:gap-12">
          <!-- 2 Form -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 20 }"
            :visible-once="{
              opacity: 1,
              y: 0,
              transition: { duration: 650, delay: 80 },
            }"
            class="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-xl p-8 md:p-10 shadow-[0_12px_48px_-12px_rgba(220,38,38,0.12),0_4px_24px_-8px_rgba(0,0,0,0.5)]"
          >
            <div class="flex items-center gap-3 mb-8">
              <div
                class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60"
              >
                <MessageSquare class="w-5 h-5" stroke-width="1.25" />
              </div>
              <div>
                <h2 class="text-lg font-light tracking-wide">{{ t("contact.formTitle") }}</h2>
                <p class="text-sm text-white/45 font-light">
                  {{ t("contact.formSubtitle") }}
                </p>
              </div>
            </div>

            <!-- Success -->
            <div
              v-if="success"
              class="mb-8 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200/95"
            >
              <CheckCircle2 class="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <p class="font-medium text-emerald-100">{{ t("contact.successTitle") }}</p>
                <p class="text-sm text-emerald-200/80 font-light mt-1">
                  {{ t("contact.successBody") }}
                </p>
              </div>
            </div>

            <!-- Server error -->
            <div
              v-if="serverError"
              class="mb-8 flex items-start gap-3 rounded-xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-red-200/95"
            >
              <AlertCircle class="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <p class="text-sm font-light">{{ serverError }}</p>
            </div>

            <form class="space-y-6" novalidate @submit.prevent="onSubmit">
              <div class="grid sm:grid-cols-2 gap-6">
                <div class="space-y-2">
                  <label
                    for="contact-name"
                    class="block text-xs uppercase tracking-[0.15em] text-white/45"
                    >{{ t("contact.labelName") }}</label
                  >
                  <input
                    id="contact-name"
                    v-model="form.name"
                    type="text"
                    name="name"
                    autocomplete="name"
                    class="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/60 focus:ring-1 focus:ring-crimson-600/30 transition-colors"
                    :placeholder="t('contact.placeholderName')"
                    :class="errors.name ? 'border-red-500/50' : ''"
                  />
                  <p v-if="errors.name" class="text-xs text-red-400/90">
                    {{ errors.name }}
                  </p>
                </div>
                <div class="space-y-2">
                  <label
                    for="contact-email"
                    class="block text-xs uppercase tracking-[0.15em] text-white/45"
                    >{{ t("contact.labelEmail") }}</label
                  >
                  <input
                    id="contact-email"
                    v-model="form.email"
                    type="email"
                    name="email"
                    autocomplete="email"
                    class="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/60 focus:ring-1 focus:ring-crimson-600/30 transition-colors"
                    :placeholder="t('contact.placeholderEmail', { at: '@' })"
                    :class="errors.email ? 'border-red-500/50' : ''"
                  />
                  <p v-if="errors.email" class="text-xs text-red-400/90">
                    {{ errors.email }}
                  </p>
                </div>
              </div>

              <div class="space-y-2">
                <label
                  for="contact-subject"
                  class="block text-xs uppercase tracking-[0.15em] text-white/45"
                  >{{ t("contact.labelSubject") }}</label
                >
                <input
                  id="contact-subject"
                  v-model="form.subject"
                  type="text"
                  name="subject"
                  class="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/60 focus:ring-1 focus:ring-crimson-600/30 transition-colors"
                  :placeholder="t('contact.placeholderSubject')"
                  :class="errors.subject ? 'border-red-500/50' : ''"
                />
                <p v-if="errors.subject" class="text-xs text-red-400/90">
                  {{ errors.subject }}
                </p>
              </div>

              <div class="space-y-2">
                <label
                  for="contact-message"
                  class="block text-xs uppercase tracking-[0.15em] text-white/45"
                  >{{ t("contact.labelMessage") }}</label
                >
                <textarea
                  id="contact-message"
                  v-model="form.message"
                  name="message"
                  rows="5"
                  class="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-crimson-600/60 focus:ring-1 focus:ring-crimson-600/30 transition-colors resize-y min-h-[120px]"
                  :placeholder="t('contact.placeholderMessage')"
                  :class="errors.message ? 'border-red-500/50' : ''"
                />
                <p v-if="errors.message" class="text-xs text-red-400/90">
                  {{ errors.message }}
                </p>
              </div>

              <button
                type="submit"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-700 disabled:opacity-50 disabled:pointer-events-none text-white font-light tracking-wide transition-colors border border-crimson-500/30 shadow-[0_8px_28px_-6px_rgba(220,38,38,0.35)]"
                :disabled="submitting"
              >
                <Send class="w-4 h-4" />
                {{ submitting ? t("common.sending") : t("contact.send") }}
              </button>
            </form>
          </div>
        </div>

        <!-- Support info -->
        <section
          v-motion
          :initial="{ opacity: 0 }"
          :visible-once="{ opacity: 1, transition: { duration: 600 } }"
          class="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-8 text-center"
        >
          <p class="text-white/55 font-light leading-relaxed max-w-xl mx-auto text-sm md:text-base">
            {{ t("contact.supportNote") }}
          </p>
        </section>

        <!-- Direct email -->
        <section class="text-center space-y-2">
          <p class="text-xs uppercase tracking-[0.25em] text-white/35">
            {{ t("contact.preferEmail") }}
          </p>
          <a
            :href="`mailto:${SUPPORT_EMAIL}`"
            class="text-crimson-400/90 hover:text-crimson-300 font-light text-lg transition-colors"
          >
            {{ SUPPORT_EMAIL }}
          </a>
        </section>

      </div>
    </main>
  </div>
</template>
