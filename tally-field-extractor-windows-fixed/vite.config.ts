import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: './', // Important for Electron
  server: {
    proxy: {
      '/api/tally': {
        target: 'http://34.133.208.212:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tally/, ''),
        timeout: 120000, // 2 minutes timeout for Tally API
        proxyTimeout: 120000, // 2 minutes proxy timeout
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});
