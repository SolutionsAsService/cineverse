// The relationship engine. Every relationship is derived from stored facts (Wikidata statements or the editorial trilogy list) on demand;
// nothing is random. Each carries its source, whether it is factual or inferred, a confidence, and a plain explanation.
import type { Catalog } from './catalog';
import type { Category, Film } from './types';

export type RelType = 'SEQUEL_TO' | 'SAME_FRANCHISE' | 'SAME_TRILOGY' | 'REMAKE_OF' | 'BASED_ON_SAME' | 'SAME_DIRECTOR' | 'SHARED_ACTOR' | 'SHARED_WRITER' | 'SHARED_COMPOSER' | 'SHARED_CINEMATOGRAPHER' | 'SAME_PRODUCER' | 'SAME_STUDIO' | 'SAME_GENRE' | 'SHARED_SUBJECT' | 'SIMILAR_DNA';
/** fact = a Wikidata statement or the editorial list links the two films; label = they carry the same coarse classification; inferred = an editorial reading or an algorithm. */
export type Tier = 'fact' | 'label' | 'inferred';
export interface RelDef { type: RelType; label: string; category: Category; factual: boolean; tier: Tier; weight: number; source: string; confidence: number }
export const REL_DEFS: Record<RelType, RelDef> = {
  SEQUEL_TO: { type: 'SEQUEL_TO', label: 'Sequel', category: 'franchise', tier: 'fact', factual: true, weight: 100, source: 'Wikidata P155/P156', confidence: 0.98 },
  SAME_TRILOGY: { type: 'SAME_TRILOGY', label: 'Same trilogy', category: 'trilogy', tier: 'fact', factual: true, weight: 100, source: 'Wikidata film trilogy / editorial', confidence: 0.97 },
  SAME_FRANCHISE: { type: 'SAME_FRANCHISE', label: 'Same franchise', category: 'franchise', tier: 'fact', factual: true, weight: 95, source: 'Wikidata P179', confidence: 0.95 },
  REMAKE_OF: { type: 'REMAKE_OF', label: 'Remake or adaptation of a film', category: 'adaptation', tier: 'fact', factual: true, weight: 90, source: 'Wikidata P144/P941', confidence: 0.9 },
  SAME_DIRECTOR: { type: 'SAME_DIRECTOR', label: 'Same director', category: 'director', tier: 'fact', factual: true, weight: 85, source: 'Wikidata P57', confidence: 0.97 },
  SHARED_ACTOR: { type: 'SHARED_ACTOR', label: 'Shared actor', category: 'cast', tier: 'fact', factual: true, weight: 80, source: 'Wikidata P161', confidence: 0.95 },
  SHARED_WRITER: { type: 'SHARED_WRITER', label: 'Same screenwriter', category: 'crew', tier: 'fact', factual: true, weight: 70, source: 'Wikidata P58', confidence: 0.95 },
  BASED_ON_SAME: { type: 'BASED_ON_SAME', label: 'Same source material', category: 'adaptation', tier: 'fact', factual: true, weight: 65, source: 'Wikidata P144', confidence: 0.9 },
  SHARED_COMPOSER: { type: 'SHARED_COMPOSER', label: 'Same composer', category: 'crew', tier: 'fact', factual: true, weight: 60, source: 'Wikidata P86', confidence: 0.95 },
  SHARED_CINEMATOGRAPHER: { type: 'SHARED_CINEMATOGRAPHER', label: 'Same cinematographer', category: 'crew', tier: 'fact', factual: true, weight: 55, source: 'Wikidata P344', confidence: 0.95 },
  SAME_GENRE: { type: 'SAME_GENRE', label: 'Shared genre label', category: 'genre', tier: 'label', factual: false, weight: 50, source: 'Wikidata P136', confidence: 0.8 },
  SAME_PRODUCER: { type: 'SAME_PRODUCER', label: 'Same producer', category: 'crew', tier: 'fact', factual: true, weight: 45, source: 'Wikidata P162', confidence: 0.9 },
  SHARED_SUBJECT: { type: 'SHARED_SUBJECT', label: 'Shared subject', category: 'inferred', tier: 'inferred', factual: false, weight: 40, source: 'Wikidata P921 (editorial reading)', confidence: 0.6 },
  SIMILAR_DNA: { type: 'SIMILAR_DNA', label: 'Movie DNA share in Similar films', category: 'inferred', tier: 'inferred', factual: false, weight: 35, source: 'algorithmic (genre, era, scope)', confidence: 0.5 },
  SAME_STUDIO: { type: 'SAME_STUDIO', label: 'Same production company', category: 'crew', tier: 'fact', factual: true, weight: 30, source: 'Wikidata P272', confidence: 0.9 },
};
export type Weights = Record<RelType, number>;
export const defaultWeights = (): Weights => Object.fromEntries(Object.values(REL_DEFS).map(d => [d.type, d.weight])) as Weights;

export interface Via { kind: 'person' | 'franchise' | 'trilogy' | 'genre' | 'company' | 'subject' | 'setting' | 'source'; id: string; label: string }
export interface Relation { a: string; b: string; type: RelType; strength: number; factual: boolean; tier: Tier; category: Category; why: string; via?: Via; source: string; confidence: number; /** the stored edge runs b → a (b is the sequel / remake) */ rev?: boolean }
export interface PairRelation { a: string; b: string; strength: number; primary: Relation; all: Relation[] }
export interface Options { categories?: Set<Category>; includeGenre?: boolean; includeInferred?: boolean; maxPerPerson?: number }

const name = (cat: Catalog, id: string) => cat.person.get(id)?.n || id;
const nm = (f: Film) => `“${f.t}” (${f.y})`;
// the same person counted in two roles (director and writer) is one connection, not two: keep the strongest relation per shared thing
export const combine = (rels: Relation[], k = 0.15) => { const best = new Map<string, number>(); for (const r of rels) { const key = r.via ? r.via.kind + ':' + r.via.id : r.type; best.set(key, Math.max(best.get(key) || 0, r.strength)); } const s = [...best.values()].sort((x, y) => y - x); return Math.min(100, (s[0] || 0) + k * s.slice(1).reduce((x, y) => x + y, 0)); };

export function relationsOf(cat: Catalog, filmId: string, w: Weights, opt: Options = {}): Relation[] {
  const A = cat.film.get(filmId); if (!A) return [];
  const out: Relation[] = []; const maxPer = opt.maxPerPerson ?? 40;
  const want = (c: Category) => !opt.categories || opt.categories.has(c);
  const mk = (B: Film, type: RelType, why: string, via?: Via, strength?: number, rev?: boolean): void => {
    const d = REL_DEFS[type]; if (!want(d.category)) return;
    out.push({ a: A.id, b: B.id, type, strength: Math.max(0, Math.min(100, strength ?? w[type])), factual: d.factual, tier: d.tier, category: d.category, why, via, source: d.source, confidence: d.confidence, ...(rev ? { rev } : {}) });
  };
  const get = (id: string) => cat.film.get(id);
  // sequels (stored direction: sequel -> original)
  for (const id of A.next) { const B = get(id); if (B) mk(B, 'SEQUEL_TO', `${nm(B)} follows ${nm(A)} (Wikidata “followed by”).`, undefined, undefined, true); }
  for (const id of A.prev) { const B = get(id); if (B) mk(B, 'SEQUEL_TO', `${nm(A)} follows ${nm(B)} (Wikidata “follows”).`); }
  const seq = new Set([...A.next, ...A.prev]);
  // franchises and trilogies
  for (const fid of A.fr) { const fr = cat.franchise.get(fid); if (!fr) continue; for (const id of fr.films) { if (id === A.id || seq.has(id)) continue; const B = get(id); if (!B) continue;
    if (fr.k === 'trilogy') mk(B, 'SAME_TRILOGY', `Both films belong to ${fr.n}${fr.kind ? ` (${fr.kind} trilogy)` : ''}.`, { kind: 'trilogy', id: fr.id, label: fr.n }); else mk(B, 'SAME_FRANCHISE', `Both films belong to ${fr.n}.`, { kind: 'franchise', id: fr.id, label: fr.n }); } }
  for (const tid of A.tr || []) { const tr = cat.franchise.get(tid); if (!tr) continue; for (const id of tr.films) { if (id === A.id) continue; const B = get(id); if (B) mk(B, 'SAME_TRILOGY', `Connected through ${tr.n}${tr.kind ? ` (${tr.kind} trilogy)` : ''}.`, { kind: 'trilogy', id: tr.id, label: tr.n }); } }
  // remakes and shared sources
  for (const s of A.ba) { const src = get(s.s); if (src && src.id !== A.id) mk(src, 'REMAKE_OF', `${nm(A)} is ${s.k} ${nm(src)}.`, { kind: 'source', id: s.s, label: src.t }); }
  for (const B of cat.bySource.get(A.id) || []) if (B.id !== A.id) mk(B, 'REMAKE_OF', `${nm(B)} is based on or inspired by ${nm(A)}.`, { kind: 'source', id: A.id, label: A.t }, undefined, true);
  for (const s of A.ba) for (const B of cat.bySource.get(s.s) || []) if (B.id !== A.id && !(B.id === s.s)) mk(B, 'BASED_ON_SAME', `Both films are ${s.k} ${s.l}.`, { kind: 'source', id: s.s, label: s.l });
  // people
  const people: ['dir' | 'wr' | 'co' | 'dp' | 'pr', 'dir' | 'wr' | 'co' | 'dp' | 'pr', RelType, string][] = [['dir', 'dir', 'SAME_DIRECTOR', 'directed by'], ['wr', 'wr', 'SHARED_WRITER', 'written by'], ['co', 'co', 'SHARED_COMPOSER', 'scored by'], ['dp', 'dp', 'SHARED_CINEMATOGRAPHER', 'shot by'], ['pr', 'pr', 'SAME_PRODUCER', 'produced by']];
  for (const [field, role, type, verb] of people) for (const p of A[field]) { let n = 0; for (const c of cat.credits.get(p) || []) { if (c.role !== role || c.film.id === A.id) continue; if (n++ >= maxPer) break; mk(c.film, type, `Both films were ${verb} ${name(cat, p)}.`, { kind: 'person', id: p, label: name(cat, p) }); } }
  for (const [p, b1] of A.cast) { let n = 0; for (const c of cat.credits.get(p) || []) { if (c.role !== 'cast' || c.film.id === A.id) continue; if (n++ >= maxPer * 2) break;
    const b2 = c.billing; const lead = b1 > 0 && b1 <= 2 && b2 > 0 && b2 <= 2, top = b1 > 0 && b1 <= 5 && b2 > 0 && b2 <= 5, known = b1 > 0 && b2 > 0;
    const strength = w.SHARED_ACTOR * (lead ? 1 : top ? .85 : known ? .7 : .6); const role = lead ? 'a lead in both' : top ? 'billed near the top in both' : known ? 'in the cast of both' : 'in the cast of both (billing order not recorded)';
    mk(c.film, 'SHARED_ACTOR', `${name(cat, p)} is ${role}.`, { kind: 'person', id: p, label: name(cat, p) }, strength); } }
  for (const cm of A.cm) { const list = cat.byCompany.get(cm) || []; if (list.length > 60) continue; for (const B of list) if (B.id !== A.id) mk(B, 'SAME_STUDIO', `Both films were produced by ${cm}.`, { kind: 'company', id: cm, label: cm }); }
  // genre (only on request: it would otherwise connect everything to everything)
  if (opt.includeGenre) { const pg = cat.primaryGenre(A); const pool = (cat.byGenre.get(pg) || []).filter(B => B.id !== A.id && Math.abs(B.y - A.y) <= 12).sort((x, y) => (y.pop || 0) - (x.pop || 0)).slice(0, 60);
    for (const B of pool) { const shared = A.g.filter(g => B.g.includes(g)); mk(B, 'SAME_GENRE', `Both are ${shared.map(g => cat.genreName.get(g)).join(' / ')} films.`, { kind: 'genre', id: pg, label: cat.genreName.get(pg) || pg }, Math.min(100, w.SAME_GENRE * (shared.length >= 2 ? 1.1 : .9))); } }
  if (opt.includeInferred !== false) {
    for (const s of A.subj) { const list = cat.bySubject.get(s) || []; if (list.length > 30) continue; for (const B of list) if (B.id !== A.id) mk(B, 'SHARED_SUBJECT', `Both have “${s}” as a Wikidata main subject (an editorial reading, not a credit).`, { kind: 'subject', id: s, label: s }); }
  }
  return out;
}

export function neighbors(cat: Catalog, filmId: string, w: Weights, opt: Options = {}): PairRelation[] {
  const by = new Map<string, Relation[]>();
  for (const r of relationsOf(cat, filmId, w, opt)) { const a = by.get(r.b); if (a) a.push(r); else by.set(r.b, [r]); }
  const list: PairRelation[] = [];
  for (const [b, rels] of by) { rels.sort((x, y) => y.strength - x.strength); list.push({ a: filmId, b, strength: combine(rels), primary: rels[0], all: rels }); }
  return list.sort((x, y) => y.strength - x.strength || ((cat.film.get(y.b)?.pop || 0) - (cat.film.get(x.b)?.pop || 0)));
}
export function pairRelations(cat: Catalog, a: string, b: string, w: Weights): PairRelation | null {
  return neighbors(cat, a, w, { includeGenre: true }).find(p => p.b === b) || null;
}
