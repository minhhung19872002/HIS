import { test, expect, type Page } from '@playwright/test';

/**
 * #352 lô 15 — FollowUp v2: tìm kiếm server-side + số điện thoại bấm gọi được.
 * Trước: keyword chỉ lọc client trong 16 dòng của trang hiện tại (BN ngoài trang đầu
 * không tìm thấy), và nút điện thoại KHÔNG gọi mà âm thầm đổi trạng thái lịch hẹn.
 */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test('#352 FollowUp gửi keyword lên server khi tìm kiếm', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto(`${BASE}/v2/follow-up`);
  await page.waitForResponse((r) => r.url().includes('/appointments/search') || r.url().includes('appointment'), { timeout: 30_000 })
    .catch(() => { /* route có thể khác tên, không chặn test */ });

  const call = page.waitForResponse(
    (r) => r.url().includes('keyword=Nguyen') && r.request().method() === 'GET',
    { timeout: 30_000 },
  );
  await page.getByPlaceholder(/Tìm/).first().fill('Nguyen');
  const res = await call;
  expect(res.status(), 'tìm kiếm phải gọi server kèm keyword').toBe(200);
});
