<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { useExplore } from '@/stores/explore';
import { useSettings } from '@/stores/settings';
import { refOf } from '@/lib/graph';
import { norm } from '@/lib/search';
import { CATEGORY_COLOR, CATEGORY_LABEL, type Category } from '@/lib/types';
import MovieGraph from '@/components/MovieGraph.vue';
import FilterSidebar from '@/components/FilterSidebar.vue';
import MovieDetailPanel from '@/components/MovieDetailPanel.vue';
import PersonPanel from '@/components/PersonPanel.vue';
import DiscoveryPanel from '@/components/DiscoveryPanel.vue';
import { ALL_CATEGORIES } from '@/lib/categories';
const cat = useCatalog().cat!, ex = useExplore(), st = useSettings(), route = useRoute(), router = useRouter();
const graph = ref<InstanceType<typeof MovieGraph>>(); const showSide = ref(false); const sheet = ref(true); const wide = () => window.innerWidth > 1180; const tab = ref<'details' | 'discover'>('details'); const find = ref(''); const copied = ref('');
const node = computed(() => (ex.selected ? ex.graph.nodes.get(ex.selected) : null));
const counts = ref({ n: 0, e: 0 }); const onCount = (c: { nodes: number; edges: number }) => { counts.value = { n: c.nodes, e: c.edges }; };
const startNote = ref(''); const saveOpen = ref(false); const saveName = ref('');
import { useLibrary } from '@/stores/library';
const lib = useLibrary();
function saveMap() { const sn = ex.snapshot(); lib.saveMap(saveName.value || `Map from ${cat.film.get(sn.films[0])?.t || 'a film'}`, sn.films, sn.people, st.mode); saveName.value = ''; saveOpen.value = false; ex.say2('Map saved. Find it under Collections, Saved maps.'); }
const years = computed(() => { void ex.version; return [...ex.graph.nodes.values()].filter(n => n.kind === 'film').map(n => ({ id: n.id, y: n.year || 0, t: n.label })).sort((a, b) => a.y - b.y); });
const yr = computed(() => { const ys = years.value.map(x => x.y); return [Math.min(...ys, 2020), Math.max(...ys, 1920)]; });
function boot() {
  const q = route.query; const set = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined;
  const map = set(q.map), film = set(q.film), person = set(q.person);
  if (map) { try { const o = JSON.parse(decodeURIComponent(escape(atob(map)))); ex.loadMap((o.f || []).filter((i: string) => cat.film.has(i)), (o.p || []).filter((i: string) => cat.person.has(i))); ex.select(null); } catch { ex.start(cat.data.films[0].id); } }
  else if (film && !cat.film.has(film)) { ex.start((cat.data.films.find(f => f.t === 'Pulp Fiction') || cat.data.films[0]).id); startNote.value = 'That film is not in the catalog, so this map starts from a popular film. Search (⌘K) to choose another.'; }
  else if (film && cat.film.has(film)) { if (ex.graph.nodes.has('f:' + film)) ex.select('f:' + film); else if (ex.graph.nodes.size) ex.addFilm(film); else ex.start(film); }
  else if (person && cat.person.has(person)) { if (!ex.graph.nodes.size) ex.reset(); ex.addPerson(person); }
  else if (!ex.graph.nodes.size) { ex.start((cat.data.films.find(f => f.t === 'Pulp Fiction') || cat.data.films[0]).id); startNote.value = 'You did not pick a film, so this map starts from a popular one. Search (⌘K) to choose your own.'; }
  const rt = set(q.route); ex.route.splice(0); if (rt) ex.setRoute(rt.split(',').filter(x => x.startsWith('f:') || x.startsWith('p:')));
}
onMounted(() => { boot(); if (!wide()) sheet.value = false; });
const detailEl = ref<HTMLElement>();
watch(() => ex.selected, () => { detailEl.value && (detailEl.value.scrollTop = 0); });
watch(() => ex.selected, (v, o) => { if (v && v !== o && ex.version > 0 && !wide() && graphTapped.value) sheet.value = true; if (!v) sheet.value = false; });
const graphTapped = ref(false);
watch(() => [route.query.film, route.query.person, route.query.map], () => { startNote.value = ''; if (route.name === 'explore') boot(); });
function expand(id?: string, only?: Category[]) { const target = id || ex.selected; if (target) ex.expand(target, only); }
const findGo = () => { const q = norm(find.value); if (!q) return; const hit = [...ex.graph.nodes.values()].find(n => norm(n.label).includes(q)); if (hit) { ex.select(hit.id); graph.value?.center(); } };
async function share() { const s = ex.snapshot(); const code = btoa(unescape(encodeURIComponent(JSON.stringify({ f: s.films, p: s.people })))); const url = location.origin + location.pathname + '#/explore?map=' + encodeURIComponent(code); try { await navigator.clipboard.writeText(url); copied.value = 'Link copied: it opens this exact map.'; } catch { copied.value = 'Copy failed: ' + url.slice(0, 60) + '…'; } setTimeout(() => (copied.value = ''), 2500); }
function png() { const u = graph.value?.png(); if (!u) return; const a = document.createElement('a'); a.href = u; a.download = 'cineverse-map.png'; a.click(); }
const present = (id: string) => ex.graph.nodes.has('f:' + id);
const addFilm = (id: string) => { const was = present(id); const t = cat.film.get(id)?.t; ex.addFilm(id); ex.say2(was ? `“${t}” is already on the map: selected.` : `Added “${t}” and its strongest connections.`); };
const onFocusFilm = (id: string) => { if (!ex.graph.nodes.has('f:' + id)) ex.addFilm(id); else ex.select('f:' + id); };
const catButtons = computed(() => ALL_CATEGORIES.filter(c => c !== 'genre' && c !== 'inferred'));
void router;
</script>

<template>
  <div class="explore">
    <aside class="side" :class="{ open: showSide }" aria-label="Exploration controls">
      <div class="side-head"><h1 class="display text-xl">Movie map</h1><button class="btn ghost drawer-only" @click="showSide = false" aria-label="Close controls">Close</button></div>
      <FilterSidebar @load="(f, p) => { ex.loadMap(f, p); showSide = false; }" @share="share" />
      <p v-if="copied" class="text-cast text-sm mt-2" role="status">{{ copied }}</p>
    </aside>

    <section class="stage" :class="{ 'sheet-open': !!node && sheet }" aria-label="Interactive map">
      <MovieGraph ref="graph" @expand="id => expand(id)" @count="onCount" @pointerdown.capture="graphTapped = true" />
      <div class="topbar">
        <button class="btn drawer-only" @click="showSide = true">Controls</button>
        <input v-model="find" class="field" type="search" placeholder="Find in this map" aria-label="Find a node in this map" @keydown.enter="findGo" />
        <span class="chip hidden sm:inline-flex" role="status">{{ counts.n }} nodes · {{ counts.e }} links shown</span>
        <button class="btn" :aria-expanded="saveOpen" @click="saveOpen = !saveOpen">Save map</button>
        <form v-if="saveOpen" class="panel flex gap-2 p-2" @submit.prevent="saveMap"><input v-model="saveName" class="field !w-40" placeholder="Name this map" aria-label="Map name" /><button class="btn primary" type="submit">Save</button></form>
      </div>
      <div class="zoom" role="group" aria-label="Map controls">
        <button class="btn" aria-label="Zoom in" @click="graph?.zoom(1.3)">+</button><button class="btn" aria-label="Zoom out" @click="graph?.zoom(1 / 1.3)">−</button>
        <button class="btn" @click="graph?.fit()">Fit</button><button class="btn" :disabled="!ex.selected" @click="graph?.center()">Centre</button>
        <button class="btn" @click="graph?.relayout()">Re-layout</button><button class="btn" @click="png">PNG</button><button class="btn" @click="ex.reset(); ex.start(cat.data.films[0].id)">Reset</button>
      </div>
      <p v-if="ex.notice" class="notice panel" role="status">{{ ex.notice }}</p>
      <p v-if="ex.toast" class="toast panel" role="status">{{ ex.toast }}</p>
      <p v-if="startNote" class="startnote panel" role="status">{{ startNote }} <button class="btn ghost !min-h-11" @click="startNote = ''">Dismiss</button></p>
      <p v-if="counts.n <= 1" class="notice panel" role="status">Search a film (⌘K) or pick one from the home page to start a map.</p>
      <div class="strip" aria-label="Release years of films on the map">
        <svg :viewBox="`0 0 600 34`" class="w-full h-[34px]" preserveAspectRatio="none" role="img" :aria-label="`${years.length} films from ${yr[0]} to ${yr[1]}`">
          <line x1="0" y1="20" x2="600" y2="20" stroke="var(--color-line)" /><circle v-for="f in years" :key="f.id" :cx="10 + (f.y - yr[0]) / Math.max(1, yr[1] - yr[0]) * 580" cy="20" r="4" :fill="ex.selected === f.id ? 'var(--color-gold)' : 'var(--color-dim)'" @click="ex.select(f.id)"><title>{{ f.t }}</title></circle>
          <text x="2" y="12" font-size="11" fill="var(--color-faint)">{{ yr[0] }}</text><text x="598" y="12" font-size="11" text-anchor="end" fill="var(--color-faint)">{{ yr[1] }}</text>
        </svg>
      </div>
      <ul class="key" aria-label="Relationship colours"><li v-for="c in ALL_CATEGORIES" :key="c"><i :style="{ background: CATEGORY_COLOR[c] }" />{{ CATEGORY_LABEL[c] }}</li></ul>
    </section>

    <aside ref="detailEl" class="detail" :class="{ open: !!node && sheet }" aria-label="Details" aria-live="polite">
      <div v-if="node" class="grid grid-cols-1 gap-3">
        <div class="flex items-center justify-between gap-2"><div class="flex gap-1" role="tablist"><button v-if="node.kind === 'film'" role="tab" :aria-selected="tab === 'details'" class="btn !min-h-11" :class="tab === 'details' ? 'on' : 'ghost'" @click="tab = 'details'">Details</button><button v-if="node.kind === 'film'" role="tab" :aria-selected="tab === 'discover'" class="btn !min-h-11" :class="tab === 'discover' ? 'on' : 'ghost'" @click="tab = 'discover'">Discover</button></div><button class="btn ghost" aria-label="Close details" @click="ex.select(null)">×</button></div>
        <template v-if="node.kind === 'film'">
          <template v-if="tab === 'details'">
            <MovieDetailPanel :id="refOf(node.id)" graph show-connections @expand="c => expand(node!.id, c ? [c] : undefined)" @focus="onFocusFilm" />
            <div class="flex flex-wrap gap-1"><span class="eyebrow w-full">Expand only</span><button v-for="c in catButtons" :key="c" class="chip !min-h-11 hover:border-gold" @click="expand(node!.id, [c])"><i :style="{ background: CATEGORY_COLOR[c] }" />{{ CATEGORY_LABEL[c] }}</button><button class="chip !min-h-11" @click="ex.collapse(node!.id)">Collapse branch</button><button class="chip !min-h-11" @click="ex.pinned.has(node!.id) ? ex.pinned.delete(node!.id) : ex.pinned.add(node!.id)">{{ ex.pinned.has(node.id) ? 'Unpin' : 'Pin' }}</button><button class="chip !min-h-11" @click="ex.remove(node!.id)">Remove</button></div>
          </template>
          <DiscoveryPanel v-else :film-id="refOf(node.id)" compact :present="present" @add="addFilm" />
        </template>
        <PersonPanel v-else-if="node.kind === 'person'" :id="refOf(node.id)" graph @expand="expand(node!.id)" @add="addFilm" />
        <div v-else class="panel p-4"><p class="eyebrow">{{ node.kind }}</p><h2 class="display text-2xl mt-1">{{ node.label }}</h2><p v-if="node.kind === 'cluster'" class="text-dim mt-2">{{ node.hidden }} more connected films. Select again to expand.</p><div class="flex gap-2 mt-3"><button class="btn primary" @click="expand(node.id)">Expand</button><button class="btn" @click="ex.remove(node.id)">Remove</button></div></div>
      </div>
      <div v-else class="text-dim text-sm grid grid-cols-1 gap-3"><p class="eyebrow">How to read the map</p><p>Each poster is a film. Lines are relationships, coloured by kind. <b class="text-text">Click</b> a film for details, <b class="text-text">double-click</b> to add its strongest connections. Dashed lines are inferred, solid lines are facts.</p><p>Hover a line to read why two films are connected. The panel lists the same connections as text.</p></div>
    </aside>
  </div>
</template>

<style scoped>
/* graticule: a map-sheet grid, so the canvas reads as an atlas plate rather than a dark void */
.explore { display: grid; grid-template-columns: 280px minmax(0, 1fr) 380px; grid-template-rows: minmax(0, 1fr); height: calc(100dvh - var(--nav-h)); background: var(--color-ink); }
.side, .detail { overflow-y: auto; padding: 16px; background: var(--color-panel); }
.side { border-right: 1px solid var(--color-line); } .detail { border-left: 1px solid var(--color-line); }
.drawer-only { display: none; } @media (max-width: 1180px) { .drawer-only { display: inline-flex; } }
.side-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.stage { position: relative; min-width: 0; min-height: 0; height: 100%; background: linear-gradient(rgba(201, 164, 92, .11) 1px, transparent 1px) 0 0 / 64px 64px, linear-gradient(90deg, rgba(201, 164, 92, .11) 1px, transparent 1px) 0 0 / 64px 64px, radial-gradient(900px 600px at 50% 40%, #1a1721, var(--color-ink)); }
.topbar { position: absolute; top: 10px; left: 10px; right: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; pointer-events: none; z-index: 6; }
.topbar .field { min-width: 0; flex: 1 1 140px; max-width: 260px; }
.topbar form { max-width: 100%; }
.topbar > * { pointer-events: auto; }
.stage { --gr: 58px; --gt: 0px; }
.zoom { position: absolute; right: 10px; top: 64px; display: grid; gap: 6px; }
.zoom .btn { min-width: 44px; padding: 0 10px; background: color-mix(in srgb, var(--color-panel) 92%, transparent); }
.toast { position: absolute; left: 50%; transform: translateX(-50%); top: 64px; padding: 10px 14px; max-width: min(560px, 90%); font-size: 14px; border-color: var(--color-gold); z-index: 5; }
.startnote { position: absolute; left: 50%; transform: translateX(-50%); top: 110px; padding: 8px 12px; max-width: min(560px, 92%); font-size: 14px; z-index: 5; }
.notice { position: absolute; left: 50%; transform: translateX(-50%); bottom: 84px; padding: 10px 14px; max-width: min(520px, 90%); font-size: 14px; }
.strip { position: absolute; left: 10px; right: 64px; bottom: 8px; padding: 2px 8px; background: color-mix(in srgb, var(--color-panel) 88%, transparent); border: 1px solid var(--color-line); border-radius: 6px; }
.key { position: absolute; left: 10px; bottom: 50px; display: flex; flex-wrap: wrap; gap: 4px 12px; margin: 0; padding: 0; list-style: none; font-size: 12px; color: var(--color-dim); max-width: calc(100% - 80px); }
.key li { display: inline-flex; align-items: center; gap: 5px; } .key i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
@media (max-width: 1180px) { .explore { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
  .side { position: fixed; z-index: 45; inset: var(--nav-h) 20% 0 0; transform: translateX(-102%); transition: transform .2s; box-shadow: 8px 0 30px #000a; } .side.open { transform: none; }
  .detail { position: fixed; z-index: 44; left: 0; right: 0; bottom: 0; max-height: 52dvh; border-left: 0; border-top: 2px solid var(--color-gold); transform: translateY(102%); transition: transform .2s; } .detail.open { transform: none; }
  .key { display: none; } .strip { right: 10px; bottom: 8px; } .stage { --gr: 0px; --gt: 112px; } .stage.sheet-open { --gb: 52dvh; } .zoom { top: 62px; left: 10px; right: 10px; display: flex; overflow-x: auto; } .zoom .btn { flex: 0 0 auto; min-height: 44px; } }
</style>
