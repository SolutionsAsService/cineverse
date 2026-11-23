// Discovery: every result carries the path that produced it. Nothing is an opaque score.
import type { Catalog } from './catalog';
import type { Film } from './types';
import { neighbors, relationsOf, type Relation, type Weights, combine } from './relations';

// ---- Movie DNA: a small, explainable profile. Algorithmic, so it is labelled as inferred wherever it is used.
export interface Dna { genres: Record<string, number>; era: number; scope: string; length: 'short' | 'standard' | 'long' | 'epic' | 'unknown'; crew: number; seriesPart: boolean; themes: string[] }
export function dna(cat: Catalog, f: Film): Dna {
  const genres: Record<string, number> = {}; const gs = f.g.length ? f.g : ['drama']; gs.forEach((g, i) => { genres[g] = 1 / (1 + i * .35); });
  const rt = f.rt; return { genres, era: Math.floor(f.y / 10) * 10, scope: f.cn[0] || 'unknown', length: !rt ? 'unknown' : rt < 90 ? 'short' : rt < 125 ? 'standard' : rt < 160 ? 'long' : 'epic', crew: f.dir.length + f.wr.length + f.co.length + f.dp.length, seriesPart: f.fr.length > 0, themes: f.subj.slice(0, 4) };
}
export function dnaSimilarity(a: Dna, b: Dna): number {
  const keys = new Set([...Object.keys(a.genres), ...Object.keys(b.genres)]); let dot = 0, na = 0, nb = 0;
  for (const k of keys) { const x = a.genres[k] || 0, y = b.genres[k] || 0; dot += x * y; na += x * x; nb += y * y; }
  const genre = na && nb ? dot / Math.sqrt(na * nb) : 0; const era = Math.max(0, 1 - Math.abs(a.era - b.era) / 60); const scope = a.scope === b.scope ? 1 : 0; const theme = a.themes.some(t => b.themes.includes(t)) ? 1 : 0;
  return .55 * genre + .2 * era + .15 * scope + .1 * theme;
}

// ---- Similar films: weighted graph similarity (relations) plus DNA, with the reason attached
export interface Suggestion { film: Film; score: number; why: string[]; relations: Relation[]; factual: boolean }
export function similar(cat: Catalog, id: string, w: Weights, n = 12): Suggestion[] {
  const A = cat.film.get(id); if (!A) return [];
  const out = neighbors(cat, id, w, { includeGenre: true }).map(p => { const B = cat.film.get(p.b)!; const d = dnaSimilarity(dna(cat, A), dna(cat, B)); return { film: B, score: Math.min(100, p.strength * .85 + d * 15 + Math.min(8, (B.pop || 0) / 20)), why: p.all.slice(0, 3).map(r => r.why), relations: p.all, factual: p.all.some(r => r.factual) } as Suggestion; });
  return out.sort((a, b) => b.score - a.score).slice(0, n);
}

// ---- Multi-hop: A -> (shared person / franchise) -> B -> (shared person) -> C
export interface Hop { from: Film; to: Film; relation: Relation }
export interface Chain { hops: Hop[]; score: number; end: Film }
export function multiHop(cat: Catalog, id: string, w: Weights, opt: { width?: number; n?: number } = {}): Chain[] {
  const A = cat.film.get(id); if (!A) return []; const width = opt.width ?? 6;
  const first = neighbors(cat, id, w, { includeInferred: false }).filter(p => p.primary.factual).slice(0, width); const seen = new Set([id, ...first.map(p => p.b)]); const out: Chain[] = [];
  for (const p of first) { const B = cat.film.get(p.b)!; for (const q of neighbors(cat, B.id, w, { includeInferred: false }).filter(x => x.primary.factual).slice(0, width)) { if (seen.has(q.b)) continue; const C = cat.film.get(q.b)!;
    out.push({ hops: [{ from: A, to: B, relation: p.primary }, { from: B, to: C, relation: q.primary }], score: (p.strength / 100) * (q.strength / 100) * 100, end: C }); } }
  const best = new Map<string, Chain>(); for (const c of out.sort((a, b) => b.score - a.score)) if (!best.has(c.end.id)) best.set(c.end.id, c);
  return [...best.values()].slice(0, opt.n ?? 10);
}

// ---- Unexpected connections: share a person but no genre, or sit far apart in time
export interface Surprise { film: Film; relation: Relation; contrast: string }
export function unexpected(cat: Catalog, id: string, w: Weights, n = 8): Surprise[] {
  const A = cat.film.get(id); if (!A) return []; const out: Surprise[] = []; const seen = new Set<string>();
  for (const r of relationsOf(cat, id, w, { includeInferred: false })) {
    if (!r.via || r.via.kind !== 'person' || !r.factual || seen.has(r.b)) continue; const B = cat.film.get(r.b)!;
    const sharedGenre = A.g.some(g => B.g.includes(g)); const gap = Math.abs(A.y - B.y);
    if (!sharedGenre) { seen.add(B.id); out.push({ film: B, relation: r, contrast: `${A.g.map(g => cat.genreName.get(g)).join('/') || 'Drama'} against ${B.g.map(g => cat.genreName.get(g)).join('/') || 'Drama'}: no genre in common.` }); }
    else if (gap >= 35) { seen.add(B.id); out.push({ film: B, relation: r, contrast: `${gap} years apart (${A.y} and ${B.y}).` }); }
  }
  return out.sort((a, b) => b.relation.strength - a.relation.strength).slice(0, n);
}

// ---- Six degrees of cinema: shortest paths over film - person / franchise / trilogy links
export interface Step { kind: 'film' | 'via'; id: string; label: string; sub?: string; via?: 'person' | 'franchise' | 'trilogy'; role?: string }
export function sixDegrees(cat: Catalog, from: string, to: string, opt: { max?: number; maxLen?: number; roles?: boolean } = {}): Step[][] {
  if (!cat.film.has(from) || !cat.film.has(to)) return []; if (from === to) return [[{ kind: 'film', id: from, label: cat.film.get(from)!.t }]];
  const maxPaths = opt.max ?? 5, maxLen = opt.maxLen ?? 12;
  // nodes: 'f:<id>' films, 'p:<id>' people, 'r:<id>' franchises/trilogies. Film adjacency is built lazily from the catalog indexes.
  const adj = (n: string): string[] => {
    if (n[0] === 'f') { const f = cat.film.get(n.slice(2))!; return [...f.dir, ...f.wr, ...f.co, ...f.dp, ...f.cast.filter(c => c[1] === 0 || c[1] <= 8).map(c => c[0])].map(p => 'p:' + p).concat([...f.fr, ...(f.tr || [])].map(r => 'r:' + r)); }
    if (n[0] === 'p') return (cat.credits.get(n.slice(2)) || []).filter(c => c.role !== 'pr' && (c.role !== 'cast' || c.billing === 0 || c.billing <= 8)).map(c => 'f:' + c.film.id);
    return (cat.franchise.get(n.slice(2))?.films || []).map(x => 'f:' + x);
  };
  const start = 'f:' + from, goal = 'f:' + to; const dist = new Map([[start, 0]]); const parents = new Map<string, string[]>(); let frontier = [start];
  while (frontier.length && !dist.has(goal) && (dist.get(frontier[0]) ?? 0) < maxLen) { const next: string[] = [];
    for (const n of frontier) for (const m of adj(n)) { if (!dist.has(m)) { dist.set(m, dist.get(n)! + 1); parents.set(m, [n]); next.push(m); } else if (dist.get(m) === dist.get(n)! + 1) parents.get(m)!.push(n); }
    frontier = next; }
  if (!dist.has(goal)) return [];
  const paths: string[][] = []; const walk = (n: string, acc: string[]) => { if (paths.length >= maxPaths * 4) return; if (n === start) { paths.push([n, ...acc].reverse().reverse()); return; } for (const p of parents.get(n) || []) walk(p, [n, ...acc]); };
  walk(goal, []);
  const stepsOf = (path: string[]): Step[] => path.map((n, i) => {
    if (n[0] === 'f') { const f = cat.film.get(n.slice(2))!; return { kind: 'film', id: f.id, label: f.t, sub: String(f.y) } as Step; }
    const prev = cat.film.get(path[i - 1].slice(2))!, nextF = cat.film.get(path[i + 1].slice(2))!;
    if (n[0] === 'p') { const id = n.slice(2); const role = (f: Film) => (f.dir.includes(id) ? 'directed' : f.wr.includes(id) ? 'wrote' : f.co.includes(id) ? 'scored' : f.dp.includes(id) ? 'shot' : 'acted in'); return { kind: 'via', id, via: 'person', label: cat.person.get(id)?.n || id, sub: `${role(prev)} “${prev.t}” and ${role(nextF)} “${nextF.t}”` } as Step; }
    const fr = cat.franchise.get(n.slice(2)); return { kind: 'via', id: n.slice(2), via: fr?.k === 'trilogy' ? 'trilogy' : 'franchise', label: fr?.n || n, sub: 'both films belong to it' } as Step;
  });
  const uniq = new Map<string, Step[]>(); for (const p of paths) { const k = p.join('>'); if (!uniq.has(k)) uniq.set(k, stepsOf(p)); }
  return [...uniq.values()].slice(0, maxPaths);
}

// ---- Fingerprints (people)
export function fingerprint(cat: Catalog, personId: string) {
  const credits = cat.credits.get(personId) || []; const films = [...new Map(credits.map(c => [c.film.id, c.film])).values()].sort((a, b) => a.y - b.y);
  const count = <T,>(items: T[]) => { const m = new Map<T, number>(); for (const i of items) m.set(i, (m.get(i) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const genres = count(films.flatMap(f => (f.g.length ? f.g : ['drama']))).map(([g, n]) => ({ id: g, label: cat.genreName.get(g) || g, n }));
  const decades = count(films.map(f => Math.floor(f.y / 10) * 10)).sort((a, b) => a[0] - b[0]).map(([d, n]) => ({ decade: d, n }));
  const collab = (field: 'dir' | 'cast' | 'co' | 'dp' | 'wr') => count(films.flatMap(f => (field === 'cast' ? f.cast.map(c => c[0]) : f[field]).filter(x => x !== personId))).filter(x => x[1] >= 2).slice(0, 8).map(([id, n]) => ({ id, name: cat.person.get(id)?.n || id, n }));
  return { films, genres, decades, countries: count(films.flatMap(f => f.cn)).slice(0, 5), costars: collab('cast'), directors: collab('dir'), composers: collab('co'), cinematographers: collab('dp'), writers: collab('wr'), roles: count(credits.map(c => c.role)) };
}
export { combine };

// ---- Movie constellations: select films, find what joins them (direct links, and bridge films that connect several of them)
export interface Bridge { film: Film; joins: { film: Film; relation: Relation }[] }
export function constellation(cat: Catalog, ids: string[], w: Weights) {
  const set = new Set(ids); const direct: { a: Film; b: Film; relation: Relation; strength: number }[] = []; const bridge = new Map<string, Bridge>();
  for (const id of ids) { const A = cat.film.get(id); if (!A) continue; for (const p of neighbors(cat, id, w, { includeInferred: false })) { const B = cat.film.get(p.b); if (!B) continue;
    if (set.has(p.b)) { if (id < p.b) direct.push({ a: A, b: B, relation: p.primary, strength: p.strength }); }
    else if (p.primary.factual && p.strength >= 55) { const e = bridge.get(p.b) || { film: B, joins: [] }; e.joins.push({ film: A, relation: p.primary }); bridge.set(p.b, e); } } }
  return { direct: direct.sort((x, y) => y.strength - x.strength), bridges: [...bridge.values()].filter(b => b.joins.length >= 2).sort((a, b) => b.joins.length - a.joins.length || (b.film.pop || 0) - (a.film.pop || 0)).slice(0, 12) };
}
