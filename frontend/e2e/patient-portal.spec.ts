/**
 * E2E — Cổng bệnh nhân tự đăng nhập /patient-portal (R2, defer đợt 5).
 * Flow thật: register (API) → login bị chặn khi chưa link → tạo BN + link hồ sơ (API admin)
 * → login qua UI → workspace 4 tab gọi API claim-scoped (KHÔNG truyền patientId) → logout
 * → IDOR: token PortalPatient + patientId người khác → 403.
 * Data: BN tên "[AUTO-REG] PWAUTO..." (script cleanup suite đã xử lý [AUTO-REG]);
 * PortalAccounts email pwauto% — dọn trong test-cleanup-generated-data.ps1.
 * Cần backend localhost:5106 đang chạy (FE dev server tự khởi động qua playwright webServer).
 */
import { test, expect, request as pwRequest, APIRequestContext, Page } from '@playwright/test';

const API = 'http://localhost:5106';
const SUFFIX = Date.now().toString().slice(-8);
const PORTAL_EMAIL = `pwauto${SUFFIX}@example.com`;
const PORTAL_PHONE = `091${SUFFIX}`;
const PORTAL_PASS = 'PwAuto@123';
const PATIENT_NAME = `[AUTO-REG] PWAUTO Portal BN ${SUFFIX}`;

const IGNORE_PATTERNS = [
  /useForm/, /\[antd:/i, /SignalR/i, /\[HMR\]/, /\[vite\]/, /WebSocket/, /findDOMNode/,
  /401/, /403/, /Failed to load resource/, // portal chưa đăng nhập → vài request 401 là hành vi đúng
];

// apiClient FE auto-unwrap envelope {success,data}; gọi raw qua Playwright thì tự unwrap defensive 2 shape.
function unwrap<T = any>(body: any): T {
  return body && typeof body === 'object' && body.data !== undefined ? body.data : body;
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function adminToken(api: APIRequestContext): Promise<string> {
  const r = await api.post('/api/auth/login', { data: { username: 'admin', password: 'Admin@123' } });
  expect(r.ok()).toBeTruthy();
  const token = unwrap(await r.json()).token;
  expect(token).toBeTruthy();
  return token;
}

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORE_PATTERNS.some((p) => p.test(text))) return;
    errors.push(text);
  });
  return errors;
}

test.describe.serial('Patient Portal self-login (R2)', () => {
  let api: APIRequestContext;
  let accountId = '';
  let patientCode = '';

  test.beforeAll(async () => {
    api = await pwRequest.newContext({ baseURL: API });
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  test('1. /patient-portal render auth card, console sạch', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/patient-portal', { timeout: 30000 });
    await expect(page.getByTestId('patient-portal-auth-card')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('portal-login-btn')).toBeVisible();
    await page.waitForTimeout(1500);
    expect(errors, `Console errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  test('2. login sai → báo lỗi, không vào workspace', async ({ page }) => {
    await page.goto('/patient-portal');
    await page.getByTestId('portal-identifier').fill('khong-ton-tai@example.com');
    await page.getByTestId('portal-password').fill('SaiMatKhau@1');
    await page.getByTestId('portal-login-btn').click();
    // err div hiện message (BE message hoặc fallback FE) — không crash, không vào workspace
    await expect(
      page.locator('text=/thất bại|không đúng|không tồn tại|chưa kích hoạt|bị khóa/i').first()
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('patient-portal-workspace')).toHaveCount(0);
  });

  test('3. API: đăng ký account → login bị chặn khi chưa link hồ sơ', async () => {
    const reg = await api.post('/api/portal/register', {
      data: {
        fullName: `PWAUTO Portal ${SUFFIX}`,
        email: PORTAL_EMAIL,
        phone: PORTAL_PHONE,
        idNumber: `0${SUFFIX}123`,
        dateOfBirth: '1990-01-01',
        password: PORTAL_PASS,
      },
    });
    expect(reg.ok(), await reg.text()).toBeTruthy();
    accountId = unwrap(await reg.json()).id;
    expect(accountId).toBeTruthy();

    const login = await api.post('/api/portal/login', {
      data: { identifier: PORTAL_EMAIL, password: PORTAL_PASS },
    });
    const body = unwrap(await login.json());
    expect(body?.token, 'account Pending/chưa link KHÔNG được cấp token').toBeFalsy();
  });

  test('4. API: tạo BN (SĐT khớp) → link hồ sơ thành công', async () => {
    const at = await adminToken(api);
    const roomsResp = await api.get('/api/catalog/rooms', { headers: bearer(at) });
    const rooms = unwrap<any[]>(await roomsResp.json());
    const room = rooms.find((r) => r.roomType === 1) ?? rooms[0];
    expect(room?.id, 'cần ít nhất 1 phòng trong catalog').toBeTruthy();

    const reg = await api.post('/api/reception/register/fee', {
      headers: bearer(at),
      data: {
        newPatient: { fullName: PATIENT_NAME, gender: 1, yearOfBirth: 1990, phoneNumber: PORTAL_PHONE },
        roomId: room.id,
        serviceType: 2,
      },
    });
    expect(reg.ok(), await reg.text()).toBeTruthy();
    patientCode = unwrap(await reg.json()).patientCode;
    expect(patientCode).toBeTruthy();

    // verificationData = SĐT trùng với BN vừa đăng ký → link pass (R2: verify Phone/CCCD/DOB)
    const link = await api.post('/api/portal/account/link-record', {
      headers: bearer(at),
      data: { accountId, patientCode, verificationData: PORTAL_PHONE },
    });
    expect(link.ok(), await link.text()).toBeTruthy();
    const lb = unwrap(await link.json());
    expect(lb === true || lb?.success === true, `link thất bại: ${JSON.stringify(lb)}`).toBeTruthy();
  });

  test('5. UI: login → workspace 4 tab, API claim-scoped không truyền patientId → logout', async ({ page }) => {
    await page.goto('/patient-portal');
    await page.getByTestId('portal-identifier').fill(PORTAL_EMAIL);
    await page.getByTestId('portal-password').fill(PORTAL_PASS);

    const visitsResp = page.waitForResponse(
      (r) => r.url().includes('/api/portal/visits') && r.status() === 200,
      { timeout: 20000 }
    );
    await page.getByTestId('portal-login-btn').click();

    await expect(page.getByTestId('patient-portal-workspace')).toBeVisible({ timeout: 20000 });
    const resp = await visitsResp;
    expect(resp.url(), 'portal phải gọi API claim-scoped, KHÔNG truyền patientId').not.toContain('patientId');

    for (const k of ['visits', 'labs', 'rx', 'bills']) {
      await expect(page.getByTestId(`portal-tab-${k}`)).toBeVisible();
    }
    // tab Lịch sử khám có đúng 1 lượt khám vừa đăng ký (count hiển thị trong label)
    await expect(page.getByTestId('portal-tab-visits')).toContainText('(1)');

    await page.getByTestId('portal-logout-btn').click();
    await expect(page.getByTestId('patient-portal-auth-card')).toBeVisible({ timeout: 10000 });
  });

  test('6. IDOR: token PortalPatient + patientId người khác → 403; của mình → 200', async () => {
    const login = await api.post('/api/portal/login', {
      data: { identifier: PORTAL_EMAIL, password: PORTAL_PASS },
    });
    const body = unwrap(await login.json());
    expect(body?.success, `login sau link phải OK: ${JSON.stringify(body)}`).toBeTruthy();
    const portalToken = body.token as string;
    expect(portalToken).toBeTruthy();

    const foreign = '11111111-1111-1111-1111-111111111111';
    const forbidden = await api.get(`/api/portal/visits?patientId=${foreign}`, { headers: bearer(portalToken) });
    expect(forbidden.status(), 'query patientId ≠ claim phải bị 403').toBe(403);

    const own = await api.get('/api/portal/visits', { headers: bearer(portalToken) });
    expect(own.status()).toBe(200);
  });
});
