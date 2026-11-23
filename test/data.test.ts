import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { data, cat, byTitle } from './helpers.ts';

test('the snapshot meets the first-playable bar from the product brief', () => {
  assert.ok(data.films.length >= 1000, 'at least 1,000 films');
  const connected = data.films.filter(f => f.dir.length && f.cast.length && f.g.length && cat.credits.size > 0);
  assert.ok(connected.length >= 100, 'at least 100 fully connected films (director, cast, genre)');
  assert.ok(data.franchises.filter(f => f.k !== 'trilogy').length >= 10, 'at least 10 franchise groupings');
  assert.ok(data.franchises.filter(f => f.k === 'trilogy').length + data.trilogies.length >= 10, 'at least 10 trilogies');
});
test('no broken references and no duplicate ids', () => {
  const ids = new Set<string>(); for (const f of data.films) { assert.ok(!ids.has(f.id), 'duplicate film ' + f.id); ids.add(f.id); }
  for (const f of data.films) { for (const x of [...f.prev, ...f.next]) assert.ok(cat.film.has(x), `${f.t}: sequel link to missing film ${x}`); for (const p of [...f.dir, ...f.wr, ...f.co, ...f.dp, ...f.pr, ...f.cast.map(c => c[0])]) assert.ok(cat.person.has(p), `${f.t}: missing person ${p}`); for (const fr of [...f.fr, ...(f.tr || [])]) assert.ok(cat.franchise.has(fr), `${f.t}: missing franchise ${fr}`); }
  for (const fr of [...data.franchises, ...data.trilogies]) for (const x of fr.films) assert.ok(cat.film.has(x), `${fr.n}: missing film ${x}`);
});
test('duplicate records are resolved: no two films share a title and year', () => {
  const seen = new Map<string, string>(); for (const f of data.films) { const k = f.t.toLowerCase() + '|' + f.y; assert.ok(!seen.has(k), `duplicate ${f.t} (${f.y}): ${seen.get(k)} and ${f.id}`); seen.set(k, f.id); }
});
test('every title the brief names is present, including non-Hollywood cinema', () => {
  for (const t of ['Mad Max: Fury Road', 'John Wick', 'Die Hard', 'The Raid', 'Blade Runner', 'Arrival', 'Dune', 'Goodfellas', 'Heat', 'Hereditary', 'Get Out', 'Pan\'s Labyrinth', 'Princess Mononoke', 'Parasite', 'Whiplash', 'Oldboy', 'Spirited Away', 'Akira', 'Reservoir Dogs', 'Jackie Brown']) byTitle(t);
  const countries = new Set(data.films.flatMap(f => f.cn)); for (const c of ['Japan', 'South Korea', 'France', 'India', 'Italy', 'Germany', 'China', 'Sweden']) assert.ok([...countries].some(x => x.includes(c)), 'no films from ' + c);
});
test('the brief’s eleven named trilogies are all recognised, with their kind', () => {
  const sets = [...data.franchises.filter(f => f.k === 'trilogy'), ...data.trilogies];
  const want: [RegExp, string][] = [[/lord of the rings/i, 'narrative'], [/dark knight/i, 'narrative'], [/star wars original/i, 'narrative'], [/cornetto/i, 'director-defined'], [/back to the future/i, 'narrative'], [/matrix/i, 'narrative'], [/godfather/i, 'narrative'], [/before/i, 'narrative'], [/three colo/i, 'thematic'], [/dollars/i, 'director-defined'], [/vengeance/i, 'thematic']];
  for (const [rx, kind] of want) { const t = sets.find(s => rx.test(s.n)); assert.ok(t, 'missing trilogy ' + rx); assert.equal(t!.kind, kind, `${t!.n} should be ${kind}`); }
});
test('provenance and rights are stated', () => {
  assert.ok(data.meta.sources.some(s => s.name === 'Wikidata' && /CC0/.test(s.license))); assert.ok(data.meta.sources.some(s => /CC BY-SA/.test(s.license))); assert.match(data.meta.noPosters, /not redistributed/i);
  const raw = readFileSync(new URL('../app/src/lib/poster.ts', import.meta.url), 'utf8'); assert.ok(!/https?:\/\/.*\.(jpg|png)/i.test(raw), 'no remote poster URLs');
});

test('a trilogy has at most three films, and no film is dated in the future', () => {
  for (const t of [...data.franchises.filter(f => f.k === 'trilogy'), ...data.trilogies]) assert.ok(t.films.length <= 3, `${t.n} has ${t.films.length} films`);
  const year = new Date().getFullYear(); for (const f of data.films) assert.ok(f.y <= year, `${f.t} (${f.y}) is not released yet`);
});
test('Wikipedia excerpts are whole sentences with no pronunciation guides', () => {
  for (const f of data.films) if (f.ex) { assert.ok(!/[ˈˌə]/.test(f.ex), `${f.t}: pronunciation guide left in`); assert.match(f.ex, /[.!?…”")]$/, `${f.t}: excerpt does not end on a sentence`); }
  for (const p of data.people) if (p.ex) assert.ok(!/[ˈˌə]/.test(p.ex), `${p.n}: pronunciation guide left in`);
});
