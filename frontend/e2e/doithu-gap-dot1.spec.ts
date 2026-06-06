import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

/**
 * E2E cho các gap Đợt 1 bù đối thủ (docs/workspace-docs/10-assessment/prompts-doithu-gap.md):
 * - Tra cứu HSBA công khai CCCD (P1 #4) — không cần đăng nhập, deterministic.
 * - Tiếp đón: CRUD cờ cảnh báo BN trong drawer v2 (P1 #7) — seed visit qua API trước.
 * - Đặt khám tại quầy: nút thật + form tạo/sửa (P1 #8).
 * - Nội trú: nút Kê y lệnh thuốc / Chỉ định CLS / Ra viện trong THEO DOI DIEU TRI (P1 #1,#2,#3).
 */

const API = 'http://localhost:5106';

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const resp = await request.post(`${API}/api/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const data = await resp.json();
  return data?.data?.token;
}

async function loginAsAdmin(page: Page) {
  const token = await getAdminToken(page.request);
  await page.context().addInitScript((t: string) => {
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  }, token);
  return token;
}

/** Seed 1 visit thu phí hôm nay (BN mới) để bảng Tiếp đón v2 chắc chắn có row. */
async function seedTodayVisit(request: APIRequestContext, token: string): Promise<boolean> {
  const h = { Authorization: `Bearer ${token}` };
  const roomsResp = await request.get(`${API}/api/reception/rooms/overview`, { headers: h });
  if (!roomsResp.ok()) return false;
  const roomsBody = await roomsResp.json();
  const rooms = roomsBody?.data ?? roomsBody;
  const roomId = Array.isArray(rooms) && rooms.length > 0 ? (rooms[0].roomId ?? rooms[0].id) : null;
  if (!roomId) return false;

  const reg = await request.post(`${API}/api/reception/register/fee`, {
    headers: h,
    data: {
      newPatient: {
        fullName: 'E2E Doithu Gap',
        gender: 1,
        yearOfBirth: 1990,
        phoneNumber: '0900000001',
        address: 'E2E test',
      },
      serviceType: 1,
      roomId,
    },
  });
  return reg.ok();
}

function collectApiErrors(page: Page) {
  const errors: string[] = [];
  page.on('response', (resp) => {
    if (resp.status() >= 500 && resp.url().includes('/api/')) {
      errors.push(`[${resp.status()}] ${resp.url().replace(/^https?:\/\/[^/]+/, '')}`);
    }
  });
  return errors;
}

/** Row dữ liệu thật phải có ≥4 cột — phân biệt với empty-state row (1 td colspan). */
async function firstDataRow(page: Page) {
  const firstRow = page.locator('.ab-tbl tbody tr').first();
  const visible = await firstRow.isVisible().catch(() => false);
  if (!visible) return null;
  const tdCount = await firstRow.locator('td').count();
  return tdCount >= 4 ? firstRow : null;
}

// ── P1 #4: Tra cứu HSBA công khai ────────────────────────────────────────
test.describe('Public EMR lookup (/tra-cuu-benh-an)', () => {
  test('form renders without login and bogus lookup returns neutral message', async ({ page }) => {
    const apiErrors = collectApiErrors(page);
    await page.goto('/tra-cuu-benh-an', { waitUntil: 'domcontentloaded' });

    await expect(page.getByPlaceholder('Nhập số CCCD/CMND')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('Nhập số CCCD/CMND').fill('000000000000');
    // antd DatePicker: phải Enter để commit value vào form state (fill thường không đủ)
    await page.getByPlaceholder('DD/MM/YYYY').fill('01/01/1990');
    await page.getByPlaceholder('DD/MM/YYYY').press('Enter');
    await page.getByRole('button', { name: /tra cứu/i }).click();

    // Thông điệp trung lập — không lộ CCCD có tồn tại hay không.
    await expect(
      page.getByText('Không tìm thấy hồ sơ bệnh án đã ký số khớp với thông tin đã nhập.')
    ).toBeVisible({ timeout: 10000 });

    expect(apiErrors, 'No 5xx').toHaveLength(0);
  });
});

// ── P1 #7: Cờ cảnh báo BN trong drawer Tiếp đón v2 ───────────────────────
test.describe('Reception v2 patient flags', () => {
  test('drawer shows PatientFlagsSection with add button', async ({ page }) => {
    const token = await loginAsAdmin(page);
    await seedTodayVisit(page.request, token);

    const apiErrors = collectApiErrors(page);
    await page.goto('/v2/reception', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const row = await firstDataRow(page);
    if (!row) test.skip(true, 'No reception rows (seed failed)');

    await row!.locator('td').nth(2).click();

    // DrawerShell của _v2kit render .hui-drawer (không phải antd Drawer)
    const drawer = page.locator('.hui-drawer, .ant-drawer-content, [role="dialog"]').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    await expect(drawer.getByText('CỜ CẢNH BÁO BỆNH NHÂN')).toBeVisible({ timeout: 10000 });
    await expect(drawer.getByRole('button', { name: /thêm/i }).first()).toBeVisible();

    expect(apiErrors, 'No 5xx').toHaveLength(0);
  });
});

// ── P1 #8: Đặt khám tại quầy ─────────────────────────────────────────────
test.describe('Booking management v2', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('page loads with real action buttons and create form opens', async ({ page }) => {
    const apiErrors = collectApiErrors(page);
    await page.goto('/v2/booking-management', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Nút "Đặt lịch" mở form đặt khám tại quầy thật
    await page.getByRole('button', { name: 'Đặt lịch', exact: true }).click();
    await expect(page.getByText('Đặt lịch khám tại quầy')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Huỷ' }).click();

    expect(apiErrors, 'No 5xx').toHaveLength(0);
  });
});

// ── P1 #1,#2,#3: Nội trú — y lệnh thuốc / CLS / ra viện ──────────────────
test.describe('Inpatient v2 treatment monitor actions', () => {
  test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

  test('treatment section exposes prescription / CLS / discharge buttons', async ({ page }) => {
    const apiErrors = collectApiErrors(page);
    await page.goto('/v2/ipd', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const row = await firstDataRow(page);
    if (!row) test.skip(true, 'No inpatient rows in DB');

    await row!.locator('td').nth(2).click();
    await page.waitForTimeout(1500);

    const body = page.locator('.hui-drawer, .ant-drawer-content, [role="dialog"], body').first();
    const monitorVisible = await body.getByText('THEO DOI DIEU TRI').isVisible().catch(() => false);
    if (!monitorVisible) {
      test.skip(true, 'Treatment monitor section not reachable for first row (no admission)');
    }

    await expect(body.getByRole('button', { name: /Ke y lenh thuoc/i })).toBeVisible();
    await expect(body.getByRole('button', { name: /Chi dinh CLS/i })).toBeVisible();
    await expect(body.getByRole('button', { name: /Ra vien/i })).toBeVisible();

    // Mở modal kê y lệnh thuốc rồi đóng (không ghi dữ liệu)
    await body.getByRole('button', { name: /Ke y lenh thuoc/i }).click();
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape');

    expect(apiErrors, 'No 5xx').toHaveLength(0);
  });
});
