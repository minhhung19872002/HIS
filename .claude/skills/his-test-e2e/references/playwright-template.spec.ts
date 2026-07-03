// TEMPLATE — HIS Playwright page-load + functional. Copy into frontend/e2e/<feature>-pages.spec.ts
// (Prod smoke: copy into frontend/e2e-prod/ and run with --config=playwright.prod.config.ts)
import { test, expect, request as pwRequest } from '@playwright/test';

const API = process.env.PW_API ?? 'http://localhost:5106/api';
const APP = process.env.PW_APP ?? 'http://localhost:3001';

const ROUTES = [
  { path: '/v2/x-name', name: 'XName', keywords: ['x'] },
];

const IGNORE_CONSOLE = [/SignalR/i, /\[HMR\]/, /\[vite\]/, /WebSocket/, /findDOMNode/, /useForm/];

// Get the token + inject localStorage before entering the app
async function authInit(page: any) {
  const ctx = await pwRequest.newContext();
  const r = await ctx.post(`${API}/auth/login`, { data: { username: 'admin', password: 'Admin@123' } });
  const token = (await r.json())?.data?.token;            // token is at data.data.token
  await page.addInitScript((t: string) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify({ username: 'admin', roles: ['Admin'], permissions: ['*'] }));
  }, token);
}

for (const route of ROUTES) {
  test(`${route.name} - loads without errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') {
        const t = m.text();
        if (!IGNORE_CONSOLE.some((p) => p.test(t))) consoleErrors.push(t);
      }
    });
    const apiFailures: string[] = [];
    page.on('response', (resp) => {
      if (resp.url().includes('/api/') && resp.status() >= 500) apiFailures.push(`${resp.status()} ${resp.url()}`);
    });

    await authInit(page);
    await page.goto(`${APP}${route.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(20);
    expect(consoleErrors, `console errors`).toHaveLength(0);
    expect(apiFailures, `api 5xx`).toHaveLength(0);
  });
}

test('Backend endpoints respond', async ({ request }) => {
  const r = await request.post(`${API}/auth/login`, { data: { username: 'admin', password: 'Admin@123' } });
  const token = (await r.json()).data.token;
  for (const ep of ['/x', '/x/types']) {
    const resp = await request.get(`${API}${ep}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(resp.status(), ep).toBeLessThan(500);
  }
});
