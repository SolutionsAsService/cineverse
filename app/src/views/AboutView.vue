<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { REL_DEFS } from '@/lib/relations';
const cat = useCatalog().cat!; const m = cat.data.meta;
const by = computed(() => { const n = new Map<string, number>(); for (const f of cat.data.films) { const c = f.cn[0] || 'unrecorded'; n.set(c, (n.get(c) || 0) + 1); } return [...n.entries()].sort((a, b) => b[1] - a[1]); });
const us = computed(() => by.value.find(x => x[0] === 'United States')?.[1] || 0);
const billing = computed(() => { let all = 0, known = 0; for (const f of cat.data.films) for (const c of f.cast) { all += 1; if (c[1] > 0) known += 1; } return { all, known, films: cat.data.films.filter(f => f.cast.some(c => c[1] > 0)).length }; });
const tiers = Object.values(REL_DEFS);
</script>
<template><div class="zone"><div class="wrap py-8 max-w-4xl"><p class="eyebrow">About the data</p><h1 class="display text-4xl mt-2">What is in this atlas, and what is not</h1>
  <p class="text-dim mt-3">Snapshot {{ m.generated }}: {{ m.films.toLocaleString() }} films, {{ m.people.toLocaleString() }} people, {{ cat.seriesSets.length }} series and universes, {{ cat.trilogySets.length }} trilogies.</p>
  <section class="mt-8"><h2 class="display text-2xl mb-2">How the films were chosen</h2><p class="text-dim">{{ m.selection }}</p>
    <p class="text-dim mt-2">Sitelinks (how many Wikipedias document a film) is a proxy for being widely known, not for quality. It favours canonical, widely translated and older films. The country balance rule widens the catalog but does not make it representative: {{ us.toLocaleString() }} of {{ m.films.toLocaleString() }} films ({{ Math.round(100 * us / m.films) }}%) list the United States first among their countries, and {{ by.length }} countries appear in all. “Every movie connects” is true of this curated set, not of all film.</p>
    <ul class="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 mt-3 text-sm"><li v-for="c in by.slice(0, 18)" :key="c[0]" class="flex justify-between border-b border-line/50 py-1"><span>{{ c[0] }}</span><span class="text-faint">{{ c[1] }}</span></li></ul></section>
  <section class="mt-8"><h2 class="display text-2xl mb-2">What a connection means</h2>
    <p class="text-dim">Every line carries a tier. <b class="text-text">FACT</b>: a Wikidata statement (a credit, a sequel link, a series) or the editorial trilogy list links the two films. <b class="text-text">SHARED LABEL</b>: both films carry the same coarse genre label. <b class="text-text">INFERRED</b>: an editorial reading (a shared Wikidata main subject) or an algorithm (Movie DNA).</p>
    <table class="w-full mt-3 text-sm"><caption class="sr-only">Relationship types, tiers and default weights</caption><thead class="text-faint text-left"><tr><th class="py-1 pr-2">Relationship</th><th class="pr-2">Tier</th><th class="pr-2">Default weight</th><th>Source</th></tr></thead><tbody><tr v-for="t in tiers" :key="t.type" class="border-t border-line/50"><td class="py-1 pr-2">{{ t.label }}</td><td class="pr-2">{{ t.tier }}</td><td class="pr-2">{{ t.weight }}</td><td class="text-faint">{{ t.source }}</td></tr></tbody></table></section>
  <section class="mt-8"><h2 class="display text-2xl mb-2">Known gaps</h2><ul class="grid gap-2 text-dim list-disc pl-5">
    <li>Cast billing order is recorded for {{ billing.films }} films ({{ Math.round(100 * billing.known / billing.all) }}% of cast entries). Elsewhere the cast shown is up to eight of the names Wikidata lists, in no meaningful order, so “lead actor” links are rare.</li>
    <li>Wikidata’s series statements are sometimes loose; studio catalogues are filtered out, but edge cases remain. Some trilogies list only two films here.</li>
    <li>Posters, stills and ratings are not redistributed; film movements are not in the data; there is no backend, so collections live in this browser.</li></ul></section>
  <p class="mt-8 text-sm text-faint">Full notes: <a class="underline" href="https://github.com/SolutionsAsService/cineverse/blob/main/docs/DATA.md" rel="noopener">docs/DATA.md</a>. Back to <RouterLink class="underline" to="/">home</RouterLink>.</p></div></div></template>
