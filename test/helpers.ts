import { readFileSync } from 'node:fs';
import { buildCatalog } from '../app/src/lib/catalog';
import type { Dataset } from '../app/src/lib/types';
export const data: Dataset = JSON.parse(readFileSync(new URL('../app/public/data/cineverse.json', import.meta.url), 'utf8'));
export const cat = buildCatalog(data);
export const byTitle = (t: string, y?: number) => data.films.find(f => f.t === t && (!y || f.y === y)) ?? (() => { throw new Error('film not in snapshot: ' + t); })();
