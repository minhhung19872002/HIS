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

const PAGES = [
  { slug: 'radiology', design: 'RIS.html',      wait: '.ris-wrap',  my: '.ris-wrap' },
  { slug: 'billing',   design: 'Billing.html',  wait: '.bill-wrap', my: '.bill-wrap' },
  { slug: 'surgery',   design: 'OR.html',       wait: '.or-wrap',   my: '.or-wrap' },
  { slug: 'lab',       design: 'LIS.html',      wait: '.lis-wrap',  my: '.lis-wrap' },
];

for (const p of PAGES) {
  test(`capture design ${p.design}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/__design/${p.design}`, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForSelector(p.wait, { timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `design-${p.slug}.png`), fullPage: true });
  });

  test(`capture my /v2/${p.slug}`, async ({ page }) => {
    test.setTimeout(120_000);
    page.on('pageerror', (e) => console.log(`PAGE_EXCEPTION (${p.slug}):`, e.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await setupAuth(page);
    await page.goto(`${BASE}/v2/${p.slug}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector(p.my, { timeout: 20_000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `my-${p.slug}.png`), fullPage: true });
  });
}
