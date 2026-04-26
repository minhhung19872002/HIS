import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/v2/dashboard',     name: 'Dashboard' },
  { path: '/v2/reception',     name: 'Reception' },
  { path: '/v2/opd',           name: 'OPD' },
  { path: '/v2/ipd',           name: 'Inpatient' },
  { path: '/v2/prescription',  name: 'Prescription' },
  { path: '/v2/pharmacy',      name: 'Pharmacy' },
  { path: '/v2/surgery',       name: 'Surgery' },
  { path: '/v2/billing',       name: 'Billing' },
  { path: '/v2/lab',           name: 'Laboratory' },
  { path: '/v2/radiology',     name: 'Radiology' },
  { path: '/v2/blood-bank',    name: 'BloodBank' },
  { path: '/v2/emr',           name: 'EMR' },
  { path: '/v2/consultation',  name: 'Consultation' },
  { path: '/v2/follow-up',     name: 'FollowUp' },
  { path: '/v2/pathology',     name: 'Pathology' },
  { path: '/v2/insurance',     name: 'Insurance' },
  { path: '/v2/reports',       name: 'Reports' },
  { path: '/v2/master-data',   name: 'MasterData' },
];

const IGNORE_CONSOLE_PATTERNS = [
  /Download the React DevTools/,
  /\[antd:/,
  /\[antd: /,
  /useForm/,
  /not connected to any Form/,
  /SignalR/i,
  /signalr/,
  /WebSocket/,
  /\[HMR\]/,
  /\[vite\]/,
  /Vite HMR/,
  // Cosmetic dev warnings about Reactstrict mode + future API changes
  /findDOMNode/,
  // Unauthenticated SignalR negotiation noise
  /negotiate.*401/,
];

test.beforeEach(async ({ page, context }) => {
  // Inject token + user into localStorage so ProtectedRoute lets us through
  await context.addInitScript(() => {
    // Login state — admin user
    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjllNTMwOWRjLWVjZjktNGQ0OC05YTA5LTIyNGNkMTUzNDdiMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ.invalid';
    window.localStorage.setItem('token', fakeToken);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd153 47b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  });

  // Real-login fallback to set live token (so API calls succeed)
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
  test(`${route.name} (${route.path})`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkErrors: { url: string; status: number }[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!IGNORE_CONSOLE_PATTERNS.some((p) => p.test(text))) {
          consoleErrors.push(text);
        }
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    page.on('response', (resp) => {
      const url = resp.url();
      const status = resp.status();
      if (status >= 400 && url.includes('/api/')) {
        // Ignore 401 (auth issues — separate from page bugs)
        // Ignore 404 on optional endpoints
        if (status === 401) return;
        networkErrors.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), status });
      }
    });

    await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500); // give time for API + render

    // Check basic render
    const bodyText = await page.locator('body').innerText();
    const hasContent = bodyText.length > 100;

    // Report
    const summary: string[] = [];
    if (!hasContent) summary.push(`⚠ Page rendered <100 chars`);
    if (pageErrors.length > 0) summary.push(`💥 ${pageErrors.length} page errors:\n  - ${pageErrors.join('\n  - ')}`);
    if (consoleErrors.length > 0) summary.push(`🟥 ${consoleErrors.length} console errors:\n  - ${consoleErrors.slice(0, 5).join('\n  - ')}`);
    if (networkErrors.length > 0) summary.push(`🟧 ${networkErrors.length} network 4xx/5xx:\n  - ${networkErrors.slice(0, 5).map((e) => `[${e.status}] ${e.url}`).join('\n  - ')}`);

    if (summary.length > 0) {
      console.log(`\n=== ${route.name} (${route.path}) ===\n${summary.join('\n')}`);
    } else {
      console.log(`✓ ${route.name} (${route.path}) — clean`);
    }

    // Take screenshot
    await page.screenshot({ path: `test-results/v2-audit-${route.name}.png`, fullPage: false });

    // Soft assertions — only fail on page errors (real crashes)
    expect(pageErrors, `Page crashes:\n${pageErrors.join('\n')}`).toHaveLength(0);
  });
}
