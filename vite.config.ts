import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// The app lives in app/ and builds to site/, which is committed: Shadw and Vercel serve plain static files, there is no build step on the host.
export default defineConfig({
  root: fileURLToPath(new URL('./app', import.meta.url)),
  base: './',
  publicDir: fileURLToPath(new URL('./app/public', import.meta.url)),
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./app/src', import.meta.url)) } },
  build: { outDir: fileURLToPath(new URL('./site', import.meta.url)), emptyOutDir: true, chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: (id: string) => (id.includes('node_modules/cytoscape') ? 'cytoscape' : id.includes('node_modules/d3') ? 'd3' : /node_modules\/(vue|vue-router|pinia|@vue)\//.test(id) ? 'vue' : undefined) } } },
  server: { port: 5173 },
});
