import { defineConfig, devices } from '@playwright/test';

// Данные администратора для e2e/admin.spec.js — из .env.e2e (в .gitignore, образец — .env.e2e.example).
// Файла нет (CI, продакшен-smoke) — тесты администратора просто пропускаются
try {
  process.loadEnvFile('.env.e2e');
} catch {
  // нет файла — ничего страшного
}

// Локально (без BASE_URL) Playwright сам поднимает API (../agromarket-server, локальная база)
// и Vite. С BASE_URL — тесты идут против уже работающего сайта, например продакшена на Vercel:
// туда запускаем только @smoke (npm run e2e:smoke), которые ничего не меняют в базе
const baseURL = process.env.BASE_URL || 'http://localhost:5173';
const isRemote = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: './e2e',
  // Бесплатный Render после простоя просыпается до минуты — для продакшена ждём дольше
  timeout: isRemote ? 90_000 : 30_000,
  expect: { timeout: isRemote ? 15_000 : 5_000 },
  retries: process.env.CI ? 2 : 0,
  workers: 1, // тесты входа делят лимит попыток (ЛР11) и одну базу — по очереди
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',      // запись шагов при повторе
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: isRemote ? undefined : [
    {
      command: 'npm run dev',
      cwd: '../agromarket-server',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
    },
  ],
});
