import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://localhost:3003';
const OUT = path.join(__dirname, '__snapshots__');

const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin', fullName: 'Administrator', email: 'admin@his.local',
  roles: ['Admin'], permissions: [],
};

test('capture design Pharmacy.html', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/__design/Pharmacy.html`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForSelector('.rx-wrap', { timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'design-pharmacy.png'), fullPage: true });
});

test('capture my /v2/pharmacy', async ({ page }) => {
  test.setTimeout(120_000);
  page.on('pageerror', (e) => console.log('PAGE_EXCEPTION:', e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('http://localhost:5106/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: DEMO_USER }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, DEMO_USER);
  await page.goto(`${BASE}/v2/pharmacy`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('.rx-wrap', { timeout: 20_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, 'my-pharmacy.png'), fullPage: true });
});
