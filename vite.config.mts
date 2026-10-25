import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: path.resolve(import.meta.dirname, 'app/ui'),
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'app/ui/src')
    }
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'app/ui/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(import.meta.dirname, 'app/ui/index.html')
    }
  }
});
