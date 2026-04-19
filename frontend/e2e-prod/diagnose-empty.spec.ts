import { test, Page } from '@playwright/test';

const EMPTY_PAGES = [
  '/microbiology',
  '/sample-storage',
  '/quality',
  '/patient-portal',
  '/medical-record-archive',
  '/satisfaction-survey',
];

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder*="đăng nhập" i], input[name="username"], #username', 'admin');
  await page.fill('input[type="password"], #password', 'Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
}

test.describe.configure({ mode: 'serial', timeout: 300000 });

test('diagnose why flagged pages render empty', async ({ page }) => {
  test.setTimeout(300000);
  await login(page);

  for (const route of EMPTY_PAGES) {
    const consoleErrors: string[] = [];
    const xhrFailures: string[] = [];
    const xhrs: Array<{ url: string; status: number }> = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 200));
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
    page.on('response', (res) => {
      if (res.url().includes('/api/')) {
        xhrs.push({ url: res.url().split('/api/')[1].substring(0, 100), status: res.status() });
        if (res.status() >= 400) xhrFailures.push(`${res.status()} ${res.url().split('/api/')[1]}`);
      }
    });

    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(4000);

    const tableRows = await page.locator('.ant-table-tbody > tr:not(.ant-table-placeholder)').count();
    const emptyCount = await page.locator('.ant-empty').count();
    const listItems = await page.locator('.ant-list-item').count();
    const cards = await page.locator('.ant-card').count();
    const statNumbers = await page.locator('.ant-statistic-content-value').count();
    const tabs = await page.locator('.ant-tabs-tab').count();

    // What API calls did the page actually make?
    const uniqueApis = Array.from(new Set(xhrs.map((x) => x.url.split('?')[0]))).sort();

    console.log(`\n=== ${route} ===`);
    console.log(`  rows=${tableRows} empties=${emptyCount} listItems=${listItems} cards=${cards} stats=${statNumbers} tabs=${tabs}`);
    console.log(`  XHR failures (${xhrFailures.length}):`, xhrFailures.slice(0, 5));
    console.log(`  Console errors (${consoleErrors.length}):`, consoleErrors.slice(0, 3));
    console.log(`  APIs called (${uniqueApis.length}):`);
    uniqueApis.slice(0, 8).forEach((u) => console.log(`    - ${u}`));

    // Cleanup listeners for next route
    page.removeAllListeners('console');
    page.removeAllListeners('pageerror');
    page.removeAllListeners('response');
  }
});
