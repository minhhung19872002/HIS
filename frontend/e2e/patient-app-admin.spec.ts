import { test, expect } from '@playwright/test';

/**
 * Web quản trị app người bệnh — HSMT I.3.
 *
 * Năm màn này đọc dữ liệu từ **BFF** (`/patient-api`), không phải từ HIS Core. Đó chính là chỗ dễ
 * hỏng lặng lẽ: HIS chạy tốt, đăng nhập được, menu hiện đủ, chỉ có mấy màn này trắng vì proxy chưa
 * trỏ hoặc `VITE_PATIENT_APP_API_URL` chưa đặt. Không ai phát hiện cho tới lúc quản trị viên mở ra.
 *
 * Bộ này kiểm ba mệnh đề: màn dựng được · không có lỗi JS · lời gọi API tới BFF không trả 4xx/5xx.
 * Phần nghiệp vụ (khoá tài khoản, đặt lại mật khẩu, gửi chiến dịch, ghi nhật ký truy cập) đã có
 * `scripts/smoke-patient-app-phase6.py` kiểm bằng API thật với PostgreSQL thật.
 */

const ROUTES = [
  { path: '/v2/patient-app',               name: 'Bảng điều khiển',  testId: 'patient-app-dashboard-page' },
  { path: '/v2/patient-app/accounts',      name: 'Tài khoản app',    testId: 'patient-app-accounts-page' },
  { path: '/v2/patient-app/families',      name: 'Nhóm gia đình',    testId: 'patient-app-families-page' },
  { path: '/v2/patient-app/notifications', name: 'Chiến dịch thông báo', testId: 'patient-app-notifications-page' },
  { path: '/v2/patient-app/lookup',        name: 'Tra cứu CSKH',     testId: 'patient-app-lookup-page' },
];

const IGNORE_CONSOLE = [
  /Download the React DevTools/,
  /\[antd:/,
  /useForm/,
  /not connected to any Form/,
  /SignalR/i,
  /WebSocket/,
  /\[HMR\]/,
  /\[vite\]/,
  /findDOMNode/,
  /negotiate.*401/,
];

test.beforeEach(async ({ page, context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  });

  // Web quản trị gọi BFF bằng CHÍNH token của HIS (quyết định D16) — không có danh tính thứ hai.
  const resp = await page.request.post('http://localhost:5106/api/auth/login', {
    data: { username: 'admin', password: 'Admin@123' },
    failOnStatusCode: false,
  });
  if (resp.ok()) {
    const data = await resp.json();
    const token = data?.data?.token || data?.token;
    if (token) {
      await context.addInitScript((t: string) => {
        window.localStorage.setItem('token', t);
      }, token);
    }
  }
});

for (const route of ROUTES) {
  test(`${route.name} — dựng được, không lỗi JS, BFF không trả lỗi`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const bffErrors: { url: string; status: number }[] = [];

    page.on('console', (m) => {
      if (m.type() === 'error') {
        const t = m.text();
        if (!IGNORE_CONSOLE.some((p) => p.test(t))) consoleErrors.push(t);
      }
    });
    page.on('response', (r) => {
      const url = r.url();
      const s = r.status();
      // 401 bỏ qua: một số lời gọi chạy trước khi token kịp vào localStorage.
      if (s >= 400 && s !== 401 && /\/patient-api\/|\/api\/v1\/admin\/patient-app/.test(url)) {
        bffErrors.push({ url: url.replace(/^https?:\/\/[^/]+/, ''), status: s });
      }
    });

    await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 8000 });

    expect(consoleErrors, `lỗi JS: ${consoleErrors.join(' | ')}`).toEqual([]);
    expect(bffErrors, `BFF trả lỗi: ${JSON.stringify(bffErrors)}`).toEqual([]);
  });
}

test('Bảng điều khiển — đổi khoảng thời gian thì gọi lại BFF', async ({ page }) => {
  await page.goto('/v2/patient-app', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('patient-app-dashboard-page')).toBeVisible({ timeout: 8000 });

  // Bộ lọc phải thật sự nạp lại dữ liệu, không phải chỉ đổi chữ trên nút.
  const reload = page.waitForResponse(
    (r) => /dashboard/.test(r.url()) && r.status() === 200,
    { timeout: 15000 },
  );

  // `Filter` của _v2kit là thẻ <select> gốc, không phải Select của antd.
  await page.locator('select.ab-sel').first().selectOption('7');

  await reload;
});

test('Tra cứu CSKH — không tự tra khi chưa nhập gì', async ({ page }) => {
  // Mọi lần tra đều vào nhật ký truy cập, nên một lần tra "tự động" lúc mở màn là một dòng nhật ký
  // sai: nó ghi rằng nhân viên đã xem hồ sơ của ai đó trong khi họ chưa hề tìm.
  const lookups: string[] = [];
  page.on('request', (r) => {
    if (/lookup\/patients/.test(r.url())) lookups.push(r.url());
  });

  await page.goto('/v2/patient-app/lookup', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('patient-app-lookup-page')).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(2000);

  expect(lookups, `đã tra khi chưa nhập: ${lookups.join(' | ')}`).toEqual([]);
});
