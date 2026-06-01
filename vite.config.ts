import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

// TowAssist — frontend estático (Vite). Publicado pelo Netlify a partir de dist/.
// O BFF (chat/voz) é provido por Netlify Functions sob /api/* (ver netlify.toml).
const BUILD_ID = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
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
