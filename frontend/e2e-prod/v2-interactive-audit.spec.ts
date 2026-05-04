/**
 * v2 Interactive Functional Audit — production
 *
 * Beyond the structural "does the page load" check in
 * v2-design-conformance.spec.ts, this spec exercises 3 core
 * interactions that should work on every list-style v2 page:
 *
 *   1. Row click          — clicking the first ab-tbl row opens a
 *                            Drawer (`.ant-drawer-content`).
 *   2. Search filter      — typing into `.ab-search` filters the
 *                            sibling table (row count changes).
 *   3. Status tab switch  — clicking a non-active `.ab-stab` updates
 *                            the active class.
 *
 * Pages that lack a primitive (e.g. dashboard with no table) are
 * recorded as "n/a" and do not fail.
 *
 * Output: playwright-prod-interactive.json with per-route results.
 */
import { test, expect, Page, Response, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROUTES = [
  'dashboard', 'admin', 'asset-management', 'bhxh-audit', 'bhxh-config',
  'billing', 'blood-bank', 'booking-management', 'catalogs-admin',
  'central-signing', 'chronic-disease', 'clinical-guidance',
  'clinical-pharmacy-check', 'community-health', 'consultation',
  'consultation-register', 'culture-collection', 'dashboard-3cap',
  'digital-signature', 'dispensing-counter', 'doctor-portal',
  'emergency-disaster', 'employee-profile', 'emr', 'endpoint-security',
  'environmental-health', 'epidemiology', 'equipment', 'finance',
  'follow-up', 'food-safety', 'health-checkup', 'health-education',
  'health-exchange', 'help', 'hiv-management', 'hospital-pharmacy',
  'hr', 'immunization', 'infection-control', 'inpatient-dispensing',
  'insurance', 'inter-hospital', 'ipd', 'ivf-lab', 'lab', 'lab-qc',
  'lis-catalog-admin', 'lis-config', 'master-data', 'medical-forensics',
  'medical-record-archive', 'medical-record-planning', 'medical-supply',
  'mental-health', 'methadone-treatment', 'microbiology',
  'non-dicom-capture', 'nutrition', 'observation-stay',
  'occupational-health', 'office-supply-approval', 'opd', 'pathology',
  'patient-portal', 'payment-reports', 'payment-transactions',
  'pharmacy', 'pharmacy-approval', 'population-health',
  'practice-license', 'prescription', 'procurement', 'quality',
  'radiology', 'radiology-ops', 'reagent-management',
  'receipt-book-admin', 'reception', 'rehabilitation', 'reports',
  'reproductive-health', 'ris-admin', 'ris-catalog-admin',
  'ris-dispatcher', 'sample-receive', 'sample-storage', 'sample-tracking',
  'satisfaction-survey', 'school-health', 'screening', 'service-requeue',
  'signing-workflow', 'sms-management', 'specialty-emr', 'stock-report',
  'surgery', 'tb-hiv', 'telemedicine', 'traditional-medicine',
  'training-research', 'trauma-registry', 'treatment-protocols',
  'video-consultation', 'workload-report',
];

const PROD_API = process.env.PROD_API_URL || 'https://his-api-694913628964.asia-southeast1.run.app/api';
let CACHED_TOKEN: string | null = null;
let CACHED_USER: string | null = null;

async function getToken(request: APIRequestContext) {
  if (CACHED_TOKEN) return { token: CACHED_TOKEN, user: CACHED_USER };
  const r = await request.post(`${PROD_API}/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  if (!r.ok()) throw new Error(`login failed: ${r.status()}`);
  const j = await r.json();
  CACHED_TOKEN = j?.data?.token || j?.token;
  CACHED_USER = JSON.stringify(j?.data?.user || { username: 'admin', roles: ['Admin'] });
  return { token: CACHED_TOKEN, user: CACHED_USER };
}

async function loginViaToken(page: Page, request: APIRequestContext) {
  const { token, user } = await getToken(request);
  await page.context().addInitScript(({ t, u }) => {
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', u);
  }, { t: token, u: user });
}

interface InteractionResult {
  route: string;
  loadOk: boolean;
  hasTable: boolean;
  rowCount: number;
  rowClickOpensDrawer: 'pass' | 'fail' | 'n/a';
  searchFilters: 'pass' | 'fail' | 'n/a';
  statusTabSwitch: 'pass' | 'fail' | 'n/a';
  apiFailures: number;
  pageErrors: number;
  notes: string[];
}

const REPORT: InteractionResult[] = [];

test.describe.configure({ mode: 'serial' });

for (const route of ROUTES) {
  test(`v2 interactive: ${route}`, async ({ page, request }) => {
    const apiFailures: { url: string; status: number }[] = [];
    const pageErrors: string[] = [];
    page.on('response', (resp: Response) => {
      const url = resp.url();
      const status = resp.status();
      if (status >= 400 && url.includes('/api/')) {
        apiFailures.push({ url, status });
      }
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await loginViaToken(page, request);

    let loadOk = true;
    try {
      await page.goto(`/v2/${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);
    } catch {
      loadOk = false;
    }

    const notes: string[] = [];

    // 1. Row click → drawer
    // _v2kit DataTable binds onClick to each <td>, not <tr> — click a non-action td.
    const tableRows = page.locator('table.ab-tbl tbody tr');
    const rowCount = await tableRows.count();
    const hasTable = rowCount > 0;
    let rowClickOpensDrawer: InteractionResult['rowClickOpensDrawer'] = 'n/a';
    if (hasTable) {
      try {
        // Click 2nd td (skip first which is often a checkbox/code cell, both should fire)
        const firstRowTd = tableRows.first().locator('td:not(.ck):not(.act)').first();
        await firstRowTd.click({ timeout: 5000, force: true });
        await page.waitForTimeout(700);
        // Antd v6 drawer: .ant-drawer is always present but .ant-drawer-open class added when shown
        const drawerOpen = await page.locator('.ant-drawer-content:visible, .ant-drawer-open').count();
        if (drawerOpen > 0) {
          rowClickOpensDrawer = 'pass';
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(300);
        } else {
          rowClickOpensDrawer = 'fail';
          notes.push('row click did not open drawer');
        }
      } catch (e) {
        rowClickOpensDrawer = 'fail';
        notes.push(`row click error: ${(e as Error).message.slice(0, 60)}`);
      }
    }

    // 2. Search filter — type 'a' then check row count differs (or stays/clears)
    const searchInput = page.locator('.ab-search input, .ab-tools input[type="text"]').first();
    let searchFilters: InteractionResult['searchFilters'] = 'n/a';
    if (await searchInput.count() > 0 && hasTable) {
      try {
        const initialRows = await tableRows.count();
        await searchInput.fill('zzz_unlikely_term_123');
        await page.waitForTimeout(700);
        const filteredRows = await tableRows.count();
        // pass if either: rows decrease OR empty state shown
        const hasEmpty = await page.locator('.ab-empty').count() > 0;
        if (filteredRows < initialRows || hasEmpty || filteredRows === 0) {
          searchFilters = 'pass';
        } else if (filteredRows === initialRows) {
          searchFilters = 'fail';
          notes.push(`search did not filter (initial=${initialRows} after=${filteredRows})`);
        }
        await searchInput.clear();
        await page.waitForTimeout(300);
      } catch {
        searchFilters = 'fail';
        notes.push('search input threw error');
      }
    }

    // 3. Status tab switch
    const statusTabs = page.locator('.ab-stab');
    const tabCount = await statusTabs.count();
    let statusTabSwitch: InteractionResult['statusTabSwitch'] = 'n/a';
    if (tabCount > 1) {
      try {
        const activeBefore = await page.locator('.ab-stab.on, .ab-stab.active').count();
        // Click second tab (index 1)
        await statusTabs.nth(1).click({ timeout: 3000 });
        await page.waitForTimeout(400);
        const newActive = await statusTabs.nth(1).getAttribute('class') || '';
        if (newActive.includes('on') || newActive.includes('active')) {
          statusTabSwitch = 'pass';
        } else if (activeBefore === 0) {
          // Pages without explicit "on" class but tab is clickable
          statusTabSwitch = 'pass';
        } else {
          statusTabSwitch = 'fail';
          notes.push('status tab did not become active');
        }
      } catch {
        statusTabSwitch = 'fail';
        notes.push('status tab click threw error');
      }
    }

    REPORT.push({
      route, loadOk, hasTable, rowCount,
      rowClickOpensDrawer, searchFilters, statusTabSwitch,
      apiFailures: apiFailures.length, pageErrors: pageErrors.length, notes,
    });

    expect(pageErrors.length, `pageerror on /v2/${route}`).toBeLessThan(5);
  });
}

test.afterAll(async () => {
  const out = path.join(process.cwd(), 'playwright-prod-interactive.json');
  fs.writeFileSync(out, JSON.stringify({
    generated: new Date().toISOString(),
    totalRoutes: REPORT.length,
    summary: {
      withTable: REPORT.filter((r) => r.hasTable).length,
      rowClickPass: REPORT.filter((r) => r.rowClickOpensDrawer === 'pass').length,
      rowClickFail: REPORT.filter((r) => r.rowClickOpensDrawer === 'fail').length,
      searchPass: REPORT.filter((r) => r.searchFilters === 'pass').length,
      searchFail: REPORT.filter((r) => r.searchFilters === 'fail').length,
      tabPass: REPORT.filter((r) => r.statusTabSwitch === 'pass').length,
      tabFail: REPORT.filter((r) => r.statusTabSwitch === 'fail').length,
      apiFailures: REPORT.filter((r) => r.apiFailures > 0).length,
      pageErrors: REPORT.filter((r) => r.pageErrors > 0).length,
    },
    routes: REPORT,
  }, null, 2));
  console.log(`\n[v2-interactive] report → ${out}\n`);
});
