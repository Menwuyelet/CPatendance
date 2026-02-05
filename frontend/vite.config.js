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

  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        fastRefresh: true,
        include: '**/*.jsx',
      }),
    ],

    server: {
      port: 5174,
      host: true,
      https: httpsConfig,

      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/accounts': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/attendance': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/employees': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/biometrics': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    optimizeDeps: {
      include: [
        '@mui/material',
        '@mui/icons-material',
        '@mui/x-date-pickers',
        '@emotion/react',
        '@emotion/styled',
        'dayjs',
        '@remix-run/router',
        'react-router-dom',
        'react',
        'react-dom',
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
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            'vendor-router': ['@remix-run/router'],
          },
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      sourcemap: isProduction ? false : 'inline',
    },
  };
});
