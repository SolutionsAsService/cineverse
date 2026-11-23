import type { Dataset, Film, Person, Franchise, Role } from './types';

export interface Credit { film: Film; role: Role; billing: number }
export interface Catalog {
  data: Dataset;
  film: Map<string, Film>; person: Map<string, Person>; franchise: Map<string, Franchise>; genreName: Map<string, string>;
  credits: Map<string, Credit[]>;                 // person id -> credits
  byGenre: Map<string, Film[]>; byCompany: Map<string, Film[]>; bySource: Map<string, Film[]>; bySubject: Map<string, Film[]>;
  filmsOfFranchise: (id: string) => Film[];
  trilogySets: Franchise[]; seriesSets: Franchise[];
  primaryGenre: (f: Film) => string;
  yearRange: [number, number];
}

export function buildCatalog(data: Dataset): Catalog {
  const film = new Map(data.films.map(f => [f.id, f])), person = new Map(data.people.map(p => [p.id, p]));
  const franchise = new Map<string, Franchise>([...data.franchises, ...data.trilogies].map(f => [f.id, f]));
  const credits = new Map<string, Credit[]>(), byGenre = new Map<string, Film[]>(), byCompany = new Map<string, Film[]>(), bySource = new Map<string, Film[]>(), bySubject = new Map<string, Film[]>();
  const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };
  for (const f of data.films) {
    for (const role of ['dir', 'wr', 'co', 'dp', 'pr'] as const) for (const p of f[role]) push(credits, p, { film: f, role, billing: 0 });
    for (const [p, b] of f.cast) push(credits, p, { film: f, role: 'cast', billing: b });
    for (const g of f.g) push(byGenre, g, f);
    for (const c of f.cm) push(byCompany, c, f);
    for (const s of f.ba) push(bySource, s.s, f);
    for (const s of f.subj) push(bySubject, s, f);
  }
  const years = data.films.map(f => f.y);
  const order = data.genres.map(g => g.id);
  return {
    data, film, person, franchise, genreName: new Map(data.genres.map(g => [g.id, g.n])), credits, byGenre, byCompany, bySource, bySubject,
    filmsOfFranchise: id => (franchise.get(id)?.films || []).map(x => film.get(x)).filter((x): x is Film => !!x),
    trilogySets: [...data.franchises.filter(f => f.k === 'trilogy'), ...data.trilogies], seriesSets: data.franchises.filter(f => f.k !== 'trilogy'),
    primaryGenre: f => [...f.g].sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] || 'drama',
    yearRange: [Math.min(...years), Math.max(...years)],
  };
}
let cached: Promise<Catalog> | null = null;
export function loadCatalog(): Promise<Catalog> {
  cached ??= fetch(new URL('data/cineverse.json', document.baseURI)).then(r => { if (!r.ok) throw new Error(`Catalog returned HTTP ${r.status}`); return r.json() as Promise<Dataset>; }).then(buildCatalog);
  return cached;
}
