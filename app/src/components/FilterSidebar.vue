<script setup lang="ts">
import { ref } from 'vue';
import { useExplore } from '@/stores/explore';
import { useSettings, type NodeMode } from '@/stores/settings';
import { useLibrary } from '@/stores/library';
import { ALL_CATEGORIES } from '@/lib/categories';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import { REL_DEFS, type RelType } from '@/lib/relations';
const ex = useExplore(), st = useSettings(), lib = useLibrary();
const emit = defineEmits<{ load: [films: string[], people: string[]]; share: [] }>();
const modes: [NodeMode, string, string][] = [['poster', 'Title cards', 'Generated from each film’s data, not posters'], ['minimal', 'Minimal', 'Dots, for large maps'], ['genre', 'Genre', 'Colour by genre'], ['franchise', 'Franchise', 'Colour and cluster by series'], ['timeline', 'Timeline', 'Left to right by year']];
const name = ref(''); const saved = ref('');
function save() { const s = ex.snapshot(); lib.saveMap(name.value || 'Untitled map', s.films, s.people, st.mode); name.value = ''; saved.value = 'Saved.'; setTimeout(() => (saved.value = ''), 1800); }
const relTypes = Object.values(REL_DEFS).sort((a, b) => b.weight - a.weight);
</script>
<template>
  <div class="grid grid-cols-1 gap-6 text-sm">
    <section><h2 class="eyebrow mb-2">Display mode</h2>
      <div class="grid grid-cols-1 gap-1"><button v-for="m in modes" :key="m[0]" class="btn !justify-start !min-h-11 text-left" :class="st.mode === m[0] ? 'on' : 'ghost'" :aria-pressed="st.mode === m[0]" @click="st.mode = m[0]"><span><b class="block">{{ m[1] }}</b><span class="font-normal text-faint text-xs">{{ m[2] }}</span></span></button></div></section>
    <section><h2 class="eyebrow mb-2">Relationships shown</h2>
      <ul class="grid grid-cols-1 gap-1"><li v-for="c in ALL_CATEGORIES" :key="c"><button class="btn ghost !justify-start !min-h-11 w-full" role="switch" :aria-checked="!ex.hidden.has(c)" @click="ex.toggleCategory(c)"><i class="w-3 h-3 rounded-full inline-block" :style="{ background: ex.hidden.has(c) ? 'transparent' : CATEGORY_COLOR[c], border: '2px solid ' + CATEGORY_COLOR[c] }" /><span :class="ex.hidden.has(c) ? 'text-faint line-through' : ''">{{ CATEGORY_LABEL[c] }}</span></button></li></ul>
      <p class="text-xs text-faint mt-2">Solid lines are facts from Wikidata or the editorial list. Dashed lines are a shared genre label or an inference (shared subject); the line’s tooltip says which.</p></section>
    <section class="grid grid-cols-1 gap-3"><h2 class="eyebrow">Map size</h2>
      <label class="grid grid-cols-1 gap-1"><span>New connections per expand: <b>{{ st.branch }}</b></span><input v-model.number="st.branch" type="range" min="4" max="30" class="w-full min-h-11 accent-[var(--color-gold)]" /></label>
      <label class="grid grid-cols-1 gap-1"><span>Node limit: <b>{{ st.nodeLimit }}</b></span><input v-model.number="st.nodeLimit" type="range" min="30" max="300" step="10" class="w-full min-h-11 accent-[var(--color-gold)]" /></label>
      <label class="flex items-center gap-3 min-h-11"><input v-model="st.hubs" type="checkbox" class="w-6 h-6 min-w-6 accent-[var(--color-gold)]" /><span>Show director, leads, genre and franchise as nodes when expanding</span></label></section>
    <details><summary class="eyebrow cursor-pointer min-h-11 flex items-center">Adjust relationship weights (open)</summary>
      <p class="text-xs text-faint my-2">How strongly each kind of link ranks. Changing a weight re-orders what is added next.</p>
      <div class="grid grid-cols-1 gap-2"><label v-for="t in relTypes" :key="t.type" class="grid grid-cols-1 gap-0.5"><span class="flex justify-between"><span>{{ t.label }}</span><b>{{ st.weights[t.type as RelType] }}</b></span><input v-model.number="st.weights[t.type as RelType]" type="range" min="0" max="100" class="w-full min-h-11 accent-[var(--color-gold)]" :aria-label="`${t.label} weight`" /></label></div>
      <button class="btn ghost mt-2" @click="st.resetWeights()">Reset to defaults</button></details>
    <section class="grid grid-cols-1 gap-2"><h2 class="eyebrow">Saved maps</h2>
      <div class="flex gap-2"><input v-model="name" class="field" placeholder="Name this map" aria-label="Map name" @keydown.enter="save" /><button class="btn" @click="save">Save</button></div><p v-if="saved" class="text-cast" role="status">{{ saved }}</p>
      <ul class="grid grid-cols-1 gap-1"><li v-for="m in lib.s.maps" :key="m.id" class="flex items-center gap-1"><button class="btn ghost flex-1 !justify-start text-left" @click="emit('load', m.films, m.people)">{{ m.name }} <span class="text-faint font-normal">{{ m.films.length }} films</span></button><button class="btn ghost" :aria-label="`Delete ${m.name}`" @click="lib.deleteMap(m.id)">×</button></li></ul>
      <button class="btn ghost" @click="emit('share')">Copy link to this map</button></section>
    <p class="text-xs text-faint leading-relaxed">Facts: Wikidata (CC0). Text on film and person panels: Wikipedia, CC BY-SA 4.0, shortened. Title cards are generated, not posters.</p>
  </div>
</template>
