<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { Film } from '@/lib/types';
import { titleCard } from '@/lib/poster';
import { useCatalog } from '@/stores/catalog';
const props = defineProps<{ film: Film; to?: string; sub?: string }>();
const cat = useCatalog();
const src = computed(() => titleCard(props.film, cat.cat!.primaryGenre(props.film)));
</script>
<template>
  <RouterLink :to="to || `/movie/${film.id}`" class="tile" :title="`${film.t} (${film.y})`">
    <img :src="src" :alt="`Generated title card for ${film.t}`" loading="lazy" width="200" height="300" />
    <b>{{ film.t }}</b><span>{{ sub || film.y }}</span>
  </RouterLink>
</template>
