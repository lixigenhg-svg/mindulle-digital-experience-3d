import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 静态部署友好：资源走相对路径；WS 地址在 src/config.ts 用 VITE_WS_URL 覆盖
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
