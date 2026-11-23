<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useCatalog } from '@/stores/catalog';
import PersonPanel from '@/components/PersonPanel.vue';
import NotFoundView from './NotFoundView.vue';
const props = defineProps<{ id: string }>();
const cat = useCatalog().cat!;
const p = computed(() => cat.person.get(props.id));
</script>
<template><NotFoundView v-if="!p" /><div v-else class="zone zone-person"><div class="wrap py-8 max-w-4xl"><nav class="text-sm text-faint mb-4" aria-label="Breadcrumb"><RouterLink to="/people" class="hover:text-gold">People</RouterLink> / {{ p.n }}</nav><PersonPanel :id="id" /></div></div></template>
