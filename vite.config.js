import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 3000 matches Supabase's default Site URL (http://localhost:3000), so
    // Google OAuth redirects land back on the dev server without extra config.
    port: 3000,
    // The studio sidecar (server/index.mjs) holds the AI keys; the SPA only
    // ever talks to it through this proxy.
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});
