import { test, expect, type Page } from '@playwright/test';

/** #352 lô 8 — CommunityHealth v2 nhận CRUD hộ gia đình (HH_FIELDS đã khai báo mà chưa gắn modal). */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test('#352 CommunityHealth mở được modal thêm hộ gia đình', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto(`${BASE}/v2/community-health`);

  const addBtn = page.getByRole('button', { name: /Thêm hộ gia đình/ });
  await expect(addBtn).toBeVisible({ timeout: 20_000 });
  await addBtn.click();

  await expect(page.getByText('Thêm hộ gia đình').last()).toBeVisible();
  // vài field đặc trưng của HH_FIELDS
  await expect(page.getByText(/Chủ hộ/).first()).toBeVisible();
});
