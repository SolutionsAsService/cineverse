<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { sixDegrees, type Step } from '@/lib/discovery';
// Routes: real shortest chains between famous films, computed when the page opens. They are examples of the six-degrees tool, not recommendations.
const cat = useCatalog().cat!;
const PAIRS2: [string, string][] = [['Pulp Fiction', 'Blade Runner'], ['The Godfather', 'Mad Max: Fury Road'], ['Parasite', 'Inception'], ['Toy Story', 'Schindler\'s List'], ['Alien', 'The Dark Knight']];
const routes = computed(() => PAIRS2.slice(0, 5).map(([a, b]) => { const A = cat.data.films.find(f => f.t === a), B = cat.data.films.find(f => f.t === b); if (!A || !B) return null; const p = sixDegrees(cat, A.id, B.id, { max: 1 })[0]; return p ? { a: A, b: B, p } : null; }).filter((x): x is { a: NonNullable<typeof x>['a']; b: NonNullable<typeof x>['b']; p: Step[] } => !!x));
</script>
<template>
  <ul class="grid grid-cols-1 gap-3 lg:grid-cols-2">
    <li v-for="r in routes" :key="r.a.id + r.b.id"><RouterLink :to="{ path: '/paths', query: { a: r.a.id, b: r.b.id } }" class="panel p-4 block hover:border-gold h-full">
      <p class="eyebrow">{{ r.p.filter(s => s.kind === 'film').length - 1 }} film-to-film steps</p>
      <ol class="mt-3 grid gap-0"><li v-for="(s, i) in r.p" :key="i" class="flex gap-3 items-stretch"><div class="flex flex-col items-center w-4 shrink-0"><span class="w-2.5 h-2.5 rounded-full mt-1.5" :style="{ background: s.kind === 'film' ? 'var(--color-gold)' : s.via === 'person' ? 'var(--color-director)' : 'var(--color-franchise)' }" /><span v-if="i < r.p.length - 1" class="flex-1 w-px bg-line" /></div>
        <div class="pb-2 min-w-0 text-sm"><b v-if="s.kind === 'film'" class="font-semibold">{{ s.label }} <span class="font-normal text-faint">{{ s.sub }}</span></b><span v-else class="text-dim"><span :class="s.via === 'person' ? 'text-director' : 'text-franchise'">{{ s.label }}</span>: {{ s.sub }}</span></div></li></ol></RouterLink></li>
  </ul>
  <p class="text-xs text-faint mt-3 max-w-[70ch]">Examples of the Six degrees tool, not recommendations or lineages: a shortest chain of directors, writers and cast. Where a step says “listed in the cast”, Wikidata does not record that actor’s billing. Ties between equally short chains are broken arbitrarily.</p>
</template>
