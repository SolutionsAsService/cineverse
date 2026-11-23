// Normalises data/raw/*.json (Wikidata CC0 + Wikipedia lead paragraphs CC BY-SA 4.0) into the committed snapshot app/public/data/cineverse.json.
// Nothing here invents a fact: every field comes from a Wikidata statement or from data/editorial.json (the master prompt's own trilogy list, resolved against titles).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const RAW = new URL('../data/raw/', import.meta.url).pathname, OUT = new URL('../app/public/data/', import.meta.url).pathname;
const R = async n => (existsSync(RAW + n + '.json') ? JSON.parse(await readFile(RAW + n + '.json', 'utf8')) : []);
const id = u => u.split('/').pop();
const v = (r, k) => r[k]?.value;
const isQ = s => /^Q\d+$/.test(s || '');
const by = (rows, k = 'f') => { const m = new Map(); for (const r of rows) { const key = id(r[k].value); if (!m.has(key)) m.set(key, []); m.get(key).push(r); } return m; };
const uniq = a => [...new Set(a)];

// ---- films
const baseRows = by(await R('base'));
const links = new Map((await R('films')).map(f => [f.id, f.links])); for (const e of await R('extra')) links.set(e.id, Math.max(links.get(e.id) || 0, e.links));
const films = new Map();
for (const [fid, rows] of baseRows) {
  const label = v(rows[0], 'label'); if (!label || isQ(label)) continue;
  const dates = rows.map(r => v(r, 'date')).filter(Boolean).sort(); const year = dates[0] ? Number(dates[0].slice(0, 4)) : null; if (!year || year < 1890 || year > 2027) continue;
  const rts = rows.map(r => Number(v(r, 'runtime'))).filter(n => n > 20 && n < 600).sort((a, b) => a - b);
  const ot = uniq(rows.map(v2 => v(v2, 'title')).filter(Boolean)).find(t => t.toLowerCase() !== label.toLowerCase());
  films.set(fid, { id: fid, t: label, ...(ot ? { ot } : {}), y: year, ...(rts.length ? { rt: rts[Math.floor(rts.length / 2)] } : {}), de: v(rows[0], 'desc') || '', w: v(rows.find(r => v(r, 'wiki')) || {}, 'wiki') || undefined,
    g: [], sg: [], dir: [], wr: [], co: [], dp: [], pr: [], cm: [], cast: [], fr: [], prev: [], next: [], ba: [], subj: [], set: [], cn: [], lg: [], aw: [] });
}
const people = new Map(); const person = (pid, name) => { if (!people.has(pid)) people.set(pid, { id: pid, n: name }); return pid; };
const add = async (name, field, fn) => { for (const [fid, rows] of by(await R(name))) { const f = films.get(fid); if (f) f[field] = uniq([...f[field], ...rows.map(fn)].filter(Boolean)); } };
const pf = r => (isQ(v(r, 'xLabel')) ? null : person(id(v(r, 'x')), v(r, 'xLabel')));
await add('director', 'dir', pf); await add('writer', 'wr', pf); await add('composer', 'co', pf); await add('dop', 'dp', pf); await add('producer', 'pr', pf);
await add('company', 'cm', r => v(r, 'xLabel')); await add('country', 'cn', r => v(r, 'xLabel')); await add('language', 'lg', r => v(r, 'xLabel'));
await add('subject', 'subj', r => v(r, 'xLabel')); await add('setting', 'set', r => v(r, 'xLabel'));
await add('follows', 'prev', r => id(v(r, 'x'))); await add('followedBy', 'next', r => id(v(r, 'x')));
for (const f of films.values()) { f.prev = f.prev.filter(x => films.has(x)); f.next = f.next.filter(x => films.has(x)); }
// based on / inspired by: keep source label and, when the source is itself a film in the snapshot, its id (a remake)
for (const name of ['basedOn', 'inspiredBy']) for (const [fid, rows] of by(await R(name))) { const f = films.get(fid); if (f) for (const r of rows) { const sid = id(v(r, 'x')), lab = v(r, 'xLabel'); if (!isQ(lab) && !f.ba.some(b => b.s === sid)) f.ba.push({ s: sid, l: lab, k: name === 'basedOn' ? 'based on' : 'inspired by' }); } }
// derivative works (a film that has a remake/adaptation in the snapshot): used as a hint only, never as a stand-alone edge
const AWARD = /academy award|palme d'or|golden lion|golden bear|golden globe|bafta|golden palm|césar|cesar|grand prix|silver bear|national film|saturn|hugo|sundance|golden leopard|goya/i;
for (const [fid, rows] of by(await R('awards'))) { const f = films.get(fid); if (f) f.aw = uniq(rows.map(r => v(r, 'xLabel')).filter(l => l && AWARD.test(l))).slice(0, 8); }

// ---- genres: Wikidata genres are fine-grained; coarse buckets by label, the remainder kept as sub-genre text
const COARSE = [['science-fiction', 'Science Fiction', /science fiction|sci-fi|cyberpunk|space opera|dystopi/i], ['horror', 'Horror', /horror|slasher|zombie|monster/i], ['animation', 'Animation', /animat|anime|cartoon|stop motion/i], ['documentary', 'Documentary', /documentary|docudrama/i],
  ['western', 'Western', /western/i], ['war', 'War', /\bwar\b|military/i], ['musical', 'Musical', /music|musical/i], ['fantasy', 'Fantasy', /fantasy|fairy|superhero/i], ['action', 'Action', /action|martial|superhero|disaster|heist/i], ['crime', 'Crime', /crime|gangster|noir|mafia|police|detective|heist/i],
  ['thriller', 'Thriller', /thriller|suspense|psycholog/i], ['mystery', 'Mystery', /mystery|whodunit/i], ['romance', 'Romance', /romance|romantic/i], ['comedy', 'Comedy', /comedy|satire|parody|farce|slapstick/i], ['adventure', 'Adventure', /adventure/i],
  ['family', 'Family', /family|children/i], ['history', 'History', /histor|biograph|period|epic|costume/i], ['drama', 'Drama', /drama|coming-of-age|melodrama|social/i]];
const genreRows = by(await R('genre')); const genreIds = new Map(COARSE.map(([gid, name]) => [gid, name]));
for (const [fid, rows] of genreRows) { const f = films.get(fid); if (!f) continue; const labels = uniq(rows.map(r => v(r, 'xLabel')).filter(Boolean));
  const coarse = new Set(); const rest = [];
  for (const l of labels) { let hit = false; for (const [gid, , rx] of COARSE) if (rx.test(l)) { coarse.add(gid); hit = true; } if (!hit || /neo-noir|film noir|cyberpunk|giallo|new wave|slasher|spaghetti|screwball|noir/i.test(l)) rest.push(l.replace(/ film$/i, '')); }
  f.g = COARSE.map(c => c[0]).filter(g => coarse.has(g)); f.sg = rest.slice(0, 4); }
// primary genre = the first coarse genre in a specificity order (the COARSE order above runs from most to least specific)

// ---- cast: billing order only where Wikidata gives P1545; otherwise unordered and flagged
for (const [fid, rows] of by(await R('cast'))) { const f = films.get(fid); if (!f) continue; const ordered = rows.filter(r => v(r, 'ord') && !isQ(v(r, 'xLabel'))); const list = ordered.length >= 2 ? ordered.sort((a, b) => Number(v(a, 'ord')) - Number(v(b, 'ord'))).slice(0, 12).map((r, i) => [person(id(v(r, 'x')), v(r, 'xLabel')), i + 1]) : rows.filter(r => !isQ(v(r, 'xLabel'))).slice(0, 8).map(r => [person(id(v(r, 'x')), v(r, 'xLabel')), 0]);
  f.cast = [...new Map(list).entries()]; }

// ---- same title and year but different works (language versions, a short film and its feature remake): qualify the less documented one so titles stay unambiguous
const groups = new Map(); for (const f of films.values()) { const k = f.t.toLowerCase() + '|' + f.y; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(f); }
for (const g of groups.values()) if (g.length > 1) { g.sort((a, b) => (links.get(b.id) || 0) - (links.get(a.id) || 0)); const [main, ...rest] = g;
  for (const f of rest) { f.t += main.lg[0] && f.lg[0] && main.lg[0] !== f.lg[0] ? ` (${f.lg[0]}-language version)` : f.cn[0] && main.cn[0] !== f.cn[0] ? ` (${f.cn[0]})` : ` (${f.id})`; } }

// ---- people facts
for (const [pid, rows] of by(await R('people'), 'p')) { const p = people.get(pid); if (!p) continue; const r = rows[0];
  if (v(r, 'desc')) p.de = v(r, 'desc'); const b = rows.map(x => v(x, 'born')).filter(Boolean).sort()[0]; if (b) p.b = Number(b.slice(0, 4)); const d = rows.map(x => v(x, 'died')).filter(Boolean).sort()[0]; if (d) p.d = Number(d.slice(0, 4));
  const g = rows.map(x => v(x, 'gl')).find(Boolean); if (g) p.sx = g; const w = rows.map(x => v(x, 'wiki')).find(Boolean); if (w) p.w = w; }

// ---- franchises
const metaRows = by(await R('seriesMeta'), 's'); const seriesTypes = new Map();
for (const [sid, rows] of metaRows) seriesTypes.set(sid, { name: v(rows.find(r => v(r, 'sl')) || {}, 'sl'), types: uniq(rows.map(r => v(r, 'tl')).filter(Boolean)) });
const FR_OK = /film series|film franchise|media franchise|franchise|trilogy|film universe|cinematic universe|shared universe|film cycle|anthology|saga|duology|tetralogy/i;
const FR_BAD = /list of|bbc|greatest|filmography|award|ranking|top \d|best of|collection of films/i;
const franchises = new Map();
for (const [fid, rows] of by(await R('series'))) { const f = films.get(fid); if (!f) continue; for (const r of rows) { const sid = id(v(r, 'x')); const meta = seriesTypes.get(sid); const name = meta?.name || v(r, 'xLabel'); if (!meta || !name || isQ(name) || FR_BAD.test(name)) continue;
  if (!meta.types.some(t => FR_OK.test(t))) continue; if (!franchises.has(sid)) franchises.set(sid, { id: sid, n: name, ty: meta.types.filter(t => FR_OK.test(t)), films: [] }); franchises.get(sid).films.push(fid); f.fr.push(sid); } }
for (const f of franchises.values()) { f.films = uniq(f.films).sort((a, b) => films.get(a).y - films.get(b).y || films.get(a).t.localeCompare(films.get(b).t));
  const isTri = f.ty.some(t => /trilogy/i.test(t)); f.k = isTri ? 'trilogy' : f.ty.some(t => /universe/i.test(t)) ? 'universe' : 'series'; f.src = 'wikidata'; }
for (const [fid, fo] of films) fo.fr = uniq(fo.fr).filter(s => (franchises.get(s)?.films.length || 0) >= 2);
for (const [sid, f] of [...franchises]) if (f.films.length < 2) franchises.delete(sid);

// ---- editorial trilogies from the master prompt, resolved against dataset titles (kept separate from Wikidata ones, with their kind)
const editorial = JSON.parse(await readFile(new URL('../data/editorial.json', import.meta.url), 'utf8'));
const byTitle = new Map(); for (const f of films.values()) { const key = f.t.toLowerCase(); if (!byTitle.has(key) || byTitle.get(key).links < (f.links || 0)) byTitle.set(key, f); }
const resolveTitle = t => [...films.values()].filter(f => f.t.toLowerCase() === t.toLowerCase() || (f.ot || '').toLowerCase() === t.toLowerCase()).sort((a, b) => b.cast.length - a.cast.length)[0];
const trilogies = [];
for (const t of editorial.trilogies) { const members = t.titles.map(resolveTitle); const found = members.filter(Boolean); const tid = 'T-' + t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (found.length < 2) { console.warn('trilogy skipped (titles not in snapshot):', t.name, t.titles.filter((_, i) => !members[i])); continue; }
  if (found.length < t.titles.length) console.warn('trilogy partial:', t.name, 'missing', t.titles.filter((_, i) => !members[i]));
  const ids = new Set(found.map(f => f.id));
  // when Wikidata already has this trilogy (same films), annotate it with the brief's classification instead of duplicating it
  const twin = [...franchises.values()].find(fr => fr.k === 'trilogy' && fr.films.length >= found.length && [...ids].every(i => fr.films.includes(i)) && fr.films.length <= found.length + 2);
  if (twin) { twin.kind = t.kind; twin.note = t.note; twin.src = 'wikidata + editorial'; console.log('trilogy annotated:', t.name, '->', twin.n); continue; }
  trilogies.push({ id: tid, n: t.name, k: 'trilogy', ty: ['editorial trilogy'], kind: t.kind, films: found.sort((a, b) => a.y - b.y).map(f => f.id), note: t.note, src: 'editorial' }); for (const f of found) f.tr = [...(f.tr || []), tid]; }

// ---- Wikipedia lead paragraphs (CC BY-SA 4.0): first 3 sentences, with the article title kept for attribution
const extracts = (await R('extracts')); const ex = Array.isArray(extracts) ? {} : extracts;
const lead = t => { if (!t) return ''; const s = t.replace(/\s+/g, ' ').trim(); const m = s.match(/^(.*?[.!?])(\s+[A-Z].*?[.!?]){0,2}/); return (m ? m[0] : s).slice(0, 560); };
for (const f of films.values()) if (f.w && ex[f.w]) f.ex = lead(ex[f.w]);
for (const p of people.values()) if (p.w && ex[p.w]) p.ex = lead(ex[p.w]);

// ---- prune people nobody references; index genres
const used = new Set(); for (const f of films.values()) { for (const k of ['dir', 'wr', 'co', 'dp', 'pr']) f[k].forEach(x => used.add(x)); f.cast.forEach(([x]) => used.add(x)); }
const peopleOut = [...people.values()].filter(p => used.has(p.id));
const filmList = [...films.values()].sort((a, b) => b.cast.length + b.dir.length - a.cast.length - a.dir.length || a.t.localeCompare(b.t));
for (const f of filmList) { const n = links.get(f.id); if (n) f.pop = n; }
const dataset = { meta: { generated: new Date().toISOString().slice(0, 10), films: filmList.length, people: peopleOut.length, franchises: franchises.size, trilogies: trilogies.length + [...franchises.values()].filter(f => f.k === 'trilogy').length,
    sources: [{ name: 'Wikidata', license: 'CC0 1.0', url: 'https://www.wikidata.org', use: 'films, people, credits, genres, franchises, sequels, sources and awards' }, { name: 'Wikipedia (English)', license: 'CC BY-SA 4.0', url: 'https://en.wikipedia.org', use: 'lead paragraphs for synopses and biographies; each carries its article title' }, { name: 'Editorial', license: 'this project', url: 'docs/DATA.md', use: 'the trilogy list from the product brief, resolved to dataset titles' }],
    selection: 'Instance of film (or a subclass) with at least 45 Wikidata sitelinks, plus members of the same franchise with at least 15, plus the titles named in the product brief.', noPosters: 'Posters are not redistributed: the app draws a generated title card from each film’s data.' },
  genres: COARSE.map(([gid, name]) => ({ id: gid, n: name })), films: filmList, people: peopleOut, franchises: [...franchises.values()], trilogies };
await mkdir(OUT, { recursive: true }); await writeFile(OUT + 'cineverse.json', JSON.stringify(dataset));
const kb = Buffer.byteLength(JSON.stringify(dataset)) / 1024;
console.log(`films ${filmList.length} · people ${peopleOut.length} · franchises ${franchises.size} · trilogies ${trilogies.length} · ${kb.toFixed(0)} KB`);
console.log('films with synopsis', filmList.filter(f => f.ex).length, '· with director', filmList.filter(f => f.dir.length).length, '· with cast', filmList.filter(f => f.cast.length).length, '· with genre', filmList.filter(f => f.g.length).length);
