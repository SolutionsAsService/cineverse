<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
const cat = useCatalog().cat!; const kind = ref<'all' | 'series' | 'universe'>('all'); const q = ref('');
const list = computed(() => cat.data.franchises.filter(f => f.k !== 'trilogy' && (kind.value === 'all' || f.k === kind.value) && (!q.value || f.n.toLowerCase().includes(q.value.toLowerCase()))).sort((a, b) => b.films.length - a.films.length));
const span = (id: string) => { const f = cat.filmsOfFranchise(id); return `${f[0]?.y}–${f.at(-1)?.y}`; };
</script>
<template><div class="zone zone-franchise"><div class="wrap py-8"><p class="eyebrow">Franchise explorer</p><h1 class="display text-4xl mt-2">Series, universes and franchises</h1><p class="text-dim mt-3 max-w-[60ch]">From Wikidata’s “part of the series” statements. Release order is not canonical order: each page shows both where Wikidata records sequels.</p>
  <div class="flex flex-wrap gap-2 mt-5"><div class="flex" role="group" aria-label="Kind"><button v-for="k in (['all', 'series', 'universe'] as const)" :key="k" class="btn" :class="kind === k ? 'on' : 'ghost'" @click="kind = k">{{ k === 'all' ? 'All' : k === 'series' ? 'Series' : 'Universes' }}</button></div><input v-model="q" class="field !w-64" type="search" placeholder="Filter franchises" aria-label="Filter franchises" /></div>
  <ul class="grid grid-cols-1 gap-3 mt-6 sm:grid-cols-2 lg:grid-cols-4"><li v-for="f in list" :key="f.id"><RouterLink :to="`/franchise/${f.id}`" class="panel p-4 block hover:border-franchise h-full"><p class="eyebrow">{{ f.k }} · {{ f.films.length }} films</p><b class="block font-display text-lg leading-tight mt-2">{{ f.n }}</b><span class="text-sm text-faint">{{ span(f.id) }}</span></RouterLink></li></ul></div></div></template>
