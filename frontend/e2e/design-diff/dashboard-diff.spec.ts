import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://localhost:3003';
const OUT = path.join(__dirname, '__snapshots__');

test.describe.configure({ mode: 'serial' });

test('capture design Dashboard.html', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/__design/Dashboard.html`, { waitUntil: 'networkidle', timeout: 30_000 });
  // Wait for React render
  await page.waitForSelector('.dash-top', { timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, 'design-dashboard.png'), fullPage: true });
});

test('capture my /v2/dashboard', async ({ page }) => {
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('PAGE_ERROR:', m.text());
  });
  page.on('pageerror', (e) => console.log('PAGE_EXCEPTION:', e.message));

  await page.setViewportSize({ width: 1440, height: 900 });

  const DEMO_USER = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    fullName: 'Administrator',
    email: 'admin@his.local',
    roles: ['Admin'],
    permissions: [],
  };

  // Mock ONLY backend API calls (localhost:5106) so the page renders demo
  // data without backend. Vite module URLs also contain "/api/" paths for
  // src/api/*.ts so we must not touch port 3003.
  await page.route('http://localhost:5106/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me') || url.includes('/auth/current')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: DEMO_USER }),
      });
      return;
    }
    // Every other API returns empty envelope — Dashboard falls back to demo.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.addInitScript((user) => {
    localStorage.setItem('token', 'demo-token-for-screenshot');
    localStorage.setItem('user', JSON.stringify(user));
  }, DEMO_USER);

  await page.goto(`${BASE}/v2/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('.dash-top', { timeout: 20_000 });
  // Allow API Promise.allSettled + sparkline spark draws to complete
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, 'my-dashboard.png'), fullPage: true });

  // CmdK open via keyboard
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.his-cmdk', { timeout: 3000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'my-cmdk.png'), fullPage: false });
  await page.keyboard.press('Escape');

  // Notification popover
  await page.waitForTimeout(200);
  await page.locator('.his-tb-btn[title*="Thông báo"]').click();
  await page.waitForSelector('.ant-popover-content', { timeout: 3000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'my-notif-popover.png'), fullPage: false });
  await page.keyboard.press('Escape');

  // User dropdown
  await page.waitForTimeout(200);
  await page.locator('.his-user').click();
  await page.waitForSelector('.ant-dropdown', { timeout: 3000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'my-user-menu.png'), fullPage: false });
  await page.keyboard.press('Escape');
});

test('capture my /v2/dashboard with patient pill', async ({ page }) => {
  page.on('pageerror', (e) => console.log('PAGE_EXCEPTION:', e.message));
  await page.setViewportSize({ width: 1440, height: 900 });

  const DEMO_USER = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    fullName: 'Administrator',
    email: 'admin@his.local',
    roles: ['Admin'],
    permissions: [],
  };
  await page.route('http://localhost:5106/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me') || url.includes('/auth/current')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: DEMO_USER }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
  });
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, DEMO_USER);

  await page.goto(`${BASE}/v2/dashboard?pid=BN-00201`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('.his-patient-pill', { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'my-dashboard-with-patient.png'), fullPage: true });
});
