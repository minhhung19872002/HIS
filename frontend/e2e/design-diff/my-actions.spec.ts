import { test } from '@playwright/test';

const BASE = 'http://localhost:3003';

const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  fullName: 'Administrator',
  email: 'admin@his.local',
  roles: ['Admin'],
  permissions: [],
};

test('my /v2/dashboard click actions', async ({ page }) => {
  test.setTimeout(180_000);
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
  await page.goto(`${BASE}/v2/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.dash-top', { timeout: 15_000 });
  await page.waitForTimeout(1500);

  const selectors = [
    // Data-click popups (the items anh complained weren't opening detail)
    { name: 'er-row',            sel: '.panel:has(.er-chips) tbody tr:nth-child(1)' },
    { name: 'bed-square',        sel: '.bed-grid .bed.occ' },
    { name: 'or-slot',           sel: '.or-slot' },
    { name: 'stock-row',         sel: '.stock-row' },
    { name: 'alert-row',         sel: '.alert-row' },
    { name: 'alerts-xem-het',    sel: '.panel:has(.alert-row) .btn.ghost' },
    // Design-expected non-clickable (no detail): KPI, dept row, staff row
    { name: 'kpi-card',          sel: '.kpi:nth-child(1)' },
    { name: 'opd-dept-row',      sel: '.opd-depts .dept-row:nth-child(1)' },
    { name: 'staff-row',         sel: '.staff-row' },
  ];

  const report: { name: string; exists: boolean; modal: boolean; drawer: boolean; toast: boolean; urlChanged: boolean }[] = [];

  for (const { name, sel } of selectors) {
    // Close any open overlay
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
    // If URL drifted (nav away), put it back
    if (!page.url().includes('/v2/dashboard')) {
      await page.goto(`${BASE}/v2/dashboard`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.dash-top', { timeout: 15_000 });
      await page.waitForTimeout(500);
    }
    const urlBefore = page.url();
    const el = page.locator(sel).first();
    const exists = await el.count() > 0;
    if (!exists) {
      report.push({ name, exists: false, modal: false, drawer: false, toast: false, urlChanged: false });
      continue;
    }
    await el.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(700);
    await page.screenshot({ path: `e2e/design-diff/__snapshots__/probe-${name}.png`, fullPage: false }).catch(() => {});
    report.push({
      name,
      exists: true,
      modal:   (await page.locator('.ant-modal-content').count()) > 0,
      drawer:  (await page.locator('.ant-drawer-content').count()) > 0,
      toast:   (await page.locator('.ant-message-notice-content').count()) > 0,
      urlChanged: page.url() !== urlBefore,
    });
    // Close popup if opened
    const closeBtn = page.locator('.ant-modal-close, .ant-drawer-close').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click({ timeout: 1000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  console.log('MY_ACTIONS_REPORT:', JSON.stringify(report, null, 2));
});
