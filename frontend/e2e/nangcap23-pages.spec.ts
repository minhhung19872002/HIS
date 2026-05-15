import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/v2/national-gateways',      name: 'NationalGateways',      testId: 'national-gateways-page' },
  { path: '/v2/de-an-06',               name: 'DeAn06Liaison',         testId: 'de-an-06-page' },
  { path: '/v2/linen-management',       name: 'LinenManagement',       testId: 'linen-management-page' },
  { path: '/v2/functional-diagnostics', name: 'FunctionalDiagnostics', testId: 'functional-diagnostics-page' },
  { path: '/v2/zalo-notifications',     name: 'ZaloNotifications',     testId: 'zalo-notifications-page' },
  { path: '/v2/quality-dashboard-live', name: 'QualityDashboardLive',  testId: 'quality-dashboard-page' },
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
  await context.addInitScript(() => {
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  });
  const resp = await page.request.post('http://localhost:5106/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' },
    failOnStatusCode: false,
  });
  if (resp.ok()) {
    const data = await resp.json();
    const token = data?.data?.token || data?.token;
    if (token) {
      await context.addInitScript((t: string) => {
        window.localStorage.setItem('token', t);
      }, token);
    }
  }
});

for (const route of ROUTES) {
  test(`${route.name} - loads + has data-testid`, async ({ page }) => {
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

    // Page wrapper must be present
    await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 5000 });

    // No JS errors
    expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
    // No API 4xx/5xx on the NangCap23 endpoints
    const nangcap23Errors = networkErrors.filter((e) =>
      /national-prescription-gateway|national-pharmacy|de-an-06|\/linen\/|functional-diagnostics|zalo-notification|quality-dashboard/.test(e.url)
    );
    expect(nangcap23Errors, `nangcap23 API failures: ${JSON.stringify(nangcap23Errors)}`).toEqual([]);
  });
}

test('NationalGateways - 3 tabs render', async ({ page }) => {
  await page.goto('/v2/national-gateways', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('national-gateways-page')).toBeVisible();
  // Switch to Dược QG tab
  await page.getByRole('button', { name: /Dược QG/ }).click();
  await page.waitForTimeout(500);
  // Switch to Cấu hình
  await page.getByRole('button', { name: /Cấu hình/ }).click();
  await page.waitForTimeout(800);
  await expect(page.getByTestId('gateway-config-panel')).toBeVisible({ timeout: 5000 });
});

test('DeAn06Liaison - 3 tabs render', async ({ page }) => {
  await page.goto('/v2/de-an-06', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('de-an-06-page')).toBeVisible();
  await page.getByRole('button', { name: /Giấy báo tử/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Giấy KSK lái xe/ }).click();
  await page.waitForTimeout(400);
});

test('LinenManagement - 3 tabs render', async ({ page }) => {
  await page.goto('/v2/linen-management', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('linen-management-page')).toBeVisible();
  await page.getByRole('button', { name: /Giao nhận giặt/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Lịch tiệt trùng/ }).click();
  await page.waitForTimeout(400);
});

test('QualityDashboardLive - all 5 views switch OK', async ({ page }) => {
  await page.goto('/v2/quality-dashboard-live', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('quality-dashboard-page')).toBeVisible();
  for (const tab of [/Nội trú/, /Cận lâm sàng/, /Xét nghiệm/, /Doanh thu trong ngày/, /Phòng khám/]) {
    await page.getByRole('button', { name: tab }).first().click();
    await page.waitForTimeout(400);
  }
});

test('ZaloNotifications - send modal opens', async ({ page }) => {
  await page.goto('/v2/zalo-notifications', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('zalo-notifications-page')).toBeVisible();
  await page.getByRole('button', { name: /Gửi thử/ }).click();
  await page.waitForTimeout(500);
  // Modal title visible
  await expect(page.getByText('Gửi tin Zalo (ZNS)')).toBeVisible({ timeout: 3000 });
});

test('FunctionalDiagnostics - filters work', async ({ page }) => {
  await page.goto('/v2/functional-diagnostics', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('functional-diagnostics-page')).toBeVisible();
});
