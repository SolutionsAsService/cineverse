import { defineStore } from 'pinia';
import { markRaw, reactive, ref } from 'vue';
import { useCatalog } from './catalog';
import { useSettings } from './settings';
import { expandFilm, expandHubs, expandPerson, filmId, newGraph, personId, refOf, removeNode, type Delta, type GraphModel } from '@/lib/graph';
import type { Category } from '@/lib/types';
import { ALL_CATEGORIES } from '@/lib/categories';

export const useExplore = defineStore('explore', () => {
  const graph = ref<GraphModel>(markRaw(newGraph())); const version = ref(0); const lastDelta = ref<Delta | null>(null);
  const selected = ref<string | null>(null); const notice = ref(''); const pinned = reactive(new Set<string>());
  const hidden = reactive(new Set<Category>()); const history = ref<string[]>([]);
  const bump = (d?: Delta) => { version.value += 1; lastDelta.value = d || null; };
  const cat = () => useCatalog().cat!; const st = useSettings();
  const cats = (only?: Category[]) => (only ? new Set(only) : new Set(ALL_CATEGORIES.filter(c => !hidden.has(c))));

  function say(d: Delta) { notice.value = d.truncated ? `Node limit reached (${st.nodeLimit}). Raise it in the sidebar or collapse a branch.` : ''; }
  function expandFilmNode(ref: string, only?: Category[]) {
    const d = expandFilm(cat(), graph.value, ref, st.weights, { limit: st.branch, nodeLimit: st.nodeLimit, categories: cats(only), includeGenre: !only || only.includes('genre') });
    if (st.hubs) { const h = expandHubs(cat(), graph.value, ref); d.nodes.push(...h.nodes); d.edges.push(...h.edges); }
    say(d); bump(d); return d;
  }
  function start(ref: string) { graph.value = markRaw(newGraph()); pinned.clear(); history.value = []; expandFilmNode(ref); select(filmId(ref)); }
  function addFilm(ref: string) { if (!graph.value.nodes.has(filmId(ref))) expandFilmNode(ref); select(filmId(ref)); }
  function select(id: string | null) { selected.value = id; if (id) history.value = [id, ...history.value.filter(x => x !== id)].slice(0, 20); }
  function expand(id: string, only?: Category[]) {
    const n = graph.value.nodes.get(id); if (!n) return;
    if (n.kind === 'film') expandFilmNode(n.ref, only);
    else if (n.kind === 'person') { const d = expandPerson(cat(), graph.value, n.ref, { limit: st.branch + 6, nodeLimit: st.nodeLimit }); say(d); bump(d); }
    else if (n.kind === 'cluster') { const f = n.ref; removeNode(graph.value, id); expandFilmNode(f, n.category ? [n.category] : undefined); }
    else if (n.kind === 'franchise') { for (const x of cat().filmsOfFranchise(n.ref).slice(0, st.branch + 8)) if (!graph.value.nodes.has(filmId(x.id))) expandFilm(cat(), graph.value, x.id, st.weights, { limit: 0, nodeLimit: st.nodeLimit }); bump(); }
    else if (n.kind === 'genre') { const films = (cat().byGenre.get(n.ref) || []).slice().sort((a, b) => (b.pop || 0) - (a.pop || 0)).slice(0, st.branch); for (const f of films) if (!graph.value.nodes.has(filmId(f.id)) && graph.value.nodes.size < st.nodeLimit) expandFilm(cat(), graph.value, f.id, st.weights, { limit: 0, nodeLimit: st.nodeLimit }); bump(); }
  }
  function addPerson(ref: string) { const d = expandPerson(cat(), graph.value, ref, { limit: st.branch + 6, nodeLimit: st.nodeLimit }); say(d); bump(d); select(personId(ref)); }
  function collapse(id: string) {
    // remove nodes that hang only off this one (leaves), keeping the node itself
    const g = graph.value; const touching = new Map<string, Set<string>>(); for (const e of g.edges.values()) { for (const [a, b] of [[e.source, e.target], [e.target, e.source]]) { if (!touching.has(a)) touching.set(a, new Set()); touching.get(a)!.add(b); } }
    for (const nb of touching.get(id) || []) if (!pinned.has(nb) && (touching.get(nb)?.size || 0) <= 1) removeNode(g, nb); bump();
  }
  function remove(id: string) { removeNode(graph.value, id); if (selected.value === id) selected.value = null; bump(); }
  function loadMap(films: string[], people: string[]) { graph.value = markRaw(newGraph()); pinned.clear(); for (const f of films) expandFilm(cat(), graph.value, f, st.weights, { limit: 0, nodeLimit: 9999 }); for (const p of people) expandPerson(cat(), graph.value, p, { limit: 0, nodeLimit: 9999 }); bump(); }
  function addPath(films: string[], people: string[]) { for (const f of films) if (!graph.value.nodes.has(filmId(f))) expandFilm(cat(), graph.value, f, st.weights, { limit: 0, nodeLimit: 9999 }); for (const p of people) expandPerson(cat(), graph.value, p, { limit: 0, nodeLimit: 9999 }); bump(); }
  function toggleCategory(c: Category) { if (hidden.has(c)) hidden.delete(c); else hidden.add(c); version.value += 1; }
  const snapshot = () => ({ films: [...graph.value.nodes.values()].filter(n => n.kind === 'film').map(n => n.ref), people: [...graph.value.nodes.values()].filter(n => n.kind === 'person').map(n => n.ref) });
  function reset() { graph.value = markRaw(newGraph()); pinned.clear(); selected.value = null; history.value = []; notice.value = ''; bump(); }
  return { graph, version, lastDelta, selected, notice, pinned, hidden, history, start, addFilm, addPerson, select, expand, collapse, remove, loadMap, addPath, toggleCategory, snapshot, reset, refOf };
});
