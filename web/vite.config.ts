import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { execSync } from 'child_process';

const gitHash = execSync('git rev-parse --short HEAD').toString().trim();
const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const buildDate = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
const buildTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
const appVersion = `${buildDate}-${buildTime}+${gitHash}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        secure: false,
      },
    },
  },
});
