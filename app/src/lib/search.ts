// Global search: prefix + token match, popularity ranking, typo tolerance (Damerau-Levenshtein <= 1 or 2 on tokens), recents.
import type { Catalog } from './catalog';

export type Kind = 'film' | 'person' | 'genre' | 'franchise';
export interface Hit { kind: Kind; id: string; title: string; sub: string; score: number }
interface Entry { kind: Kind; id: string; title: string; sub: string; keys: string[]; tokens: string[]; pop: number }
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
function dl(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1; const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j += 1) d[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) for (let j = 1; j <= b.length; j += 1) { const c = a[i - 1] === b[j - 1] ? 0 : 1; d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }
  return d[a.length][b.length];
}
export interface Index { search(q: string, kinds?: Kind[], limit?: number): Hit[]; size: number }
export function buildIndex(cat: Catalog): Index {
  const entries: Entry[] = []; const peopleFilmCount = new Map<string, number>(); for (const [p, c] of cat.credits) peopleFilmCount.set(p, c.length);
  for (const f of cat.data.films) { const keys = [norm(f.t), ...(f.ot ? [norm(f.ot)] : []), String(f.y)]; entries.push({ kind: 'film', id: f.id, title: f.t, sub: `${f.y}${f.dir[0] ? ' · ' + (cat.person.get(f.dir[0])?.n || '') : ''}`, keys, tokens: [...new Set(keys.flatMap(k => k.split(' ')))], pop: f.pop || 40 }); }
  for (const p of cat.data.people) { const n = peopleFilmCount.get(p.id) || 0; if (!n) continue; const key = norm(p.n); entries.push({ kind: 'person', id: p.id, title: p.n, sub: p.de || 'Film credit', keys: [key], tokens: key.split(' '), pop: 30 + n * 4 }); }
  for (const g of cat.data.genres) entries.push({ kind: 'genre', id: g.id, title: g.n, sub: `Genre · ${(cat.byGenre.get(g.id) || []).length} films`, keys: [norm(g.n)], tokens: norm(g.n).split(' '), pop: 90 });
  for (const f of [...cat.data.franchises, ...cat.data.trilogies]) entries.push({ kind: 'franchise', id: f.id, title: f.n, sub: `${f.k === 'trilogy' ? 'Trilogy' : 'Franchise'} · ${f.films.length} films`, keys: [norm(f.n)], tokens: norm(f.n).split(' '), pop: 70 + f.films.length });
  return { size: entries.length, search(q, kinds, limit = 12) {
    const nq = norm(q); if (!nq) return []; const qt = nq.split(' '); const hits: Hit[] = [];
    for (const e of entries) { if (kinds && !kinds.includes(e.kind)) continue; let s = 0;
      for (const k of e.keys) { if (k === nq) s = Math.max(s, 100); else if (k.startsWith(nq)) s = Math.max(s, 85); else if (k.includes(' ' + nq)) s = Math.max(s, 70); else if (k.includes(nq)) s = Math.max(s, 55); }
      if (!s && qt.every(t => e.tokens.some(x => x.startsWith(t)))) s = 60;
      if (!s && nq.length >= 4) { const tol = nq.length >= 7 ? 2 : 1; const ok = qt.every(t => e.tokens.some(x => dl(t, x.slice(0, Math.max(t.length, 1) + 1), tol) <= tol || dl(t, x, tol) <= tol)); if (ok) s = 35; }
      if (s) hits.push({ kind: e.kind, id: e.id, title: e.title, sub: e.sub, score: s + Math.min(14, e.pop / 9) }); }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit); } };
}
