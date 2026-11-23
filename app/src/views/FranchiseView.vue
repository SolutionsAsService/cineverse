<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import FilmTile from '@/components/FilmTile.vue';
import FranchiseTimeline from '@/components/FranchiseTimeline.vue';
import NotFoundView from './NotFoundView.vue';
const props = defineProps<{ id: string }>();
const cat = useCatalog().cat!; const order = ref<'release' | 'story'>('release');
const fr = computed(() => cat.franchise.get(props.id));
const films = computed(() => cat.filmsOfFranchise(props.id));
// "story order" follows Wikidata's follows / followed-by chains where they exist; films not linked in a chain stay in release order after it. Many franchises have no single canonical order.
const story = computed(() => { const ids = new Set(films.value.map(f => f.id)); const first = films.value.filter(f => !f.prev.some(p => ids.has(p))); const out: typeof films.value = []; const seen = new Set<string>(); const walk = (f: typeof films.value[0]) => { if (seen.has(f.id)) return; seen.add(f.id); out.push(f); for (const n of f.next) { const g = cat.film.get(n); if (g && ids.has(g.id)) walk(g); } }; first.forEach(walk); films.value.forEach(walk); return out; });
const shown = computed(() => (order.value === 'story' ? story.value : films.value));
const linked = computed(() => films.value.some(f => f.next.length || f.prev.length));
const directors = computed(() => { const n = new Map<string, number>(); for (const f of films.value) for (const d of f.dir) n.set(d, (n.get(d) || 0) + 1); return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, c]) => ({ p: cat.person.get(id)!, c })); });
const actors = computed(() => { const n = new Map<string, number>(); for (const f of films.value) for (const [p] of f.cast) n.set(p, (n.get(p) || 0) + 1); return [...n.entries()].filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, c]) => ({ p: cat.person.get(id)!, c })); });
const kindLabel: Record<string, string> = { narrative: 'Narrative trilogy: one continuous story', thematic: 'Thematic trilogy: linked by theme, not by story', 'director-defined': 'Director-defined: separate stories, shared creators' };
</script>
<template>
  <NotFoundView v-if="!fr" />
  <div v-else class="zone" :class="fr.k === 'trilogy' ? 'zone-trilogy' : 'zone-franchise'"><div class="wrap py-8">
    <nav class="text-sm text-faint mb-4"><RouterLink :to="fr.k === 'trilogy' ? '/trilogies' : '/franchises'" class="hover:text-gold">{{ fr.k === 'trilogy' ? 'Trilogies' : 'Franchises' }}</RouterLink> / {{ fr.n }}</nav>
    <p class="eyebrow">{{ fr.k === 'trilogy' ? 'Trilogy' : fr.k === 'universe' ? 'Shared universe' : 'Series' }} · {{ films.length }} films · source: {{ fr.src }}</p>
    <h1 class="display text-4xl lg:text-5xl mt-2">{{ fr.n }}</h1>
    <p v-if="fr.kind" class="mt-3"><span class="chip text-text"><i style="background: var(--color-trilogy)" />{{ kindLabel[fr.kind] }}</span></p><p v-if="fr.note" class="text-dim mt-2 max-w-[62ch]">{{ fr.note }}</p>
    <div class="flex flex-wrap gap-2 mt-5"><RouterLink :to="{ path: '/explore', query: { film: films[0]?.id } }" class="btn primary">Open on the map</RouterLink>
      <div class="flex" role="group" aria-label="Order"><button class="btn" :class="order === 'release' ? 'on' : 'ghost'" @click="order = 'release'">Release order</button><button class="btn" :class="order === 'story' ? 'on' : 'ghost'" :disabled="!linked" @click="order = 'story'">Story order (Wikidata links)</button></div></div>
    <p v-if="!linked" class="text-sm text-faint mt-2">Wikidata records no sequel links between these films, so only release order is shown. A franchise has no single canonical order.</p>
    <FranchiseTimeline :films="shown" class="mt-6" />
    <section class="mt-6"><h2 class="display text-2xl mb-3">The films</h2><div class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-4"><FilmTile v-for="f in shown" :key="f.id" :film="f" /></div></section>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-10"><section v-if="directors.length"><h2 class="eyebrow mb-2">Directors</h2><ul class="grid grid-cols-1 gap-1"><li v-for="d in directors" :key="d.p.id" class="flex justify-between"><RouterLink :to="`/person/${d.p.id}`" class="hover:text-gold">{{ d.p.n }}</RouterLink><span class="text-faint">{{ d.c }} films</span></li></ul></section>
      <section v-if="actors.length"><h2 class="eyebrow mb-2">Recurring cast</h2><ul class="grid grid-cols-1 gap-1"><li v-for="d in actors" :key="d.p.id" class="flex justify-between"><RouterLink :to="`/person/${d.p.id}`" class="hover:text-gold">{{ d.p.n }}</RouterLink><span class="text-faint">{{ d.c }} films</span></li></ul></section></div>
  </div></div>
</template>
