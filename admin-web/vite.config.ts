import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Alias `@` trỏ thẳng vào mã nguồn của HIS frontend: 5 màn quản trị và bộ `_v2kit` giữ MỘT bản
// duy nhất, không sao chép. Sao chép ra thì vài tháng sau hai bản lệch nhau và không ai biết bản
// nào đúng. Vite chỉ gói những gì thật sự được dùng tới, nên bundle không kéo theo cả HIS.
const hisSrc = path.resolve(__dirname, '../frontend/src');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': hisSrc },
  },
  server: { port: 3002, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
