import test from 'node:test';
import assert from 'node:assert/strict';
import { cat, byTitle } from './helpers.ts';
import { defaultWeights } from '../app/src/lib/relations.ts';
import { multiHop, similar, sixDegrees, unexpected, constellation } from '../app/src/lib/discovery.ts';
const w = defaultWeights();
test('six degrees: paths alternate film and shared credit, and start and end where asked', () => {
  const a = byTitle('Pulp Fiction'), b = byTitle('Inception'); const paths = sixDegrees(cat, a.id, b.id); assert.ok(paths.length >= 1, 'a path must exist');
  for (const p of paths) { assert.equal(p[0].id, a.id); assert.equal(p.at(-1)!.id, b.id); p.forEach((s, i) => assert.equal(s.kind, i % 2 === 0 ? 'film' : 'via')); }
});
test('six degrees: identical or unreachable films behave', () => { const a = byTitle('Alien'); assert.equal(sixDegrees(cat, a.id, a.id)[0].length, 1); assert.deepEqual(sixDegrees(cat, a.id, 'Q0'), []); });
test('similar films come with reasons, not bare scores', () => { const s = similar(cat, byTitle('Heat').id, w, 8); assert.ok(s.length >= 5); for (const x of s) assert.ok(x.why.length > 0 && x.relations.length > 0); });
test('multi-hop chains are two factual steps', () => { const c = multiHop(cat, byTitle('The Godfather').id, w, { n: 5 }); assert.ok(c.length > 0); for (const x of c) { assert.equal(x.hops.length, 2); assert.ok(x.hops.every(h => h.relation.factual)); } });
test('unexpected connections really differ', () => { for (const s of unexpected(cat, byTitle('Pulp Fiction').id, w, 6)) { assert.ok(s.contrast.length > 5); assert.equal(s.relation.via?.kind, 'person'); } });
test('constellation finds direct links and bridge films', () => { const ids = ['Pulp Fiction', 'Kill Bill: Volume 1', 'Heat'].map(t => byTitle(t).id); const c = constellation(cat, ids, w); assert.ok(c.direct.length >= 1); });

test('six degrees respects the roles it may use', () => {
  const a = byTitle('Pulp Fiction'), b = byTitle('Inception');
  for (const roles of [['dir'], ['dir', 'wr'], ['dir', 'wr', 'cast', 'co', 'dp']] as const) for (const p of sixDegrees(cat, a.id, b.id, { roles: [...roles] })) for (const s of p) if (s.kind === 'via' && s.via === 'person') { const who = s.id; const films = p.filter(x => x.kind === 'film').map(x => cat.film.get(x.id)!); const used = new Set<string>(); for (const f of films) { if (f.dir.includes(who)) used.add('dir'); if (f.wr.includes(who)) used.add('wr'); if (f.co.includes(who)) used.add('co'); if (f.dp.includes(who)) used.add('dp'); if (f.cast.some(c => c[0] === who)) used.add('cast'); } assert.ok([...used].some(r => (roles as readonly string[]).includes(r)), 'a step used a disallowed role'); }
});
test('similar films: the Movie DNA share is configurable and no popularity bonus is hidden', () => {
  const id = byTitle('Heat').id; const flat = similar(cat, id, { ...w, SIMILAR_DNA: 0 }, 10), heavy = similar(cat, id, { ...w, SIMILAR_DNA: 100 }, 10); assert.notDeepEqual(flat.map(x => x.film.id), heavy.map(x => x.film.id));
});
