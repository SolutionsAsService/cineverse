// Posters are not redistributed (rights). Each film gets a generated title card instead, drawn only from its own data: primary genre sets the hue, release decade the grain.
import type { Film } from './types';
const HUE: Record<string, number> = { 'science-fiction': 200, horror: 350, animation: 40, documentary: 150, western: 28, war: 100, musical: 300, fantasy: 275, action: 12, crime: 330, thriller: 220, mystery: 255, romance: 340, comedy: 52, adventure: 170, family: 80, history: 35, drama: 215 };
export const genreHue = (g: string) => HUE[g] ?? 215;
export const genreColor = (g: string, l = 58, c = .55) => `hsl(${genreHue(g)} ${Math.round(c * 100)}% ${l}%)`;
const cache = new Map<string, string>();
const esc = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
function wrap(t: string, max: number): string[] { const words = t.split(' '); const lines: string[] = []; let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) lines.push(cur); return lines.slice(0, 4); }
export function titleCard(f: Film, genre: string): string {
  const k = f.id + genre; const hit = cache.get(k); if (hit) return hit;
  const h = genreHue(genre); const seed = [...f.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); const lines = wrap(f.t.toUpperCase(), 13); const longest = Math.max(...lines.map(l => l.length)); const size = Math.max(14, Math.min(lines.length > 3 ? 22 : lines.length > 2 ? 26 : 30, Math.floor(168 / (0.66 * Math.max(longest, 1)))));
  const holes = Array.from({ length: 9 }, (_, i) => `<rect x="14" y="${22 + i * 29}" width="7" height="12" rx="2" fill="hsl(${h} 40% 14%)"/><rect x="179" y="${22 + i * 29}" width="7" height="12" rx="2" fill="hsl(${h} 40% 14%)"/>`).join('');   // film-strip sprocket holes: decoration that cannot be mistaken for data
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 38% 22%)"/><stop offset="1" stop-color="hsl(${(h + 28) % 360} 42% 9%)"/></linearGradient></defs>
<rect width="200" height="300" fill="url(#g)"/><rect x="8" y="8" width="184" height="284" fill="none" stroke="hsl(${h} 60% 70%)" stroke-opacity=".55" stroke-width="1.5"/>${holes}
<text x="100" y="${70 - (lines.length - 1) * 4}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="${size}" fill="#f4efe6">${lines.map((l, i) => `<tspan x="100" dy="${i ? size + 3 : 0}">${esc(l)}</tspan>`).join('')}</text>
<text x="100" y="262" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" letter-spacing="3" fill="hsl(${h} 70% 78%)">${f.y}</text><text x="100" y="283" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" letter-spacing="1.5" fill="hsl(${h} 30% 78%)">GENERATED TITLE CARD</text></svg>`;
  const uri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg); cache.set(k, uri); return uri;
}
