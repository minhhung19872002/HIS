import { test, expect, type Page } from '@playwright/test';

/**
 * #352 lô 14 — FinanceCatalogs v2 chặn lưu bản ghi rỗng.
 * Trước: v2 post thẳng, seed code:'' name:'' và BE cũng không validate ⇒ tạo được danh mục
 * RỖNG nuôi thẳng vào giá viện phí / vận chuyển.
 */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test('#352 FinanceCatalogs không cho lưu danh mục rỗng', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);

  // Bắt mọi POST lưu danh mục — phải KHÔNG có request nào khi form rỗng
  const saves: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /master-catalog|additional-charge|other-income|transport|gasoline/i.test(r.url())) {
      saves.push(r.url());
    }
  });

  await page.goto(`${BASE}/v2/finance-catalogs`);
  await page.getByRole('button', { name: /Thêm/ }).first().click();

  // Lưu ngay khi chưa nhập gì
  // nút lưu của drawer tên là "Tạo mới" (thêm) / "Cập nhật" (sửa)
  await page.getByRole('button', { name: /Tạo mới|Cập nhật/ }).last().click();
  await page.waitForTimeout(1200);

  expect(saves, 'không được gửi POST khi form rỗng').toEqual([]);
  await expect(page.getByText(/là bắt buộc/).first()).toBeVisible({ timeout: 10_000 });
});
