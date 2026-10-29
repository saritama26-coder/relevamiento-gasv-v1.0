import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Configuración independiente de la PWA para producir un único HTML portable.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), '.'),
    },
  },
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: path.resolve(process.cwd(), 'index.html'),
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'gasv-standalone.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
