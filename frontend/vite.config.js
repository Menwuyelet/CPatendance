import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const proxyTarget =
    env.VITE_PROXY_TARGET ||
    env.VITE_BACKEND_URL ||
    'http://127.0.0.1:8000';

  return {
    plugins: [react()],

    server: {
      port: 5173,
      host: true, // allows access from local network / mobile testing

      proxy: {
        // Proxy for API calls – IMPORTANT: we DO NOT strip /api prefix anymore
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // REMOVE or COMMENT OUT the rewrite line below
          // rewrite: (path) => path.replace(/^\/api/, ''),  // ← this was causing the problem

          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              console.error(
                `[vite proxy] Error proxying ${req.url} → ${proxyTarget}`,
                err?.code || err.message
              );
            });
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log(
                `[vite proxy] ${req.method} ${req.url} → ${proxyTarget}${req.url}`
              );
            });
          },
        },

        // You can keep /auth proxy if you want to use /auth/login/ in frontend
        // But since your backend uses /api/auth/..., it's better to just use /api
        // '/auth': { ... }  // ← optional – you can remove this block
      },
    },

    optimizeDeps: {
      include: ['@remix-run/router', 'react-router-dom'],
    },

    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },

    build: {
      // Increase chunk size warning limit (optional)
      chunkSizeWarningLimit: 1000,
      
      rollupOptions: {
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-mui': ['@mui/material', '@mui/icons-material', '@mui/lab'],
            // Heavy libraries in separate chunks
            'vendor-tensorflow': ['@tensorflow/tfjs', '@tensorflow-models/face-landmarks-detection'],
            'vendor-mediapipe': ['@mediapipe/tasks-vision'],
          },
        },
      },
    },
  };
});
