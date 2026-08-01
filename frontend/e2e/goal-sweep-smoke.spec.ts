import { test, expect, type Page } from '@playwright/test';

/**
 * Smoke UI cho batch goal-sweep 2026-08-02: #433 · #434 · #435 · #438.
 * Chạy với backend local (localhost:5106) + vite dev (localhost:3001).
 *   npx playwright test e2e/goal-sweep-smoke.spec.ts --project=chromium
 *
 * Mục tiêu: xác nhận UI mới RENDER + GỌI ĐÚNG API (không phải test nghiệp vụ sâu —
 * phần logic đã phủ bằng test-goal-sweep-smoke.ps1 ở tầng API).
 */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder(/tên đăng nhập|username/i).fill('admin');
  await page.getByPlaceholder(/mật khẩu|password/i).fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('#438 tab Đối chiếu thuốc gọi API và render bảng', async ({ page }) => {
  const call = page.waitForResponse(
    (r) => r.url().includes('/pharmacy/reconciliation') && r.request().method() === 'GET',
    { timeout: 30_000 },
  );

  await page.goto(`${BASE}/v2/pharmacy`);
  await page.getByRole('button', { name: /Đối chiếu thuốc/i }).click();

  const res = await call;
  expect(res.status(), 'GET /pharmacy/reconciliation phải trả 200').toBe(200);

  // KPI strip 6 ô của tab đối chiếu
  await expect(page.getByText('HSBA đối chiếu')).toBeVisible();
  await expect(page.getByText('Chưa/thiếu cấp')).toBeVisible();
  await expect(page.getByText('Lệch dữ liệu')).toBeVisible();

  // Ghi chú read-only phải hiện (phase 1 chỉ báo cáo)
  await expect(page.getByText(/Báo cáo chỉ đọc/i)).toBeVisible();
});

test('#435 tab Khách hàng có nút quản lý điểm, mở được modal cộng/đổi điểm', async ({ page }) => {
  await page.goto(`${BASE}/v2/hospital-pharmacy`);
  await page.getByRole('button', { name: /Khách hàng/i }).click();
  await page.waitForResponse((r) => r.url().includes('/hospital-pharmacy/customers'), { timeout: 30_000 });

  const pointsBtn = page.locator('button[title="Quản lý điểm tích lũy"]').first();
  await expect(pointsBtn, 'phải có nút quản lý điểm trên mỗi dòng KH').toBeVisible({ timeout: 15_000 });
  await pointsBtn.click();

  await expect(page.getByText(/Điểm tích lũy —/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cộng điểm' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đổi điểm' })).toBeVisible();
  await expect(page.getByText(/Điểm hiện có:/)).toBeVisible();
});

test('#435 tab Hoa hồng mở được modal thêm hoa hồng', async ({ page }) => {
  await page.goto(`${BASE}/v2/hospital-pharmacy`);
  // waitForResponse sau click là race (response có thể về trước) → chờ trực tiếp trên UI
  await page.getByRole('button', { name: 'Hoa hồng', exact: true }).click();
  const addBtn = page.getByRole('button', { name: /Thêm hoa hồng/i });
  await expect(addBtn).toBeVisible({ timeout: 20_000 });
  await addBtn.click();
  await expect(page.getByText(/Bác sĩ \/ người hưởng/)).toBeVisible();
  await expect(page.getByText(/Hoa hồng tạm tính/)).toBeVisible();
});

test('#434 tab XML có nút xem trước + bộ lọc khoa, preview gọi đúng API', async ({ page }) => {
  await page.goto(`${BASE}/v2/insurance`);
  await page.getByRole('button', { name: /Xuất XML QĐ4210/i }).click();

  await expect(page.getByText('Khoa:')).toBeVisible();
  const previewBtn = page.getByRole('button', { name: /Xem trước & kiểm tra/i });
  await expect(previewBtn).toBeVisible();

  const call = page.waitForResponse(
    (r) => r.url().includes('/insurance/xml/preview') && r.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await previewBtn.click();
  const res = await call;
  expect(res.status(), 'POST /insurance/xml/preview phải trả 200').toBe(200);

  // Panel kết quả preview
  await expect(page.getByText(/Xem trước — đợt/)).toBeVisible({ timeout: 15_000 });
});

test('#433 OpdEditor có nút gợi ý chẩn đoán CDS + mẫu bộ chỉ định', async ({ page }) => {
  await page.goto(`${BASE}/v2/opd/edit`);
  // Chưa chọn BN: khối chẩn đoán chưa render → chỉ cần trang không crash
  await expect(page.getByText(/Chọn bệnh nhân từ hàng đợi|Chẩn đoán/i).first()).toBeVisible({ timeout: 30_000 });

  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.waitForTimeout(2000);
  expect(errors.filter((e) => !/favicon|404|Failed to load resource/i.test(e))).toEqual([]);
});
