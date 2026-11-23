import test from 'node:test';
import assert from 'node:assert/strict';
import { cat, byTitle } from './helpers.ts';
import { defaultWeights } from '../app/src/lib/relations.ts';
import { expandFilm, expandPerson, filmId, newGraph } from '../app/src/lib/graph.ts';
const w = defaultWeights();

test('progressive expansion adds the strongest connections first and respects the branch limit', () => {
  const g = newGraph(); const f = byTitle('Pulp Fiction'); const d = expandFilm(cat, g, f.id, w, { limit: 10, nodeLimit: 90 });
  const films = [...g.nodes.values()].filter(n => n.kind === 'film'); assert.ok(films.length >= 6 && films.length <= 11, `got ${films.length}`);
  for (const e of g.edges.values()) { assert.ok(g.nodes.has(e.source) && g.nodes.has(e.target), 'edge endpoints exist: ' + e.id); assert.ok(e.why.length > 10, 'every edge carries an explanation'); }
  assert.ok(d.nodes.some(n => n.kind === 'cluster'), 'the remainder folds into a +N more node');
});
test('node limit is a hard cap', () => {
  const g = newGraph(); expandFilm(cat, g, byTitle('The Dark Knight').id, w, { limit: 30, nodeLimit: 8 }); assert.ok([...g.nodes.values()].filter(n => n.kind !== 'cluster').length <= 8);
});
test('expanding a second film links to films already on the map', () => {
  const g = newGraph(); expandFilm(cat, g, byTitle('Pulp Fiction').id, w, { limit: 12, nodeLimit: 120 }); const before = g.edges.size; expandFilm(cat, g, byTitle('Reservoir Dogs').id, w, { limit: 12, nodeLimit: 120 }); assert.ok(g.edges.size > before);
  assert.ok(g.nodes.has(filmId(byTitle('Reservoir Dogs').id)));
});
test('category filters restrict what is added', () => {
  const g = newGraph(); expandFilm(cat, g, byTitle('Pulp Fiction').id, w, { limit: 12, nodeLimit: 120, categories: new Set(['director']) }); for (const e of g.edges.values()) if (e.type !== 'MORE') assert.equal(e.category, 'director');
});
test('a person node expands to their films', () => {
  const g = newGraph(); const dir = byTitle('Pulp Fiction').dir[0]; expandPerson(cat, g, dir, { limit: 8, nodeLimit: 60 }); assert.ok([...g.nodes.values()].some(n => n.kind === 'person')); assert.ok([...g.nodes.values()].filter(n => n.kind === 'film').length >= 4);
});
