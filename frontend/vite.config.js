import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load all env vars (incl. VITE_*) so the proxy can be configured without editing code
  const env = loadEnv(mode, process.cwd(), '');

  // Where the Vite dev server should proxy /api requests to.
  // Keep the current default, but allow override via .env.local
  const proxyTarget =
    env.VITE_PROXY_TARGET || env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          // Optional: rewrite if your backend URLs have extra prefix
          // rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            // Keep logs actionable when the backend isn't running/reachable
            proxy.on('error', (err) => {
              console.error(
                `[vite proxy] failed to reach backend at ${proxyTarget}:`,
                err?.code || err
              );
            });
          },
        },
      },
    },
  };
});
