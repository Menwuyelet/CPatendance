import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // or whatever you use
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // your Django server
        changeOrigin: true,
        secure: false,
        // Optional: rewrite if your backend URLs have extra prefix
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});