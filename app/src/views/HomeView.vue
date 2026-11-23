<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import HeroConstellation from '@/components/HeroConstellation.vue';
import FilmTile from '@/components/FilmTile.vue';
import RouteCards from '@/components/RouteCards.vue';
import { genreColor } from '@/lib/poster';
defineEmits<{ search: [] }>();
const cat = useCatalog().cat!;
const popular = computed(() => cat.data.films.slice(0, 18));
const franchises = computed(() => [...cat.seriesSets].sort((a, b) => b.films.length - a.films.length).slice(0, 10));
const trilogies = computed(() => cat.trilogySets.slice(0, 8));
const directors = computed(() => { const n = new Map<string, number>(); for (const f of cat.data.films) for (const d of f.dir) n.set(d, (n.get(d) || 0) + 1); return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, c]) => ({ p: cat.person.get(id)!, c })).filter(x => x.p); });
const decades = computed(() => { const n = new Map<number, number>(); for (const f of cat.data.films) n.set(Math.floor(f.y / 10) * 10, (n.get(Math.floor(f.y / 10) * 10) || 0) + 1); return [...n.entries()].sort((a, b) => a[0] - b[0]); });
const filmsOf = (id: string) => cat.filmsOfFranchise(id);
</script>

<template>
  <div class="zone zone-home">
    <section class="wrap pt-5 pb-8 lg:pt-6">
      <div class="grid grid-cols-1 gap-5 lg:gap-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] items-center">
        <div>
          <p class="eyebrow">The interactive movie connection atlas</p>
          <h1 class="display text-[clamp(1.9rem,5.2vw,4.4rem)] mt-3">Every movie has a story. <span class="text-gold">Every movie connects.</span></h1>
          <p class="text-dim text-[17px] mt-4 max-w-[46ch] hidden sm:block">A map of {{ cat.data.films.length.toLocaleString() }} films joined by who made them, who starred in them, and what they belong to. Start with one and follow the lines.</p>
          <div class="hidden sm:flex flex-wrap gap-3 mt-5"><RouterLink to="/explore" class="btn primary">Open the map</RouterLink><button class="btn" @click="$emit('search')">Search a film</button></div>
        </div>
        <HeroConstellation />
      </div>
    </section>

    <section class="wrap py-8"><div class="flex items-end justify-between mb-4"><h2 class="display text-2xl">Routes through cinema</h2><RouterLink to="/paths" class="text-gold text-sm min-h-11 inline-flex items-center">Try your own →</RouterLink></div><p class="text-dim text-sm mb-3 max-w-[62ch]">Shortest chains of real credits between famous films, computed when this page opens. Each step names the person or franchise the two films share.</p><RouteCards /></section>

    <section class="wrap py-8"><h2 class="display text-2xl mb-4">Start from a film</h2>
      <div class="rail"><FilmTile v-for="f in popular" :key="f.id" :film="f" :to="`/explore?film=${f.id}`" :sub="`${f.y} · ${cat.genreName.get(cat.primaryGenre(f))}`" /></div>
      <p class="text-faint text-sm mt-2">Tiles open the map centred on that film. Posters are not redistributed: each title card is generated from the film’s own data.</p></section>

    <section class="wrap py-8"><div class="flex items-end justify-between mb-4"><h2 class="display text-2xl">Franchises and universes</h2><RouterLink to="/franchises" class="text-gold text-sm min-h-11 inline-flex items-center">All {{ cat.seriesSets.length }} →</RouterLink></div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"><RouterLink v-for="f in franchises" :key="f.id" :to="`/franchise/${f.id}`" class="panel p-4 hover:border-gold block"><p class="eyebrow">{{ f.k === 'universe' ? 'Universe' : 'Series' }} · {{ f.films.length }} films</p><b class="block mt-2 font-display text-lg leading-tight">{{ f.n }}</b><span class="text-sm text-faint">{{ filmsOf(f.id)[0]?.y }}–{{ filmsOf(f.id).at(-1)?.y }}</span></RouterLink></div></section>

    <section class="wrap py-8"><div class="flex items-end justify-between mb-4"><h2 class="display text-2xl">Trilogies</h2><RouterLink to="/trilogies" class="text-gold text-sm min-h-11 inline-flex items-center">The Trilogy Machine →</RouterLink></div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><RouterLink v-for="t in trilogies" :key="t.id" :to="`/franchise/${t.id}`" class="panel p-4 hover:border-trilogy block"><b class="block font-display text-lg leading-tight">{{ t.n }}</b><span class="text-sm text-faint">{{ t.films.length }} films · {{ filmsOf(t.id)[0]?.y }}–{{ filmsOf(t.id).at(-1)?.y }}</span></RouterLink></div></section>

    <section class="wrap py-8"><h2 class="display text-2xl mb-4">Genres</h2>
      <div class="flex flex-wrap gap-2"><RouterLink v-for="g in cat.data.genres" :key="g.id" :to="`/genre/${g.id}`" class="chip !min-h-11 !px-4 text-text" :style="{ borderColor: genreColor(g.id, 55, .5) }"><i :style="{ background: genreColor(g.id, 60, .6) }" />{{ g.n }} <span class="text-faint">{{ (cat.byGenre.get(g.id) || []).length }}</span></RouterLink></div></section>

    <section class="wrap py-8"><div class="flex items-end justify-between mb-4"><h2 class="display text-2xl">Filmmakers with the most films mapped</h2><RouterLink to="/people" class="text-gold text-sm min-h-11 inline-flex items-center">Directors and actors →</RouterLink></div>
      <div class="flex flex-wrap gap-2"><RouterLink v-for="d in directors" :key="d.p.id" :to="`/person/${d.p.id}`" class="chip !min-h-11 !px-4 text-text"><i style="background: var(--color-director)" />{{ d.p.n }} <span class="text-faint">{{ d.c }}</span></RouterLink></div></section>

    <section class="wrap py-8"><h2 class="display text-2xl mb-4">A century of films, by decade</h2>
      <RouterLink to="/timeline" class="block panel p-4 hover:border-gold" aria-label="Open the timeline"><div class="flex items-end gap-1 h-28"><div v-for="[d, n] in decades" :key="d" class="flex-1 min-w-0 flex flex-col items-center justify-end gap-1"><div class="w-full rounded-sm" :style="{ height: Math.max(4, n / Math.max(...decades.map(x => x[1])) * 88) + 'px', background: 'var(--color-gold)' }" /><span class="text-[12px] text-faint">{{ String(d).slice(2) }}s</span></div></div></RouterLink></section>

  </div>
</template>
