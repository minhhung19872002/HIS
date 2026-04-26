import { test, expect } from '@playwright/test';

const NEW_ROUTES = [
  '/v2/admin', '/v2/quality', '/v2/equipment', '/v2/chronic-disease',
  '/v2/hiv-management', '/v2/tb-hiv-management', '/v2/mental-health',
  '/v2/telemedicine', '/v2/sms-management', '/v2/signing-workflow',
  '/v2/patient-portal', '/v2/doctor-portal', '/v2/hospital-pharmacy',
  '/v2/procurement', '/v2/medical-supply',
];

test.beforeEach(async ({ page, context }) => {
  const resp = await page.request.post('http://localhost:5106/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' }, failOnStatusCode: false,
  });
  if (resp.ok()) {
    const data = await resp.json();
    const token = data?.data?.token;
    if (token) {
      await context.addInitScript((t: string) => {
        window.localStorage.setItem('token', t);
        window.localStorage.setItem('user', JSON.stringify({
          id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1', username: 'admin', fullName: 'Admin', roles: ['Admin'], permissions: ['*'],
        }));
      }, token);
    }
  }
});

const IGNORE = [/Download the React DevTools/, /\[antd:/, /SignalR/i, /WebSocket/, /\[HMR\]/, /\[vite\]/, /negotiate.*401/];

for (const path of NEW_ROUTES) {
  test(`audit ${path}`, async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const t = m.text();
        if (!IGNORE.some((p) => p.test(t))) errs.push(t);
      }
    });
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const text = await page.locator('body').innerText();
    if (errs.length || text.length < 100) {
      console.log(`✗ ${path}: ${errs.length} errors, body=${text.length}ch`);
      console.log('  ' + errs.slice(0, 3).join('\n  '));
    } else {
      console.log(`✓ ${path}`);
    }
    expect(errs, `Errors:\n${errs.join('\n')}`).toHaveLength(0);
  });
}
