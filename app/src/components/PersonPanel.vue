<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import FilmTile from './FilmTile.vue';
import Fingerprint from './Fingerprint.vue';
import { ROLE_LABEL, type Role } from '@/lib/types';
const props = defineProps<{ id: string; graph?: boolean }>();
const emit = defineEmits<{ expand: []; add: [id: string] }>();
const cat = useCatalog().cat!;
const p = computed(() => cat.person.get(props.id)!);
const credits = computed(() => cat.credits.get(props.id) || []);
const roles = computed(() => [...new Set(credits.value.map(c => c.role))] as Role[]);
const filter = ref<'all' | Role | 'lead'>('all');
const films = computed(() => { const seen = new Map<string, { film: typeof credits.value[0]['film']; roles: Role[]; billing: number }>(); for (const c of credits.value) { if (filter.value === 'lead' ? !(c.role === 'cast' && c.billing > 0 && c.billing <= 3) : filter.value !== 'all' && c.role !== filter.value) continue; const e = seen.get(c.film.id) || { film: c.film, roles: [], billing: 0 }; e.roles.push(c.role); if (c.billing) e.billing = c.billing; seen.set(c.film.id, e); } return [...seen.values()].sort((a, b) => a.film.y - b.film.y); });
const wiki = computed(() => (p.value.w ? `https://en.wikipedia.org/wiki/${encodeURIComponent(p.value.w.replace(/ /g, '_'))}` : ''));
const hasBilling = computed(() => credits.value.some(c => c.role === 'cast' && c.billing > 0));
</script>
<template>
  <article class="grid grid-cols-1 gap-4" :aria-label="p.n">
    <header><p class="eyebrow">{{ roles.map(r => ROLE_LABEL[r]).join(' · ') }}<template v-if="p.b"> · born {{ p.b }}<template v-if="p.d">, died {{ p.d }}</template></template></p>
      <h2 class="display text-3xl mt-1">{{ p.n }}</h2><p v-if="p.de" class="text-faint text-sm">{{ p.de }}</p></header>
    <p v-if="p.ex" class="text-dim leading-relaxed">{{ p.ex }}</p>
    <p v-if="p.ex" class="text-xs text-faint -mt-2">Biography: <a :href="wiki" class="underline" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA 4.0, shortened). Facts: Wikidata (CC0).</p>
    <div class="flex flex-wrap gap-2"><button v-if="graph" class="btn primary" @click="emit('expand')">Show filmography on the map</button><RouterLink v-else :to="{ path: '/explore', query: { person: id } }" class="btn primary">Show on the map</RouterLink></div>
    <div v-if="!graph" class="flex flex-wrap gap-1" role="group" aria-label="Filter filmography by role"><button class="btn !min-h-11 !px-3" :class="filter === 'all' ? 'on' : 'ghost'" @click="filter = 'all'">All</button><button v-for="r in roles" :key="r" class="btn !min-h-11 !px-3" :class="filter === r ? 'on' : 'ghost'" @click="filter = r">{{ ROLE_LABEL[r] }}</button><button v-if="hasBilling" class="btn !min-h-11 !px-3" :class="filter === 'lead' ? 'on' : 'ghost'" @click="filter = 'lead'">Leading roles</button></div>
    <section><h3 class="eyebrow mb-2">Filmography · {{ films.length }}</h3>
      <div v-if="!graph" class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3"><FilmTile v-for="e in films" :key="e.film.id" :film="e.film" :sub="`${e.film.y} · ${e.roles.map(r => ROLE_LABEL[r]).join(', ')}`" /></div>
      <ul v-else class="text-sm grid grid-cols-1 gap-1"><li v-for="e in films.slice(0, 40)" :key="e.film.id" class="flex justify-between gap-2"><button class="text-left hover:text-gold min-h-11 py-1" @click="emit('add', e.film.id)">{{ e.film.t }} <span class="text-faint">{{ e.film.y }}</span></button><span class="text-faint">{{ e.roles.map(r => ROLE_LABEL[r]).join(', ') }}</span></li></ul>
      <p v-if="filter === 'cast' || filter === 'lead'" class="text-xs text-faint mt-2">Leading roles are shown only where Wikidata records the billing order; cameo status is not recorded.</p></section>
    <section v-if="!graph"><h3 class="eyebrow mb-3">Fingerprint</h3><Fingerprint :person-id="id" /></section>
  </article>
</template>
