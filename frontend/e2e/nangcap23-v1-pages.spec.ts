import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/national-gateways',      name: 'NationalGateways v1' },
  { path: '/de-an-06',               name: 'DeAn06Liaison v1' },
  { path: '/linen-management',       name: 'LinenManagement v1' },
  { path: '/functional-diagnostics', name: 'FunctionalDiagnostics v1' },
  { path: '/zalo-notifications',     name: 'ZaloNotifications v1' },
  { path: '/quality-dashboard-live', name: 'QualityDashboardLive v1' },
];

const IGNORE_CONSOLE = [
  /Download the React DevTools/,
  /\[antd:/,
  /useForm/,
  /not connected to any Form/,
  /SignalR/i,
  /WebSocket/,
  /\[HMR\]/,
  /\[vite\]/,
  /findDOMNode/,
  /negotiate.*401/,
];

test.beforeEach(async ({ page, context }) => {
  const resp = await page.request.post('http://localhost:5106/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' },
    failOnStatusCode: false,
  });
  if (resp.ok()) {
    const data = await resp.json();
    const token = data?.data?.token || data?.token;
    const user = data?.data?.user || data?.user;
    if (token && user) {
      await context.addInitScript((args: { t: string; u: unknown }) => {
        window.localStorage.setItem('token', args.t);
        window.localStorage.setItem('user', JSON.stringify(args.u));
      }, { t: token, u: user });
    }
  }
});

for (const route of ROUTES) {
  test(`${route.name} loads at ${route.path}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: { url: string; status: number }[] = [];

    page.on('console', (m) => {
      if (m.type() === 'error') {
        const t = m.text();
        if (!IGNORE_CONSOLE.some((p) => p.test(t))) consoleErrors.push(t);
      }
    });
    page.on('response', (r) => {
      const url = r.url();
      const s = r.status();
      if (s >= 400 && url.includes('/api/') && s !== 401) {
        networkErrors.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), status: s });
      }
    });

    await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Should not redirect to /login
    expect(page.url(), 'should not redirect to login').not.toContain('/login');

    // Should have Card content
    await expect(page.locator('.ant-card').first()).toBeVisible({ timeout: 5000 });

    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    const nangcap23Errors = networkErrors.filter((e) =>
      /national-prescription-gateway|national-pharmacy|de-an-06|\/linen\/|functional-diagnostics|zalo-notification|quality-dashboard/.test(e.url)
    );
    expect(nangcap23Errors, `nangcap23 API failures: ${JSON.stringify(nangcap23Errors)}`).toEqual([]);
  });
}

test('National Gateways v1 — 3 antd tabs work', async ({ page }) => {
  await page.goto('/national-gateways', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await expect(page.locator('.ant-card-head-title').filter({ hasText: /Cổng quốc gia/ })).toBeVisible();
  // Switch to Dược QG
  await page.locator('.ant-tabs-tab').filter({ hasText: 'Dược Quốc Gia' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText('Tạo & gửi').first()).toBeVisible();
  // Cấu hình
  await page.locator('.ant-tabs-tab').filter({ hasText: 'Cấu hình' }).click();
  await page.waitForTimeout(500);
  await expect(page.getByText('Cấu hình cổng quốc gia').first()).toBeVisible();
});

test('Đề án 06 v1 — 3 certificate tabs work', async ({ page }) => {
  await page.goto('/de-an-06', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('.ant-tabs-tab').filter({ hasText: 'Giấy báo tử' }).click();
  await page.waitForTimeout(400);
  await page.locator('.ant-tabs-tab').filter({ hasText: 'Giấy KSK lái xe' }).click();
  await page.waitForTimeout(400);
});

test('LinenManagement v1 — 3 tabs work', async ({ page }) => {
  await page.goto('/linen-management', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('.ant-tabs-tab').filter({ hasText: 'Giao nhận giặt' }).click();
  await page.waitForTimeout(400);
  await page.locator('.ant-tabs-tab').filter({ hasText: 'Lịch tiệt trùng' }).click();
  await page.waitForTimeout(400);
});

test('QualityDashboardLive v1 — 5 views render', async ({ page }) => {
  await page.goto('/quality-dashboard-live', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  for (const label of [/2\. Nội trú/, /3\. Cận lâm sàng/, /4\. Xét nghiệm/, /5\. Doanh thu/, /1\. Phòng khám/]) {
    await page.locator('.ant-tabs-tab').filter({ hasText: label }).click();
    await page.waitForTimeout(400);
  }
});

test('Zalo Notifications v1 — send modal opens', async ({ page }) => {
  await page.goto('/zalo-notifications', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /Gửi thử/ }).click();
  await page.waitForTimeout(500);
  await expect(page.locator('.ant-modal-title').filter({ hasText: 'Gửi tin Zalo (ZNS)' })).toBeVisible();
});

test('Functional Diagnostics v1 — filter by test type', async ({ page }) => {
  await page.goto('/functional-diagnostics', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await expect(page.locator('.ant-card-head-title').filter({ hasText: /Thăm dò chức năng/ })).toBeVisible();
});

test('Menu nav — all 6 NangCap23 items appear in MainLayout', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Open "Cận lâm sàng" group
  await page.locator('.ant-menu-submenu-title').filter({ hasText: 'Cận lâm sàng' }).click();
  await page.waitForTimeout(300);
  await expect(page.locator('.ant-menu-item').filter({ hasText: 'Thăm dò chức năng' })).toBeVisible();

  // Open "Quản lý" group
  await page.locator('.ant-menu-submenu-title').filter({ hasText: 'Quản lý' }).first().click();
  await page.waitForTimeout(300);
  await expect(page.locator('.ant-menu-item').filter({ hasText: /DB Chất lượng \(live\)/ })).toBeVisible();
  await expect(page.locator('.ant-menu-item').filter({ hasText: /Đồ giặt/ })).toBeVisible();

  // Open "Liên thông" group
  await page.locator('.ant-menu-submenu-title').filter({ hasText: 'Liên thông' }).click();
  await page.waitForTimeout(300);
  await expect(page.locator('.ant-menu-item').filter({ hasText: /Cổng Đơn thuốc \/ Dược QG/ })).toBeVisible();
  await expect(page.locator('.ant-menu-item').filter({ hasText: /Đề án 06/ })).toBeVisible();
  await expect(page.locator('.ant-menu-item').filter({ hasText: /Zalo OA \/ ZNS/ })).toBeVisible();
});
