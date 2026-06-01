import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// TowAssist — frontend estático (Vite). Publicado pelo Netlify a partir de dist/.
// O BFF (chat/voz) é provido por Netlify Functions sob /api/* (ver netlify.toml).
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: false,
  },
});
