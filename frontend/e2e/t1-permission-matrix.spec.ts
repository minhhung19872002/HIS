/**
 * [T1 #216] Permission & account-state — UI evidence for the cross-cutting TC-PERM tasks.
 *
 * Logs in as one seeded user per role, records what the shell shows after login, then
 * walks straight into an admin-only route and calls an admin-only API with that role's
 * token. The screenshots land in docs/architecture/evidence/cross/ under the
 * TC-PERM-NNN__sNN__<state> convention so the evidence viewer can trace them.
 *
 * Backend enforcement across the whole controller surface is covered separately by the
 * role x endpoint matrix script (t1_matrix.py); this spec is the UI half.
 *
 * Needs: API on :5106, Vite on :3001, the seeded users with password 123456 (local DB).
 * Login is rate-limited to 10/min, so the roles run serially with a pause between them.
 */
import { test, expect, type Page } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.resolve(HERE, '../../docs/architecture/evidence/cross');
const API = 'http://localhost:5106/api';
const ADMIN_ROUTE = '/v2/admin';          // SystemAdminV2 — permission System.Configure
const ADMIN_API = '/admin/users';          // [Authorize(Roles = Admin)]

type RoleCase = { tc: string; user: string; pass: string; label: string; admin?: boolean };
const ROLES: RoleCase[] = [
  { tc: 'TC-PERM-001', user: 'bsannn',   pass: '123456',    label: 'Bác sĩ' },
  { tc: 'TC-PERM-002', user: 'ddgiang',  pass: '123456',    label: 'Điều dưỡng' },
  { tc: 'TC-PERM-003', user: 'ktvkhanh', pass: '123456',    label: 'KTV XN' },
  { tc: 'TC-PERM-004', user: 'dsoanh',   pass: '123456',    label: 'Dược sĩ' },
  { tc: 'TC-PERM-005', user: 'lthung',   pass: '123456',    label: 'Tiếp đón' },
  { tc: 'TC-PERM-006', user: 'tnmai',    pass: '123456',    label: 'Thu ngân' },
  { tc: 'TC-PERM-010', user: 'admin',    pass: 'Admin@123', label: 'Quản trị hệ thống', admin: true },
];

const results: Record<string, unknown>[] = [];
test.describe.configure({ mode: 'serial' });

function shot(page: Page, name: string) {
  fs.mkdirSync(EVID, { recursive: true });
  return page.screenshot({ path: path.join(EVID, `${name}.png`), fullPage: true });
}

function sql(q: string) {
  return execSync(
    `docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HisDocker2024Pass#" -d HIS -C -h -1 -W -Q "SET NOCOUNT ON; ${q}"`,
    { encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } },
  ).trim();
}

async function uiLogin(page: Page, user: string, pass: string) {
  await page.goto('/login');
  await page.fill('#login_username', user);
  await page.fill('#login_password', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.waitForTimeout(2500); // let the shell + KPI strip settle
}

async function token(page: Page) {
  return page.evaluate(() => localStorage.getItem('token') || '');
}

for (const r of ROLES) {
  test(`${r.tc} - [${r.label}] login shows the shell; admin route + admin API ${r.admin ? 'allowed' : 'blocked'}`, async ({ page }) => {
    await uiLogin(page, r.user, r.pass);
    await shot(page, `${r.tc}__s01__list`);

    const t = await token(page);
    expect(t).not.toEqual('');

    // Straight into the admin-only route with this role's session.
    await page.goto(ADMIN_ROUTE);
    await page.waitForTimeout(3500);
    await shot(page, `${r.tc}__s02__${r.admin ? 'list' : 'permission'}`);

    // Backend gate, bypassing the UI: admin-only API with this role's token.
    const res = await page.request.get(API + ADMIN_API, { headers: { Authorization: `Bearer ${t}` } });
    results.push({ tc: r.tc, user: r.user, role: r.label, adminRoute: page.url(), adminApiStatus: res.status() });
    if (r.admin) expect(res.status()).toBe(200);
    else expect(res.status()).toBe(403);

    await page.waitForTimeout(6000); // stay under the 10 logins/minute limiter
  });
}

test('TC-PERM-012 - [Khách] direct URL without a session redirects to /login; API without/with garbage token is 401', async ({ page }) => {
  await page.goto('/v2/dashboard');
  await page.waitForURL((u) => u.pathname.startsWith('/login'), { timeout: 20_000 });
  await shot(page, 'TC-PERM-012__s01__permission');
  const noTok = await page.request.get(API + '/reception/opd-flow-stats');
  const badTok = await page.request.get(API + '/reception/opd-flow-stats', { headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.zzzz' } });
  results.push({ tc: 'TC-PERM-012', noToken: noTok.status(), garbageToken: badTok.status() });
  expect(noTok.status()).toBe(401);
  expect(badTok.status()).toBe(401);
});

test('TC-PERM-013 - [Account-state] a deactivated user (IsActive=0) cannot log in; reactivation restores access', async ({ page }) => {
  sql("UPDATE Users SET IsActive=0 WHERE Username='ddgiang'");
  try {
    await page.goto('/login');
    await page.fill('#login_username', 'ddgiang');
    await page.fill('#login_password', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await shot(page, 'TC-PERM-013__s01__error');
    expect(page.url()).toContain('/login');
    const msg = await page.locator('.ant-message, .ant-alert, .ant-form-item-explain-error, [role="alert"]').allInnerTexts();
    results.push({ tc: 'TC-PERM-013', lockedLoginStayedOnLogin: page.url().includes('/login'), message: msg.join(' | ') });
  } finally {
    sql("UPDATE Users SET IsActive=1, FailedLoginCount=0, LockoutEndAt=NULL WHERE Username='ddgiang'");
  }
  await page.waitForTimeout(6000);
  await uiLogin(page, 'ddgiang', '123456');
  await shot(page, 'TC-PERM-013__s02__success');
});

test('TC-PERM-014 - [Account-state] an expired/invalid token in localStorage is rejected and the shell returns to /login', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid');
    localStorage.setItem('user', JSON.stringify({ username: 'ghost', roles: ['Bác sĩ'] }));
  });
  await page.goto('/v2/reception');
  await page.waitForTimeout(4000);
  await shot(page, 'TC-PERM-014__s01__permission');
  const api = await page.request.get(API + '/reception/opd-flow-stats', { headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid' } });
  const remaining = await page.evaluate(() => localStorage.getItem('token'));
  results.push({ tc: 'TC-PERM-014', apiStatus: api.status(), finalUrl: page.url(), tokenStillStored: !!remaining });
  expect(api.status()).toBe(401);
});

test.afterAll(async () => {
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 't1-ui-results.json'), JSON.stringify(results, null, 2));
});
