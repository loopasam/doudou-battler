import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: '/doudou-battler/',
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        game: resolve(rootDirectory, 'index.html'),
        studio: resolve(rootDirectory, 'studio/index.html'),
      },
    },
  },
});
