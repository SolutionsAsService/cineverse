<script setup lang="ts">
import { computed } from 'vue';
import type { Relation } from '@/lib/relations';
import { REL_DEFS } from '@/lib/relations';
import { CATEGORY_COLOR } from '@/lib/types';
const props = defineProps<{ rel: Relation; explain?: boolean }>();
const def = computed(() => REL_DEFS[props.rel.type]);
</script>
<template>
  <span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
    <span class="chip" :title="def.source"><i :style="{ background: CATEGORY_COLOR[rel.category] }" />{{ def.label }}</span>
    <span class="text-xs font-semibold tracking-wide" :class="rel.factual ? 'text-dim' : 'text-faint'">{{ rel.factual ? 'FACT' : 'INFERRED' }}</span>
    <span v-if="explain" class="text-sm text-dim">{{ rel.why }}</span>
  </span>
</template>
