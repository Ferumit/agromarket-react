import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',               // в тестах есть document, window
    globals: true,                      // describe, test, expect, vi без import
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'], // e2e-тесты Playwright сюда не попадут
    css: false,
    coverage: {
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx}'],
    },
  },
})
