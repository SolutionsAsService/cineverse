<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
const cat = useCatalog().cat!; const role = ref<'dir' | 'cast'>('dir'); const q = ref('');
const list = computed(() => { const n = new Map<string, { films: number; top: number }>(); for (const f of cat.data.films) { const ids = role.value === 'dir' ? f.dir : f.cast.map(c => c[0]); for (const id of ids) { const e = n.get(id) || { films: 0, top: 0 }; e.films += 1; e.top = Math.max(e.top, f.pop || 0); n.set(id, e); } }
  const s = q.value.trim().toLowerCase(); return [...n.entries()].map(([id, v]) => ({ p: cat.person.get(id)!, ...v })).filter(x => x.p && (!s || x.p.n.toLowerCase().includes(s))).sort((a, b) => b.films - a.films || b.top - a.top).slice(0, 120); });
</script>
<template><div class="zone zone-person"><div class="wrap py-8"><p class="eyebrow">People</p><h1 class="display text-4xl mt-2">Directors and actors</h1><p class="text-dim mt-3 max-w-[60ch]">Ranked by the number of films they have in this map. Each page shows a filmography, frequent collaborators and a fingerprint of genres and decades.</p>
  <div class="flex flex-wrap gap-2 mt-5 items-center"><div class="flex" role="group" aria-label="Role"><button class="btn" :class="role === 'dir' ? 'on' : 'ghost'" @click="role = 'dir'">Directors</button><button class="btn" :class="role === 'cast' ? 'on' : 'ghost'" @click="role = 'cast'">Actors</button></div><input v-model="q" class="field !w-64" type="search" placeholder="Filter by name" aria-label="Filter by name" /></div>
  <ul class="grid grid-cols-1 gap-2 mt-6 sm:grid-cols-2 lg:grid-cols-3"><li v-for="x in list" :key="x.p.id"><RouterLink :to="`/person/${x.p.id}`" class="panel p-3 flex justify-between gap-3 hover:border-director min-h-14"><span class="min-w-0"><b class="block truncate">{{ x.p.n }}</b><span class="text-xs text-faint block truncate">{{ x.p.de }}</span></span><span class="text-director font-semibold shrink-0">{{ x.films }}</span></RouterLink></li></ul></div></div></template>
