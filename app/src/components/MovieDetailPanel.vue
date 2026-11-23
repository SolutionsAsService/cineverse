<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import { useLibrary } from '@/stores/library';
import { useSettings } from '@/stores/settings';
import { neighbors } from '@/lib/relations';
import { titleCard } from '@/lib/poster';
import { ROLE_LABEL, type Category } from '@/lib/types';
import RelationBadge from './RelationBadge.vue';
const props = defineProps<{ id: string; graph?: boolean; showConnections?: boolean }>();
const emit = defineEmits<{ expand: [category?: Category]; focus: [id: string]; add: [id: string] }>();
const cat = useCatalog().cat!, lib = useLibrary(), st = useSettings();
const f = computed(() => cat.film.get(props.id)!);
const people = (ids: string[]) => ids.map(i => cat.person.get(i)).filter((p): p is NonNullable<typeof p> => !!p);
const cast = computed(() => f.value.cast.map(([id, b]) => ({ p: cat.person.get(id)!, b })).filter(x => x.p));
const franchises = computed(() => f.value.fr.map(i => cat.franchise.get(i)).concat((f.value.tr || []).map(i => cat.franchise.get(i))).filter((x): x is NonNullable<typeof x> => !!x));
const conns = computed(() => neighbors(cat, props.id, st.weights, { includeGenre: false }).slice(0, 14));
const wiki = computed(() => (f.value.w ? `https://en.wikipedia.org/wiki/${encodeURIComponent(f.value.w.replace(/ /g, '_'))}` : ''));
const collectionPick = (e: Event) => { const v = (e.target as HTMLSelectElement).value; if (v === '__new') { const n = prompt('Name the new collection'); if (n) lib.addToCollection(lib.addCollection(n).id, props.id); } else if (v) lib.addToCollection(v, props.id); (e.target as HTMLSelectElement).value = ''; };
</script>
<template>
  <article class="grid grid-cols-1 gap-4" :aria-label="f.t">
    <header class="flex gap-4">
      <img :src="titleCard(f, cat.primaryGenre(f))" :alt="`Generated title card for ${f.t}`" width="100" height="150" class="rounded border border-line shrink-0" />
      <div class="min-w-0">
        <p class="eyebrow">{{ f.y }}<template v-if="f.rt"> · {{ f.rt }} min</template><template v-if="f.cn[0]"> · {{ f.cn[0] }}</template></p>
        <h2 class="display text-2xl mt-1">{{ f.t }}</h2>
        <p v-if="f.ot" class="text-sm text-faint">{{ f.ot }}</p>
        <div class="flex flex-wrap gap-1 mt-2"><RouterLink v-for="g in f.g" :key="g" :to="`/genre/${g}`" class="chip">{{ cat.genreName.get(g) }}</RouterLink><span v-for="s in f.sg.slice(0, 2)" :key="s" class="chip">{{ s }}</span></div>
      </div>
    </header>
    <div class="flex flex-wrap gap-2">
      <button v-if="graph" class="btn primary" @click="emit('expand')">Expand connections</button>
      <RouterLink v-else :to="{ path: '/explore', query: { film: f.id } }" class="btn primary">Show on the map</RouterLink>
      <button class="btn" :aria-pressed="lib.has('watchlist', f.id)" @click="lib.toggle('watchlist', f.id)">{{ lib.has('watchlist', f.id) ? '✓ On watchlist' : '+ Watchlist' }}</button>
      <button class="btn" :aria-pressed="lib.has('watched', f.id)" @click="lib.toggle('watched', f.id)">{{ lib.has('watched', f.id) ? '✓ Watched' : 'Mark watched' }}</button>
      <label class="btn relative"><span class="sr-only">Save to collection</span><select class="bg-transparent text-sm" aria-label="Save to collection" @change="collectionPick"><option value="">Save to collection…</option><option v-for="c in lib.s.collections" :key="c.id" :value="c.id">{{ c.name }}</option><option value="__new">New collection…</option></select></label>
    </div>
    <div class="flex items-center gap-1" role="group" aria-label="Your rating"><span class="text-sm text-faint mr-1">Your rating</span><button v-for="n in 5" :key="n" class="min-w-11 min-h-11 text-xl" :class="(lib.s.ratings[f.id] || 0) >= n ? 'text-gold' : 'text-faint'" :aria-label="`${n} star${n > 1 ? 's' : ''}`" :aria-pressed="lib.s.ratings[f.id] === n" @click="lib.rate(f.id, lib.s.ratings[f.id] === n ? 0 : n)">★</button></div>
    <section><p class="text-dim leading-relaxed">{{ f.ex || f.de }}</p><p v-if="wiki" class="text-xs text-faint mt-1">Synopsis: <a :href="wiki" class="underline" target="_blank" rel="noopener">Wikipedia</a> (CC BY-SA 4.0). Facts: Wikidata (CC0).</p></section>
    <dl class="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-sm">
      <template v-if="f.dir.length"><dt class="text-faint">Director</dt><dd><RouterLink v-for="p in people(f.dir)" :key="p.id" :to="`/person/${p.id}`" class="text-director hover:underline mr-3">{{ p.n }}</RouterLink></dd></template>
      <template v-if="f.wr.length"><dt class="text-faint">Writers</dt><dd><RouterLink v-for="p in people(f.wr).slice(0, 5)" :key="p.id" :to="`/person/${p.id}`" class="hover:text-gold mr-3">{{ p.n }}</RouterLink></dd></template>
      <template v-if="f.co.length"><dt class="text-faint">Music</dt><dd><RouterLink v-for="p in people(f.co)" :key="p.id" :to="`/person/${p.id}`" class="hover:text-gold mr-3">{{ p.n }}</RouterLink></dd></template>
      <template v-if="f.dp.length"><dt class="text-faint">Cinematography</dt><dd><RouterLink v-for="p in people(f.dp)" :key="p.id" :to="`/person/${p.id}`" class="hover:text-gold mr-3">{{ p.n }}</RouterLink></dd></template>
      <template v-if="f.cm.length"><dt class="text-faint">Companies</dt><dd class="text-dim">{{ f.cm.slice(0, 4).join(', ') }}</dd></template>
      <template v-if="f.cn.length || f.lg.length"><dt class="text-faint">Country, language</dt><dd class="text-dim">{{ f.cn.join(', ') }}<template v-if="f.lg.length"> · {{ f.lg.join(', ') }}</template></dd></template>
      <template v-if="f.aw.length"><dt class="text-faint">Awards</dt><dd class="text-dim">{{ f.aw.slice(0, 4).join('; ') }}</dd></template>
      <template v-if="f.ba.length"><dt class="text-faint">Source</dt><dd class="text-dim">{{ f.ba.map(b => `${b.k} ${b.l}`).join('; ') }}</dd></template>
    </dl>
    <section v-if="cast.length"><h3 class="eyebrow mb-2">Cast <span v-if="cast[0].b === 0" class="normal-case tracking-normal">(billing order not recorded)</span></h3>
      <ul class="flex flex-wrap gap-x-4 gap-y-1 text-sm"><li v-for="c in cast" :key="c.p.id"><RouterLink :to="`/person/${c.p.id}`" class="hover:text-gold" :class="c.b > 0 && c.b <= 2 ? 'text-text font-semibold' : 'text-dim'">{{ c.p.n }}</RouterLink></li></ul></section>
    <section v-if="franchises.length"><h3 class="eyebrow mb-2">Franchise information</h3><div class="flex flex-wrap gap-2"><RouterLink v-for="fr in franchises" :key="fr.id" :to="`/franchise/${fr.id}`" class="chip text-text"><i :style="{ background: fr.k === 'trilogy' ? 'var(--color-trilogy)' : 'var(--color-franchise)' }" />{{ fr.n }} · {{ fr.films.length }} films</RouterLink></div></section>
    <section v-if="showConnections"><h3 class="eyebrow mb-2">Connections ({{ conns.length }} strongest)</h3>
      <ul class="grid grid-cols-1 gap-1"><li v-for="c in conns" :key="c.b" class="border-b border-line/60 py-2 text-sm"><div class="flex items-start justify-between gap-2"><button class="text-left font-semibold hover:text-gold min-h-11 py-1" @click="emit('focus', c.b)">{{ cat.film.get(c.b)?.t }} <span class="font-normal text-faint">{{ cat.film.get(c.b)?.y }}</span></button><span class="text-xs text-faint shrink-0">{{ Math.round(c.strength) }}</span></div><RelationBadge :rel="c.primary" explain /><p v-if="c.all.length > 1" class="text-xs text-faint mt-1">+ {{ c.all.length - 1 }} more link{{ c.all.length > 2 ? 's' : '' }}</p></li></ul></section>
    <p class="text-xs text-faint">Roles: {{ Object.values(ROLE_LABEL).slice(0, 3).join(', ') }} and more are linked above. Wikidata id: {{ f.id }}.</p>
  </article>
</template>
