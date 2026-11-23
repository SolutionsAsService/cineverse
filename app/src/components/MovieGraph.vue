<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { useCatalog } from '@/stores/catalog';
import { useExplore } from '@/stores/explore';
import { useSettings, type NodeMode } from '@/stores/settings';
import { genreColor, titleCard } from '@/lib/poster';
import { CATEGORY_COLOR, CATEGORY_LABEL } from '@/lib/types';
import type { GEdge, GNode } from '@/lib/graph';

// Cytoscape is only a renderer. The single graph model lives in the explore store (src/lib/graph.ts); this component diffs it into Cytoscape elements.
const catalog = useCatalog(), ex = useExplore(), st = useSettings();
const el = ref<HTMLDivElement>(); const tip = ref<{ x: number; y: number; text: string; more: string[]; factual: boolean } | null>(null);
let cy: Core | null = null; let first = true;
const emit = defineEmits<{ expand: [id: string] }>();
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
const edgeData = (e: GEdge) => ({ id: e.id, source: e.source, target: e.target, color: CATEGORY_COLOR[e.category], w: 1.2 + e.strength / 38, factual: e.factual, category: e.category, why: e.why, more: e.more, strength: e.strength, label: e.label });

function sync() {
  if (!cy) return; const g = ex.graph; const mode = st.mode;
  cy.batch(() => {
    const have = new Set(cy!.elements().map(x => x.id()));
    for (const [id, n] of g.nodes) { if (have.has(id)) { cy!.getElementById(id).data(nodeData(n, mode)); continue; } const near = ex.selected && cy!.getElementById(ex.selected).length ? cy!.getElementById(ex.selected).position() : { x: 0, y: 0 };
      cy!.add({ group: 'nodes', data: nodeData(n, mode), position: { x: near.x + (Math.random() - .5) * 60, y: near.y + (Math.random() - .5) * 60 } } as ElementDefinition); }
    for (const [id, e] of g.edges) { const hide = ex.hidden.has(e.category); if (have.has(id)) { cy!.getElementById(id).data(edgeData(e)); } else if (g.nodes.has(e.source) && g.nodes.has(e.target)) cy!.add({ group: 'edges', data: edgeData(e) } as ElementDefinition); const ce = cy!.getElementById(id); if (ce.length) ce.toggleClass('off', hide); }
    cy!.elements().forEach(x => { if (!g.nodes.has(x.id()) && !g.edges.has(x.id())) x.remove(); });
  });
  decorate();
}
function decorate() {
  if (!cy) return; cy.elements().removeClass('dim hot');
  const sel = ex.selected ? cy.getElementById(ex.selected) : null;
  if (sel && sel.length) { const hood = sel.closedNeighborhood(); cy.elements().not(hood).addClass('dim'); sel.addClass('hot'); sel.connectedEdges().addClass('hot'); }
  cy.nodes().forEach(n => { n.toggleClass('pin', ex.pinned.has(n.id())); });
}
function layout(opts: { fit?: boolean } = {}) {
  if (!cy || cy.nodes().length === 0) return;
  if (st.mode === 'timeline') {
    const films = cy.nodes('[kind = "film"]'); const years = films.map(n => Number(n.data('year'))).filter(Boolean); const min = Math.min(...years), max = Math.max(...years, min + 1);
    const lanes = new Map<string, number>(); const cat = catalog.cat!;
    cy.nodes().positions(n => { if (n.data('kind') !== 'film') return n.position(); const f = cat.film.get(String(n.data('ref')))!; const lane = cat.primaryGenre(f); if (!lanes.has(lane)) lanes.set(lane, lanes.size); return { x: ((Number(n.data('year')) - min) / (max - min)) * Math.max(900, films.length * 46), y: lanes.get(lane)! * 78 }; });
    cy.fit(undefined, 60); return;
  }
  cy.layout({ name: 'cose', animate: !first, animationDuration: 450, randomize: false, fit: opts.fit ?? first, padding: 50, nodeRepulsion: () => 9000, idealEdgeLength: (e: cytoscape.EdgeSingular) => (e.data('category') === 'franchise' || e.data('category') === 'trilogy' ? 70 : 120), edgeElasticity: () => 80, gravity: .35, numIter: 700, nodeOverlap: 22 } as cytoscape.LayoutOptions).run();
  first = false;
}
onMounted(() => {
  cy = cytoscape({ container: el.value!, wheelSensitivity: .25, minZoom: .12, maxZoom: 2.8, textureOnViewport: true, hideEdgesOnViewport: false, pixelRatio: Math.min(2, window.devicePixelRatio || 1),
    style: [
      { selector: 'node', style: { label: 'data(label)', color: '#f1ece3', 'font-size': 11, 'text-valign': 'bottom', 'text-margin-y': 5, 'text-wrap': 'ellipsis', 'text-max-width': '96px', 'min-zoomed-font-size': 9, 'text-background-color': '#0b0a0c', 'text-background-opacity': .72, 'text-background-padding': '2px', width: 'data(w)', height: 'data(h)', 'background-color': 'data(color)', shape: 'data(shape)' as never, 'border-width': 1.5, 'border-color': '#3a3541' } },
      { selector: 'node[kind = "film"][img != "none"]', style: { 'background-image': 'data(img)' as never, 'background-fit': 'cover', 'background-color': '#17151a', 'border-width': 1.5, 'border-color': '#5b5465' } },
      { selector: 'node[kind = "person"]', style: { 'border-width': 2, 'border-color': '#01d3ff', 'background-color': '#12303a', color: '#bff3ff' } },
      { selector: 'node[kind = "cluster"]', style: { 'border-width': 2, 'border-color': 'data(color)', 'background-color': '#17151a', 'text-valign': 'center', 'text-margin-y': 0, color: '#f1ece3', 'font-size': 12, 'text-background-opacity': 0 } },
      { selector: 'node.hot', style: { 'border-color': '#c9a45c', 'border-width': 3.2, 'z-index': 20 } },
      { selector: 'node.pin', style: { 'border-style': 'double', 'border-width': 4 } },
      { selector: 'node.dim, edge.dim', style: { opacity: .16 } },
      { selector: 'edge', style: { width: 'data(w)', 'line-color': 'data(color)', 'curve-style': 'bezier', opacity: .5, 'target-arrow-shape': 'none' } },
      { selector: 'edge[?factual]', style: { 'line-style': 'solid' } }, { selector: 'edge[!factual]', style: { 'line-style': 'dashed', 'line-dash-pattern': [6, 5] } },
      { selector: 'edge.hot', style: { opacity: 1, width: 3.4, 'z-index': 15 } },
      { selector: '.off', style: { display: 'none' } },
    ] as unknown as cytoscape.StylesheetJson });
  cy.on('tap', 'node', evt => { const n = evt.target; ex.select(n.id()); if (n.data('kind') === 'cluster') emit('expand', n.id()); });
  cy.on('dbltap', 'node', evt => emit('expand', evt.target.id()));
  cy.on('tap', evt => { if (evt.target === cy) ex.select(null); });
  cy.on('mouseover', 'edge', evt => { const e = evt.target; const p = evt.renderedPosition || e.midpoint(); tip.value = { x: p.x, y: p.y, text: String(e.data('why')), more: ((e.data('more') as { why: string }[]) || []).slice(1, 4).map(m => m.why), factual: !!e.data('factual') }; e.addClass('hot'); });
  cy.on('mouseout', 'edge', evt => { tip.value = null; if (!ex.selected || !evt.target.connectedNodes().some((n: cytoscape.NodeSingular) => n.id() === ex.selected)) evt.target.removeClass('hot'); });
  cy.on('grab', () => { tip.value = null; });
  sync(); layout({ fit: true });
});
watch(() => ex.version, () => { const had = cy?.nodes().length || 0; sync(); const d = ex.lastDelta; if (!d || d.nodes.length || !had) layout({ fit: !had }); });
watch(() => st.mode, () => { sync(); layout({ fit: true }); });
watch(() => ex.selected, () => { decorate(); const n = ex.selected && cy?.getElementById(ex.selected); if (n && n.length && cy) cy.animate({ center: { eles: n }, duration: 280 }); });
onBeforeUnmount(() => { cy?.destroy(); cy = null; });
defineExpose({
  zoom: (f: number) => { if (cy) cy.zoom({ level: cy.zoom() * f, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } }); },
  fit: () => cy?.fit(undefined, 50), center: () => { const n = ex.selected && cy?.getElementById(ex.selected); if (n && n.length && cy) cy.animate({ center: { eles: n }, zoom: Math.max(cy.zoom(), 1), duration: 280 }); },
  relayout: () => layout({ fit: true }), png: () => cy?.png({ full: true, bg: '#0b0a0c', scale: 1.5 }),
});
const legendCats = Object.entries(CATEGORY_LABEL);
void legendCats;
</script>

<template>
  <div class="absolute left-0 bottom-0" style="top: var(--gt, 0px); right: var(--gr, 58px)">
    <div ref="el" class="w-full h-full" role="application" aria-label="Interactive movie map. Select a film to see its connections; the connection list in the side panel carries the same information as text." />
    <div v-if="tip" class="absolute z-10 pointer-events-none panel px-3 py-2 text-sm max-w-[300px] shadow-xl" :style="{ left: Math.min(tip.x + 14, 9999) + 'px', top: tip.y + 14 + 'px' }">
      <p><span class="eyebrow mr-2">{{ tip.factual ? 'Factual' : 'Inferred' }}</span>{{ tip.text }}</p>
      <p v-for="m in tip.more" :key="m" class="text-dim mt-1">+ {{ m }}</p>
    </div>
  </div>
</template>
