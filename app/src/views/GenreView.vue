<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import * as d3 from 'd3';
import { useCatalog } from '@/stores/catalog';
import FilmTile from '@/components/FilmTile.vue';
import { genreColor } from '@/lib/poster';
import NotFoundView from './NotFoundView.vue';
const props = defineProps<{ id: string }>();
const cat = useCatalog().cat!;
const name = computed(() => cat.genreName.get(props.id));
const films = computed(() => (cat.byGenre.get(props.id) || []).slice().sort((a, b) => (b.pop || 0) - (a.pop || 0)));
const decades = computed(() => { const all = new Map<number, number>(), mine = new Map<number, number>(); for (const f of cat.data.films) all.set(Math.floor(f.y / 10) * 10, (all.get(Math.floor(f.y / 10) * 10) || 0) + 1); for (const f of films.value) mine.set(Math.floor(f.y / 10) * 10, (mine.get(Math.floor(f.y / 10) * 10) || 0) + 1);
  return [...all.keys()].sort((a, b) => a - b).map(d => ({ d, n: mine.get(d) || 0, share: (mine.get(d) || 0) / (all.get(d) || 1), top: films.value.filter(f => Math.floor(f.y / 10) * 10 === d).slice(0, 2) })); });
const W = 640, H = 150; const x = computed(() => d3.scaleBand<number>().domain(decades.value.map(v => v.d)).range([30, W - 10]).padding(.15)); const y = computed(() => d3.scaleLinear().domain([0, d3.max(decades.value, v => v.share) || 1]).range([H - 24, 10]));
const subs = computed(() => { const n = new Map<string, number>(); for (const f of films.value) for (const s of f.sg) n.set(s, (n.get(s) || 0) + 1); return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14); });
const directors = computed(() => { const n = new Map<string, number>(); for (const f of films.value) for (const d of f.dir) n.set(d, (n.get(d) || 0) + 1); return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, c]) => ({ p: cat.person.get(id)!, c })); });
</script>
<template><NotFoundView v-if="!name" /><div v-else class="zone zone-genre" :style="{ '--wash': `color-mix(in srgb, ${genreColor(id, 52, .6)} 22%, transparent)` }"><div class="wrap py-8">
  <nav class="flex flex-wrap gap-1 mb-5" aria-label="Genres"><RouterLink v-for="g in cat.data.genres" :key="g.id" :to="`/genre/${g.id}`" class="chip !min-h-11" :class="g.id === id ? '!border-gold !text-gold' : ''">{{ g.n }}</RouterLink></nav>
  <p class="eyebrow">Genre explorer · {{ films.length }} films</p><h1 class="display text-5xl mt-2">{{ name }}</h1>
  <section class="mt-6"><h2 class="display text-xl mb-2">Genre evolution</h2><p class="text-sm text-dim mb-2">Share of each decade’s films in this catalog that carry the {{ name }} label (Wikidata genre statements). A reading of the catalog, not of all cinema.</p>
    <figure class="panel p-3 overflow-x-auto"><svg :viewBox="`0 0 ${W} ${H}`" class="w-full min-w-[520px] h-auto" role="img" :aria-label="`${name} share of films by decade: ${decades.map(v => v.d + 's ' + Math.round(v.share * 100) + '%').join(', ')}`"><g v-for="v in decades" :key="v.d"><rect :x="x(v.d)" :y="y(v.share)" :width="x.bandwidth()" :height="H - 24 - y(v.share)" :fill="genreColor(id, 58, .6)" rx="2" /><text :x="(x(v.d) || 0) + x.bandwidth() / 2" :y="H - 8" text-anchor="middle" font-size="12" fill="var(--color-dim)">{{ String(v.d).slice(2) }}s</text><text :x="(x(v.d) || 0) + x.bandwidth() / 2" :y="y(v.share) - 3" text-anchor="middle" font-size="11" fill="var(--color-text)">{{ Math.round(v.share * 100) }}%</text></g></svg></figure>
    <ul class="grid grid-cols-1 gap-1 mt-3 text-sm sm:grid-cols-2"><li v-for="v in decades.filter(d => d.top.length)" :key="v.d" class="text-dim"><b class="text-text">{{ v.d }}s</b> · <RouterLink v-for="(f, i) in v.top" :key="f.id" :to="`/movie/${f.id}`" class="hover:text-gold">{{ f.t }}<template v-if="i < v.top.length - 1">, </template></RouterLink></li></ul></section>
  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-8"><section v-if="subs.length"><h2 class="eyebrow mb-2">Sub-genres in the data</h2><div class="flex flex-wrap gap-2"><span v-for="s in subs" :key="s[0]" class="chip">{{ s[0] }} <span class="text-faint">{{ s[1] }}</span></span></div></section>
    <section><h2 class="eyebrow mb-2">Directors in this genre</h2><ul class="grid grid-cols-1 gap-1 text-sm"><li v-for="d in directors" :key="d.p.id" class="flex justify-between"><RouterLink :to="`/person/${d.p.id}`" class="hover:text-gold">{{ d.p.n }}</RouterLink><span class="text-faint">{{ d.c }}</span></li></ul></section></div>
  <section class="mt-8"><h2 class="display text-2xl mb-3">Most widely documented</h2><div class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-4"><FilmTile v-for="f in films.slice(0, 48)" :key="f.id" :film="f" :to="`/explore?film=${f.id}`" /></div></section></div></div></template>
