import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/static/app/',
  build: {
    outDir: '../public/app',
    emptyOutDir: true,
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  server: {
    proxy: {
      '/api': 'http://localhost:7431',
      '/v1': 'http://localhost:7431',
      '/llm': 'http://localhost:7431',
      '/asr': 'http://localhost:7431',
      '/tts': 'http://localhost:7431',
    },
  },
})
