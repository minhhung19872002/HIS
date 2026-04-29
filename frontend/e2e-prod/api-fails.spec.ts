import { test, expect } from '@playwright/test';

// Capture all failing API calls from representative pages that reported failures.
const PAGES_WITH_FAILS = [
  'hospital-pharmacy', 'bhxh-audit', 'health-checkup',
  'occupational-health', 'school-health', 'epidemiology',
  'patient-portal', 'methadone-treatment', 'hiv-management', 'tb-hiv',
  'dashboard', 'prescription', 'laboratory', 'medical-supply',
  'quality', 'satisfaction-survey', 'practice-license',
  'chronic-disease', 'mental-health', 'traditional-medicine',
  'trauma-registry', 'environmental-health', 'medical-forensics',
  'follow-up', 'clinical-guidance', 'inter-hospital', 'central-signing',
  'lis-config', 'endpoint-security', 'health-education',
  'population-health', 'reproductive-health', 'microbiology', 'sample-storage',
];

test.setTimeout(900000);

test('record failing API calls per page', async ({ page, request }) => {
  const loginResp = await request.post('https://his-api-694913628964.asia-southeast1.run.app/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const d = await loginResp.json();
  const token = d.data.token; const user = d.data.user;
  await page.goto('https://his-psi.vercel.app/');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });

  const allFails: Array<{ page: string; status: number; method: string; path: string }> = [];
  const allSuccesses: Array<{ page: string; path: string; size: number }> = [];

  for (const slug of PAGES_WITH_FAILS) {
    const pageFails: Array<{ status: number; method: string; url: string }> = [];
    const pageOk: Array<{ url: string; size: number }> = [];
    const onResp = async (resp: import('@playwright/test').Response) => {
      const url = resp.url();
      if (!url.includes('/api/')) return;
      if (resp.status() >= 400) {
        pageFails.push({ status: resp.status(), method: resp.request().method(), url });
      } else if (resp.request().method() === 'GET') {
        try {
          const body = await resp.text();
          pageOk.push({ url, size: body.length });
        } catch {}
      }
    };
    page.on('response', onResp);
    try {
      await page.goto(`https://his-psi.vercel.app/${slug}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);
    } catch {}
    page.off('response', onResp);

    pageFails.forEach(f => {
      const p = f.url.replace('https://his-api-92850107096.asia-southeast1.run.app', '').replace(/\?.*$/, '');
      allFails.push({ page: slug, status: f.status, method: f.method, path: p });
    });
    pageOk.forEach(o => {
      const p = o.url.replace('https://his-api-92850107096.asia-southeast1.run.app', '').replace(/\?.*$/, '');
      allSuccesses.push({ page: slug, path: p, size: o.size });
    });
  }

  console.log('\n=== FAILING API CALLS ===');
  allFails.forEach(f => console.log(`  [${f.status}] ${f.method} ${f.path}  (on /${f.page})`));

  console.log('\n=== SUCCESSFUL GET with tiny body (<30 bytes = probably empty array/null) ===');
  allSuccesses.filter(s => s.size < 30).forEach(s => console.log(`  ${s.size}B  ${s.path}  (on /${s.page})`));
});
