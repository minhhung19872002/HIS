import { defineConfig, devices } from '@playwright/test';

/**
 * HIS - Playwright E2E Testing Configuration
 * Cau hinh test tu dong cho Hospital Information System
 */
export default defineConfig({
  // Thu muc chua test files
  testDir: './e2e',

  // design-diff/* la workbench so anh voi design pack — can server rieng :3003 serve __design/*.html.
  // Khong phai regression: loai khoi run mac dinh (mo lai bang cach sua testIgnore khi lam design).
  testIgnore: ['**/design-diff/**'],

  // Chay test song song
  fullyParallel: true,

  // Khong cho phep test.only trong CI
  forbidOnly: !!process.env.CI,

  // Retry khi fail
  retries: process.env.CI ? 2 : 0,

  // So worker chay parallel
  workers: process.env.CI ? 1 : undefined,

  // Reporter - tao bao cao
  reporter: [
    ['html', { outputFolder: process.env.PLAYWRIGHT_HTML_REPORT || 'playwright-report' }],
    ['list']
  ],

  // Cau hinh chung cho moi test
  use: {
    // URL goc cua ung dung
    baseURL: 'http://localhost:3001',

    // Chup anh khi test fail
    screenshot: 'only-on-failure',

    // Quay video khi test fail
    video: 'on-first-retry',

    // Ghi lai trace de debug
    trace: 'on-first-retry',

    // Locale tieng Viet
    locale: 'vi-VN',

    // Timezone Vietnam
    timezoneId: 'Asia/Ho_Chi_Minh',
  },

  // Cau hinh browser
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Co the them Firefox, Safari neu can
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Tu dong khoi dong dev server truoc khi test
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
