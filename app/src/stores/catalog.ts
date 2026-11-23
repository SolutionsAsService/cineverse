import { defineStore } from 'pinia';
import { markRaw, ref, shallowRef } from 'vue';
import { loadCatalog, type Catalog } from '@/lib/catalog';
import { buildIndex, type Index } from '@/lib/search';

export const useCatalog = defineStore('catalog', () => {
  const cat = shallowRef<Catalog | null>(null); const index = shallowRef<Index | null>(null);
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle'); const error = ref('');
  async function load() {
    if (status.value === 'ready' || status.value === 'loading') return; status.value = 'loading';
    try { const c = await loadCatalog(); cat.value = markRaw(c); index.value = markRaw(buildIndex(c)); status.value = 'ready'; }
    catch (e) { error.value = e instanceof Error ? e.message : String(e); status.value = 'error'; }
  }
  return { cat, index, status, error, load };
});
