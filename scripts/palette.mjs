// Derives and checks the CINEVERSE palette. Source: the SMPTE colour bars (the signal every film lab and broadcaster calibrates to): the six bar hues
// (yellow, cyan, green, magenta, red, blue) plus the +Q purple patch from the lower row. Bars are 75% amplitude on a black ground, so they are lifted
// in CIELAB to read on near-black at >= 4.5:1 and pushed apart to a minimum pairwise deltaE76 of 30. Run: node scripts/palette.mjs
const bars = { franchise: [191, 0, 0], trilogy: [128, 0, 191], director: [0, 191, 191], cast: [0, 191, 0], crew: [191, 0, 191], genre: [0, 0, 191], adaptation: [191, 191, 0] };
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const toLab = ([r, g, b]) => { const R = lin(r), G = lin(g), B = lin(b); const X = (.4124 * R + .3576 * G + .1805 * B) / .95047, Y = .2126 * R + .7152 * G + .0722 * B, Z = (.0193 * R + .1192 * G + .9505 * B) / 1.08883; const f = t => (t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))]; };
const toRgb = ([L, a, b]) => { const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200; const f = t => (t ** 3 > .008856 ? t ** 3 : (t - 16 / 116) / 7.787); const X = .95047 * f(fx), Y = f(fy), Z = 1.08883 * f(fz); const c = u => (u <= .0031308 ? 12.92 * u : 1.055 * u ** (1 / 2.4) - .055); return [c(3.2406 * X - 1.5372 * Y - .4986 * Z), c(-.9689 * X + 1.8758 * Y + .0415 * Z), c(.0557 * X - .204 * Y + 1.057 * Z)]; };
const inGamut = rgb => rgb.every(x => x >= -.002 && x <= 1.002);
const hex = rgb => '#' + rgb.map(x => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('');
const lumHex = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]); };
export const contrast = (a, b) => { const x = lumHex(a), y = lumHex(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
export const dE = (a, b) => Math.hypot(...toLab([...Buffer.from(a.slice(1), 'hex')]).map((v, i) => v - toLab([...Buffer.from(b.slice(1), 'hex')])[i]));
export function derive(bg = '#0b0a0c', signal = '#c9a45c') {
  const names = Object.keys(bars);
  const hue0 = names.map(n => { const [, a, b] = toLab(bars[n].map(x => x * 255 / 191)); return Math.atan2(b, a); });   // keep each bar's hue angle
  const mk = (h, L, C) => [L, C * Math.cos(h), C * Math.sin(h)];
  const state = names.map((_, i) => ({ h: hue0[i], L: 72, C: 55 }));
  const lab = s => mk(s.h, s.L, s.C);
  const ok = (i, s) => { const rgb = toRgb(lab(s)); return inGamut(rgb) && contrast(hex(rgb), bg) >= 4.5 && s.L >= 58 && s.L <= 86 && s.C >= 30 && Math.abs(Math.atan2(Math.sin(s.h - hue0[i]), Math.cos(s.h - hue0[i]))) <= .6; };
  for (const [i, s] of state.entries()) while (!ok(i, s) && s.C > 10) s.C -= 1;
  const gold = toLab([...Buffer.from(signal.slice(1), 'hex')]);
  const minD = () => { const a = [...state.map(lab), gold]; let m = 99; for (let i = 0; i < a.length; i += 1) for (let j = i + 1; j < a.length; j += 1) m = Math.min(m, Math.hypot(...a[i].map((v, k) => v - a[j][k]))); return m; };
  let best = minD(); let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let it = 0; it < 80000; it += 1) { const i = Math.floor(rnd() * state.length); const old = { ...state[i] }; const q = { h: old.h + (rnd() - .5) * .08, L: old.L + (rnd() - .5) * 3, C: old.C + (rnd() - .5) * 4 }; if (!ok(i, q)) continue; state[i] = q; const m = minD(); if (m >= best) best = m; else state[i] = old; }
  return { colors: Object.fromEntries(names.map((n, i) => [n, hex(toRgb(lab(state[i])))])), minDeltaE: best };
}
if (process.argv[1].endsWith('palette.mjs')) {
  const { colors, minDeltaE } = derive();
  console.log(JSON.stringify(colors, null, 1)); console.log('min pairwise dE76 incl. gold signal:', minDeltaE.toFixed(1));
  for (const [n, c] of Object.entries(colors)) console.log(n.padEnd(11), c, 'contrast on #0b0a0c', contrast(c, '#0b0a0c').toFixed(2), 'on panel #17151a', contrast(c, '#17151a').toFixed(2));
}
