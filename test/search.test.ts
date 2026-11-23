import test from 'node:test';
import assert from 'node:assert/strict';
import { cat } from './helpers.ts';
import { buildIndex } from '../app/src/lib/search.ts';
const idx = buildIndex(cat);
test('autocomplete: prefixes, titles, people, genres, franchises', () => {
  assert.equal(idx.search('pulp fic')[0].title, 'Pulp Fiction'); assert.ok(idx.search('tarantino', ['person']).some(h => h.title === 'Quentin Tarantino'));
  assert.ok(idx.search('sci', ['genre']).some(h => h.title === 'Science Fiction')); assert.ok(idx.search('star wars', ['franchise']).length > 0);
});
test('typo tolerance', () => { assert.ok(idx.search('inceptoin').some(h => h.title === 'Inception')); assert.ok(idx.search('blde runner').some(h => /Blade Runner/.test(h.title))); });
test('alternative (original) titles and years are searchable', () => { assert.ok(idx.search('parasite')[0].title === 'Parasite'); assert.ok(idx.search('1994').some(h => h.kind === 'film')); });
test('empty and nonsense queries return nothing', () => { assert.equal(idx.search('').length, 0); assert.equal(idx.search('zzzzqqqq').length, 0); });
