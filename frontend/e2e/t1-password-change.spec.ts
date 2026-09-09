/**
 * [T1 #216 / TC-PERM-015] Buộc đổi mật khẩu lần đầu — bằng chứng UI.
 *
 * Đợt 2 ghi nhận "CHƯA CÓ TÍNH NĂNG". Spec này chạy đúng các bước của task TC-PERM-015 trong
 * test-plan: admin tạo user → user đăng nhập → bị đưa tới màn đổi mật khẩu, KHÔNG vào dashboard →
 * gõ thẳng route nghiệp vụ vẫn bị đá về → mật khẩu yếu bị chặn có thông báo → đổi hợp lệ → đăng
 * nhập lại vào được hệ thống.
 *
 * Ảnh theo §2 evidence/README: cross/TC-PERM-015__s<NN>__<state>.png.
 * Cần: API :5106, Vite :3001, admin/Admin@123.
 *   npx playwright test e2e/t1-password-change.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.resolve(HERE, '../../docs/architecture/evidence/cross');
const API = 'http://localhost:5106';
const TC = 'TC-PERM-015';

const results: Record<string, unknown>[] = [];
test.describe.configure({ mode: 'serial' });

async function api(method: string, p: string, token?: string, body?: unknown) {
  const r = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  let json: any = null;
  try { json = JSON.parse(txt); } catch { /* not json */ }
  return { status: r.status, data: json && typeof json === 'object' && 'data' in json ? json.data : json };
}

async function uiLogin(page: Page, user: string, pass: string) {
  await page.goto('/login');
  await page.fill('#login_username', user);
  await page.fill('#login_password', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.waitForTimeout(1500);
}

function shot(page: Page, step: string, state: string) {
  fs.mkdirSync(EVID, { recursive: true });
  return page.screenshot({ path: path.join(EVID, `${TC}__${step}__${state}.png`), fullPage: true });
}

test(`${TC} - [Đổi mật khẩu] tài khoản mới bị buộc đổi trước khi vào hệ thống`, async ({ page }) => {
  const adm = await api('POST', '/api/auth/login', undefined, { username: 'admin', password: 'Admin@123' });
  expect(adm.status, 'admin login').toBe(200);
  const A = adm.data.token as string;

  const roles = (await api('GET', '/api/admin/roles', A)).data as any[];
  const doctor = roles.find((r) => (r.code || r.roleCode) === 'DOCTOR') ?? roles[0];
  const username = `t1pwui_${Date.now().toString(36)}`;
  const initial = 'Tam@12345';
  const created = await api('POST', '/api/admin/users', A, {
    username, fullName: `T1 UI ${username}`, roleIds: [doctor.id], initialPassword: initial,
  });
  expect(created.status, 'tạo user thử').toBe(200);
  const userId = created.data.id as string;

  try {
    // s01: đăng nhập → bị đưa tới màn đổi mật khẩu, không vào dashboard
    await uiLogin(page, username, initial);
    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.locator('#changePassword_newPassword')).toBeVisible();
    await shot(page, 's01', 'form');
    results.push({ step: 's01', check: 'đăng nhập → /change-password, không vào dashboard', url: page.url() });

    // s02: gõ thẳng route nghiệp vụ → vẫn bị đá về màn đổi
    await page.goto('/v2/dashboard');
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/change-password$/);
    await shot(page, 's02', 'permission');
    results.push({ step: 's02', check: 'gõ thẳng /v2/dashboard → quay về /change-password', url: page.url() });

    // s03: mật khẩu yếu → validation, không cho qua
    await page.fill('#changePassword_currentPassword', initial);
    await page.fill('#changePassword_newPassword', 'abc');
    await page.fill('#changePassword_confirmPassword', 'abc');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/ít nhất 8 ký tự/)).toBeVisible();
    await expect(page).toHaveURL(/\/change-password$/);
    await shot(page, 's03', 'validation');
    results.push({ step: 's03', check: "mật khẩu 'abc' → thông báo 'ít nhất 8 ký tự', vẫn ở màn đổi" });

    // s04: đổi hợp lệ → về đăng nhập với thông báo thành công (phiên cũ bị thu hồi)
    const fresh = 'Benhvien2026x';
    await page.fill('#changePassword_newPassword', fresh);
    await page.fill('#changePassword_confirmPassword', fresh);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login$/, { timeout: 30_000 });
    // Câu này CHỈ có ở Login.tsx (đọc logout_reason=PASSWORD_CHANGED) — locator duy nhất.
    await expect(page.getByText(/Vui lòng đăng nhập lại bằng mật khẩu mới/)).toBeVisible();
    await shot(page, 's04', 'success');
    results.push({ step: 's04', check: 'đổi hợp lệ → /login + toast "Đã đổi mật khẩu"' });

    // s05: đăng nhập lại bằng mật khẩu mới → vào được hệ thống, không còn bị đá
    await uiLogin(page, username, fresh);
    await expect(page).not.toHaveURL(/\/change-password$/);
    await expect(page).not.toHaveURL(/\/login$/);
    await shot(page, 's05', 'list');
    results.push({ step: 's05', check: 'đăng nhập lại bằng mật khẩu mới → vào hệ thống', url: page.url() });

    // Mật khẩu cũ do admin đặt không còn dùng được nữa.
    const old = await api('POST', '/api/auth/login', undefined, { username, password: initial });
    expect(old.status, 'mật khẩu cũ phải chết').toBe(401);
    results.push({ step: 'api', check: 'mật khẩu khởi tạo cũ → 401', status: old.status });
  } finally {
    await api('DELETE', `/api/admin/users/${userId}`, A);
  }
});

test.afterAll(async () => {
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 't1-password-change-results.json'), JSON.stringify(results, null, 2));
});
