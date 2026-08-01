import { test, expect, type Page } from '@playwright/test';

/**
 * #433 — smoke 2 mục PATIENT-SAFETY của OpdEditor v2 (theo DoD):
 *   (a) auto-save 30s ghi lên SERVER (không chỉ localStorage)
 *   (b) kết quả CDS bị XOÁ khi đổi bệnh nhân (chống hiển thị nhầm BN)
 *
 * Cần backend local + hàng đợi có BN:
 *   POST /api/admin/seed-daily/patients?count=6  (header X-Seed-Key)
 * Chạy: npx playwright test e2e/goal-sweep-opd-safety.spec.ts --project=chromium --workers=1
 */

const BASE = 'http://localhost:3001';
const API  = 'http://localhost:5106';

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.getByPlaceholder('Tên đăng nhập').fill('admin');
  await page.getByPlaceholder('Mật khẩu').fill('Admin@123');
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForURL(/\/v2\//, { timeout: 30_000 });
}

/** Hỏi API xem phòng nào đang có BN trong hàng đợi (tránh đoán mò trên UI). */
async function roomsWithQueue(request: import('@playwright/test').APIRequestContext) {
  const login = await request.post(`${API}/api/auth/login`, { data: { username: 'admin', password: 'Admin@123' } });
  const token = (await login.json()).data.token;
  const auth = { Authorization: `Bearer ${token}` };
  const rooms = (await (await request.get(`${API}/api/examination/rooms/active`, { headers: auth })).json()).data as
    { id: string; name: string }[];
  const out: { id: string; name: string; count: number; patientName: string }[] = [];
  for (const r of rooms) {
    const q = (await (await request.get(`${API}/api/examination/room/${r.id}/patients`, { headers: auth })).json()).data;
    if (Array.isArray(q) && q.length > 0) {
      out.push({ id: r.id, name: r.name, count: q.length, patientName: q[0].patientName });
    }
  }
  return out;
}

test.describe.configure({ mode: 'serial' });

test('#433 auto-save 30s ghi lên SERVER + CDS xoá khi đổi bệnh nhân', async ({ page, request }) => {
  test.setTimeout(240_000);

  const withQueue = await roomsWithQueue(request);
  expect(withQueue.length, 'cần ít nhất 2 phòng có BN (chạy seed trước)').toBeGreaterThanOrEqual(2);

  await login(page);

  const serverWrites: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'PUT' && /\/examination\/[^/]+\/(medical-interview|physical-examination|vital-signs)/.test(r.url())) {
      serverWrites.push(r.url().replace(/^.*\/api/, ''));
    }
  });

  await page.goto(`${BASE}/v2/opd/edit`);
  await page.waitForTimeout(2000);

  // Chọn ĐÚNG phòng có BN (select đầu tiên = chọn phòng khám)
  const roomSelect = page.locator('select').first();
  await roomSelect.selectOption({ label: new RegExp(withQueue[0].name.slice(0, 12)) }).catch(async () => {
    await roomSelect.selectOption(withQueue[0].id);
  });
  await page.waitForTimeout(1500);

  // Bấm ĐÚNG thẻ BN trong hàng đợi (theo tên lấy từ API — tránh trúng rail sidebar)
  await page.getByText(withQueue[0].patientName, { exact: false }).first().click();
  await page.waitForTimeout(2500);

  // Khối bệnh sử phải xuất hiện (đã chọn BN)
  await expect(page.getByText('Chẩn đoán (ICD-10)')).toBeVisible({ timeout: 20_000 });

  // ── (b) CDS: bấm gợi ý → có kết quả → đổi BN → kết quả phải BIẾN MẤT ──
  const cdsBtn = page.getByRole('button', { name: /Gợi ý chẩn đoán \(CDS\)/i });
  await expect(cdsBtn, 'nút CDS phải hiện trong khối Chẩn đoán').toBeVisible();

  const historyBox = page.locator('textarea').first();
  // Hook tách triệu chứng theo [;,.\n] → dùng token khớp từ điển CDS (sot / ho / dau hong)
  await historyBox.fill('sot; ho; dau hong');
  await page.waitForTimeout(500);

  const cdsCall = page.waitForResponse((r) => r.url().includes('/cds/suggest-diagnoses'), { timeout: 30_000 });
  await cdsBtn.click();
  const cdsRes = await cdsCall;
  expect(cdsRes.status(), 'POST /cds/suggest-diagnoses phải 200').toBe(200);
  await page.waitForTimeout(1500);

  const suggestionLink = page.locator('button[title="Thêm vào danh sách chẩn đoán"]');
  const suggestionCount = await suggestionLink.count();
  console.log(`CDS tra ve ${suggestionCount} goi y hien tren UI`);

  // ── (a) auto-save 30s lên server ──
  await page.waitForTimeout(36_000);
  expect(serverWrites.length, `auto-save 30s phải PUT lên server; bắt được: ${serverWrites.join(', ') || '(không có)'}`)
    .toBeGreaterThan(0);
  expect(serverWrites.some((u) => u.includes('medical-interview')), 'phải có PUT medical-interview').toBeTruthy();
  console.log('AUTO-SAVE server writes:', serverWrites.join(', '));

  // Đổi sang phòng khác có BN → chọn BN mới → gợi ý CDS của BN cũ phải biến mất
  if (suggestionCount > 0) {
    await roomSelect.selectOption({ label: new RegExp(withQueue[1].name.slice(0, 12)) }).catch(async () => {
      await roomSelect.selectOption(withQueue[1].id);
    });
    await page.waitForTimeout(1500);
    await page.getByText(withQueue[1].patientName, { exact: false }).first().click();
    await page.waitForTimeout(2500);

    await expect(
      page.locator('button[title="Thêm vào danh sách chẩn đoán"]'),
      'gợi ý CDS của BN trước PHẢI bị xoá khi đổi BN (patient-safety)',
    ).toHaveCount(0);
  }
});
