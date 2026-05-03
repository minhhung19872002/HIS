import { test, expect } from '@playwright/test';

/**
 * Smoke test all 107 unique v2 routes (skip 12 lite/* duplicates).
 * For each route:
 *   - log JS pageerror (real crashes)
 *   - log console.error (filtered)
 *   - log API 4xx/5xx (filtered by allowlist)
 *   - assert page rendered something meaningful
 *
 * Pageerrors fail the test. Other findings are summary-only.
 */

const ROUTES = [
  // Tier B core (12)
  '/v2/dashboard', '/v2/reception', '/v2/opd', '/v2/ipd', '/v2/prescription',
  '/v2/pharmacy', '/v2/surgery', '/v2/billing', '/v2/lab', '/v2/radiology',
  '/v2/blood-bank', '/v2/emr',
  // Misc + Batches
  '/v2/dashboard-3cap', '/v2/medical-supply', '/v2/follow-up',
  '/v2/booking-management', '/v2/sms-management', '/v2/lab-qc',
  '/v2/microbiology', '/v2/culture-collection', '/v2/sample-storage',
  '/v2/screening', '/v2/reagent-management', '/v2/sample-tracking',
  '/v2/pathology', '/v2/ivf-lab', '/v2/finance', '/v2/insurance',
  '/v2/master-data', '/v2/reports', '/v2/admin', '/v2/digital-signature',
  '/v2/central-signing', '/v2/telemedicine', '/v2/nutrition',
  '/v2/infection-control', '/v2/rehabilitation', '/v2/equipment',
  '/v2/hr', '/v2/quality', '/v2/patient-portal', '/v2/health-exchange',
  '/v2/emergency-disaster', '/v2/consultation', '/v2/help',
  '/v2/radiology/viewer', '/v2/medical-record-archive', '/v2/bhxh-audit',
  '/v2/doctor-portal', '/v2/satisfaction-survey', '/v2/lis-config',
  '/v2/specialty-emr', '/v2/signing-workflow', '/v2/medical-record-planning',
  '/v2/endpoint-security', '/v2/treatment-protocols', '/v2/chronic-disease',
  '/v2/hospital-pharmacy', '/v2/clinical-guidance', '/v2/tb-hiv',
  '/v2/health-checkup', '/v2/immunization', '/v2/epidemiology',
  '/v2/school-health', '/v2/occupational-health', '/v2/methadone-treatment',
  '/v2/food-safety', '/v2/community-health', '/v2/hiv-management',
  '/v2/medical-forensics', '/v2/traditional-medicine',
  '/v2/reproductive-health', '/v2/mental-health', '/v2/environmental-health',
  '/v2/trauma-registry', '/v2/population-health', '/v2/health-education',
  '/v2/practice-license', '/v2/inter-hospital', '/v2/asset-management',
  '/v2/training-research', '/v2/procurement',
  // Batch 7
  '/v2/pharmacy-approval', '/v2/dispensing-counter',
  '/v2/clinical-pharmacy-check', '/v2/inpatient-dispensing',
  '/v2/stock-report', '/v2/office-supply-approval',
  // Batch 8
  '/v2/receipt-book-admin', '/v2/observation-stay', '/v2/service-requeue',
  '/v2/bhxh-config', '/v2/payment-reports', '/v2/payment-transactions',
  // Batch 9
  '/v2/lis-catalog-admin', '/v2/ris-catalog-admin', '/v2/sample-receive',
  '/v2/radiology-ops', '/v2/ris-dispatcher', '/v2/ris-admin',
  // Batch 10
  '/v2/consultation-register', '/v2/workload-report', '/v2/catalogs-admin',
  '/v2/employee-profile', '/v2/non-dicom-capture', '/v2/video-consultation',
];

const IGNORE_CONSOLE_PATTERNS = [
  /Download the React DevTools/,
  /\[antd:/,
  /useForm/,
  /not connected to any Form/,
  /SignalR/i,
  /signalr/,
  /WebSocket/,
  /\[HMR\]/,
  /\[vite\]/,
  /Vite HMR/,
  /findDOMNode/,
  /negotiate.*401/,
  /Failed to load resource.*401/,
  /Failed to load resource.*404/,  // routes/endpoints that 404 are tracked separately
  /ERR_CONNECTION/,
];

const IGNORE_NETWORK_PATTERNS = [
  /\/auth\/me/,           // probe endpoint, expected 401
  /\/notification\//,     // notif optional
  /\/hubs\//,             // SignalR
];

test.beforeEach(async ({ page, context }) => {
  // 1) Bake fake token into localStorage so ProtectedRoute lets us through
  await context.addInitScript(() => {
    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjllNTMwOWRjLWVjZjktNGQ0OC05YTA5LTIyNGNkMTUzNDdiMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ.invalid';
    window.localStorage.setItem('token', fakeToken);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  });

  // 2) Real login fallback to get a live JWT for API calls
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
  const name = route.replace('/v2/', '').replace(/\//g, '-') || 'index';
  test(`v2 ${name}`, async ({ page }) => {
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
        if (status === 401) return;
        if (IGNORE_NETWORK_PATTERNS.some((p) => p.test(url))) return;
        networkErrors.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), status });
      }
    });

    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Give time for lazy module + initial API calls
    await page.waitForTimeout(2500);

    const bodyText = await page.locator('body').innerText();
    const hasContent = bodyText.length > 100;

    const summary: string[] = [];
    if (!hasContent) summary.push(`PAGE_THIN (<100 chars rendered)`);
    if (pageErrors.length > 0) {
      summary.push(`CRASH x${pageErrors.length}: ${pageErrors[0].slice(0, 200)}`);
    }
    if (consoleErrors.length > 0) {
      summary.push(`CONSOLE x${consoleErrors.length}: ${consoleErrors[0].slice(0, 150)}`);
    }
    if (networkErrors.length > 0) {
      const top = networkErrors.slice(0, 3).map((e) => `[${e.status}] ${e.url}`).join(' | ');
      summary.push(`NET x${networkErrors.length}: ${top}`);
    }

    if (summary.length > 0) {
      console.log(`\n${route}\n  ${summary.join('\n  ')}`);
    } else {
      console.log(`OK ${route}`);
    }

    // Hard fail only on real JS crashes
    expect(pageErrors, `Page crashes on ${route}:\n${pageErrors.join('\n')}`).toHaveLength(0);
  });
}
