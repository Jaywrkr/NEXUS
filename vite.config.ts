import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Dos páginas: index.html = Los Nexus 3D (actual), 2d.html = la versión 2D original en Phaser.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        legacy2d: resolve(__dirname, '2d.html'),
      },
    },
  },
});
