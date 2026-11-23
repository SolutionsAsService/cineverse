// Second fetch stage: franchise/series metadata, people facts and Wikipedia lead paragraphs (CC BY-SA 4.0, attributed). Needs data/raw from fetch-wikidata.mjs.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { sparql, qid, UA } from './sparql.mjs';
const RAW = new URL('../data/raw/', import.meta.url).pathname;
const read = async n => JSON.parse(await readFile(RAW + n + '.json', 'utf8'));
const save = (n, v) => writeFile(RAW + n + '.json', JSON.stringify(v));
const have = n => existsSync(RAW + n + '.json');
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const lab = (v, a, b) => `OPTIONAL { ${v} rdfs:label ${a}. FILTER(LANG(${a})="en") } OPTIONAL { ${v} rdfs:label ${b}. FILTER(LANG(${b})="mul") }`;

// 1. series metadata
if (!have('seriesMeta')) {
  const ids = [...new Set((await read('series')).map(r => qid(r.x.value)))];
  const out = [];
  for (const c of chunk(ids, 150)) {
    const v = c.map(x => 'wd:' + x).join(' ');
    out.push(...(await sparql(`SELECT ?s ?t ?tl ?sl ?parts WHERE { VALUES ?s { ${v} } OPTIONAL { ?s wdt:P31 ?t. ${lab('?t', '?tl1', '?tl2')} BIND(COALESCE(?tl1,?tl2) AS ?tl) } ${lab('?s', '?sl1', '?sl2')} BIND(COALESCE(?sl1,?sl2) AS ?sl) OPTIONAL { ?s wdt:P1545 ?parts } }`)));
  }
  await save('seriesMeta', out); console.log('seriesMeta', out.length);
}
// 2. people
if (!have('people')) {
  const ids = new Set();
  for (const n of ['director', 'writer', 'composer', 'dop']) for (const r of await read(n)) ids.add(qid(r.x.value));
  const cast = await read('cast');
  const byFilm = new Map(); for (const r of cast) { const f = qid(r.f.value); if (!byFilm.has(f)) byFilm.set(f, []); byFilm.get(f).push(r); }
  for (const rows of byFilm.values()) { rows.sort((a, b) => (Number(a.ord?.value) || 999) - (Number(b.ord?.value) || 999)); for (const r of rows.slice(0, 12)) ids.add(qid(r.x.value)); }
  const list = [...ids].filter(x => x.startsWith('Q')); const out = [];
  for (const [i, c] of chunk(list, 150).entries()) {
    const v = c.map(x => 'wd:' + x).join(' ');
    out.push(...(await sparql(`SELECT ?p ?desc ?born ?died ?gl ?wiki WHERE { VALUES ?p { ${v} } OPTIONAL { ?p schema:description ?desc. FILTER(LANG(?desc)="en") } OPTIONAL { ?p wdt:P569 ?born } OPTIONAL { ?p wdt:P570 ?died } OPTIONAL { ?p wdt:P21 ?g. ${lab('?g', '?gl1', '?gl2')} BIND(COALESCE(?gl1,?gl2) AS ?gl) } OPTIONAL { ?a schema:about ?p; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?wiki } }`)));
    process.stdout.write(`\rpeople ${i + 1}/${Math.ceil(list.length / 150)}`);
  }
  console.log(); await save('people', out);
}
// 3. Wikipedia lead paragraphs (CC BY-SA 4.0): films first, then people who are directors or appear in at least two films' billing
if (!have('extracts')) {
  const titles = new Set((await read('base')).map(r => r.wiki?.value).filter(Boolean));
  const dirIds = new Set((await read('director')).map(r => qid(r.x.value)));
  for (const r of await read('people')) if (dirIds.has(qid(r.p.value)) && r.wiki) titles.add(r.wiki.value);
  const list = [...titles]; const out = {};
  for (const [i, c] of chunk(list, 20).entries()) {
    const url = 'https://en.wikipedia.org/w/api.php?' + new URLSearchParams({ action: 'query', prop: 'extracts', exintro: '1', explaintext: '1', exlimit: '20', redirects: '1', format: 'json', titles: c.join('|') });
    for (let k = 0; k < 4; k += 1) {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) { await new Promise(r => setTimeout(r, 4000 * (k + 1))); continue; }
      const j = await res.json(); const norm = new Map((j.query?.normalized || []).map(n => [n.to, n.from])); const redir = new Map((j.query?.redirects || []).map(n => [n.to, n.from]));
      for (const p of Object.values(j.query?.pages || {})) if (p.extract) { const orig = redir.get(p.title) || p.title; out[norm.get(orig) || orig] = p.extract; out[p.title] = p.extract; }
      break;
    }
    process.stdout.write(`\rextracts ${i + 1}/${Math.ceil(list.length / 20)}`); await new Promise(r => setTimeout(r, 300));
  }
  console.log(); await save('extracts', out);
}
console.log('extras done');
