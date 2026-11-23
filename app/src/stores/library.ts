// Personal collections live in this browser (localStorage). Accounts and server-side sync are on the roadmap (docs/ROADMAP.md); sharing works through URL-encoded collections.
import { defineStore } from 'pinia';
import { reactive, watch } from 'vue';

const KEY = 'cineverse:library:v1';
export interface Collection { id: string; name: string; films: string[]; note?: string; created: number }
export interface SavedMap { id: string; name: string; films: string[]; people: string[]; mode: string; created: number }
interface State { watchlist: string[]; watched: string[]; favorites: string[]; ratings: Record<string, number>; collections: Collection[]; maps: SavedMap[]; recent: string[] }
const empty = (): State => ({ watchlist: [], watched: [], favorites: [], ratings: {}, collections: [], maps: [], recent: [] });
function read(): State { try { const raw = localStorage.getItem(KEY); return raw ? { ...empty(), ...JSON.parse(raw) } : empty(); } catch { return empty(); } }
const uid = () => Math.random().toString(36).slice(2, 9);
export const useLibrary = defineStore('library', () => {
  const s = reactive<State>(read());
  watch(s, () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage full or blocked */ } }, { deep: true });
  const toggle = (list: 'watchlist' | 'watched' | 'favorites', id: string) => { const i = s[list].indexOf(id); if (i >= 0) s[list].splice(i, 1); else s[list].push(id); };
  const has = (list: 'watchlist' | 'watched' | 'favorites', id: string) => s[list].includes(id);
  const rate = (id: string, n: number) => { if (n <= 0) delete s.ratings[id]; else s.ratings[id] = n; };
  const addCollection = (name: string, films: string[] = [], note = '') => { const c: Collection = { id: uid(), name: name.trim() || 'Untitled collection', films: [...new Set(films)], note, created: Date.now() }; s.collections.unshift(c); return c; };
  const addToCollection = (cid: string, film: string) => { const c = s.collections.find(x => x.id === cid); if (c && !c.films.includes(film)) c.films.push(film); };
  const removeFromCollection = (cid: string, film: string) => { const c = s.collections.find(x => x.id === cid); if (c) c.films = c.films.filter(x => x !== film); };
  const deleteCollection = (cid: string) => { s.collections = s.collections.filter(c => c.id !== cid); };
  const saveMap = (name: string, films: string[], people: string[], mode: string) => { const m: SavedMap = { id: uid(), name: name.trim() || 'Untitled map', films, people, mode, created: Date.now() }; s.maps.unshift(m); return m; };
  const deleteMap = (id: string) => { s.maps = s.maps.filter(m => m.id !== id); };
  const remember = (q: string) => { const t = q.trim(); if (!t) return; s.recent = [t, ...s.recent.filter(x => x !== t)].slice(0, 8); };
  const share = (c: Collection) => btoa(unescape(encodeURIComponent(JSON.stringify({ n: c.name, f: c.films, t: c.note || '' }))));
  const fromShare = (code: string): { n: string; f: string[]; t: string } | null => { try { const o = JSON.parse(decodeURIComponent(escape(atob(code)))); return Array.isArray(o.f) && typeof o.n === 'string' ? o : null; } catch { return null; } };
  return { s, toggle, has, rate, addCollection, addToCollection, removeFromCollection, deleteCollection, saveMap, deleteMap, remember, share, fromShare };
});
