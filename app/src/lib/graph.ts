// One graph data model for the whole app. Cytoscape (src/components/MovieGraph.vue) is only an adapter over it; D3 draws the separate timeline and fingerprint charts.
import type { Catalog } from './catalog';
import type { Category, Film } from './types';
import { CATEGORY_LABEL } from './types';
import { neighbors, relationsOf, type PairRelation, type Weights } from './relations';

export type NodeKind = 'film' | 'person' | 'genre' | 'franchise' | 'trilogy' | 'cluster';
export interface GNode { id: string; kind: NodeKind; label: string; ref: string; year?: number; weight: number; genre?: string; category?: Category; hidden?: number }
export interface GEdge { id: string; source: string; target: string; type: string; label: string; category: Category; strength: number; factual: boolean; why: string; more: { label: string; why: string; strength: number; factual: boolean }[] }
export interface GraphModel { nodes: Map<string, GNode>; edges: Map<string, GEdge> }
export interface Delta { nodes: GNode[]; edges: GEdge[]; truncated: boolean }

export const newGraph = (): GraphModel => ({ nodes: new Map(), edges: new Map() });
export const filmId = (id: string) => 'f:' + id;
export const personId = (id: string) => 'p:' + id;
export const isFilmNode = (id: string) => id.startsWith('f:');
export const refOf = (id: string) => id.slice(id.indexOf(':') + 1);

export function filmNode(cat: Catalog, f: Film): GNode { return { id: filmId(f.id), kind: 'film', label: f.t, ref: f.id, year: f.y, weight: Math.min(1, (f.pop || 40) / 120), genre: cat.primaryGenre(f) }; }
export function personNode(cat: Catalog, id: string): GNode { const p = cat.person.get(id); return { id: personId(id), kind: 'person', label: p?.n || id, ref: id, weight: .5 }; }
const edgeId = (a: string, b: string, t: string) => (a < b ? `${a}|${b}|${t}` : `${b}|${a}|${t}`);

function pairEdge(p: PairRelation, a: string, b: string, categories?: Set<Category>): GEdge {
  const rels = categories ? p.all.filter(r => categories.has(r.category)) : p.all; const r = rels[0] || p.primary;
  const stored = r.rev ? { source: b, target: a } : { source: a, target: b };
  return { id: edgeId(a, b, r.type), ...stored, type: r.type, label: r.via?.label || '', category: r.category, strength: p.strength, factual: r.factual, why: r.why, more: p.all.slice(0, 6).map(x => ({ label: x.type, why: x.why, strength: x.strength, factual: x.factual })) };
}

/** Add the strongest neighbours of a film. Large groups are folded into a "+N more" node that expands on demand. */
export function expandFilm(cat: Catalog, g: GraphModel, id: string, w: Weights, opt: { limit: number; categories?: Set<Category>; nodeLimit: number; includeGenre?: boolean }): Delta {
  const delta: Delta = { nodes: [], edges: [], truncated: false };
  const f = cat.film.get(id); if (!f) return delta;
  const addNode = (n: GNode) => { if (!g.nodes.has(n.id)) { g.nodes.set(n.id, n); delta.nodes.push(n); } };
  const addEdge = (e: GEdge) => { if (!g.edges.has(e.id)) { g.edges.set(e.id, e); delta.edges.push(e); } };
  addNode(filmNode(cat, f));
  const list = neighbors(cat, id, w, { categories: opt.categories, includeGenre: opt.includeGenre });
  const fresh = list.filter(p => !g.nodes.has(filmId(p.b)));
  let room = Math.max(0, opt.nodeLimit - g.nodes.size);
  // edges to films already on the map are cheap and show how the map interconnects
  for (const p of list) if (g.nodes.has(filmId(p.b))) addEdge(pairEdge(p, filmId(id), filmId(p.b), opt.categories));
  const take = Math.min(opt.limit, room);
  for (const p of fresh.slice(0, take)) { const B = cat.film.get(p.b); if (!B) continue; addNode(filmNode(cat, B)); addEdge(pairEdge(p, filmId(id), filmId(p.b), opt.categories)); }
  const left = fresh.length - take;
  if (left > 0) {
    delta.truncated = take < opt.limit && room < opt.limit;
    const byCat = new Map<Category, number>(); for (const p of fresh.slice(take)) byCat.set(p.primary.category, (byCat.get(p.primary.category) || 0) + 1);
    const [topCat, n] = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    const cid = 'c:' + id + ':' + topCat; if (!delta.truncated && !g.nodes.has(cid)) { addNode({ id: cid, kind: 'cluster', label: `+${left} more`, ref: id, weight: .3, category: topCat, hidden: left }); addEdge({ id: cid + '|e', source: filmId(id), target: cid, type: 'MORE', label: '', category: topCat, strength: 30, factual: true, why: `${left} more connected films (mostly ${CATEGORY_LABEL[topCat].toLowerCase()}). Click to expand.`, more: [] }); }
  }
  void relationsOf;
  return delta;
}

/** A person node and their films. */
export function expandPerson(cat: Catalog, g: GraphModel, id: string, opt: { limit: number; nodeLimit: number }): Delta {
  const delta: Delta = { nodes: [], edges: [], truncated: false };
  const pn = personNode(cat, id); if (!g.nodes.has(pn.id)) { g.nodes.set(pn.id, pn); delta.nodes.push(pn); }
  const credits = [...(cat.credits.get(id) || [])].sort((a, b) => (b.film.pop || 0) - (a.film.pop || 0) || (a.billing || 99) - (b.billing || 99));
  let added = 0;
  for (const c of credits) {
    const nid = filmId(c.film.id); const room = opt.nodeLimit - g.nodes.size;
    if (!g.nodes.has(nid)) { if (added >= opt.limit || room <= 0) { delta.truncated = room <= 0; continue; } const n = filmNode(cat, c.film); g.nodes.set(n.id, n); delta.nodes.push(n); added += 1; }
    const category: Category = c.role === 'dir' ? 'director' : c.role === 'cast' ? 'cast' : 'crew'; const eid = edgeId(pn.id, nid, c.role);
    if (!g.edges.has(eid)) { const e: GEdge = { id: eid, source: pn.id, target: nid, type: c.role.toUpperCase(), label: c.role, category, strength: c.role === 'dir' ? 85 : c.role === 'cast' ? (c.billing > 0 && c.billing <= 2 ? 80 : 60) : 60, factual: true, why: `${pn.label}: ${({ dir: 'director', wr: 'screenwriter', co: 'composer', dp: 'cinematographer', pr: 'producer', cast: 'cast member' } as const)[c.role]} of “${c.film.t}” (${c.film.y}).`, more: [] }; g.edges.set(eid, e); delta.edges.push(e); }
  }
  return delta;
}

/** Hub nodes (director, top-billed actors, genre, franchise) around one film, for the people-and-genres view. */
export function expandHubs(cat: Catalog, g: GraphModel, id: string): Delta {
  const delta: Delta = { nodes: [], edges: [], truncated: false }; const f = cat.film.get(id); if (!f) return delta;
  const add = (n: GNode, cat2: Category, type: string, why: string) => { if (!g.nodes.has(n.id)) { g.nodes.set(n.id, n); delta.nodes.push(n); } const eid = edgeId(filmId(id), n.id, type); if (!g.edges.has(eid)) { const e: GEdge = { id: eid, source: n.id, target: filmId(id), type, label: n.label, category: cat2, strength: 70, factual: true, why, more: [] }; g.edges.set(eid, e); delta.edges.push(e); } };
  for (const p of f.dir) add(personNode(cat, p), 'director', 'DIR', `${cat.person.get(p)?.n} directed “${f.t}”.`);
  for (const [p, b] of f.cast.filter(c => c[1] > 0 && c[1] <= 3).slice(0, 3)) add(personNode(cat, p), 'cast', 'CAST', `${cat.person.get(p)?.n} is billed ${b} in “${f.t}”.`);
  for (const frId of f.fr.slice(0, 2)) { const fr = cat.franchise.get(frId); if (fr) add({ id: 'fr:' + fr.id, kind: 'franchise', label: fr.n, ref: fr.id, weight: .6 }, 'franchise', 'FR', `“${f.t}” belongs to ${fr.n}.`); }
  const pg = cat.primaryGenre(f); add({ id: 'g:' + pg, kind: 'genre', label: cat.genreName.get(pg) || pg, ref: pg, weight: .5, genre: pg }, 'genre', 'GENRE', `“${f.t}” is classified ${cat.genreName.get(pg)}.`);
  return delta;
}
export function removeNode(g: GraphModel, id: string) { g.nodes.delete(id); for (const [k, e] of g.edges) if (e.source === id || e.target === id) g.edges.delete(k); }
