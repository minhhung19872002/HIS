import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    exclude: [
      '@cornerstonejs/dicom-image-loader',
      '@cornerstonejs/codec-charls',
      '@cornerstonejs/codec-libjpeg-turbo-8bit',
      '@cornerstonejs/codec-openjpeg',
      '@cornerstonejs/codec-openjph',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-charts': ['recharts'],
          'vendor-signalr': ['@microsoft/signalr'],
          'vendor-utils': ['axios', 'dayjs', '@tanstack/react-query'],
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
