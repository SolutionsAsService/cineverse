<script setup lang="ts">
import { computed } from 'vue';
import * as d3 from 'd3';
import { useRouter } from 'vue-router';
import type { Film } from '@/lib/types';
const props = defineProps<{ films: Film[] }>(); const router = useRouter();
const W = 900, H = 120; const ys = computed(() => props.films.map(f => f.y));
const x = computed(() => d3.scaleLinear().domain([Math.min(...ys.value), Math.max(...ys.value, Math.min(...ys.value) + 1)]).range([40, W - 40]));
const pts = computed(() => { const used = new Map<number, number>(); return props.films.map((f, i) => { const k = Math.round(x.value(f.y) / 26); const row = used.get(k) || 0; used.set(k, row + 1); return { f, i, cx: x.value(f.y), cy: 38 + row * 26 }; }); });
const links = computed(() => { const idx = new Map(pts.value.map(p => [p.f.id, p])); return pts.value.flatMap(p => p.f.next.map(n => idx.get(n)).filter((q): q is NonNullable<typeof q> => !!q).map(q => ({ a: p, b: q }))); });
</script>
<template>
  <figure class="panel p-3 overflow-x-auto"><figcaption class="eyebrow mb-1">Release timeline · lines show Wikidata sequel links</figcaption>
    <svg :viewBox="`0 0 ${W} ${H}`" class="w-full min-w-[640px] h-auto" role="group" aria-label="Franchise films by release year">
      <line x1="30" :x2="W - 30" y1="12" y2="12" stroke="var(--color-line)" /><text v-for="t in x.ticks(6)" :key="t" :x="x(t)" y="9" text-anchor="middle" font-size="12" fill="var(--color-faint)">{{ t }}</text>
      <line v-for="l in links" :key="l.a.f.id + l.b.f.id" :x1="l.a.cx" :y1="l.a.cy" :x2="l.b.cx" :y2="l.b.cy" stroke="var(--color-franchise)" stroke-opacity=".7" stroke-width="2" />
      <g v-for="p in pts" :key="p.f.id" tabindex="0" role="link" :aria-label="`${p.f.t} (${p.f.y})`" class="cursor-pointer" @click="router.push(`/movie/${p.f.id}`)" @keydown.enter="router.push(`/movie/${p.f.id}`)"><circle :cx="p.cx" :cy="p.cy" r="7" fill="var(--color-ink)" stroke="var(--color-gold)" stroke-width="2.5" /><title>{{ p.f.t }} ({{ p.f.y }})</title></g>
    </svg></figure>
</template>
