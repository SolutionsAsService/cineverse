<script setup lang="ts">
defineProps<{ status: 'idle' | 'loading' | 'ready' | 'error'; error?: string }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div class="wrap grid grid-cols-1 place-items-center text-center" style="min-height: calc(100dvh - var(--nav-h))" role="status" aria-live="polite">
    <div v-if="status === 'error'" class="max-w-md">
      <p class="eyebrow">Catalog unavailable</p>
      <h1 class="display text-3xl mt-3">The film catalog did not load.</h1>
      <p class="text-dim mt-3">{{ error }}</p>
      <button class="btn primary mt-6" @click="$emit('retry')">Try again</button>
    </div>
    <div v-else class="max-w-md">
      <svg viewBox="0 0 64 64" class="mx-auto w-16 h-16 animate-spin" style="animation-duration: 2.4s" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-line)" stroke-width="3" /><path d="M32 6a26 26 0 0 1 26 26" fill="none" stroke="var(--color-gold)" stroke-width="3" stroke-linecap="round" /></svg>
      <p class="eyebrow mt-5">Loading the catalog</p>
      <p class="text-dim mt-2">About 2,000 films, 11,000 people and their connections.</p>
    </div>
  </div>
</template>
