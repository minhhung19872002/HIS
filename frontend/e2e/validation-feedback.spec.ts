/**
 * E2E — Validation KHÔNG im lặng ở wizard Đăng ký tiếp đón (NewVisitModal).
 * Nguồn: docs/workspace-docs/10-assessment/prod-livetest-bugs-2026-06-12.md (bug chính):
 * trước đây bấm "Tiếp tục" khi thiếu field bắt buộc → KHÔNG message / KHÔNG tô đỏ / KHÔNG cuộn.
 * Sau fix (đợt 19): phải có (a) message.error tổng, (b) lỗi đỏ dưới field, (c) không qua bước.
 * Cần backend localhost:5106 đang chạy (FE dev server tự khởi động qua playwright webServer).
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const API = 'http://localhost:5106';

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const resp = await request.post(`${API}/api/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const data = await resp.json();
  return data?.data?.token;
}

async function loginAsAdmin(page: Page) {
  const token = await getAdminToken(page.request);
  await page.context().addInitScript((t: string) => {
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  }, token);
}

async function openNewVisitModal(page: Page) {
  await page.goto('/v2/reception');
  await page.getByRole('button', { name: /Đăng ký mới/ }).click();
  await expect(page.getByText('Đăng ký tiếp đón mới')).toBeVisible();
}

test.describe('Wizard Đăng ký tiếp đón — validation phải có feedback rõ', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('Bước 1 trống → toast tổng + lỗi đỏ dưới field + KHÔNG qua bước', async ({ page }) => {
    await openNewVisitModal(page);
    await expect(page.getByText('Bước 1/4')).toBeVisible();

    await page.getByRole('button', { name: /Tiếp tục/ }).click();

    // (a) message.error tổng liệt kê field thiếu
    await expect(page.locator('.ant-message').getByText(/Vui lòng kiểm tra/)).toBeVisible();
    // (b) lỗi đỏ dưới field (Lbl error)
    await expect(page.getByText('Bắt buộc', { exact: true })).toBeVisible();
    await expect(page.getByText('CCCD 12 số')).toBeVisible();
    // (c) vẫn ở bước 1 — không lặng lẽ đứng yên mà có feedback, không qua bước
    await expect(page.getByText('Bước 1/4')).toBeVisible();
  });

  test('Bước 3 thiếu "Lý do khám" (repro bug prod) → toast + lỗi field; điền đủ → qua bước 4', async ({ page }) => {
    await openNewVisitModal(page);

    // Bước 1 — điền hợp lệ
    await page.getByPlaceholder('Nguyễn Văn A').fill('E2E Validation BN');
    await page.getByPlaceholder('0912 345 678').fill('0912345678');
    await page.getByRole('spinbutton').fill('30'); // Tuổi (InputNumber)
    await page.getByPlaceholder('012345678901').fill('012345678901');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await expect(page.getByText('Bước 2/4')).toBeVisible();

    // Bước 2 — chọn "Khám thường" (không cần xác thực BHYT)
    await page.getByText('Khám thường', { exact: true }).click();
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await expect(page.getByText('Bước 3/4')).toBeVisible();

    // Bước 3 — bấm Tiếp tục khi CHƯA chọn phòng + CHƯA điền lý do (đúng kịch bản bug prod)
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await expect(page.locator('.ant-message').getByText(/Vui lòng kiểm tra/).first()).toBeVisible();
    await expect(page.getByText('Chọn khoa / phòng')).toBeVisible();
    await expect(page.getByText('Nhập lý do khám')).toBeVisible();
    await expect(page.getByText('Bước 3/4')).toBeVisible(); // không qua bước

    // Điền đủ → qua bước 4 (KHÔNG bấm Đăng ký — không tạo data)
    const firstRoom = page.locator('.rec-deptgrid label').first();
    if (await firstRoom.count()) await firstRoom.click();
    await page.getByPlaceholder(/Triệu chứng chính/).fill('E2E test lý do khám');
    await page.getByRole('button', { name: /Tiếp tục/ }).click();
    await expect(page.getByText('Bước 4/4')).toBeVisible();
  });
});
