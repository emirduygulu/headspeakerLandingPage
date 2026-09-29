import { defineConfig } from 'vite';
import { heroHtml } from './src/render.js';

// Hero'yu içerik dosyasından (content.js) build/dev sırasında statik HTML olarak basar.
const staticHero = () => ({
  name: 'noira-static-hero',
  transformIndexHtml: (html) => html.replace('<!--HERO-->', heroHtml()),
});

export default defineConfig({
  base: './',
  plugins: [staticHero()],
  build: {
    target: 'es2022', // top-level await
    chunkSizeWarningLimit: 900,
  },
});
