<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useWindowSize } from '@vueuse/core';
import { useCatalog } from '@/stores/catalog';
import { useSettings } from '@/stores/settings';
import { neighbors, type PairRelation } from '@/lib/relations';
import { titleCard } from '@/lib/poster';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';

// The landing figure is real: the centre film and its strongest factual neighbours come from the same relationship engine as the map.
const cat = useCatalog().cat!, st = useSettings(), router = useRouter();
const { width } = useWindowSize(); const tall = computed(() => width.value < 760);
const FAVOURITES = ['Pulp Fiction', 'Blade Runner', 'The Godfather', 'Inception', 'Alien'];
const pool = FAVOURITES.map(t => cat.data.films.find(f => f.t === t)).filter((f): f is NonNullable<typeof f> => !!f);
const idx = ref(0); const centre = computed(() => pool[idx.value % pool.length] || cat.data.films[0]);
const shuffle = () => { idx.value += 1; active.value = 0; };
// An honest sample: the strongest factual links, no per-category cap. Actor links count only where Wikidata records the billing (a lead in both films); studio and producer links are too weak to headline.
const allFactual = computed(() => neighbors(cat, centre.value.id, st.weights, { includeInferred: false }).filter(p => p.primary.tier === 'fact').length);
const pool_ = computed(() => neighbors(cat, centre.value.id, st.weights, { includeInferred: false }).filter(p => p.primary.tier === 'fact' && p.primary.type !== 'SAME_STUDIO' && p.primary.type !== 'SAME_PRODUCER' && (p.primary.type !== 'SHARED_ACTOR' || p.primary.why.includes('a lead'))));
const list = computed<PairRelation[]>(() => pool_.value.slice(0, tall.value ? 6 : 8));
const active = ref(0);
const W = computed(() => (tall.value ? 360 : 700)), H = computed(() => (tall.value ? 270 : 390));
const nodes = computed(() => list.value.map((p, i) => { const n = list.value.length; const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (n % 2 ? 0 : Math.PI / n); const rx = tall.value ? 118 : 255, ry = tall.value ? 94 : 150; return { p, x: W.value / 2 + Math.cos(a) * rx, y: H.value / 2 + Math.sin(a) * ry, film: cat.film.get(p.b)! }; }));
const explain = computed(() => nodes.value[active.value]?.p.primary.why || '');
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const genreCount = cat.data.genres.length;
const topics = computed(() => [
  { to: '/explore', name: 'Movie map', fig: `${cat.data.films.length.toLocaleString()} films`, glyph: 'map' },
  { to: '/franchises', name: 'Franchises', fig: `${cat.seriesSets.length} series`, glyph: 'fr' },
  { to: '/trilogies', name: 'Trilogies', fig: `${cat.trilogySets.length} trilogies`, glyph: 'tri' },
  { to: '/people', name: 'Directors and actors', fig: `${cat.data.people.length.toLocaleString()} people`, glyph: 'person' },
  { to: '/timeline', name: 'Timeline', fig: `${cat.yearRange[0]}–${cat.yearRange[1]}`, glyph: 'time' },
  { to: `/genre/${cat.data.genres[0].id}`, name: 'Genres', fig: `${genreCount} genres`, glyph: 'genre' },
  { to: '/paths', name: 'Six degrees', fig: 'any two films', glyph: 'path' },
  { to: '/collections', name: 'Collections', fig: 'yours, saved', glyph: 'coll' },
]);
const open = (id: string) => router.push({ path: '/explore', query: { film: id } });
const used = computed(() => [...new Set(list.value.map(p => p.primary.category))]);
</script>

<template>
  <figure class="hero-fig" aria-label="A live slice of the movie map, with one tile for each part of the site">
    <div class="hero-map">
      <svg :viewBox="`0 0 ${W} ${H}`" role="group" :aria-label="`${centre.t} and its strongest factual connections`" class="w-full h-auto block">
        <g v-for="(n, i) in nodes" :key="'e' + n.p.b">
          <line :x1="W / 2" :y1="H / 2" :x2="n.x" :y2="n.y" :stroke="CATEGORY_COLOR[n.p.primary.category]" :stroke-width="(active === i ? 1.8 : 1) * (1 + n.p.strength / 40)" :stroke-opacity="active === i ? 1 : .6" />
        </g>
        <g :transform="`translate(${W / 2 - (tall ? 27 : 38)},${H / 2 - (tall ? 40 : 57)})`">
          <rect x="-4" y="-4" :width="(tall ? 54 : 76) + 8" :height="(tall ? 80 : 114) + 8" rx="3" fill="var(--color-ink)" stroke="var(--color-gold)" stroke-width="2.5" />
          <image :href="titleCard(centre, cat.primaryGenre(centre))" :width="tall ? 54 : 76" :height="tall ? 80 : 114" />
        </g>
        <g v-for="(n, i) in nodes" :key="n.p.b" class="cursor-pointer" tabindex="0" role="link" :aria-label="`${n.film.t} (${n.film.y}): ${n.p.primary.why}`" @click="open(n.film.id)" @keydown.enter="open(n.film.id)" @mouseenter="active = i" @focus="active = i">
          <rect :x="n.x - (tall ? 50 : 78)" :y="n.y - 19" :width="tall ? 100 : 156" height="38" rx="6" fill="var(--color-panel)" :stroke="CATEGORY_COLOR[n.p.primary.category]" :stroke-width="active === i ? 3 : 1.6" />
          <text :x="n.x" :y="n.y - 2" text-anchor="middle" :font-size="tall ? 13 : 14" font-weight="700" fill="var(--color-text)">{{ short(n.film.t, tall ? 13 : 22) }}</text>
          <text :x="n.x" :y="n.y + 13" text-anchor="middle" font-size="12.5" fill="var(--color-dim)">{{ tall ? n.film.y : `${n.film.y} · ${n.p.primary.via?.label ? short(n.p.primary.via.label, 22) : n.p.primary.type.toLowerCase().replace(/_/g, ' ')}` }}</text>
        </g>
      </svg>
      <figcaption class="hero-why" aria-live="polite"><b>{{ centre.t }}</b> ↔ <b>{{ nodes[active]?.film.t }}</b> · {{ explain }} <span class="text-faint">Strongest {{ list.length }} of {{ pool_.length }} links (sequels, franchises, directors, writers, composers, recorded leads); {{ allFactual }} factual links in all. Line thickness is strength.</span></figcaption>
      <div class="hero-key"><span v-for="c in used" :key="c" class="chip"><i :style="{ background: CATEGORY_COLOR[c] }" />{{ CATEGORY_LABEL[c] }}</span><button class="btn ghost !min-h-[44px]" @click="shuffle">Another film</button></div>
    </div>
    <nav class="hero-topics" aria-label="Everything on the site">
      <RouterLink v-for="t in topics" :key="t.to" :to="t.to" class="topic">
        <svg viewBox="0 0 32 32" class="w-7 h-7 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <g v-if="t.glyph === 'map'"><circle cx="16" cy="16" r="3" /><circle cx="6" cy="8" r="2.4" /><circle cx="26" cy="9" r="2.4" /><circle cx="25" cy="25" r="2.4" /><circle cx="7" cy="25" r="2.4" /><path d="M14 14L8 10M18 14l6-3M18 18l5 5M14 18l-5 5" /></g>
          <g v-else-if="t.glyph === 'fr'"><rect x="4" y="9" width="7" height="14" /><rect x="13" y="9" width="7" height="14" /><rect x="22" y="9" width="7" height="14" /></g>
          <g v-else-if="t.glyph === 'tri'"><path d="M16 5l11 20H5z" /><circle cx="16" cy="5" r="2" /><circle cx="27" cy="25" r="2" /><circle cx="5" cy="25" r="2" /></g>
          <g v-else-if="t.glyph === 'person'"><circle cx="16" cy="11" r="5" /><path d="M6 27c1-6 5-9 10-9s9 3 10 9" /></g>
          <g v-else-if="t.glyph === 'time'"><path d="M3 16h26M8 12v8M14 10v12M20 12v8M26 9v14" /></g>
          <g v-else-if="t.glyph === 'genre'"><path d="M16 4l5 8-5 8-5-8zM8 18l4 7H4zM24 18l4 7h-8z" /></g>
          <g v-else-if="t.glyph === 'path'"><circle cx="5" cy="24" r="2.5" /><circle cx="27" cy="8" r="2.5" /><path d="M7 22l6-6 5 4 7-10" /></g>
          <g v-else><rect x="5" y="6" width="22" height="20" rx="2" /><path d="M10 12h12M10 17h12M10 22h7" /></g>
        </svg>
        <span class="min-w-0"><b>{{ t.name }}</b><em>{{ t.fig }}</em></span>
      </RouterLink>
    </nav>
  </figure>
</template>

<style scoped>
.hero-fig { margin: 0; border: 1px solid var(--color-line); border-radius: 10px; background: color-mix(in srgb, var(--color-panel) 86%, transparent); overflow: hidden; }
.hero-map { padding: 10px 10px 6px; }
.hero-why { min-height: 44px; padding: 4px 8px; font-size: 14px; line-height: 1.35; color: var(--color-dim); }
.hero-why b { color: var(--color-text); }
.hero-key { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 0 8px 4px; }
.hero-topics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--color-line); }
.topic { display: flex; align-items: center; gap: 8px; padding: 10px; min-height: 64px; border-right: 1px solid var(--color-line); color: var(--color-dim); }
.topic:nth-child(4n) { border-right: 0; } .topic:nth-child(-n+4) { border-bottom: 1px solid var(--color-line); }
.topic:hover { background: var(--color-panel2); color: var(--color-gold); }
.topic b { display: block; font-size: 13px; line-height: 1.15; color: var(--color-text); }
.topic em { display: block; font-style: normal; font-size: 12px; color: var(--color-faint); margin-top: 2px; }
@media (max-width: 760px) { .topic { flex-direction: column; align-items: flex-start; gap: 3px; padding: 7px 8px; min-height: 70px; } .topic svg { width: 20px; height: 20px; } .topic b { font-size: 12.5px; } .hero-key .chip { display: none; } .hero-why { min-height: 40px; font-size: 13.5px; padding: 0 8px; } .hero-map { padding: 6px 6px 2px; } }
</style>
