<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { useCatalog } from '@/stores/catalog';
import { useExplore } from '@/stores/explore';
import { useSettings, type NodeMode } from '@/stores/settings';
import { genreColor, titleCard } from '@/lib/poster';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import type { GEdge, GNode } from '@/lib/graph';

// Cytoscape is only a renderer. The single graph model lives in the explore store (src/lib/graph.ts); this component diffs it into Cytoscape elements.
const catalog = useCatalog(), ex = useExplore(), st = useSettings();
const el = ref<HTMLDivElement>(); const tipPinnedUi = computed(() => !!tip.value && (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)); const tip = ref<{ x: number; y: number; names: string; text: string; more: string[]; tier: string } | null>(null);
let cy: Core | null = null; let first = true; let tipPinned = false; let ro: ResizeObserver | null = null;
const emit = defineEmits<{ expand: [id: string]; count: [c: { nodes: number; edges: number }] }>();
const franchiseHue = (id: string) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 58%)`; };

function nodeData(n: GNode, mode: NodeMode) {
  const cat = catalog.cat!; const f = n.kind === 'film' ? cat.film.get(n.ref) : undefined;
  const base: Record<string, unknown> = { id: n.id, label: n.kind === 'film' ? `${n.label} (${n.year})` : n.label, kind: n.kind, ref: n.ref };
  if (n.kind === 'film' && f) {
    const poster = mode === 'poster';
    const color = mode === 'franchise' ? (f.fr[0] ? franchiseHue(f.fr[0]) : '#6b6573') : mode === 'minimal' ? '#c9a45c' : genreColor(n.genre || 'drama', 60, .6);
    Object.assign(base, { w: poster ? 52 : 12 + n.weight * 22, h: poster ? 78 : 12 + n.weight * 22, img: poster ? titleCard(f, n.genre || 'drama') : 'none', color, shape: poster ? 'round-rectangle' : 'ellipse', year: n.year });
  } else if (n.kind === 'cluster') Object.assign(base, { w: 56, h: 26, img: 'none', color: n.category ? CATEGORY_COLOR[n.category] : '#9a96a3', shape: 'round-tag' });
  else if (n.kind === 'person') Object.assign(base, { w: 26, h: 26, img: 'none', color: '#01d3ff', shape: 'ellipse' });
  else if (n.kind === 'genre') Object.assign(base, { w: 30, h: 30, img: 'none', color: genreColor(n.genre || 'drama', 60, .6), shape: 'diamond' });
  else Object.assign(base, { w: 30, h: 30, img: 'none', color: '#ff4813', shape: 'hexagon' });
  return base;
}
const edgeData = (e: GEdge) => ({ id: e.id, source: e.source, target: e.target, color: CATEGORY_COLOR[e.category], w: 1.2 + e.strength / 38, factual: e.factual, tier: e.tier, category: e.category, why: e.why, more: e.more, strength: e.strength, label: e.label });

function sync() {
  if (!cy) return; const g = ex.graph; const mode = st.mode;
  cy.batch(() => {
    const have = new Set(cy!.elements().map(x => x.id()));
    // new nodes start on a ring around the anchor (the selected node) at a position derived from their order, so the same action always gives the same map
    const anchor = ex.selected && cy!.getElementById(ex.selected).length ? cy!.getElementById(ex.selected).position() : { x: 0, y: 0 }; let k = 0; const fresh = [...g.nodes.keys()].filter(i => !have.has(i)).length || 1;
    for (const [id, n] of g.nodes) { if (have.has(id)) { cy!.getElementById(id).data(nodeData(n, mode)); continue; } const a = (k / fresh) * Math.PI * 2 - Math.PI / 2, r = 140 + (k % 2) * 55; k += 1;
      cy!.add({ group: 'nodes', data: nodeData(n, mode), position: { x: anchor.x + Math.cos(a) * r, y: anchor.y + Math.sin(a) * r } } as ElementDefinition); }
    for (const [id, e] of g.edges) { const hide = ex.hidden.has(e.category); if (have.has(id)) { cy!.getElementById(id).data(edgeData(e)); } else if (g.nodes.has(e.source) && g.nodes.has(e.target)) cy!.add({ group: 'edges', data: edgeData(e) } as ElementDefinition); const ce = cy!.getElementById(id); if (ce.length) ce.toggleClass('off', hide); }
    cy!.elements().forEach(x => { if (!g.nodes.has(x.id()) && !g.edges.has(x.id())) x.remove(); });
    // a film left with no visible line only because of a relationship filter is hidden too (the selected node and pinned nodes stay)
    cy!.nodes().forEach(n => { const edges = n.connectedEdges(); const orphan = edges.length > 0 && edges.filter('.off').length === edges.length && n.id() !== ex.selected && !ex.pinned.has(n.id()); n.toggleClass('off', orphan); });
  });
  emit('count', { nodes: cy.nodes(':visible').length, edges: cy.edges(':visible').length });
  decorate();
}
function decorate() {
  if (!cy) return; cy.elements().removeClass('dim hot');
  const sel = ex.selected ? cy.getElementById(ex.selected) : null;
  if (sel && sel.length) { const hood = sel.closedNeighborhood(); cy.elements().not(hood).addClass('dim'); sel.addClass('hot'); sel.connectedEdges().addClass('hot'); }
  cy.nodes().forEach(n => { n.toggleClass('pin', ex.pinned.has(n.id())); });
  cy.elements().removeClass('route'); const r = ex.route; if (r.length) { const set = new Set(r); cy.nodes().filter(n => set.has(n.id())).addClass('route'); cy.edges().filter(e => set.has(e.source().id()) && set.has(e.target().id())).addClass('route'); cy.elements().not('.route').addClass('dim'); }
}
function layout(opts: { fit?: boolean } = {}) {
  if (!cy || cy.nodes().length === 0) return;
  if (st.mode === 'timeline') {
    const films = cy.nodes('[kind = "film"]'); const years = films.map(n => Number(n.data('year'))).filter(Boolean); const min = Math.min(...years), max = Math.max(...years, min + 1);
    const lanes = new Map<string, number>(); const cat = catalog.cat!;
    cy.nodes().positions(n => { if (n.data('kind') !== 'film') return n.position(); const f = cat.film.get(String(n.data('ref')))!; const lane = cat.primaryGenre(f); if (!lanes.has(lane)) lanes.set(lane, lanes.size); return { x: ((Number(n.data('year')) - min) / (max - min)) * Math.max(900, films.length * 46), y: lanes.get(lane)! * 78 }; });
    cy.fit(undefined, 60); return;
  }
  cy.one('layoutstop', () => { if (!opts.fit) focusSelected(); });
  cy.layout({ name: 'cose', animate: !first, animationDuration: 450, randomize: false, fit: opts.fit ?? first, padding: 50, nodeRepulsion: () => 9000, idealEdgeLength: (e: cytoscape.EdgeSingular) => (e.data('category') === 'franchise' || e.data('category') === 'trilogy' ? 70 : 120), edgeElasticity: () => 80, gravity: .35, numIter: 700, nodeOverlap: 22 } as cytoscape.LayoutOptions).run();
  first = false;
}
onMounted(() => {
  cy = cytoscape({ container: el.value!, wheelSensitivity: .25, minZoom: .12, maxZoom: 2.8, textureOnViewport: true, hideEdgesOnViewport: false, pixelRatio: Math.min(2, window.devicePixelRatio || 1),
    style: [
      { selector: 'node', style: { label: 'data(label)', color: '#f1ece3', 'font-size': 11, 'text-valign': 'bottom', 'text-margin-y': 5, 'text-wrap': 'ellipsis', 'text-max-width': '96px', 'min-zoomed-font-size': 6.5, 'text-background-color': '#0b0a0c', 'text-background-opacity': .72, 'text-background-padding': '2px', width: 'data(w)', height: 'data(h)', 'background-color': 'data(color)', shape: 'data(shape)' as never, 'border-width': 1.5, 'border-color': '#3a3541' } },
      { selector: 'node[kind = "film"][img != "none"]', style: { 'background-image': 'data(img)' as never, 'background-fit': 'cover', 'background-color': '#17151a', 'border-width': 1.5, 'border-color': '#5b5465' } },
      { selector: 'node[kind = "person"]', style: { 'border-width': 2, 'border-color': '#01d3ff', 'background-color': '#12303a', color: '#bff3ff' } },
      { selector: 'node[kind = "cluster"]', style: { 'border-width': 2, 'border-color': 'data(color)', 'background-color': '#17151a', 'text-valign': 'center', 'text-margin-y': 0, color: '#f1ece3', 'font-size': 12, 'text-background-opacity': 0 } },
      { selector: 'node.hot', style: { 'border-color': '#c9a45c', 'border-width': 3.2, 'z-index': 20 } },
      { selector: 'node.pin', style: { 'border-style': 'double', 'border-width': 4 } },
      { selector: 'node.dim, edge.dim', style: { opacity: .16 } },
      { selector: 'edge', style: { width: 'data(w)', 'line-color': 'data(color)', 'curve-style': 'bezier', opacity: .5, 'target-arrow-shape': 'none' } },
      { selector: 'edge[?factual]', style: { 'line-style': 'solid' } }, { selector: 'edge[!factual]', style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 5] } },
      { selector: 'edge.hot', style: { opacity: 1, width: 3.4, 'z-index': 15 } },
      { selector: 'node.route', style: { 'border-color': '#c9a45c', 'border-width': 3.4, opacity: 1 } }, { selector: 'edge.route', style: { 'line-color': '#c9a45c', width: 4.5, opacity: 1, 'z-index': 30 } },
      { selector: '.off', style: { display: 'none' } },
    ] as unknown as cytoscape.StylesheetJson });
  cy.on('tap', 'node', evt => { const n = evt.target; ex.select(n.id()); if (n.data('kind') === 'cluster') emit('expand', n.id()); });
  cy.on('dbltap', 'node', evt => emit('expand', evt.target.id()));
  cy.on('tap', evt => { if (evt.target === cy) { ex.select(null); tip.value = null; tipPinned = false; } });
  const names = (e: cytoscape.EdgeSingular) => `${e.source().data('label')} ↔ ${e.target().data('label')}`;
  cy.on('mouseover', 'edge', evt => { if (tipPinned) return; const e = evt.target; const p = evt.renderedPosition || e.midpoint(); tip.value = { x: p.x, y: p.y, names: names(e), text: String(e.data('why')), more: ((e.data('more') as { why: string; factual: boolean; label: string }[]) || []).slice(1, 4).map(m => `${m.label === 'SAME_GENRE' ? '[shared label] ' : m.factual ? '[fact] ' : '[inferred] '}${m.why}`), tier: String(e.data('tier')) }; e.addClass('hot'); });
  cy.on('tap', 'edge', evt => { const e = evt.target; const p = evt.renderedPosition || e.midpoint(); tipPinned = true; tip.value = { x: Math.min(p.x, (el.value?.clientWidth || 360) - 280), y: p.y, names: names(e), text: String(e.data('why')), more: ((e.data('more') as { why: string; factual: boolean; label: string }[]) || []).slice(1, 4).map(m => `${m.label === 'SAME_GENRE' ? '[shared label] ' : m.factual ? '[fact] ' : '[inferred] '}${m.why}`), tier: String(e.data('tier')) }; });
  cy.on('mouseout', 'edge', evt => { if (tipPinned) return; tip.value = null; if (!ex.selected || !evt.target.connectedNodes().some((n: cytoscape.NodeSingular) => n.id() === ex.selected)) evt.target.removeClass('hot'); });
  cy.on('grab', () => { tip.value = null; });
  sync(); layout({ fit: true });
});
watch(() => ex.version, () => { const had = cy?.nodes().length || 0; sync(); const d = ex.lastDelta; if (!d || d.nodes.length || !had) layout({ fit: !had }); });
function focusSelected() { if (!cy || !ex.selected) return; const n = cy.getElementById(ex.selected); if (!n.length) return; const hood = n.closedNeighborhood().nodes(':visible'); if (cy.nodes().length > 22 && hood.length > 1) cy.animate({ fit: { eles: hood, padding: 70 }, duration: 320 }); else cy.animate({ center: { eles: n }, duration: 280 }); }
watch(() => st.mode, () => { sync(); layout({ fit: true }); });
watch(() => ex.selected, () => { decorate(); const n = ex.selected && cy?.getElementById(ex.selected); if (n && n.length && cy) cy.animate({ center: { eles: n }, duration: 280 }); });
onMounted(() => { if (el.value && typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => { cy?.resize(); focusSelected(); }); ro.observe(el.value); } });
onBeforeUnmount(() => { ro?.disconnect(); cy?.destroy(); cy = null; });
defineExpose({
  zoom: (f: number) => { if (cy) cy.zoom({ level: cy.zoom() * f, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); },
  fit: () => cy?.fit(undefined, 50), center: () => { const n = ex.selected && cy?.getElementById(ex.selected); if (n && n.length && cy) cy.animate({ center: { eles: n }, zoom: Math.max(cy.zoom(), 1), duration: 280 }); },
  relayout: () => layout({ fit: true }), png: () => cy?.png({ full: true, bg: '#0b0a0c', scale: 1.5 }),
});
const legendCats = Object.entries(CATEGORY_LABEL);
void legendCats;
</script>

<template>
  <div class="absolute left-0" style="top: var(--gt, 0px); right: var(--gr, 58px); bottom: var(--gb, 0px)">
    <div ref="el" class="w-full h-full" role="application" aria-label="Interactive movie map. Select a film to see its connections; the connection list in the side panel carries the same information as text." />
    <div v-if="tip" class="absolute z-10 panel px-3 py-2 text-sm max-w-[300px] shadow-xl" :class="tipPinnedUi ? '' : 'pointer-events-none'" :style="{ left: Math.min(tip.x + 14, 9999) + 'px', top: tip.y + 14 + 'px' }">
      <p class="font-semibold mb-1">{{ tip.names }}</p>
      <p><span class="eyebrow mr-2">{{ tip.tier === 'fact' ? 'Fact' : tip.tier === 'label' ? 'Shared label' : 'Inferred' }}</span>{{ tip.text }}</p>
      <p v-for="m in tip.more" :key="m" class="text-dim mt-1">+ {{ m }}</p>
      <button v-if="tipPinnedUi" class="btn ghost mt-1 !min-h-11" @click="tip = null; tipPinned = false">Close</button>
    </div>
  </div>
</template>
