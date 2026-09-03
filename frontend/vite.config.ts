import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Dev only: forward the relative /api calls to the backend so the same code
    // works in split-dev (HMR) and when the backend serves the built frontend.
    proxy: {
      '/api': 'http://localhost:1337',
    },
  },
});
