// After the build: the committed site/ folder must be self-contained.
import { existsSync, readFileSync, statSync } from 'node:fs';
const root = new URL('../site/', import.meta.url).pathname; const fail = [];
for (const p of ['index.html', 'vercel.json', 'favicon.svg', 'og.png', 'data/cineverse.json']) if (!existsSync(root + p)) fail.push('site/' + p + ' missing');
if (existsSync(root + 'index.html')) { const h = readFileSync(root + 'index.html', 'utf8'); if (!h.includes('https://cineverse.shadw.app/og.png')) fail.push('built index.html lost the absolute og:image'); if (/src="\/(?!\/)/.test(h) || /href="\/(?!\/)/.test(h)) fail.push('built index.html uses root-absolute paths; the site must work from any folder'); }
if (existsSync(root + 'data/cineverse.json')) { const d = JSON.parse(readFileSync(root + 'data/cineverse.json', 'utf8')); if (d.films.length < 1000) fail.push('fewer than 1,000 films in the shipped catalog'); }
if (fail.length) { console.error('site check failed:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log(`site ok (${(statSync(root + 'data/cineverse.json').size / 1e6).toFixed(1)} MB catalog)`);
