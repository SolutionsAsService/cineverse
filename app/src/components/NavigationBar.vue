<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
defineEmits<{ search: [] }>();
const open = ref(false);
const links = [['/explore', 'Explore'], ['/franchises', 'Franchises'], ['/trilogies', 'Trilogies'], ['/people', 'People'], ['/timeline', 'Timeline'], ['/paths', 'Six degrees'], ['/collections', 'Collections']] as const;
</script>
<template>
  <header class="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur" style="height: var(--nav-h)">
    <div class="wrap flex items-center gap-4 h-full">
      <RouterLink to="/" class="flex items-center gap-2 shrink-0 min-h-11" aria-label="CINEVERSE home" @click="open = false">
        <svg viewBox="0 0 32 32" class="w-8 h-8" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="var(--color-gold)" stroke-width="2" /><g stroke="var(--color-text)" stroke-width="1.4" fill="var(--color-ink)"><line x1="16" y1="16" x2="16" y2="5" /><line x1="16" y1="16" x2="25" y2="21" /><line x1="16" y1="16" x2="7" y2="21" /><circle cx="16" cy="5" r="2.4" /><circle cx="25" cy="21" r="2.4" /><circle cx="7" cy="21" r="2.4" /></g><circle cx="16" cy="16" r="3.2" fill="var(--color-gold)" /></svg>
        <span class="display text-xl tracking-[.08em]">CINEVERSE</span>
      </RouterLink>
      <nav class="hidden lg:flex items-center gap-1 ml-4" aria-label="Main">
        <RouterLink v-for="l in links" :key="l[0]" :to="l[0]" class="px-3 h-11 inline-flex items-center text-sm text-dim hover:text-text rounded" active-class="!text-gold">{{ l[1] }}</RouterLink>
      </nav>
      <div class="ml-auto flex items-center gap-2">
        <button class="btn ghost min-w-[44px]" @click="$emit('search')" aria-label="Search films, people, franchises">
          <svg viewBox="0 0 20 20" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l5 5" /></svg>
          <span class="hidden sm:inline text-dim">Search</span><span class="kbd hidden md:inline">⌘K</span>
        </button>
        <button class="btn ghost lg:hidden" :aria-expanded="open" aria-controls="menu" @click="open = !open" aria-label="Menu">
          <svg viewBox="0 0 20 20" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" /></svg>
        </button>
      </div>
    </div>
    <nav v-if="open" id="menu" class="lg:hidden absolute inset-x-0 top-full bg-ink border-b border-line" aria-label="Menu">
      <div class="wrap py-2 grid grid-cols-1">
        <RouterLink v-for="l in links" :key="l[0]" :to="l[0]" class="min-h-12 flex items-center text-lg border-b border-line/60" active-class="!text-gold" @click="open = false">{{ l[1] }}</RouterLink>
      </div>
    </nav>
  </header>
</template>
