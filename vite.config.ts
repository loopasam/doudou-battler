import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCurationPlugin } from './curation-vite-plugin';

const rootDirectory = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: '/doudou-battler/',
  plugins: [createCurationPlugin(rootDirectory)],
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
