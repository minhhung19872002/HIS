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
        // Only proxy exact /health, /health/live, /health/ready, /health/details
        // Do NOT proxy /health-exchange (frontend SPA route)
        bypass(req) {
          if (req.url && req.url.startsWith('/health-exchange')) {
            return req.url;
          }
        },
      },
    },
  },
})
