import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Production smoke tests for https://his-psi.vercel.app.
 * Goal: after the Cloud Run schema repair runs, confirm that the critical
 * paths no longer throw 500s and that the frontend can actually render data.
 *
 * These tests intentionally avoid destructive actions (no create/delete).
 */

const BACKEND_API = process.env.PROD_API_URL || 'https://his-api-rm6c6yvoja-as.a.run.app/api';

const ROUTES = [
  '/',
  '/reception',
  '/opd',
  '/prescription',
  '/ipd',
  '/pharmacy',
  '/follow-up',
  '/medical-supply',
  '/billing',
  '/laboratory',
  '/radiology',
  '/blood-bank',
  '/insurance',
  '/emr',
  '/dashboard',
  '/equipment',
  '/hr',
  '/quality',
  '/infection-control',
  '/nutrition',
  '/telemedicine',
  '/mci',
  '/rehabilitation',
  '/system-admin',
];

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder*="đăng nhập" i], input[name="username"], #username', 'admin');
  await page.fill('input[type="password"], #password', 'Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).first().click();
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (/Failed to load resource|ERR_FAILED|CORS|500|400/i.test(text)) {
        errors.push(text);
      }
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 500 && res.url().includes('/api/')) {
      errors.push(`HTTP ${res.status()} ${res.url()}`);
    }
  });
  return errors;
}

test.describe('Prod smoke - API health', () => {
  test('backend /health responds 200', async ({ request }) => {
    const res = await request.get(BACKEND_API.replace('/api', '') + '/health');
    expect(res.status()).toBe(200);
  });

  test('backend login works', async ({ request }) => {
    const res = await request.post(BACKEND_API + '/auth/login', {
      data: { username: 'admin', password: 'Admin@123' },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data?.token).toBeTruthy();
  });

  test('previously-500 endpoints now respond without 500', async ({ request }) => {
    // Acquire token
    const login = await request.post(BACKEND_API + '/auth/login', {
      data: { username: 'admin', password: 'Admin@123' },
      headers: { 'Content-Type': 'application/json' },
    });
    const token = (await login.json()).data.token;

    const endpoints = [
      '/examination/templates/prescription',
      '/examination/appointments/overdue?daysOverdue=30',
      '/BloodBankComplete/stock/detail',
      '/insurance/claims/search',
      '/mci/events',
      '/mci/events/active',
      '/telemedicine/appointments?fromDate=2026-04-17&toDate=2026-04-17',
      '/equipment',
      '/equipment/repairs',
      '/quality/indicators?isActive=true',
      '/quality/audits',
      '/quality/incidents?page=1&pageSize=100',
      '/quality/capas',
      '/hie/connections',
      '/hie/referrals',
      '/hie/teleconsults',
      '/nutrition/screenings/pending',
      '/nutrition/screenings/high-risk',
      '/rehabilitation/referrals?pageSize=100',
      '/infectioncontrol/hai-cases/active',
      '/infectioncontrol/isolation-orders',
      '/infectioncontrol/hand-hygiene/observations',
      '/medicalhr/staff?page=1&pageSize=200',
      '/signing-workflow/pending',
      '/signing-workflow/submitted',
      '/emr-admin/signing-roles',
      '/emr-admin/cover-types',
      '/emr-admin/document-types',
      '/asset-management/assets?pageIndex=0&pageSize=15',
      '/bhxh-audit/sessions',
      '/treatment-protocols/disease-groups',
      '/treatment-protocols?pageIndex=0&pageSize=20',
      '/methadone/dashboard',
      '/immunization?pageIndex=0&pageSize=200',
      '/health-checkup/statistics',
      '/occupational-health/statistics',
      '/school-health/statistics',
      '/epidemiology/outbreaks',
    ];

    const failures: Array<{ endpoint: string; status: number }> = [];
    for (const endpoint of endpoints) {
      const res = await request.get(BACKEND_API + endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status() >= 500) {
        failures.push({ endpoint, status: res.status() });
      }
    }

    if (failures.length) {
      console.log('5xx failures:', JSON.stringify(failures, null, 2));
    }
    expect(failures, `Endpoints still returning 5xx: ${JSON.stringify(failures)}`).toEqual([]);
  });
});

test.describe('Prod smoke - frontend routes', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });

  test('login + navigate routes without HTTP 500 in console', async ({ page }) => {
    test.setTimeout(240000);
    const errors = collectConsoleErrors(page);
    await login(page);
    const collectedPerRoute: Record<string, string[]> = {};

    for (const route of ROUTES) {
      const before = errors.length;
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1500);
      } catch (e) {
        collectedPerRoute[route] = [`navigation error: ${(e as Error).message}`];
        continue;
      }
      const newErrors = errors.slice(before);
      if (newErrors.length) {
        collectedPerRoute[route] = newErrors;
      }
    }

    const routesWith500 = Object.entries(collectedPerRoute)
      .filter(([, errs]) => errs.some((e) => /HTTP 5\d\d/.test(e)))
      .map(([r, errs]) => ({ route: r, errors: errs.filter((e) => /HTTP 5\d\d/.test(e)) }));

    if (routesWith500.length) {
      console.log('Routes with 5xx errors:');
      console.log(JSON.stringify(routesWith500, null, 2));
    }
    expect(routesWith500, 'Routes producing 5xx').toEqual([]);
  });
});
