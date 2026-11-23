<script setup lang="ts">
import { computed } from 'vue';
import * as d3 from 'd3';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { fingerprint } from '@/lib/discovery';
import { genreColor } from '@/lib/poster';
const props = defineProps<{ personId: string }>();
const cat = useCatalog().cat!;
const fp = computed(() => fingerprint(cat, props.personId));
// D3 computes the scales and shapes; Vue renders the SVG (one source of DOM truth).
const dW = 360, dH = 150, m = { l: 8, r: 8, t: 8, b: 22 };
const decades = computed(() => { const d = fp.value.decades; const x = d3.scaleBand<number>().domain(d.map(v => v.decade)).range([m.l, dW - m.r]).padding(.2); const y = d3.scaleLinear().domain([0, d3.max(d, v => v.n) || 1]).range([dH - m.b, m.t]); return d.map(v => ({ ...v, x: x(v.decade)!, w: x.bandwidth(), y: y(v.n), h: dH - m.b - y(v.n) })); });
const pie = computed(() => { const arcs = d3.pie<{ id: string; n: number }>().value(v => v.n).sort(null)(fp.value.genres.slice(0, 8)); const arc = d3.arc<d3.PieArcDatum<{ id: string; n: number }>>().innerRadius(34).outerRadius(64); return arcs.map(a => ({ d: arc(a) || '', id: a.data.id, n: a.data.n })); });
const roleName: Record<string, string> = { dir: 'Director', wr: 'Writer', co: 'Composer', dp: 'Cinematographer', pr: 'Producer', cast: 'Actor' };
</script>
<template>
  <div class="grid grid-cols-1 gap-5">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <figure class="panel p-3"><figcaption class="eyebrow mb-2">Films by decade</figcaption>
        <svg :viewBox="`0 0 ${dW} ${dH}`" class="w-full h-auto" role="img" :aria-label="`Films by decade: ${fp.decades.map(d => d.decade + 's ' + d.n).join(', ')}`">
          <g v-for="d in decades" :key="d.decade"><rect :x="d.x" :y="d.y" :width="d.w" :height="d.h" fill="var(--color-gold)" rx="2" /><text :x="d.x + d.w / 2" :y="dH - 6" text-anchor="middle" font-size="12" fill="var(--color-dim)">{{ String(d.decade).slice(2) }}s</text><text :x="d.x + d.w / 2" :y="d.y - 3" text-anchor="middle" font-size="12" fill="var(--color-text)">{{ d.n }}</text></g>
        </svg></figure>
      <figure class="panel p-3"><figcaption class="eyebrow mb-2">Genre distribution</figcaption>
        <div class="flex items-center gap-3"><svg viewBox="-70 -70 140 140" class="w-32 h-32 shrink-0" role="img" :aria-label="`Genres: ${fp.genres.slice(0, 8).map(g => g.label + ' ' + g.n).join(', ')}`"><path v-for="a in pie" :key="a.id" :d="a.d" :fill="genreColor(a.id, 58, .6)" stroke="var(--color-ink)" stroke-width="1.5" /></svg>
          <ul class="text-sm grid grid-cols-1 gap-1"><li v-for="g in fp.genres.slice(0, 6)" :key="g.id" class="flex items-center gap-2"><i class="w-2.5 h-2.5 rounded-sm inline-block" :style="{ background: genreColor(g.id, 58, .6) }" />{{ g.label }} <span class="text-faint">{{ g.n }}</span></li></ul></div></figure>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      <section v-for="[title, list] in ([['Frequent co-stars', fp.costars], ['Frequent directors', fp.directors], ['Frequent composers', fp.composers], ['Frequent cinematographers', fp.cinematographers], ['Frequent writers', fp.writers]] as const)" :key="title" v-show="list.length">
        <h3 class="eyebrow mb-2">{{ title }}</h3><ul class="grid grid-cols-1 gap-1"><li v-for="c in list" :key="c.id" class="flex justify-between gap-2"><RouterLink :to="`/person/${c.id}`" class="hover:text-gold">{{ c.name }}</RouterLink><span class="text-faint">{{ c.n }} films together</span></li></ul></section>
    </div>
    <p class="text-sm text-dim">Roles on record: {{ fp.roles.map(([r, n]) => `${roleName[r]} ${n}`).join(' · ') }}. Collaborators shown only when they share at least two films with this person.</p>
  </div>
</template>
