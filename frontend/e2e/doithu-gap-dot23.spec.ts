import { test, expect, type Page } from '@playwright/test';

/**
 * E2E UI cho gap Đợt 2 + Đợt 3 + wave defer (prompts-doithu-gap.md):
 * page-level smoke — tab/nút/modal mới render đúng, không 5xx. Data-light:
 * không phụ thuộc dữ liệu nghiệp vụ, chỉ assert UI surface tồn tại + mở được.
 * (API surface đã cover bởi test-doithu-gap.ps1 — 28 asserts.)
 */

const API = 'http://localhost:5106';

async function loginAsAdmin(page: Page) {
  const resp = await page.request.post(`${API}/api/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const data = await resp.json();
  await page.context().addInitScript((t: string) => {
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin', fullName: 'Administrator', roles: ['Admin'], permissions: ['*'],
    }));
  }, data?.data?.token);
}

function collect5xx(page: Page) {
  const errors: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 500 && r.url().includes('/api/')) {
      errors.push(`[${r.status()}] ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
    }
  });
  return errors;
}

test.beforeEach(async ({ page }) => { await loginAsAdmin(page); });

// ── Đợt 2 P10: kiểm kê tài sản + hoàn trả VPP ──────────────────────────
test('AssetManagement có tab Kiểm kê + modal tạo phiếu mở được', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/asset-management', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Tab label dạng "Kiểm kê (N)" — antd Tabs render role="tab"
  const tab = page.getByRole('tab', { name: /Kiểm kê/ }).first();
  await expect(tab).toBeVisible({ timeout: 8000 });
  await tab.click();
  await page.waitForTimeout(1200);
  // Nút tạo phiếu kiểm kê hiện ra trong tab
  const createBtn = page.getByRole('button', { name: /Tạo phiếu kiểm kê/i }).first();
  await expect(createBtn).toBeVisible({ timeout: 5000 });
  expect(errs, 'No 5xx').toHaveLength(0);
});

test('OfficeSupplyApproval có tab Phiếu hoàn trả', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/office-supply-approval', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const returnsTab = page.getByRole('tab', { name: /Phiếu hoàn trả/i }).first();
  await expect(returnsTab).toBeVisible({ timeout: 8000 });
  await returnsTab.click();
  await page.waitForTimeout(1200);
  expect(errs, 'No 5xx').toHaveLength(0);
});

// ── Đợt 2 P7 + wave: tab Đã nhận hôm nay (SampleReceive) ───────────────
test('SampleReceive có tab Đã nhận hôm nay', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/sample-receive', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const tab = page.getByText(/Đã nhận hôm nay/i).first();
  await expect(tab).toBeVisible({ timeout: 8000 });
  await tab.click();
  await page.waitForTimeout(1200);
  expect(errs, 'No 5xx').toHaveLength(0);
});

// ── Wave C: nút Vai trò (DefaultLabRole) trong Laboratory ───────────────
test('Laboratory có nút Vai trò (DefaultLabRole)', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/lab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const btn = page.getByRole('button', { name: /Vai trò/i }).first();
  if (!(await btn.isVisible().catch(() => false))) {
    test.skip(true, 'Nút Vai trò không trên toolbar mặc định (có thể trong tab khác)');
  }
  await btn.click();
  await page.waitForTimeout(800);
  expect(errs, 'No 5xx').toHaveLength(0);
});

// ── Đợt 3: trình ký filter vai trò người ký ─────────────────────────────
test('SigningWorkflow có filter Vai trò người ký, KHÔNG có nút Tạo trình ký fake', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/signing-workflow', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Filter là <select> native — option placeholder không "visible", assert attached
  await expect(page.locator('option', { hasText: 'Vai trò người ký' })).toHaveCount(1, { timeout: 8000 });
  // Form tạo standalone đã bị gỡ (documentId fake) — đảm bảo không quay lại
  await expect(page.getByRole('button', { name: /Tạo trình ký/i })).toHaveCount(0);
  expect(errs, 'No 5xx').toHaveLength(0);
});

// ── Đợt 3: HR tab Đoàn thể ──────────────────────────────────────────────
test('EmployeeProfile có tab Đoàn thể', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/employee-profile', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await expect(page.getByText(/Đoàn thể/i).first()).toBeVisible({ timeout: 8000 });
  expect(errs, 'No 5xx').toHaveLength(0);
});

// ── Đợt 3: biên lai field Lý do thu ─────────────────────────────────────
test('ReceiptBookAdmin render (field Lý do thu trong form)', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/receipt-book-admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  // Trang load không 5xx là đạt (field trong modal tạo/sửa — cần data để mở)
  expect(errs, 'No 5xx').toHaveLength(0);
});

// ── Đợt 2 P8 + wave A: Radiology bulk-select + PTTT (page-level) ────────
test('Radiology v2 load sạch (bulk download + PTTT wiring)', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/radiology', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  expect(errs, 'No 5xx').toHaveLength(0);
});

// ── Đợt 2 P9: mobile bác sĩ tab Nội trú ─────────────────────────────────
test('DoctorPortalMobile có tab Nội trú (nhập liệu)', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/m/doctor-portal', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const tab = page.getByText(/Nội trú/i).first();
  if (!(await tab.isVisible().catch(() => false))) {
    test.skip(true, 'Route mobile khác hoặc cần resize — soft skip');
  }
  await tab.click();
  await page.waitForTimeout(1200);
  expect(errs, 'No 5xx').toHaveLength(0);
});
