<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { useSettings } from '@/stores/settings';
import { dna, multiHop, similar, unexpected } from '@/lib/discovery';
import RelationBadge from './RelationBadge.vue';
import { titleCard } from '@/lib/poster';
import { CATEGORY_COLOR } from '@/lib/types';
const props = defineProps<{ filmId: string; compact?: boolean; present?: (id: string) => boolean }>();
const emit = defineEmits<{ add: [id: string] }>();
const cat = useCatalog().cat!, st = useSettings();
const tab = ref<'similar' | 'hops' | 'surprise' | 'dna'>('similar');
const film = computed(() => cat.film.get(props.filmId)!);
const sim = computed(() => similar(cat, props.filmId, st.weights, props.compact ? 6 : 12));
const hops = computed(() => multiHop(cat, props.filmId, st.weights, { n: props.compact ? 5 : 10 }));
const odd = computed(() => unexpected(cat, props.filmId, st.weights, props.compact ? 5 : 8));
const profile = computed(() => dna(cat, film.value));
const bars = computed(() => Object.entries(profile.value.genres).map(([g, v]) => ({ g, name: cat.genreName.get(g) || g, v })).sort((a, b) => b.v - a.v));
const tabs = [['similar', 'Similar'], ['hops', 'Multi-hop'], ['surprise', 'Same person, other genre'], ['dna', 'Movie DNA']] as const;
</script>
<template>
  <section aria-label="Discovery">
    <div class="flex flex-wrap gap-1 mb-3" role="tablist"><button v-for="t in tabs" :key="t[0]" role="tab" :aria-selected="tab === t[0]" class="btn !min-h-11 !px-3" :class="tab === t[0] ? 'on' : 'ghost'" @click="tab = t[0]">{{ t[1] }}</button></div>
    <p class="text-sm text-faint mb-3">
      <template v-if="tab === 'similar'">If you liked “{{ film.t }}”: relationships (weights in the sidebar) blended with Movie DNA similarity at {{ Math.round(st.weights.SIMILAR_DNA * .43) }}%. Each reason is labelled; the DNA part is inferred, and ties go to the more widely documented film.</template>
      <template v-else-if="tab === 'hops'">Two steps out: “{{ film.t }}” → connected film → another film. Only factual links are followed.</template>
      <template v-else-if="tab === 'surprise'">Films that share a person with “{{ film.t }}” but no genre label, or that are 35+ years apart. Films without genre labels are skipped.</template>
      <template v-else>A small profile built from this film’s own data. Algorithmic, used for the “inferred” part of similarity.</template>
    </p>
    <ol v-if="tab === 'similar'" class="grid grid-cols-1 gap-2">
      <li v-for="s in sim" :key="s.film.id" class="panel p-2 flex gap-3">
        <img :src="titleCard(s.film, cat.primaryGenre(s.film))" alt="" width="44" height="66" class="rounded-sm border border-line self-start" loading="lazy" />
        <div class="min-w-0 flex-1"><RouterLink :to="`/movie/${s.film.id}`" class="font-semibold hover:text-gold link-t">{{ s.film.t }} <span class="text-faint font-normal">{{ s.film.y }}</span></RouterLink>
          <p v-for="r in s.relations.slice(0, 2)" :key="r.why" class="mt-1"><RelationBadge :rel="r" explain /></p>
          <button class="btn ghost !min-h-11 mt-1 !px-2 text-gold" @click="emit('add', s.film.id)">{{ present?.(s.film.id) ? 'On the map: show it' : 'Add to map' }}</button></div>
      </li>
      <li v-if="!sim.length" class="text-dim">No connections found for this film in the catalog.</li>
    </ol>
    <ol v-else-if="tab === 'hops'" class="grid grid-cols-1 gap-2">
      <li v-for="c in hops" :key="c.end.id" class="panel p-3 text-sm">
        <p class="font-semibold"><RouterLink :to="`/movie/${c.end.id}`" class="hover:text-gold">{{ c.end.t }}</RouterLink> <span class="text-faint font-normal">{{ c.end.y }}</span></p>
        <p v-for="h in c.hops" :key="h.to.id" class="text-dim mt-1"><span class="text-text">{{ h.from.t }}</span> → <span class="text-text">{{ h.to.t }}</span>: {{ h.relation.why }}</p>
        <button class="btn ghost !min-h-11 !px-2 text-gold" @click="emit('add', c.end.id)">{{ present?.(c.end.id) ? 'On the map: show it' : 'Add to map' }}</button>
      </li>
      <li v-if="!hops.length" class="text-dim">No two-step factual chains found.</li>
    </ol>
    <ol v-else-if="tab === 'surprise'" class="grid grid-cols-1 gap-2">
      <li v-for="s in odd" :key="s.film.id" class="panel p-3 text-sm">
        <p class="font-semibold"><RouterLink :to="`/movie/${s.film.id}`" class="hover:text-gold">{{ s.film.t }}</RouterLink> <span class="text-faint font-normal">{{ s.film.y }}</span></p>
        <p class="mt-1"><RelationBadge :rel="s.relation" explain /></p><p class="text-faint mt-1">{{ s.contrast }}</p>
        <button class="btn ghost !min-h-11 !px-2 text-gold" @click="emit('add', s.film.id)">{{ present?.(s.film.id) ? 'On the map: show it' : 'Add to map' }}</button>
      </li>
      <li v-if="!odd.length" class="text-dim">Nothing unexpected found: this film’s connections mostly stay within its genre and era.</li>
    </ol>
    <div v-else class="panel p-3 text-sm grid grid-cols-1 gap-2">
      <p class="eyebrow">Genre profile</p>
      <div v-for="b in bars" :key="b.g" class="flex items-center gap-2"><span class="w-24 shrink-0 text-dim">{{ b.name }}</span><span class="h-2 rounded-sm" :style="{ width: b.v * 100 + 'px', background: CATEGORY_COLOR.genre }" /></div>
      <p class="text-dim">Era: <b class="text-text">{{ profile.era }}s</b> · Scope: <b class="text-text">{{ profile.scope.join(', ') || 'not recorded' }}</b> · Length: <b class="text-text">{{ profile.length }}</b><span v-if="film.rt"> ({{ film.rt }} min)</span> · Part of a series: <b class="text-text">{{ profile.seriesPart ? 'yes' : 'no' }}</b></p>
      <p v-if="profile.themes.length" class="text-dim">Themes (Wikidata main subject): {{ profile.themes.join(', ') }}</p>
    </div>
  </section>
</template>
