/**
 * v2 Design Conformance Audit — production
 *
 * Visits every /v2/* route under admin auth and records:
 *   1. functional   — navigation OK, no console pageerror, no /api/* 4xx-5xx
 *   2. layout       — TerminalLayout shell renders (`.tl-shell` or `.terminal-shell`)
 *   3. designKit    — at least one `.ab-*` design-pack class on the page
 *   4. kitPrimitives — presence of KpiStrip / StatusTabs / DataTable / SearchBox
 *
 * Each route generates a tiny JSON object that's written to
 * `playwright-prod-report-design.json` for triage. The spec also asserts
 * "no FATAL functional break" so a console-shaped CI run still surfaces
 * page-rendering regressions.
 */
import { test, expect, Page, Request, Response } from '@playwright/test';
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
  'radiology', 'radiology-ops', 'radiology/viewer', 'reagent-management',
  'receipt-book-admin', 'reception', 'rehabilitation', 'reports',
  'reproductive-health', 'ris-admin', 'ris-catalog-admin',
  'ris-dispatcher', 'sample-receive', 'sample-storage', 'sample-tracking',
  'satisfaction-survey', 'school-health', 'screening', 'service-requeue',
  'signing-workflow', 'sms-management', 'specialty-emr', 'stock-report',
  'surgery', 'tb-hiv', 'telemedicine', 'traditional-medicine',
  'training-research', 'trauma-registry', 'treatment-protocols',
  'video-consultation', 'workload-report',
];

const IGNORE_CONSOLE = [
  /Download the React DevTools/,
  /\[antd:/,
  /useForm/,
  /not connected to any Form/,
  /SignalR/i,
  /WebSocket/i,
  /\[HMR\]/,
  /\[vite\]/,
  /findDOMNode/,
  /negotiate.*401/,
  /AbortError/,
  /favicon/i,
];

interface PageReport {
  route: string;
  loadOk: boolean;
  consoleErrors: string[];
  apiFailures: { url: string; status: number }[];
  pageErrors: string[];
  hasTerminalShell: boolean;
  hasAbClasses: boolean;
  abClassCount: number;
  kit: {
    kpiStrip: boolean;
    topTabs: boolean;
    statusTabs: boolean;
    dataTable: boolean;
    searchBox: boolean;
    drawer: boolean;
  };
  emptyContent: boolean;
}

const REPORT: PageReport[] = [];

const PROD_API = process.env.PROD_API_URL || 'https://his-api-694913628964.asia-southeast1.run.app/api';
let CACHED_TOKEN: string | null = null;
let CACHED_USER: string | null = null;

async function getToken(request: import('@playwright/test').APIRequestContext) {
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

async function loginViaToken(page: Page, request: import('@playwright/test').APIRequestContext) {
  const { token, user } = await getToken(request);
  await page.context().addInitScript(({ t, u }) => {
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', u);
  }, { t: token, u: user });
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  // Sanity ping: prod app should be up
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto('/');
  await ctx.close();
});

for (const route of ROUTES) {
  test(`v2 audit: ${route}`, async ({ page, request }) => {
    const consoleErrors: string[] = [];
    const apiFailures: { url: string; status: number }[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORE_CONSOLE.some((rx) => rx.test(text))) return;
      consoleErrors.push(text);
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('response', (resp: Response) => {
      const url = resp.url();
      const status = resp.status();
      if (status >= 400 && url.includes('/api/')) {
        apiFailures.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), status });
      }
    });

    await loginViaToken(page, request);
    let loadOk = true;
    try {
      await page.goto(`/v2/${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      // Settle for late renders
      await page.waitForTimeout(500);
    } catch {
      loadOk = false;
    }

    // Structural checks
    const hasTerminalShell = await page.locator('.tl-shell, .terminal-shell, [data-terminal-shell]').count() > 0;
    const abClassCount = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      let n = 0;
      all.forEach((el) => {
        for (const cls of Array.from(el.classList)) {
          if (cls.startsWith('ab-')) {
            n++;
            break;
          }
        }
      });
      return n;
    });
    const hasAbClasses = abClassCount > 0;

    const kit = {
      kpiStrip: await page.locator('.ab-kpis, .ab-kpi').count() > 0,
      topTabs: await page.locator('.ab-toptabs').count() > 0,
      statusTabs: await page.locator('.ab-stab').count() > 0,
      dataTable: await page.locator('.ab-tbl, .ab-tbl-wrap').count() > 0,
      searchBox: await page.locator('.ab-search, .ab-tools').count() > 0,
      drawer: await page.locator('.ant-drawer, .rec-drawer-tabs').count() > 0,
    };

    // Page emptiness — heuristic: no real text content + no table rows
    const bodyText = await page.locator('main, .tl-main, body').first().innerText().catch(() => '');
    const emptyContent = bodyText.trim().length < 80;

    const rec: PageReport = {
      route,
      loadOk,
      consoleErrors,
      apiFailures,
      pageErrors,
      hasTerminalShell,
      hasAbClasses,
      abClassCount,
      kit,
      emptyContent,
    };
    REPORT.push(rec);

    // Soft assertions — record but don't hard-fail except on catastrophic page error
    expect(pageErrors.length, `pageerror on /v2/${route}: ${pageErrors.join(' | ')}`).toBeLessThan(5);
  });
}

test.afterAll(async () => {
  const out = path.join(process.cwd(), 'playwright-prod-design-conformance.json');
  fs.writeFileSync(out, JSON.stringify({
    generated: new Date().toISOString(),
    totalRoutes: REPORT.length,
    summary: {
      withApiFailures: REPORT.filter((r) => r.apiFailures.length > 0).length,
      withPageErrors: REPORT.filter((r) => r.pageErrors.length > 0).length,
      withConsoleErrors: REPORT.filter((r) => r.consoleErrors.length > 0).length,
      missingTerminalShell: REPORT.filter((r) => !r.hasTerminalShell).length,
      missingAbClasses: REPORT.filter((r) => !r.hasAbClasses).length,
      noKpiStrip: REPORT.filter((r) => !r.kit.kpiStrip).length,
      noStatusTabs: REPORT.filter((r) => !r.kit.statusTabs && !r.kit.topTabs).length,
      noDataTable: REPORT.filter((r) => !r.kit.dataTable).length,
      noToolbar: REPORT.filter((r) => !r.kit.searchBox).length,
      emptyContent: REPORT.filter((r) => r.emptyContent).length,
    },
    routes: REPORT,
  }, null, 2));
  console.log(`\n[v2-design-conformance] report → ${out}\n`);
});
