import { defineConfig, devices } from '@playwright/test';

const PROD_URL = process.env.PROD_URL || 'https://his-psi.vercel.app';

export default defineConfig({
  testDir: './e2e-prod',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: 'playwright-prod-report.json' }]],
  use: {
    baseURL: PROD_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
