import { test, expect } from '@playwright/test';
import { waitForLoading } from './helpers/test-utils';

const ROUTES = [
  { path: '/', name: 'Dashboard' },
  { path: '/reception', name: 'Reception' },
  { path: '/opd', name: 'OPD' },
  { path: '/prescription', name: 'Prescription' },
  { path: '/ipd', name: 'Inpatient' },
  { path: '/surgery', name: 'Surgery' },
  { path: '/pharmacy', name: 'Pharmacy' },
  { path: '/lab', name: 'Laboratory' },
  { path: '/radiology', name: 'Radiology' },
  { path: '/blood-bank', name: 'Blood Bank' },
  { path: '/billing', name: 'Billing' },
  { path: '/finance', name: 'Finance' },
  { path: '/insurance', name: 'Insurance' },
  { path: '/master-data', name: 'Master Data' },
  { path: '/reports', name: 'Reports' },
  { path: '/admin', name: 'System Admin' },
  { path: '/medical-forensics', name: 'Medical Forensics' },
  { path: '/community-health', name: 'Community Health' },
  { path: '/food-safety', name: 'Food Safety' },
  { path: '/traditional-medicine', name: 'Traditional Medicine' },
  { path: '/reproductive-health', name: 'Reproductive Health' },
  { path: '/mental-health', name: 'Mental Health' },
  { path: '/environmental-health', name: 'Environmental Health' },
  { path: '/trauma-registry', name: 'Trauma Registry' },
  { path: '/population-health', name: 'Population Health' },
  { path: '/health-education', name: 'Health Education' },
  { path: '/practice-license', name: 'Practice License' },
  { path: '/inter-hospital', name: 'Inter-Hospital Sharing' },
];

const CORE_API_ENDPOINTS = [
  { path: 'http://localhost:5106/health', maxMs: 3000 },
  { path: '/api/reception/admissions/today', maxMs: 3000 },
  { path: '/api/examination/rooms/active', maxMs: 3000 },
  { path: '/api/pharmacy/pending-prescriptions', maxMs: 3000 },
  { path: '/api/reporting/dashboard', maxMs: 5000 },
  { path: '/api/dqgvn/dashboard', maxMs: 3000 },
  { path: '/api/cda?pageIndex=0&pageSize=10', maxMs: 3000 },
  { path: '/api/RISComplete/waiting-list', maxMs: 5000 },
];

const IGNORED_CONSOLE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'NotImplementedException',
  'not implemented',
  'ECONNREFUSED',
  'Failed to start the connection',
  'connection was stopped during negotiation',
  'useForm',
  'is not connected to any Form element',
  'Failed to load resource',
];

function isIgnoredMessage(message: string) {
  return IGNORED_CONSOLE_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase()),
  );
}

test.describe('Health Audit', () => {
  let authToken = '';
  let authUser: unknown;

  test.beforeAll(async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'Admin@123' },
    });
    expect(loginResponse.ok()).toBeTruthy();

    const loginJson = await loginResponse.json();
    authToken = loginJson?.data?.token ?? loginJson?.token;
    authUser = loginJson?.data?.user ?? loginJson?.user;

    expect(authToken).toBeTruthy();
    expect(authUser).toBeTruthy();
  });

  test('core APIs respond within expected thresholds', async ({ request }) => {
    for (const endpoint of CORE_API_ENDPOINTS) {
      const startedAt = Date.now();
      const response = await request.get(endpoint.path, {
        headers: endpoint.path.includes('localhost:5106/health')
          ? undefined
          : { Authorization: `Bearer ${authToken}` },
      });
      const duration = Date.now() - startedAt;

      expect(response.ok(), `${endpoint.path} status ${response.status()}`).toBeTruthy();
      expect(duration, `${endpoint.path} duration`).toBeLessThan(endpoint.maxMs);
      console.log(`[audit][api] ${endpoint.path} -> ${response.status()} in ${duration}ms`);
    }
  });

  for (const route of ROUTES) {
    test(`${route.name} route renders without severe browser errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const failedRequests: string[] = [];
      const serverErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (!isIgnoredMessage(text)) {
          consoleErrors.push(text);
        }
      });

      page.on('pageerror', (error) => {
        const text = String(error);
        if (!isIgnoredMessage(text)) {
          pageErrors.push(text);
        }
      });

      page.on('requestfailed', (request) => {
        const failure = request.failure()?.errorText ?? 'unknown failure';
        const url = request.url();
        if (failure.includes('net::ERR_ABORTED')) return;
        if (!isIgnoredMessage(`${url} ${failure}`)) {
          failedRequests.push(`${request.method()} ${url} -> ${failure}`);
        }
      });

      page.on('response', (response) => {
        const request = response.request();
        const resourceType = request.resourceType();
        if (!['document', 'xhr', 'fetch'].includes(resourceType)) return;
        if (response.url().includes('/hubs/notifications/')) return;
        if (response.url().includes('/notification/')) return;

        if (response.status() >= 400) {
          const entry = `${response.status()} ${request.method()} ${response.url()}`;
          if (!isIgnoredMessage(entry)) {
            serverErrors.push(entry);
          }
        }
      });

      await page.addInitScript(
        ([token, user]) => {
          window.localStorage.setItem('token', token);
          window.localStorage.setItem('user', JSON.stringify(user));
        },
        [authToken, authUser] as const,
      );

      const startedAt = Date.now();
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);
      await page.waitForTimeout(1500);
      const duration = Date.now() - startedAt;

      await expect(page.locator('body')).not.toBeEmpty();
      expect(duration, `${route.path} render duration`).toBeLessThan(15000);

      const hardFailures = [
        ...consoleErrors.map((item) => `console: ${item}`),
        ...pageErrors.map((item) => `pageerror: ${item}`),
        ...failedRequests.map((item) => `requestfailed: ${item}`),
        ...serverErrors.map((item) => `server: ${item}`),
      ];

      console.log(`[audit][ui] ${route.path} loaded in ${duration}ms`);
      expect(hardFailures, `${route.path} browser errors`).toEqual([]);
    });
  }
});
