<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { useLibrary } from '@/stores/library';
import { useSettings } from '@/stores/settings';
import { useExplore } from '@/stores/explore';
import { constellation } from '@/lib/discovery';
import FilmTile from '@/components/FilmTile.vue';
import RelationBadge from '@/components/RelationBadge.vue';
const catalog = useCatalog(), cat = catalog.cat!, lib = useLibrary(), st = useSettings(), ex = useExplore(), route = useRoute(), router = useRouter();
const tab = ref<'watchlist' | 'watched' | 'collections' | 'maps' | 'constellation'>('collections');
const newName = ref(''); const picks = ref<string[]>([]); const q = ref(''); const msg = ref('');
const films = (ids: string[]) => ids.map(i => cat.film.get(i)).filter((f): f is NonNullable<typeof f> => !!f);
const sug = computed(() => (q.value.trim().length >= 2 ? catalog.index!.search(q.value, ['film'], 6) : []));
const con = computed(() => (picks.value.length >= 2 ? constellation(cat, picks.value, st.weights) : null));
const imported = ref<{ n: string; f: string[]; t: string } | null>(null);
onMounted(() => { const code = route.query.share; if (typeof code === 'string') { imported.value = lib.fromShare(code); if (imported.value) tab.value = 'collections'; } });
function importShared() { if (!imported.value) return; lib.addCollection(imported.value.n, imported.value.f.filter(i => cat.film.has(i)), imported.value.t); imported.value = null; router.replace({ query: {} }); }
async function copyShare(c: Parameters<typeof lib.share>[0]) { const url = location.origin + location.pathname + '#/collections?share=' + encodeURIComponent(lib.share(c)); try { await navigator.clipboard.writeText(url); msg.value = 'Link copied. Anyone who opens it can import this collection.'; } catch { msg.value = url; } }
function addPick(id: string) { if (!picks.value.includes(id)) picks.value.push(id); q.value = ''; }
function openConstellation() { ex.loadMap(picks.value, []); router.push('/explore'); }
function saveConstellation() { const c = lib.addCollection('Constellation · ' + picks.value.slice(0, 3).map(i => cat.film.get(i)?.t).join(', '), picks.value); msg.value = `Saved as “${c.name}”.`; }
const tabs = [['collections', 'Collections'], ['watchlist', 'Watchlist'], ['watched', 'Watched'], ['maps', 'Saved maps'], ['constellation', 'Constellation builder']] as const;
</script>
<template><div class="zone zone-lib"><div class="wrap py-8"><p class="eyebrow">Your library</p><h1 class="display text-4xl mt-2">Collections, watchlists and saved maps</h1>
  <p class="text-dim mt-3 max-w-[64ch]">Everything here is stored in this browser only. Accounts and sync are on the roadmap; until then a collection can be shared as a link and imported by anyone.</p>
  <div v-if="imported" class="panel p-4 mt-4 border-gold" role="status"><b>Shared collection: {{ imported.n }}</b> · {{ imported.f.length }} films <button class="btn primary ml-3" @click="importShared">Import it</button></div>
  <div class="flex flex-wrap gap-1 mt-5" role="tablist"><button v-for="t in tabs" :key="t[0]" role="tab" :aria-selected="tab === t[0]" class="btn" :class="tab === t[0] ? 'on' : 'ghost'" @click="tab = t[0]">{{ t[1] }}<span v-if="t[0] === 'watchlist'" class="text-faint"> {{ lib.s.watchlist.length }}</span><span v-if="t[0] === 'watched'" class="text-faint"> {{ lib.s.watched.length }}</span></button></div>
  <p v-if="msg" class="mt-3 text-cast text-sm break-all" role="status">{{ msg }}</p>

  <section v-if="tab === 'collections'" class="mt-6 grid grid-cols-1 gap-6">
    <form class="flex gap-2 max-w-md" @submit.prevent="lib.addCollection(newName); newName = ''"><input v-model="newName" class="field" placeholder="New collection, e.g. Best sci-fi of the 1990s" aria-label="New collection name" /><button class="btn primary" type="submit">Create</button></form>
    <p v-if="!lib.s.collections.length" class="text-dim">No collections yet. Create one here, or use “Save to collection” on any film.</p>
    <article v-for="c in lib.s.collections" :key="c.id" class="panel p-4"><div class="flex flex-wrap items-center justify-between gap-2 mb-3"><h2 class="display text-xl">{{ c.name }} <span class="text-faint text-base font-normal">{{ c.films.length }}</span></h2><div class="flex gap-2"><button class="btn ghost" @click="ex.loadMap(c.films, []); router.push('/explore')">Open as map</button><button class="btn ghost" @click="copyShare(c)">Share link</button><button class="btn ghost" @click="lib.deleteCollection(c.id)">Delete</button></div></div>
      <div v-if="c.films.length" class="rail"><div v-for="f in films(c.films)" :key="f.id" class="relative"><FilmTile :film="f" /><button class="absolute top-1 right-1 btn !min-h-9 !px-2 bg-ink/80" :aria-label="`Remove ${f.t}`" @click="lib.removeFromCollection(c.id, f.id)">×</button></div></div><p v-else class="text-dim text-sm">Empty. Add films from any film page.</p></article></section>

  <section v-else-if="tab === 'watchlist' || tab === 'watched'" class="mt-6"><div v-if="lib.s[tab].length" class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-4"><FilmTile v-for="f in films(lib.s[tab])" :key="f.id" :film="f" :sub="`${f.y}${lib.s.ratings[f.id] ? ' · ' + '★'.repeat(lib.s.ratings[f.id]) : ''}`" /></div><p v-else class="text-dim">Nothing here yet. Use “+ Watchlist” on a film.</p></section>

  <section v-else-if="tab === 'maps'" class="mt-6 grid grid-cols-1 gap-3"><p v-if="!lib.s.maps.length" class="text-dim">No saved maps. Build one on the <RouterLink to="/explore" class="underline">movie map</RouterLink> and press Save.</p>
    <article v-for="m in lib.s.maps" :key="m.id" class="panel p-4 flex flex-wrap items-center justify-between gap-2"><div><b>{{ m.name }}</b> <span class="text-faint">{{ m.films.length }} films · {{ m.mode }} mode</span></div><div class="flex gap-2"><button class="btn" @click="st.mode = (m.mode as typeof st.mode); ex.loadMap(m.films, m.people); router.push('/explore')">Open</button><button class="btn ghost" @click="lib.deleteMap(m.id)">Delete</button></div></article></section>

  <section v-else class="mt-6 grid grid-cols-1 gap-4"><p class="text-dim max-w-[64ch]">Pick two or more films. The builder shows how they connect directly and which other films bridge several of them. Only factual links are used.</p>
    <div class="relative max-w-md"><input v-model="q" class="field" type="search" placeholder="Add a film" aria-label="Add a film to the constellation" /><ul v-if="sug.length" class="panel absolute z-10 left-0 right-0 mt-1"><li v-for="h in sug" :key="h.id"><button class="w-full min-h-11 px-3 text-left hover:bg-panel2" @click="addPick(h.id)">{{ h.title }} <span class="text-faint">{{ h.sub }}</span></button></li></ul></div>
    <div class="flex flex-wrap gap-2"><span v-for="id in picks" :key="id" class="chip !min-h-11 text-text">{{ cat.film.get(id)?.t }} <button :aria-label="`Remove ${cat.film.get(id)?.t}`" class="min-w-8 min-h-8" @click="picks = picks.filter(x => x !== id)">×</button></span></div>
    <div v-if="con" class="grid grid-cols-1 gap-6 lg:grid-cols-2"><section><h2 class="display text-xl mb-2">Direct connections ({{ con.direct.length }})</h2><ul class="grid grid-cols-1 gap-2"><li v-for="d in con.direct" :key="d.a.id + d.b.id" class="panel p-3 text-sm"><b>{{ d.a.t }}</b> ↔ <b>{{ d.b.t }}</b><p class="mt-1"><RelationBadge :rel="d.relation" explain /></p></li><li v-if="!con.direct.length" class="text-dim">These films share no direct factual link.</li></ul></section>
      <section><h2 class="display text-xl mb-2">Bridge films</h2><ul class="grid grid-cols-1 gap-2"><li v-for="b in con.bridges" :key="b.film.id" class="panel p-3 text-sm"><RouterLink :to="`/movie/${b.film.id}`" class="font-semibold hover:text-gold link-t">{{ b.film.t }} <span class="text-faint font-normal">{{ b.film.y }}</span></RouterLink><p v-for="j in b.joins" :key="j.film.id" class="text-dim mt-1">↔ {{ j.film.t }}: {{ j.relation.why }}</p></li><li v-if="!con.bridges.length" class="text-dim">No film bridges two or more of these.</li></ul></section></div>
    <div v-if="picks.length >= 2" class="flex gap-2"><button class="btn primary" @click="openConstellation">Open as map</button><button class="btn" @click="saveConstellation">Save as collection</button></div></section>
</div></div></template>
