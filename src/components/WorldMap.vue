<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const props = withDefaults(
  defineProps<{
    center?: [number, number];
    zoom?: number;
    markerPosition?: [number, number];
    showMarker?: boolean;
    radarPosition?: [number, number] | null;
  }>(),
  {
    center: () => [0, 20],
    zoom: 1,
  }
);

const W = 800;
const H = 450;

const landPaths = ref<string[]>([]);
const particleStyles = ref<{ left: string; top: string; dur: number }[]>([]);
let cachedTopology: unknown = null;

function projectPaths() {
  if (!cachedTopology) return;
  const t = cachedTopology as { objects: { countries: object } };
  const c = props.center ?? [0, 20];
  const z = props.zoom ?? 1;
  const proj = geoMercator()
    .center(c)
    .scale(147 * z)
    .translate([W / 2, H / 2]);
  const path = geoPath(proj);
  const paths: string[] = [];
  const land = feature(t as never, t.objects.countries as never);
  if (land.type === "FeatureCollection") {
    for (const f of land.features) {
      const d = path(f as never);
      if (d) paths.push(d);
    }
  } else {
    const d = path(land as never);
    if (d) paths.push(d);
  }
  landPaths.value = paths;
}

onMounted(async () => {
  const res = await fetch(geoUrl);
  cachedTopology = await res.json();
  projectPaths();
  particleStyles.value = Array.from({ length: 30 }).map(() => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    dur: Math.random() * 10 + 10,
  }));
});

watch(
  () => [props.center?.[0], props.center?.[1], props.zoom],
  () => projectPaths()
);

const projection = computed(() => {
  const c = props.center ?? [0, 20];
  const z = props.zoom ?? 1;
  return geoMercator().center(c).scale(147 * z).translate([W / 2, H / 2]);
});

function projectPoint(lon: number, lat: number): [number, number] {
  const p = projection.value([lon, lat]);
  return p ?? [0, 0];
}

const radarXY = computed(() => {
  if (!props.radarPosition) return null;
  return projectPoint(props.radarPosition[0], props.radarPosition[1]);
});

const markerXY = computed(() => {
  if (!props.markerPosition) return null;
  return projectPoint(props.markerPosition[0], props.markerPosition[1]);
});
</script>

<template>
  <div class="relative w-full h-full">
    <svg
      class="w-full h-full"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="xMidYMid slice"
      style="background: transparent"
    >
      <g>
        <path
          v-for="(d, i) in landPaths"
          :key="i"
          :d="d"
          fill="#1a1a1a"
          stroke="#2a2a2a"
          stroke-width="0.5"
        />
      </g>

      <g v-if="radarXY">
        <circle
          :cx="radarXY[0]"
          :cy="radarXY[1]"
          r="10"
          fill="#dc2626"
          opacity="0.4"
          filter="blur(8px)"
        />
        <circle
          :cx="radarXY[0]"
          :cy="radarXY[1]"
          r="8"
          fill="none"
          stroke="#dc2626"
          stroke-width="2"
          opacity="0.8"
        />
        <circle :cx="radarXY[0]" :cy="radarXY[1]" r="5" fill="#dc2626" />
        <circle :cx="radarXY[0]" :cy="radarXY[1]" r="2" fill="#ff3333" />
      </g>

      <g v-if="showMarker && markerXY">
        <circle
          :cx="markerXY[0]"
          :cy="markerXY[1]"
          r="12"
          fill="none"
          stroke="#dc2626"
          stroke-width="2"
          opacity="0.8"
        >
          <animate
            attributeName="r"
            values="12;18;12"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.8;0;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <ellipse
          :cx="markerXY[0]"
          :cy="markerXY[1] + 15"
          rx="6"
          ry="2"
          fill="#000"
          opacity="0.3"
        />
        <path
          :transform="`translate(${markerXY[0]}, ${markerXY[1]})`"
          d="M0,-10 Q5,-10 5,-5 Q5,0 0,10 Q-5,0 -5,-5 Q-5,-10 0,-10 Z"
          fill="#dc2626"
          stroke="#fff"
          stroke-width="1.5"
        />
        <circle :cx="markerXY[0]" :cy="markerXY[1] - 5" r="2.5" fill="#fff" />
      </g>
    </svg>

    <div class="absolute inset-0 pointer-events-none">
      <div
        v-for="(p, i) in particleStyles"
        :key="i"
        class="absolute w-1 h-1 bg-white/20 rounded-full motion-safe:animate-pulse"
        :style="{ left: p.left, top: p.top, animationDuration: `${p.dur}s` }"
      />
    </div>

    <div
      class="absolute inset-0 pointer-events-none"
      style="
        background: radial-gradient(
          circle at center,
          transparent 0%,
          transparent 45%,
          rgba(0, 0, 0, 0.6) 100%
        );
      "
    />
  </div>
</template>
