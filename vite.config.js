import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'src/assets',  // serves src/assets/ as static files at the root URL
});
