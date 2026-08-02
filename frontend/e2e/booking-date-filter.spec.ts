import { test, expect, type Page } from '@playwright/test';

/** #352 lô 3 — BookingManagement v2 nhận bộ lọc khoảng ngày (backend đã hỗ trợ sẵn). */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test('#352 BookingManagement truyền fromDate/toDate lên API', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);

  const call = page.waitForResponse(
    (r) => r.url().includes('/booking-management/bookings') && r.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.goto(`${BASE}/v2/booking-management`);
  const res = await call;
  expect(res.status()).toBe(200);

  const url = new URL(res.url());
  expect(url.searchParams.get('fromDate'), 'phải gửi fromDate').toBeTruthy();
  expect(url.searchParams.get('toDate'), 'phải gửi toDate').toBeTruthy();

  // Đổi ngày → gọi lại API với fromDate mới
  const next = page.waitForResponse(
    (r) => r.url().includes('/booking-management/bookings') && r.url().includes('fromDate=2026-01-05'),
    { timeout: 30_000 },
  );
  await page.locator('input[type="date"]').first().fill('2026-01-05');
  const res2 = await next;
  expect(res2.status()).toBe(200);
});
