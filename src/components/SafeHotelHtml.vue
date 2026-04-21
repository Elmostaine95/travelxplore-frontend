<template>
  <div
    class="hotel-html"
    :class="contentClass"
    v-html="safe"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { sanitizeHotelHtml } from "../lib/sanitizeHtml";

const props = withDefaults(
  defineProps<{
    html: string;
    contentClass?: string;
  }>(),
  { contentClass: "" }
);

const safe = computed(() => sanitizeHotelHtml(props.html || ""));
</script>

<style scoped>
.hotel-html :deep(p) {
  margin-bottom: 0.5rem;
}
.hotel-html :deep(p:last-child) {
  margin-bottom: 0;
}
.hotel-html :deep(ul),
.hotel-html :deep(ol) {
  margin: 0.5rem 0 0.5rem 1.25rem;
  padding-left: 0.25rem;
}
.hotel-html :deep(li) {
  margin-bottom: 0.25rem;
}
.hotel-html :deep(strong),
.hotel-html :deep(b) {
  font-weight: 600;
}
.hotel-html :deep(a) {
  color: rgb(248 113 113);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.hotel-html :deep(a:hover) {
  color: rgb(252 165 165);
}
.hotel-html :deep(h1),
.hotel-html :deep(h2),
.hotel-html :deep(h3),
.hotel-html :deep(h4) {
  font-weight: 500;
  margin: 0.75rem 0 0.5rem;
}
.hotel-html :deep(h1:first-child),
.hotel-html :deep(h2:first-child),
.hotel-html :deep(h3:first-child),
.hotel-html :deep(h4:first-child) {
  margin-top: 0;
}
.hotel-html :deep(blockquote) {
  border-left: 2px solid rgba(255, 255, 255, 0.2);
  padding-left: 0.75rem;
  margin: 0.5rem 0;
}
</style>
