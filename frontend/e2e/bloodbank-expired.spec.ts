import { test, expect, type Page } from '@playwright/test';

/**
 * #352 lô 2 — BloodBank v2 nhận tab "Đã hết hạn" (gap patient-safety).
 * Trước đây túi máu quá hạn KHÔNG xuất hiện ở bất kỳ view nào của v2
 * (getExpiringBloodBags chỉ trả Available + ExpiryDate > GETDATE()) nên nút "Tiêu huỷ"
 * không bao giờ với tới đúng túi cần huỷ.
 */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test('#352 BloodBank gọi API túi đã hết hạn và render tab riêng', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);

  const call = page.waitForResponse(
    // route thật: /BloodBankComplete/stock/expired (chú ý hoa/thường)
    (r) => r.url().includes('/stock/expired') && r.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.goto(`${BASE}/v2/blood-bank`);
  const res = await call;
  expect(res.status(), 'GET túi máu hết hạn phải 200').toBe(200);

  await page.getByRole('button', { name: /Đã hết hạn/ }).click();

  // Bảng render (dù rỗng vẫn phải có empty-state đúng ngữ cảnh)
  const emptyOrRows = page.getByText(/Không có túi máu nào quá hạn|Mã túi/).first();
  await expect(emptyOrRows).toBeVisible({ timeout: 15_000 });
});
