<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { titleCard } from '@/lib/poster';
const cat = useCatalog().cat!; const kind = ref<'all' | 'narrative' | 'thematic' | 'director-defined' | 'unclassified'>('all'); const q = ref('');
const KIND: Record<string, string> = { narrative: 'Narrative', thematic: 'Thematic', 'director-defined': 'Director-defined', unclassified: 'Not classified' };
const HELP: Record<string, string> = { narrative: 'One continuous story told over three films.', thematic: 'Linked by a shared theme or idea, not by story.', 'director-defined': 'Separate stories the filmmaker presents together: shared creators, cast and style.', unclassified: 'Wikidata lists these as a trilogy but does not say what kind. Not guessed here.' };
const sets = computed(() => [...cat.data.franchises.filter(f => f.k === 'trilogy'), ...cat.data.trilogies].map(t => {
  const films = cat.filmsOfFranchise(t.id); const shared = (key: 'dir' | 'co' | 'dp' | 'wr') => { const first = films[0]?.[key] || []; return first.filter(p => films.every(f => f[key].includes(p))).map(p => cat.person.get(p)?.n).filter(Boolean) as string[]; };
  const cast = (() => { const n = new Map<string, number>(); for (const f of films) for (const [p] of f.cast) n.set(p, (n.get(p) || 0) + 1); return [...n.entries()].filter(x => x[1] === films.length && films.length > 1).slice(0, 3).map(x => cat.person.get(x[0])?.n).filter(Boolean) as string[]; })();
  return { t, films, kind: t.kind || 'unclassified', dir: shared('dir'), co: shared('co'), cast };
}).filter(s => s.films.length >= 2).sort((a, b) => (b.films[0]?.pop || 0) - (a.films[0]?.pop || 0)));
const list = computed(() => sets.value.filter(s => (kind.value === 'all' || s.kind === kind.value) && (!q.value || s.t.n.toLowerCase().includes(q.value.toLowerCase()))));
</script>
<template><div class="zone zone-trilogy"><div class="wrap py-8"><p class="eyebrow">The Trilogy Machine</p><h1 class="display text-4xl mt-2">{{ sets.length }} trilogies, and what kind of trilogy each is</h1>
  <p class="text-dim mt-3 max-w-[64ch]">Not every trilogy is one story. The Cornetto Trilogy is linked by its makers and gags; the Three Colours films by a theme. Classification comes from the product brief’s own list; Wikidata trilogies it does not mention stay “not classified”.</p>
  <div class="flex flex-wrap gap-2 mt-5"><button v-for="k in (['all', 'narrative', 'thematic', 'director-defined', 'unclassified'] as const)" :key="k" class="btn" :class="kind === k ? 'on' : 'ghost'" @click="kind = k">{{ k === 'all' ? 'All' : KIND[k] }}</button><input v-model="q" class="field !w-56" type="search" placeholder="Filter trilogies" aria-label="Filter trilogies" /></div>
  <p v-if="kind !== 'all'" class="text-sm text-dim mt-2">{{ HELP[kind] }}</p>
  <ul class="grid grid-cols-1 gap-4 mt-6 lg:grid-cols-2"><li v-for="s in list" :key="s.t.id"><RouterLink :to="`/franchise/${s.t.id}`" class="panel p-4 flex gap-4 hover:border-trilogy h-full">
    <div class="flex shrink-0"><img v-for="(f, i) in s.films.slice(0, 3)" :key="f.id" :src="titleCard(f, cat.primaryGenre(f))" alt="" width="64" height="96" class="rounded-sm border border-line" :style="{ marginLeft: i ? '-18px' : '0' }" loading="lazy" /></div>
    <div class="min-w-0"><p class="eyebrow">{{ KIND[s.kind] }} · {{ s.films.length }} films · {{ s.films[0]?.y }}–{{ s.films.at(-1)?.y }}</p><b class="block font-display text-xl leading-tight mt-1">{{ s.t.n }}</b>
      <p class="text-sm text-dim mt-2">{{ s.films.map(f => f.t).join(' · ') }}</p>
      <p v-if="s.dir.length || s.co.length || s.cast.length" class="text-xs text-faint mt-2">Shared by all films: <template v-if="s.dir.length">director {{ s.dir.join(', ') }}</template><template v-if="s.co.length"> · composer {{ s.co.join(', ') }}</template><template v-if="s.cast.length"> · cast {{ s.cast.join(', ') }}</template></p></div></RouterLink></li></ul>
  <p v-if="!list.length" class="text-dim mt-8">No trilogy matches.</p></div></div></template>
