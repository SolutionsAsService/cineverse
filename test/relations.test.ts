import test from 'node:test';
import assert from 'node:assert/strict';
import { cat, byTitle } from './helpers.ts';
import { defaultWeights, neighbors, pairRelations, relationsOf, REL_DEFS } from '../app/src/lib/relations.ts';

const w = defaultWeights();
test('same director is found, factual, and explained in words', () => {
  const pf = byTitle('Pulp Fiction'), rd = byTitle('Reservoir Dogs');
  const p = pairRelations(cat, pf.id, rd.id, w)!; assert.ok(p, 'Pulp Fiction and Reservoir Dogs must be connected');
  const r = p.all.find(x => x.type === 'SAME_DIRECTOR')!; assert.ok(r); assert.equal(r.factual, true); assert.match(r.why, /Both films were directed by Quentin Tarantino/); assert.equal(r.via?.kind, 'person');
});
test('sequels follow Wikidata links, stored from sequel to original', () => {
  const a = byTitle('The Godfather'), b = byTitle('The Godfather Part II');
  const rel = relationsOf(cat, a.id, w).find(r => r.b === b.id && r.type === 'SEQUEL_TO')!; assert.ok(rel); assert.equal(rel.rev, true); assert.equal(rel.strength, 100);
});
test('trilogy membership connects the three Cornetto films', () => {
  const ids = ['Shaun of the Dead', 'Hot Fuzz', "The World's End"].map(t => byTitle(t).id);
  for (const id of ids) { const n = neighbors(cat, id, w).map(p => p.b); for (const other of ids.filter(x => x !== id)) assert.ok(n.includes(other), 'cornetto films must be mutual neighbours'); }
});
test('weights are configurable and re-order the result', () => {
  const id = byTitle('Pulp Fiction').id; const base = neighbors(cat, id, w); const heavy = neighbors(cat, id, { ...w, SHARED_ACTOR: 100, SAME_DIRECTOR: 5 });
  assert.notDeepEqual(base.slice(0, 8).map(p => p.b), heavy.slice(0, 8).map(p => p.b));
  const zero = neighbors(cat, id, { ...w, SAME_DIRECTOR: 0 }).find(p => p.primary.type === 'SAME_DIRECTOR'); assert.ok(!zero || zero.strength === 0);
});
test('factual and inferred relationships are kept apart', () => {
  assert.equal(REL_DEFS.SAME_DIRECTOR.factual, true); assert.equal(REL_DEFS.SIMILAR_DNA.factual, false); assert.equal(REL_DEFS.SHARED_SUBJECT.factual, false);
  const id = byTitle('Blade Runner').id; for (const r of relationsOf(cat, id, w)) assert.equal(r.factual, REL_DEFS[r.type].factual);
});
test('results are deterministic: no randomness anywhere in the engine', () => {
  const id = byTitle('Inception').id; assert.deepEqual(neighbors(cat, id, w).slice(0, 20).map(p => [p.b, p.strength]), neighbors(cat, id, w).slice(0, 20).map(p => [p.b, p.strength]));
});
test('every relation is backed by facts that can be re-checked', () => {
  for (const t of ['Pulp Fiction', 'Alien', 'The Dark Knight', 'Parasite']) { const a = byTitle(t); for (const r of relationsOf(cat, a.id, w).filter(x => x.factual && x.via?.kind === 'person')) { const b = cat.film.get(r.b)!; const p = r.via!.id; const has = (f: typeof a) => [...f.dir, ...f.wr, ...f.co, ...f.dp, ...f.pr, ...f.cast.map(c => c[0])].includes(p); assert.ok(has(a) && has(b), `${a.t} ~ ${b.t} via ${r.via!.label} is not in both credit lists`); } }
});
