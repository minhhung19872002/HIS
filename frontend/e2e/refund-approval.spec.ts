import { test, expect, type Page } from '@playwright/test';

/**
 * #352 lô 6 — màn "Duyệt hoàn tiền" (v2 chưa từng có).
 * approveRefund/confirmRefund/cancelRefund nằm sẵn trong api/billing.ts nhưng không trang v2
 * nào gọi → phiếu hoàn tiền tạo từ BillingEditor bị kẹt ở trạng thái chờ duyệt.
 */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test('#352 màn Duyệt hoàn tiền gọi API và render đủ 4 trạng thái', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);

  const call = page.waitForResponse(
    (r) => r.url().includes('/refunds/search') && r.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.goto(`${BASE}/v2/refund-approval`);
  const res = await call;
  expect(res.status(), 'GET /refunds/search phải 200').toBe(200);

  await expect(page.getByText('Duyệt hoàn tiền').first()).toBeVisible({ timeout: 15_000 });

  // 4 status tab của quy trình hoàn tiền
  for (const label of ['Chờ duyệt', 'Đã duyệt', 'Đã chi', 'Từ chối']) {
    await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
  }

  // KPI tiền chờ duyệt (kế toán cần thấy ngay)
  await expect(page.getByText('Tiền chờ duyệt')).toBeVisible();
});
