<script setup lang="ts">
import { useCatalog } from '@/stores/catalog';
const cat = useCatalog().cat!;
</script>
<template>
  <footer class="wrap py-8 text-sm text-faint border-t border-line mt-8" aria-label="Sources and licences">
    <p>Film, people, credit and franchise facts: <a class="underline" href="https://www.wikidata.org" rel="noopener">Wikidata</a>, <a class="underline" href="https://creativecommons.org/publicdomain/zero/1.0/" rel="noopener">CC0 1.0</a>. Synopses and biographies: <a class="underline" href="https://en.wikipedia.org" rel="noopener">Wikipedia</a> lead paragraphs, <a class="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener">CC BY-SA 4.0</a>, shortened to their first sentences with pronunciation guides removed; each links to its article. Snapshot {{ cat.data.meta.generated }}. Posters are not redistributed: the title cards are generated. A Vue 3 showcase from the SHADW experimental web suite.</p>
  </footer>
</template>
