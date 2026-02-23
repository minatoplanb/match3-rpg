import { defineConfig } from 'vite';

export default defineConfig({
  base: '/match3-rpg/',
  server: {
    port: 3000,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0
  }
});
