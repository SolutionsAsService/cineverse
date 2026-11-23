<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import MovieDetailPanel from '@/components/MovieDetailPanel.vue';
import DiscoveryPanel from '@/components/DiscoveryPanel.vue';
import FilmTile from '@/components/FilmTile.vue';
import NotFoundView from './NotFoundView.vue';
const props = defineProps<{ id: string }>();
const cat = useCatalog().cat!;
const f = computed(() => cat.film.get(props.id));
const series = computed(() => (f.value ? [...f.value.fr, ...(f.value.tr || [])].map(i => cat.franchise.get(i)).filter((x): x is NonNullable<typeof x> => !!x) : []));
const sequence = computed(() => (f.value && series.value[0] ? cat.filmsOfFranchise(series.value[0].id) : []));
</script>
<template>
  <NotFoundView v-if="!f" />
  <div v-else class="zone"><div class="wrap py-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
    <div><nav class="text-sm text-faint mb-4" aria-label="Breadcrumb"><RouterLink to="/" class="hover:text-gold">Home</RouterLink> / <RouterLink to="/explore" class="hover:text-gold">Map</RouterLink> / {{ f.t }}</nav><MovieDetailPanel :id="f.id" show-connections @focus="id => $router.push(`/movie/${id}`)" />
      <section v-if="sequence.length > 1" class="mt-8"><h2 class="display text-xl mb-3">{{ series[0].n }}</h2><div class="rail"><FilmTile v-for="s in sequence" :key="s.id" :film="s" :sub="`${s.y}${s.id === f.id ? ' · this film' : ''}`" /></div></section></div>
    <aside><h2 class="display text-2xl mb-3">What to watch next</h2><DiscoveryPanel :film-id="f.id" @add="id => $router.push({ path: '/explore', query: { film: id } })" /></aside>
  </div></div>
</template>
