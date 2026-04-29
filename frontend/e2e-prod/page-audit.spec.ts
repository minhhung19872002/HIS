import { test, expect } from '@playwright/test';

// Pages most likely to have empty-state issues based on prior audit.
// Each entry: [route, expected-data-heuristic] where the heuristic is a
// selector or text pattern that should be visible when the page has data.
const PAGES = [
  'dashboard', 'dashboard-3cap',
  'reception', 'patients', 'opd', 'prescription',
  'pharmacy', 'hospital-pharmacy', 'procurement', 'medical-supply',
  'inpatient', 'ipd',
  'radiology', 'laboratory', 'lab', 'microbiology', 'pathology', 'lab-qc', 'sample-storage', 'sample-tracking', 'reagent-management', 'screening',
  'blood-bank', 'culture-collection',
  'surgery', 'emr', 'specialty-emr',
  'billing', 'finance', 'insurance', 'bhxh-audit',
  'equipment', 'asset-management',
  'hr', 'practice-license', 'training-research',
  'nutrition', 'infection-control', 'quality', 'satisfaction-survey',
  'telemedicine', 'patient-portal', 'doctor-portal',
  'rehabilitation', 'mental-health', 'traditional-medicine', 'reproductive-health',
  'emergency-disaster', 'trauma-registry',
  'health-checkup', 'occupational-health', 'school-health',
  'immunization', 'epidemiology', 'tb-hiv', 'hiv-management', 'methadone-treatment',
  'food-safety', 'environmental-health', 'chronic-disease', 'community-health',
  'health-education', 'population-health', 'medical-forensics',
  'follow-up', 'consultation', 'clinical-guidance', 'treatment-protocols',
  'health-exchange', 'inter-hospital',
  'ivf-lab',
  'reports', 'master-data', 'system-admin',
  'medical-record-archive', 'medical-record-planning',
  'booking-management', 'signing-workflow', 'central-signing', 'digital-signature',
  'settings', 'sms-management', 'lis-config', 'endpoint-security',
];

test.setTimeout(1800000); // 30min — 84 pages × ~15s each

test('audit all pages for empty state + errors', async ({ page, request }) => {
  // API login -> inject token
  const loginResp = await request.post('https://his-api-694913628964.asia-southeast1.run.app/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const loginData = await loginResp.json();
  const token = loginData?.data?.token;
  const user = loginData?.data?.user;
  expect(token).toBeTruthy();

  await page.goto('https://his-psi.vercel.app/');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });

  const rows: { page: string; status: string; tables: number; rowsInTables: number; emptyText: string; failedApi: number; jsErr: number }[] = [];

  for (const slug of PAGES) {
    const apiFails: number[] = [];
    const jsErrors: string[] = [];
    const onResp = (resp: import('@playwright/test').Response) => {
      if (resp.status() >= 400 && resp.url().includes('/api/')) apiFails.push(resp.status());
    };
    const onPageErr = (err: Error) => { jsErrors.push(err.message); };
    page.on('response', onResp);
    page.on('pageerror', onPageErr);

    try {
      await page.goto(`https://his-psi.vercel.app/${slug}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2500);

      // Count tables + rows
      const tables = await page.locator('.ant-table').count();
      const rowsInTables = await page.locator('.ant-table-row:not(.ant-table-placeholder)').count();
      const emptyIndicators = [
        'Không có dữ liệu', 'Chưa có dữ liệu', 'No data', 'Empty',
        'Không tìm thấy', 'Chưa có'
      ];
      let emptyText = '';
      for (const t of emptyIndicators) {
        if (await page.locator(`text="${t}"`).count() > 0) {
          emptyText = t; break;
        }
      }

      rows.push({
        page: slug,
        status: rowsInTables > 0 ? 'HAS DATA' : (tables > 0 ? 'EMPTY TABLES' : 'NO TABLE'),
        tables,
        rowsInTables,
        emptyText,
        failedApi: apiFails.length,
        jsErr: jsErrors.length,
      });
    } catch (e: unknown) {
      rows.push({
        page: slug, status: 'LOAD ERROR',
        tables: 0, rowsInTables: 0, emptyText: '',
        failedApi: apiFails.length, jsErr: jsErrors.length,
      });
    } finally {
      page.off('response', onResp);
      page.off('pageerror', onPageErr);
    }
  }

  // Sort: empty first, then has-data
  const empty = rows.filter(r => r.status === 'EMPTY TABLES' || (r.status === 'NO TABLE' && r.emptyText));
  const noTable = rows.filter(r => r.status === 'NO TABLE' && !r.emptyText);
  const hasData = rows.filter(r => r.status === 'HAS DATA');
  const loadErr = rows.filter(r => r.status === 'LOAD ERROR');

  console.log(`\n=== EMPTY TABLES (${empty.length}) ===`);
  empty.forEach(r => console.log(`  /${r.page.padEnd(28)} tables=${r.tables} rows=${r.rowsInTables} emptyText="${r.emptyText}" apiFails=${r.failedApi} jsErr=${r.jsErr}`));

  console.log(`\n=== HAS DATA (${hasData.length}) ===`);
  hasData.forEach(r => console.log(`  /${r.page.padEnd(28)} tables=${r.tables} rows=${r.rowsInTables}`));

  console.log(`\n=== NO TABLE — card/form pages (${noTable.length}) ===`);
  noTable.forEach(r => console.log(`  /${r.page.padEnd(28)} apiFails=${r.failedApi} jsErr=${r.jsErr}`));

  console.log(`\n=== LOAD ERROR (${loadErr.length}) ===`);
  loadErr.forEach(r => console.log(`  /${r.page.padEnd(28)} apiFails=${r.failedApi}`));

  console.log(`\n=== SUMMARY: total=${rows.length} hasData=${hasData.length} empty=${empty.length} noTable=${noTable.length} error=${loadErr.length} ===`);
});
