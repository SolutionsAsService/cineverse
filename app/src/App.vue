<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useCatalog } from '@/stores/catalog';
import NavigationBar from '@/components/NavigationBar.vue';
import SearchOverlay from '@/components/SearchOverlay.vue';
import StateBlock from '@/components/StateBlock.vue';
import SiteFooter from '@/components/SiteFooter.vue';
import { useRoute } from 'vue-router';
const catalog = useCatalog(); const searchOpen = ref(false); const route = useRoute();
onMounted(() => { catalog.load(); });
</script>

<template>
  <a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] btn primary">Skip to content</a>
  <NavigationBar @search="searchOpen = true" />
  <main id="main" tabindex="-1">
    <StateBlock v-if="catalog.status !== 'ready'" :status="catalog.status" :error="catalog.error" @retry="catalog.load()" />
    <RouterView v-else v-slot="{ Component }"><component :is="Component" @search="searchOpen = true" /></RouterView>
  </main>
  <SiteFooter v-if="catalog.status === 'ready' && route.name !== 'explore'" />
  <SearchOverlay v-if="catalog.status === 'ready'" v-model:open="searchOpen" />
</template>
