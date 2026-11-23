<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { useLibrary } from '@/stores/library';
import type { Kind } from '@/lib/search';
const catalog = useCatalog(), cat = catalog.cat!, route = useRoute(), router = useRouter(), lib = useLibrary();
const q = ref(String(route.query.q || '')); const kind = ref<Kind | ''>(''); const genre = ref(''); const decade = ref('');
const hits = computed(() => { const all = q.value.trim() ? catalog.index!.search(q.value, kind.value ? [kind.value] : undefined, 80) : [];
  return all.filter(h => { if (h.kind !== 'film') return !genre.value && !decade.value; const f = cat.film.get(h.id)!; return (!genre.value || f.g.includes(genre.value)) && (!decade.value || Math.floor(f.y / 10) * 10 === Number(decade.value)); }); });
watch(q, v => router.replace({ query: v ? { q: v } : {} }));
const to = (h: { kind: string; id: string }) => (h.kind === 'film' ? `/movie/${h.id}` : h.kind === 'person' ? `/person/${h.id}` : h.kind === 'genre' ? `/genre/${h.id}` : `/franchise/${h.id}`);
const decades = Array.from({ length: 13 }, (_, i) => 1900 + i * 10);
</script>
<template><div class="zone"><div class="wrap py-8"><p class="eyebrow">Search</p><h1 class="display text-4xl mt-2">Find a film, a filmmaker or a franchise</h1>
  <div class="grid grid-cols-1 gap-3 mt-5 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]"><input v-model="q" class="field" type="search" placeholder="Title, original title, person, genre, year…" aria-label="Search" autofocus />
    <select v-model="kind" class="field" aria-label="Kind"><option value="">Everything</option><option value="film">Films</option><option value="person">People</option><option value="franchise">Franchises</option><option value="genre">Genres</option></select>
    <select v-model="genre" class="field" aria-label="Genre"><option value="">Any genre</option><option v-for="g in cat.data.genres" :key="g.id" :value="g.id">{{ g.n }}</option></select>
    <select v-model="decade" class="field" aria-label="Decade"><option value="">Any decade</option><option v-for="d in decades" :key="d" :value="d">{{ d }}s</option></select></div>
  <div v-if="!q.trim()" class="mt-6 grid grid-cols-1 gap-3"><p class="eyebrow">Recent searches</p><div class="flex flex-wrap gap-2"><button v-for="r in lib.s.recent" :key="r" class="chip !min-h-11" @click="q = r">{{ r }}</button><span v-if="!lib.s.recent.length" class="text-dim">None yet. Typos are fine: “inceptoin” still finds Inception.</span></div></div>
  <p v-else class="mt-5 text-sm text-faint" role="status">{{ hits.length }} result{{ hits.length === 1 ? '' : 's' }}</p>
  <ul class="grid grid-cols-1 gap-2 mt-3"><li v-for="h in hits" :key="h.kind + h.id"><RouterLink :to="to(h)" class="panel p-3 flex items-center gap-3 min-h-14 hover:border-gold"><span class="chip shrink-0">{{ h.kind }}</span><span class="min-w-0"><b class="block truncate">{{ h.title }}</b><span class="text-sm text-faint block truncate">{{ h.sub }}</span></span></RouterLink></li></ul>
  <p v-if="q.trim() && !hits.length" class="text-dim mt-4">No match. Try fewer letters, a director’s surname, or remove a filter.</p></div></div></template>
