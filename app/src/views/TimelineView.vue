<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as d3 from 'd3';
import { useRouter } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import FilmTile from '@/components/FilmTile.vue';
import { genreColor } from '@/lib/poster';
import type { Film } from '@/lib/types';
const cat = useCatalog().cat!, router = useRouter();
const genre = ref(''), country = ref(''), lang = ref(''), who = ref('');
const [y0, y1] = cat.yearRange; const domain = ref<[number, number]>([y0 - 1, y1 + 1]);
const W = 1000, H = 330, m = { l: 20, r: 20, t: 20, b: 34 };
const svgEl = ref<SVGSVGElement>(); let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
const top = (key: 'cn' | 'lg') => { const n = new Map<string, number>(); for (const f of cat.data.films) for (const c of f[key]) n.set(c, (n.get(c) || 0) + 1); return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16).map(x => x[0]); };
const countries = top('cn'), languages = top('lg');
const films = computed<Film[]>(() => { const q = who.value.trim().toLowerCase(); const ok = (f: Film) => (!genre.value || f.g.includes(genre.value)) && (!country.value || f.cn.includes(country.value)) && (!lang.value || f.lg.includes(lang.value)) && (!q || [...f.dir, ...f.cast.map(c => c[0])].some(p => (cat.person.get(p)?.n || '').toLowerCase().includes(q)));
  return cat.data.films.filter(ok); });
const base = d3.scaleLinear().domain([y0 - 1, y1 + 1]).range([m.l, W - m.r]);
const x = computed(() => d3.scaleLinear().domain(domain.value).range([m.l, W - m.r]));
const span = computed(() => domain.value[1] - domain.value[0]);
const ticks = computed(() => x.value.ticks(span.value > 70 ? 10 : span.value > 20 ? 14 : span.value > 8 ? span.value : 8).filter(t => Number.isInteger(t)));
const visible = computed(() => films.value.filter(f => f.y >= domain.value[0] && f.y <= domain.value[1]));
const dots = computed(() => { if (span.value > 45) return [] as { f: Film; cx: number; cy: number; r: number }[]; const stack = new Map<number, number>(); const r = span.value > 60 ? 2.6 : span.value > 15 ? 3.6 : 5.5; const step = r * 2 + 1; const order = [...visible.value].sort((a, b) => (b.pop || 0) - (a.pop || 0));
  return order.map(f => { const col = Math.round(x.value(f.y) / step); const n = stack.get(col) || 0; stack.set(col, n + 1); return { f, cx: x.value(f.y), cy: H - m.b - 6 - n * step, r }; }).filter(d => d.cy > m.t); });
const bars = computed(() => { if (span.value <= 45) return []; const n = new Map<number, number>(); for (const f of visible.value) n.set(f.y, (n.get(f.y) || 0) + 1); const mx = Math.max(1, ...n.values()); const bw = Math.max(1.2, x.value(1901) - x.value(1900) - 1); return [...n.entries()].map(([yr, c]) => ({ yr, c, x: x.value(yr) - bw / 2, w: bw, h: (c / mx) * (H - m.b - m.t - 10), top: [...visible.value].filter(f => f.y === yr).sort((a, b) => (b.pop || 0) - (a.pop || 0))[0] })); });
const labelled = computed(() => (span.value <= 25 ? dots.value.filter(d => d.cy > H - m.b - 90).slice(0, 26) : []));
const shown = computed(() => [...visible.value].sort((a, b) => (b.pop || 0) - (a.pop || 0)).slice(0, 36));
function setDomain(d: [number, number]) { if (!zoom || !svgEl.value) return; const k = (base.domain()[1] - base.domain()[0]) / (d[1] - d[0]); const tx = m.l - base(d[0]) * k + m.l * (k - 1) * 0; d3.select(svgEl.value).transition().duration(350).call(zoom.transform, d3.zoomIdentity.translate(m.l - (base(d[0]) - m.l) * k, 0).scale(k)); void tx; }
onMounted(() => {
  zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 60]).translateExtent([[m.l, 0], [W - m.r, H]]).extent([[m.l, 0], [W - m.r, H]]).on('zoom', e => { const t = e.transform as d3.ZoomTransform; const nx = t.rescaleX(base); domain.value = [nx.invert(m.l), nx.invert(W - m.r)]; });
  d3.select(svgEl.value!).call(zoom).on('dblclick.zoom', null);
});
onBeforeUnmount(() => { if (svgEl.value) d3.select(svgEl.value).on('.zoom', null); });
const decades = Array.from({ length: Math.floor((y1 - y0) / 10) + 1 }, (_, i) => Math.floor(y0 / 10) * 10 + i * 10).filter(d => d <= y1);
watch(() => [genre.value, country.value, lang.value, who.value], () => {});
const reset = () => setDomain([y0 - 1, y1 + 1]);
</script>
<template><div class="zone zone-time"><div class="wrap py-8"><p class="eyebrow">Cinematic timeline</p><h1 class="display text-4xl mt-2">A century of cinema, {{ y0 }}–{{ y1 }}</h1>
  <p class="text-dim mt-3 max-w-[64ch]">Scroll or pinch to zoom from the whole century (bars: films per year) down to single years (dots: one film each); drag to move. Film movements are not in the dataset yet: they are on the roadmap rather than invented here.</p>
  <div class="flex flex-wrap gap-2 mt-5 items-end">
    <label class="grid grid-cols-1 gap-1 text-sm"><span class="text-faint">Genre</span><select v-model="genre" class="field !w-44"><option value="">All genres</option><option v-for="g in cat.data.genres" :key="g.id" :value="g.id">{{ g.n }}</option></select></label>
    <label class="grid grid-cols-1 gap-1 text-sm"><span class="text-faint">Country</span><select v-model="country" class="field !w-44"><option value="">All countries</option><option v-for="c in countries" :key="c">{{ c }}</option></select></label>
    <label class="grid grid-cols-1 gap-1 text-sm"><span class="text-faint">Language</span><select v-model="lang" class="field !w-44"><option value="">All languages</option><option v-for="c in languages" :key="c">{{ c }}</option></select></label>
    <label class="grid grid-cols-1 gap-1 text-sm"><span class="text-faint">Director or actor</span><input v-model="who" class="field !w-52" type="search" placeholder="Name contains…" /></label>
    <button class="btn" @click="reset">Whole century</button></div>
  <div class="flex flex-wrap gap-1 mt-3" role="group" aria-label="Jump to a decade"><button v-for="d in decades" :key="d" class="btn ghost !min-h-11 !px-3" :aria-pressed="Math.abs(domain[0] - d) < 1.5 && Math.abs(domain[1] - d - 10) < 1.5" @click="setDomain([d, d + 10])">{{ d }}s</button></div>
  <figure class="panel mt-4 p-2"><svg ref="svgEl" :viewBox="`0 0 ${W} ${H}`" class="w-full h-auto touch-none select-none" role="img" :aria-label="`${visible.length} films between ${Math.round(domain[0])} and ${Math.round(domain[1])}. The list below has the same films.`">
    <g :transform="`translate(0,${H - m.b})`"><line :x1="m.l" :x2="W - m.r" stroke="var(--color-line)" /><g v-for="t in ticks" :key="t" :transform="`translate(${x(t)},0)`"><line y2="6" stroke="var(--color-line)" /><text y="22" text-anchor="middle" font-size="12" fill="var(--color-dim)">{{ t }}</text></g></g>
    <g><rect v-for="b in bars" :key="b.yr" :x="b.x" :y="H - m.b - b.h" :width="b.w" :height="b.h" fill="var(--color-gold)" fill-opacity=".85" class="cursor-pointer" @click="setDomain([b.yr - 2, b.yr + 3])"><title>{{ b.yr }}: {{ b.c }} films. Click to zoom in.</title></rect></g>
    <g><circle v-for="d in dots" :key="d.f.id" :cx="d.cx" :cy="d.cy" :r="d.r" :fill="genreColor(cat.primaryGenre(d.f), 62, .62)" fill-opacity=".9" class="cursor-pointer" @click="router.push(`/movie/${d.f.id}`)"><title>{{ d.f.t }} ({{ d.f.y }})</title></circle></g>
    <g v-for="d in labelled" :key="'l' + d.f.id" pointer-events="none"><text :x="d.cx + d.r + 3" :y="d.cy + 4" font-size="12" fill="var(--color-text)" paint-order="stroke" stroke="var(--color-ink)" stroke-width="3">{{ d.f.t.length > 24 ? d.f.t.slice(0, 23) + '…' : d.f.t }}</text></g>
  </svg></figure>
  <ul class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-dim" aria-label="Dot colours by primary genre"><li v-for="g in cat.data.genres" :key="g.id" class="inline-flex items-center gap-1"><i class="w-2.5 h-2.5 rounded-full inline-block" :style="{ background: genreColor(g.id, 62, .62) }" />{{ g.n }}</li></ul>
  <p class="text-sm text-faint mt-2" role="status">{{ visible.length }} of {{ films.length }} filtered films in view ({{ Math.round(domain[0]) }}–{{ Math.round(domain[1]) }}).</p>
  <section class="mt-6"><h2 class="display text-2xl mb-3">In view</h2><div class="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-4"><FilmTile v-for="f in shown" :key="f.id" :film="f" :sub="`${f.y} · ${cat.genreName.get(cat.primaryGenre(f)) || ''}`" /></div><p v-if="!visible.length" class="text-dim">No films match these filters in this range.</p></section></div></div></template>
