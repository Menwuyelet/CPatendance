import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Check for HTTPS certificates
const certDir = path.resolve(__dirname, 'cert');
const hasHttps = fs.existsSync(path.join(certDir, 'cert.pem')) &&
                 fs.existsSync(path.join(certDir, 'key.pem'));

const httpsConfig = hasHttps ? {
  cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
  key: fs.readFileSync(path.join(certDir, 'key.pem')),
} : undefined;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const proxyTarget = env.VITE_PROXY_TARGET ||
                      env.VITE_BACKEND_URL ||
                      'http://127.0.0.1:8000';

  return {
    plugins: [react()],

    server: {
      port: 5174,
      host: true,           // allow access from local network / mobile testing
      https: httpsConfig,   // use HTTPS only if certificates exist

      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err, req) => {
              console.error(
                `[vite proxy] Error proxying ${req.method} ${req.url} → ${proxyTarget}`,
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
      },

      // Uncomment if you want to disable the red error overlay in browser
      // hmr: { overlay: false },
    },

    optimizeDeps: {
      include: [
        '@mui/material',
        '@mui/icons-material',
        '@mui/x-date-pickers',
        '@emotion/react',
        '@emotion/styled',
        'dayjs',                    // if using AdapterDayjs
        '@remix-run/router',
        'react-router-dom',
      ],
      exclude: [
        'moment',
        'moment-timezone',
      ],
    },

    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
    },

    build: {
      chunkSizeWarningLimit: 1000,
    },
  };
});