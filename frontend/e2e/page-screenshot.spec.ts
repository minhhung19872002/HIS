import { test } from '@playwright/test';

const ROUTES = [
  // Phase 3 Tier B pages
  { path: '/v2/opd',                  name: 'opd' },
  { path: '/v2/ipd',                  name: 'ipd' },
  { path: '/v2/surgery',              name: 'surgery' },
  { path: '/v2/billing',              name: 'billing' },
  { path: '/v2/pharmacy',             name: 'pharmacy' },
  { path: '/v2/prescription',         name: 'prescription' },
  { path: '/v2/emr',                  name: 'emr' },
  // Phase 2 pages
  { path: '/v2/quality',              name: 'quality' },
  { path: '/v2/telemedicine',         name: 'telemedicine' },
  { path: '/v2/insurance',            name: 'insurance' },
  { path: '/v2/hiv-management',       name: 'hiv-management' },
  { path: '/v2/chronic-disease',      name: 'chronic-disease' },
  { path: '/v2/tb-hiv',               name: 'tb-hiv' },
  { path: '/v2/mental-health',        name: 'mental-health' },
  { path: '/v2/medical-forensics',    name: 'medical-forensics' },
  { path: '/v2/reproductive-health',  name: 'reproductive-health' },
  { path: '/v2/occupational-health',  name: 'occupational-health' },
  { path: '/v2/immunization',         name: 'immunization' },
  { path: '/v2/pathology',            name: 'pathology' },
  { path: '/v2/community-health',     name: 'community-health' },
  { path: '/v2/school-health',        name: 'school-health' },
  { path: '/v2/screening',            name: 'screening' },
  { path: '/v2/patient-portal',       name: 'patient-portal' },
  { path: '/v2/doctor-portal',        name: 'doctor-portal' },
];

test.beforeEach(async ({ page, context }) => {
  const resp = await page.request.post('http://localhost:5106/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const data = await resp.json();
  const token = data?.data?.token;
  await context.addInitScript((t: string) => {
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  }, token);
});

for (const r of ROUTES) {
  test(`screenshot ${r.name}`, async ({ page }) => {
    await page.goto(r.path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `test-results/${r.name}.png`, fullPage: false });
  });
}
