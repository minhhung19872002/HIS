import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteCommonjs()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Cornerstone3D's dicom-image-loader spawns Web Workers and dynamic-imports
  // WASM codecs — Vite's default `iife` worker format breaks code-splitting.
  // ES module workers are supported in all modern browsers we target.
  worker: { format: 'es' },
  optimizeDeps: {
    // Cornerstone's worker loader must stay as source ESM, while dicom-parser
    // needs Vite's CommonJS pre-bundling in development. Codec UMD modules are
    // intentionally not excluded so Vite can expose their default factories.
    exclude: ['@cornerstonejs/dicom-image-loader'],
    include: ['dicom-parser'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-charts': ['recharts'],
          'vendor-signalr': ['@microsoft/signalr'],
          'vendor-utils': ['axios', 'dayjs'],
          'vendor-qrcode': ['html5-qrcode'],
          'vendor-cornerstone': [
            '@cornerstonejs/core',
            '@cornerstonejs/tools',
            '@cornerstonejs/dicom-image-loader',
            'dicom-parser',
          ],
        },
      },
    },
  },
  server: {
    port: 3001,
    // strictPort: fail loudly if 3001 is taken instead of silently moving to 3002
    // (a 2nd dev server on 3002 would still proxy to the runner's 5106 → wrong-window testing).
    // See .claude/workflow/parallel-windows.md case #4.
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5106',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5106',
        changeOrigin: true,
        ws: true,
      },
      '/health': {
        target: 'http://localhost:5106',
        changeOrigin: true,
        // Only proxy /health, /health/live, /health/ready, /health/details (backend)
        // Bypass /health-* routes (frontend SPA: health-exchange, health-checkup, health-education)
        bypass(req) {
          if (req.url && /^\/health-/.test(req.url)) {
            return req.url;
          }
        },
      },
    },
  },
})
