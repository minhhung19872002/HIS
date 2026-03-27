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
