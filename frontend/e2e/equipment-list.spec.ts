import { test, expect, type Page } from '@playwright/test';

/**
 * #352 lô 13 — Equipment v2 render được danh sách.
 * Trước: v2 đọc `data?.items` trong khi GET /api/equipment trả MẢNG TRẦN ⇒ luôn rỗng
 * ⇒ danh sách + KPI + đếm trạng thái + tab Kiểm định đều trắng.
 */

const BASE = 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

test('#352 Equipment hiển thị thiết bị khi backend trả mảng trần', async ({ page, request }) => {
  test.setTimeout(90_000);

  // Đếm thiết bị thật từ API để so với UI
  const login1 = await request.post('http://localhost:5106/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const token = (await login1.json()).data.token;
  const eqRes = await request.get('http://localhost:5106/api/equipment?page=1&pageSize=200', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await eqRes.json();
  const payload = body?.data ?? body;
  const apiCount = Array.isArray(payload) ? payload.length : (payload?.items?.length ?? 0);

  await login(page);
  await page.goto(`${BASE}/v2/equipment`);
  await page.waitForResponse((r) => r.url().includes('/api/equipment') && r.request().method() === 'GET', { timeout: 30_000 });
  await page.waitForTimeout(1500);

  if (apiCount > 0) {
    // Bảng phải có dòng, không còn empty-state
    const emptyState = page.getByText(/Không có thiết bị|Chưa có thiết bị/i);
    await expect(emptyState).toHaveCount(0);
  } else {
    // Seed rỗng → chỉ xác nhận trang render không lỗi
    await expect(page.getByText(/Danh sách thiết bị/).first()).toBeVisible();
  }
});
