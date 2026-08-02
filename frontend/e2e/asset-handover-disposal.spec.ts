import { test, expect, type Page } from '@playwright/test';

/**
 * #352 lô 1 — AssetManagement v2 nhận 2 tab port từ v1: Bàn giao + Thanh lý.
 * Chạy: npx playwright test e2e/asset-handover-disposal.spec.ts --project=chromium --workers=1
 */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test.describe.configure({ mode: 'serial' });

test('#352 tab Bàn giao gọi API và mở được modal chọn tài sản', async ({ page }) => {
  await login(page);

  const call = page.waitForResponse(
    (r) => r.url().includes('/asset-management/handovers') && r.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.goto(`${BASE}/v2/asset-management`);
  const res = await call;
  expect(res.status(), 'GET handovers phải 200').toBe(200);

  await page.getByRole('tab', { name: /Bàn giao/ }).click();
  await page.getByRole('button', { name: /Tạo bàn giao/ }).click();

  await expect(page.getByText('Tạo phiếu bàn giao tài sản')).toBeVisible();
  // Sạch hơn v1: chọn tài sản từ danh sách thay vì gõ tay GUID
  // antd Select render placeholder trong <span>, không phải attribute placeholder
  await expect(page.getByText(/Chọn tài sản/).first()).toBeVisible();
  await expect(page.getByText('Loại bàn giao')).toBeVisible();
});

test('#352 tab Thanh lý gọi API và mở được modal đề xuất', async ({ page }) => {
  await login(page);

  const call = page.waitForResponse(
    (r) => r.url().includes('/asset-management/disposals') && r.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.goto(`${BASE}/v2/asset-management`);
  const res = await call;
  expect(res.status(), 'GET disposals phải 200').toBe(200);

  await page.getByRole('tab', { name: /Thanh lý/ }).click();
  await page.getByRole('button', { name: /Đề xuất thanh lý/ }).click();

  await expect(page.getByText('Đề xuất thanh lý tài sản')).toBeVisible();
  // antd Select render placeholder trong <span>, không phải attribute placeholder
  await expect(page.getByText(/Chọn tài sản/).first()).toBeVisible();
  await expect(page.getByText('Giá thanh lý (đ)')).toBeVisible();
});
