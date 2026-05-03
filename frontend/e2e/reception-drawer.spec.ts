import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, context }) => {
  const resp = await page.request.post('http://localhost:5106/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const data = await resp.json();
  const token = data?.data?.token;
  await context.addInitScript((t: string) => {
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  }, token);
});

test('Reception drawer renders enriched fields', async ({ page }) => {
  const networkErrors: { url: string; status: number }[] = [];
  page.on('response', (resp) => {
    if (resp.status() >= 400 && resp.url().includes('/api/') && !resp.url().includes('/auth/me')) {
      networkErrors.push({ url: resp.url().replace(/^https?:\/\/[^/]+/, ''), status: resp.status() });
    }
  });

  await page.goto('/v2/reception', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Click first non-header row in the table (skip the checkbox cell)
  const firstRow = page.locator('.ab-tbl tbody tr').first();
  await expect(firstRow).toBeVisible({ timeout: 10000 });

  // Click on the patient name cell to open the drawer
  await firstRow.locator('td').nth(2).click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: 'test-results/reception-after-click.png', fullPage: true });

  // Antd v6 may use ant-drawer or [role=dialog] — try multiple selectors
  const drawer = page.locator('.ant-drawer-content, [role="dialog"]').first();
  await expect(drawer).toBeVisible({ timeout: 5000 });

  const drawerText = await drawer.innerText();
  console.log('=== DRAWER TEXT ===');
  console.log(drawerText);
  console.log('=== END ===');

  await page.screenshot({ path: 'test-results/reception-drawer.png', fullPage: false });
  await drawer.screenshot({ path: 'test-results/reception-drawer-only.png' });

  // Detect issues
  const issues: string[] = [];
  if (drawerText.includes('CfDJ')) issues.push('encrypted blob (CfDJ…)');
  if (drawerText.includes('undefined')) issues.push('undefined leaked');
  if (/—t\b/.test(drawerText) && !/\d+t/.test(drawerText)) issues.push('age missing (—t)');
  if (drawerText.match(/—\s*·\s*—/)) issues.push('all dashes');
  if (drawerText.includes('NaN')) issues.push('NaN');
  if (drawerText.includes('null')) issues.push('null leaked');

  if (issues.length > 0) {
    console.log('\n⚠ ISSUES:', issues.join(', '));
  }
  if (networkErrors.length > 0) {
    console.log('\n⚠ NETWORK:', networkErrors.map((e) => `[${e.status}] ${e.url}`).join('\n  '));
  }

  // Hard assertions
  expect(networkErrors, 'No 4xx/5xx').toHaveLength(0);
  expect(drawerText, 'No encrypted blobs').not.toContain('CfDJ');
  expect(drawerText, 'No undefined').not.toContain('undefined');

  // Switch to Audit tab
  await drawer.locator('.rec-drawer-tabs button').nth(1).click();
  await page.waitForTimeout(400);
  await drawer.screenshot({ path: 'test-results/reception-drawer-audit.png' });
  const auditText = await drawer.innerText();
  expect(auditText, 'Audit shows events').toContain('Đến tiếp đón');
  expect(auditText, 'Audit shows xác thực').toContain('Xác thực');

  // Switch to Related tab
  await drawer.locator('.rec-drawer-tabs button').nth(2).click();
  await page.waitForTimeout(400);
  await drawer.screenshot({ path: 'test-results/reception-drawer-related.png' });
});
