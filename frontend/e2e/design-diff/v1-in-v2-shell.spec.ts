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

const setupAuth = async (page: any) => {
  await page.route('http://localhost:5106/**', async (route: any) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: DEMO_USER }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });
  await page.addInitScript((user: any) => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, DEMO_USER);
};

for (const slug of ['prescription', 'blood-bank', 'emr']) {
  test(`capture /v2/${slug} (v1 inside terminal)`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupAuth(page);
    await page.goto(`${BASE}/v2/${slug}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.his-app', { timeout: 15_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(OUT, `v1-in-v2-${slug}.png`), fullPage: true });
  });
}
