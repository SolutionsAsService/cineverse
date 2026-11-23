// Shapes of app/public/data/cineverse.json (built by scripts/build-dataset.mjs from Wikidata and Wikipedia).
export interface Film {
  id: string; t: string; ot?: string; y: number; rt?: number; de: string; ex?: string; w?: string; pop?: number;
  g: string[]; sg: string[];                     // coarse genre ids, free-text sub-genres
  dir: string[]; wr: string[]; co: string[]; dp: string[]; pr: string[];   // people ids by role
  cm: string[];                                  // production company names
  cast: [string, number][];                      // [person id, billing 1..12, or 0 when Wikidata gives no order]
  fr: string[]; tr?: string[];                   // franchise ids (Wikidata), editorial trilogy ids
  prev: string[]; next: string[];                // follows / followed by (Wikidata P155/P156)
  ba: { s: string; l: string; k: string }[];     // based on / inspired by: source id, label, kind
  subj: string[]; set: string[]; cn: string[]; lg: string[]; aw: string[];
}
export interface Person { id: string; n: string; de?: string; b?: number; d?: number; sx?: string; w?: string; ex?: string }
export interface Genre { id: string; n: string }
export interface Franchise { id: string; n: string; k: 'series' | 'universe' | 'trilogy'; ty: string[]; films: string[]; src: string; kind?: string; note?: string; partial?: boolean }
export interface DataMeta { generated: string; films: number; people: number; franchises: number; trilogies: number; sources: { name: string; license: string; url: string; use: string }[]; selection: string; noPosters: string }
export interface Dataset { meta: DataMeta; genres: Genre[]; films: Film[]; people: Person[]; franchises: Franchise[]; trilogies: Franchise[] }

export type Role = 'dir' | 'wr' | 'co' | 'dp' | 'pr' | 'cast';
export const ROLE_LABEL: Record<Role, string> = { dir: 'Director', wr: 'Screenwriter', co: 'Composer', dp: 'Cinematographer', pr: 'Producer', cast: 'Cast' };

export type Category = 'franchise' | 'trilogy' | 'director' | 'cast' | 'crew' | 'genre' | 'adaptation' | 'inferred';
export const CATEGORY_LABEL: Record<Category, string> = { franchise: 'Franchise and sequels', trilogy: 'Trilogy', director: 'Director', cast: 'Cast', crew: 'Crew', genre: 'Genre', adaptation: 'Source and remakes', inferred: 'Inferred similarity' };
export const CATEGORY_COLOR: Record<Category, string> = { franchise: '#ff4813', trilogy: '#f216ff', director: '#01d3ff', cast: '#00c581', crew: '#f55d97', genre: '#7282fc', adaptation: '#b3e900', inferred: '#9a96a3' };
