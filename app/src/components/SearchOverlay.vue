<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { onKeyStroke } from '@vueuse/core';
import { useCatalog } from '@/stores/catalog';
import { useLibrary } from '@/stores/library';
import type { Hit } from '@/lib/search';
const open = defineModel<boolean>('open', { default: false });
const catalog = useCatalog(), lib = useLibrary(), router = useRouter();
const q = ref(''); const input = ref<HTMLInputElement>(); const active = ref(0);
const hits = computed<Hit[]>(() => (q.value.trim() ? catalog.index!.search(q.value, undefined, 10) : []));
const popular = computed(() => catalog.cat!.data.films.slice(0, 6));
watch(open, async v => { if (v) { q.value = ''; active.value = 0; await nextTick(); input.value?.focus(); } });
watch(hits, () => { active.value = 0; });
onKeyStroke('k', e => { if (e.metaKey || e.ctrlKey) { e.preventDefault(); open.value = !open.value; } });
onKeyStroke('Escape', () => { open.value = false; });
const KIND: Record<string, string> = { film: 'Film', person: 'Person', genre: 'Genre', franchise: 'Franchise' };
function go(h: Hit, e?: MouseEvent | KeyboardEvent) {
  lib.remember(h.title); open.value = false;
  const alt = !!e && ('shiftKey' in e) && e.shiftKey;
  if (h.kind === 'film') router.push(alt ? `/movie/${h.id}` : { path: '/explore', query: { film: h.id } });
  else if (h.kind === 'person') router.push(`/person/${h.id}`); else if (h.kind === 'genre') router.push(`/genre/${h.id}`); else router.push(`/franchise/${h.id}`);
}
function key(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); active.value = Math.min(hits.value.length - 1, active.value + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); active.value = Math.max(0, active.value - 1); }
  else if (e.key === 'Enter') { if (hits.value[active.value]) go(hits.value[active.value], e); else if (q.value.trim()) { lib.remember(q.value); open.value = false; router.push({ path: '/search', query: { q: q.value } }); } }
}
</script>
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Search" @click.self="open = false">
      <div class="panel mx-auto mt-[8vh] w-[min(640px,94vw)] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div class="p-3 border-b border-line">
          <input ref="input" v-model="q" class="field" type="search" placeholder="Search a film, director, actor, genre or franchise" role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list" autocomplete="off" @keydown="key" />
        </div>
        <ul id="search-results" role="listbox" class="overflow-auto">
          <li v-for="(h, i) in hits" :key="h.kind + h.id" role="option" :aria-selected="i === active">
            <button class="w-full min-h-12 px-4 py-2 flex items-center gap-3 text-left border-b border-line/50" :class="i === active ? 'bg-panel2' : ''" @click="go(h, $event)" @mousemove="active = i">
              <span class="chip shrink-0">{{ KIND[h.kind] }}</span><span class="min-w-0 flex-1"><b class="block truncate">{{ h.title }}</b><span class="block text-sm text-faint truncate">{{ h.sub }}</span></span><span class="text-xs text-faint shrink-0">{{ h.kind === 'film' ? 'Opens on the map' : 'Opens its page' }}</span>
            </button>
          </li>
          <li v-if="q.trim() && !hits.length" class="p-4 text-dim">No match for “{{ q }}”. Try fewer letters, or search a director.</li>
        </ul>
        <div v-if="!q.trim()" class="p-4 grid grid-cols-1 gap-4">
          <div v-if="lib.s.recent.length"><p class="eyebrow mb-2">Recent</p><div class="flex flex-wrap gap-2"><button v-for="r in lib.s.recent" :key="r" class="chip" @click="q = r">{{ r }}</button></div></div>
          <div><p class="eyebrow mb-2">Popular</p><div class="flex flex-wrap gap-2"><button v-for="f in popular" :key="f.id" class="chip" @click="q = f.t">{{ f.t }}</button></div></div>
        </div>
        <p class="px-4 py-2 text-xs text-faint border-t border-line hidden md:block">↑↓ choose · Enter opens the highlighted result · Shift+Enter opens a film’s page instead of the map · Esc closes</p>
      </div>
    </div>
  </Teleport>
</template>
