// Fetches the CINEVERSE source facts from Wikidata (CC0) into data/raw/*.json. Re-runnable; raw files are git-ignored, the normalised snapshot is committed.
// Selection rule (documented in docs/DATA.md): instance of film (Q11424) with at least MIN_LINKS sitelinks, a proxy for being widely documented across Wikipedias.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { sparql, qid } from './sparql.mjs';
const MIN_LINKS = Number(process.env.MIN_LINKS || 45);
const RAW = new URL('../data/raw/', import.meta.url).pathname;
await mkdir(RAW, { recursive: true });
const save = (name, rows) => writeFile(RAW + name + '.json', JSON.stringify(rows));
const load = async name => (existsSync(RAW + name + '.json') ? JSON.parse(await readFile(RAW + name + '.json', 'utf8')) : null);
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const val = (b, k) => b[k]?.value;
// Since 2025 many Wikidata labels live under language "mul" instead of "en": read both, English first.
const LABEL = 'OPTIONAL { ?x rdfs:label ?xl1. FILTER(LANG(?xl1)="en") } OPTIONAL { ?x rdfs:label ?xl2. FILTER(LANG(?xl2)="mul") } BIND(COALESCE(?xl1,?xl2) AS ?xLabel) FILTER(BOUND(?xLabel))';

// 1. the film list
let films = await load('films');
if (!films) {
  const rows = await sparql(`SELECT ?f (MAX(?n) AS ?links) WHERE { ?f wdt:P31/wdt:P279* wd:Q11424; wikibase:sitelinks ?n. FILTER(?n >= ${MIN_LINKS}) } GROUP BY ?f`);
  films = rows.map(r => ({ id: qid(val(r, 'f')), links: Number(val(r, 'links')) }));
  await save('films', films); console.log('films', films.length);
}
// extra titles the master prompt names that the sitelink rule may miss, matched by exact English label and film type
const MUST = (await readFile(new URL('./must-include.txt', import.meta.url), 'utf8').catch(() => '')).split('\n').map(s => s.trim()).filter(Boolean);
let extra = await load('extra');
if (!extra) {
  extra = [];
  for (const group of chunk(MUST, 20)) {
    // stage 1: candidates by exact label (en, then mul); stage 2: keep the film-typed candidate with the most sitelinks per title
    const cand = new Map();
    for (const lang of ['en', 'mul']) {
      const vals = group.map(t => `"${t.replace(/"/g, '\\"')}"@${lang}`).join(' ');
      for (const r of await sparql(`SELECT ?f ?t WHERE { VALUES ?t { ${vals} } ?f rdfs:label ?t. }`)) cand.set(qid(val(r, 'f')), val(r, 't'));
    }
    if (!cand.size) continue;
    const rows = await sparql(`SELECT ?f (MAX(?n) AS ?links) WHERE { VALUES ?f { ${[...cand.keys()].map(x => 'wd:' + x).join(' ')} } ?f wdt:P31/wdt:P279* wd:Q11424; wikibase:sitelinks ?n. } GROUP BY ?f`);
    const best = new Map();
    for (const r of rows) { const id = qid(val(r, 'f')), t = cand.get(id), n = Number(val(r, 'links')); if (!best.has(t) || best.get(t).links < n) best.set(t, { id, title: t, links: n }); }
    extra.push(...best.values());
  }
  await save('extra', extra); console.log('must-include matched', extra.length, 'of', MUST.length);
}
// balance: the sitelink rule alone skews to English-language films, so each listed country also contributes its most widely documented films (documented in docs/DATA.md)
const BALANCE = { Japan: 'Q17', France: 'Q142', Italy: 'Q38', Germany: 'Q183', 'South Korea': 'Q884', India: 'Q668', China: 'Q148', 'Hong Kong': 'Q8646', Sweden: 'Q34', Denmark: 'Q35', Spain: 'Q29', Mexico: 'Q96', Brazil: 'Q155', Iran: 'Q794', Russia: 'Q159', 'Soviet Union': 'Q15180', Poland: 'Q36', Argentina: 'Q414', Taiwan: 'Q865', Thailand: 'Q869', Turkey: 'Q43', Egypt: 'Q79', Netherlands: 'Q55', Belgium: 'Q31', Austria: 'Q40', Finland: 'Q33', Norway: 'Q20', Greece: 'Q41', Nigeria: 'Q1033', Czechoslovakia: 'Q33946' };
const PER_COUNTRY = Number(process.env.PER_COUNTRY || 36);
let balance = await load('balance');
if (!balance) {
  balance = [];
  for (const [name, q] of Object.entries(BALANCE)) {
    const rows = await sparql(`SELECT ?f ?n WHERE { ?f wdt:P495 wd:${q}; wdt:P31/wdt:P279* wd:Q11424; wikibase:sitelinks ?n. FILTER(?n >= 22) } ORDER BY DESC(?n) LIMIT ${PER_COUNTRY}`);
    balance.push(...rows.map(r => ({ id: qid(val(r, 'f')), country: name, links: Number(val(r, 'n')) })));
  }
  await save('balance', balance); console.log('balance films', balance.length);
}
let ids = [...new Set([...films.map(f => f.id), ...extra.map(f => f.id), ...balance.map(f => f.id)])];
// series completion: a franchise entry with at least 15 sitelinks joins when its series already has a selected member, so franchises are whole, not cut by the popularity rule
let completion = await load('completion');
if (!completion) {
  completion = [];
  for (const c of chunk(ids, 150)) {
    const vals = c.map(x => 'wd:' + x).join(' ');
    const rows = await sparql(`SELECT DISTINCT ?m WHERE { VALUES ?f { ${vals} } ?f wdt:P179 ?s. ?m wdt:P179 ?s; wdt:P31/wdt:P279* wd:Q11424; wikibase:sitelinks ?n. FILTER(?n >= 15) }`);
    completion.push(...rows.map(r => qid(val(r, 'm'))));
  }
  completion = [...new Set(completion)]; await save('completion', completion);
}
ids = [...new Set([...ids, ...completion])];
console.log('total film ids', ids.length, '(series completion added', completion.length, 'candidates)');

// 2. per-film facts in chunks
const run = async (name, build, size = 120) => {
  const have = await load(name); if (have) return have;
  const out = [];
  for (const [i, c] of chunk(ids, size).entries()) {
    const vals = c.map(x => 'wd:' + x).join(' ');
    out.push(...(await sparql(build(vals))));
    process.stdout.write(`\r${name} ${i + 1}/${Math.ceil(ids.length / size)}`);
  }
  console.log(); await save(name, out); return out;
};
await run('base', v => `SELECT ?f ?label ?desc ?date ?runtime ?title ?wiki WHERE { VALUES ?f { ${v} } OPTIONAL { ?f rdfs:label ?l1. FILTER(LANG(?l1)="en") } OPTIONAL { ?f rdfs:label ?l2. FILTER(LANG(?l2)="mul") } BIND(COALESCE(?l1,?l2) AS ?label) FILTER(BOUND(?label))
  OPTIONAL { ?f schema:description ?desc. FILTER(LANG(?desc)="en") } OPTIONAL { ?f wdt:P577 ?date } OPTIONAL { ?f wdt:P2047 ?runtime } OPTIONAL { ?f wdt:P1476 ?title }
  OPTIONAL { ?a schema:about ?f; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?wiki } }`);
const rel = (name, prop, extraSel = '') => run(name, v => `SELECT ?f ?x ?xLabel ${extraSel} WHERE { VALUES ?f { ${v} } ?f wdt:${prop} ?x. ${LABEL} }`);
for (const [name, p] of [['director', 'P57'], ['writer', 'P58'], ['composer', 'P86'], ['dop', 'P344'], ['producer', 'P162'], ['company', 'P272'], ['genre', 'P136'], ['series', 'P179'], ['follows', 'P155'], ['followedBy', 'P156'], ['basedOn', 'P144'], ['inspiredBy', 'P941'], ['subject', 'P921'], ['setting', 'P840'], ['country', 'P495'], ['language', 'P364'], ['derivative', 'P4969']]) await rel(name, p);
await run('cast', v => `SELECT ?f ?x ?xLabel ?ord WHERE { VALUES ?f { ${v} } ?f p:P161 ?st. ?st ps:P161 ?x. OPTIONAL { ?st pq:P1545 ?ord } ${LABEL} }`, 60);
await run('awards', v => `SELECT ?f ?x ?xLabel WHERE { VALUES ?f { ${v} } ?f wdt:P166 ?x. ${LABEL} }`);
console.log('done');
