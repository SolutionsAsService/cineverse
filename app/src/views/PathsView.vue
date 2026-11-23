<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { useExplore } from '@/stores/explore';
import { DEFAULT_PATH_ROLES, sixDegrees, type PathRole, type Step } from '@/lib/discovery';
import { titleCard } from '@/lib/poster';
const cat = useCatalog().cat!, index = useCatalog().index!, route = useRoute(), router = useRouter(), ex = useExplore();
const a = ref(String(route.query.a || '')), b = ref(String(route.query.b || ''));
const qs = reactive({ a: '', b: '' }); const roles = ref<PathRole[]>([...DEFAULT_PATH_ROLES]); const paths = ref<Step[][] | null>(null); const busy = ref(false);
const sug = (q: string) => (q.trim().length >= 2 ? index.search(q, ['film'], 6) : []);
const pickA = (id: string) => { a.value = id; qs.a = ''; }, pickB = (id: string) => { b.value = id; qs.b = ''; };
function run() { if (!a.value || !b.value) return; busy.value = true; router.replace({ query: { a: a.value, b: b.value } }); setTimeout(() => { paths.value = sixDegrees(cat, a.value, b.value, { max: 5, roles: roles.value }); busy.value = false; }, 20); }
function surprise() { const pool = cat.data.films.slice(0, 600); for (let i = 0; i < 12; i += 1) { const x = pool[Math.floor(Math.random() * pool.length)], y = pool[Math.floor(Math.random() * pool.length)]; if (x.id === y.id) continue; const p = sixDegrees(cat, x.id, y.id, { max: 1, roles: roles.value }); if (p.length && p[0].length > 3) { a.value = x.id; b.value = y.id; run(); return; } } }
if (a.value && b.value) setTimeout(run, 0);
const film = (id: string) => cat.film.get(id);
const degrees = (p: Step[]) => (p.filter(s => s.kind === 'film').length - 1);
function toMap(p: Step[]) { const films = p.filter(s => s.kind === 'film').map(s => s.id), people = p.filter(s => s.via === 'person').map(s => s.id); const code = btoa(unescape(encodeURIComponent(JSON.stringify({ f: films, p: people })))); router.push({ path: '/explore', query: { map: code, route: p.map(s => (s.kind === 'film' ? 'f:' : s.via === 'person' ? 'p:' : 'x:') + s.id).filter(x => !x.startsWith('x:')).join(',') } }); }
const label = computed(() => (paths.value === null ? '' : paths.value.length ? `${paths.value.length} shortest path${paths.value.length > 1 ? 's' : ''}, ${degrees(paths.value[0])} film-to-film step${degrees(paths.value[0]) > 1 ? 's' : ''}` : 'No connection found within 12 steps.'));
</script>
<template><div class="zone zone-paths"><div class="wrap py-8"><p class="eyebrow">Six degrees of cinema</p><h1 class="display text-4xl mt-2">How are these two films connected?</h1>
  <p class="text-dim mt-3 max-w-[62ch]">Pick any two films. The shortest chains run through the people who made them and the franchises they belong to. Every step names the shared credit. Where Wikidata records billing, cast beyond the eighth is ignored; where it does not (most films), the listed cast, at most eight names, is used. Choose below which credits may link two films.</p>
  <div class="grid grid-cols-1 gap-4 mt-6 md:grid-cols-2">
    <div v-for="(side, i) in ([['From', a, pickA], ['To', b, pickB]] as const)" :key="i" class="panel p-3"><p class="eyebrow mb-2">{{ side[0] }}</p>
      <div v-if="side[1]" class="flex gap-3 items-center"><img :src="titleCard(film(side[1])!, cat.primaryGenre(film(side[1])!))" alt="" width="40" height="60" class="rounded-sm" /><div class="min-w-0 flex-1"><b>{{ film(side[1])!.t }}</b> <span class="text-faint">{{ film(side[1])!.y }}</span></div><button class="btn ghost" @click="i ? (b = '') : (a = '')">Change</button></div>
      <div v-else class="relative"><input v-model="qs[i ? 'b' : 'a']" class="field" type="search" placeholder="Search a film" :aria-label="`${side[0]} film`" /><ul v-if="sug(i ? qs.b : qs.a).length" class="panel absolute z-10 left-0 right-0 mt-1 max-h-72 overflow-auto"><li v-for="h in sug(i ? qs.b : qs.a)" :key="h.id"><button class="w-full min-h-11 px-3 text-left hover:bg-panel2" @click="side[2](h.id)">{{ h.title }} <span class="text-faint">{{ h.sub }}</span></button></li></ul></div></div></div>
  <fieldset class="mt-4 flex flex-wrap gap-x-5"><legend class="eyebrow mb-1">Link films through</legend><label v-for="r in ([['dir', 'Directors'], ['wr', 'Writers'], ['cast', 'Cast'], ['co', 'Composers'], ['dp', 'Cinematographers']] as const)" :key="r[0]" class="flex items-center gap-2 min-h-11"><input v-model="roles" type="checkbox" :value="r[0]" class="w-5 h-5 accent-[var(--color-gold)]" />{{ r[1] }}</label><span class="text-sm text-faint self-center">Franchises and trilogies always link.</span></fieldset>
  <div class="flex flex-wrap gap-2 mt-4"><button class="btn primary" :disabled="!a || !b || busy" @click="run">{{ busy ? 'Searching…' : 'Find the connection' }}</button><button class="btn" @click="surprise">Surprise me</button></div>
  <p class="mt-6 font-semibold" role="status">{{ label }}</p>
  <ol v-if="paths && paths.length" class="grid grid-cols-1 gap-4 mt-3"><li v-for="(p, pi) in paths" :key="pi" class="panel p-4">
    <div class="flex justify-between items-center mb-3"><p class="eyebrow">Path {{ pi + 1 }}</p><button class="btn ghost" @click="toMap(p)">Show on the map</button></div>
    <ol class="grid grid-cols-1 gap-0"><li v-for="(s, si) in p" :key="si" class="flex gap-3 items-stretch"><div class="flex flex-col items-center w-6 shrink-0"><span class="w-3 h-3 rounded-full mt-1.5" :style="{ background: s.kind === 'film' ? 'var(--color-gold)' : s.via === 'person' ? 'var(--color-director)' : 'var(--color-franchise)' }" /><span v-if="si < p.length - 1" class="flex-1 w-0.5 bg-line" /></div>
      <div class="pb-4 min-w-0"><RouterLink v-if="s.kind === 'film'" :to="`/movie/${s.id}`" class="font-semibold hover:text-gold link-t">{{ s.label }} <span class="text-faint font-normal">{{ s.sub }}</span></RouterLink><template v-else><RouterLink v-if="s.via === 'person'" :to="`/person/${s.id}`" class="text-director hover:underline link-t">{{ s.label }}</RouterLink><RouterLink v-else :to="`/franchise/${s.id}`" class="text-franchise hover:underline link-t">{{ s.label }}</RouterLink><p class="text-sm text-dim">{{ s.sub }}</p></template></div></li></ol></li></ol>
  <p v-if="paths && !paths.length" class="text-dim mt-2">These two films share no chain of credits or franchises in this catalog. That is a finding about the catalog, not a bug: try a second film closer to the first.</p></div></div></template>
