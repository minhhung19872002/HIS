import { test, expect, type Page } from '@playwright/test';

/**
 * #352 lô 16 — FunctionalDiagnostics v2: lọc server-side + nút Làm mới.
 * Trước: chỉ tải 500 bản ghi mới nhất rồi lọc client ⇒ bản ghi cũ hơn không tìm được.
 */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test('#352 FunctionalDiagnostics gửi keyword lên server + có nút Làm mới', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto(`${BASE}/v2/functional-diagnostics`);
  await page.waitForResponse((r) => r.url().includes('/functional-diagnostics'), { timeout: 30_000 });

  // .first(): thanh phím tắt dưới cùng cũng có chữ "Làm mới" (F5)
  await expect(page.getByRole('button', { name: /Làm mới/ }).first()).toBeVisible();

  const call = page.waitForResponse(
    (r) => r.url().includes('/functional-diagnostics') && r.url().includes('keyword=ECG'),
    { timeout: 30_000 },
  );
  await page.getByPlaceholder(/Tìm mã/).fill('ECG');
  const res = await call;
  expect(res.status()).toBe(200);
});
