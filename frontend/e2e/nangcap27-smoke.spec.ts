import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * NangCap27 (HSMT BV Tâm thần Quảng Ngãi) — smoke 2 màn mới:
 *   /v2/transport-slips     — Phiếu vận chuyển người bệnh (G1)
 *   /v2/checkup-contracts   — Hợp đồng KSK theo đoàn + DM công ty (G8)
 * Kiểm: route render, gọi API thật không lỗi, mở được form lập phiếu, không có console error.
 */

// Cảnh báo có sẵn của nền tảng (antd v6 + _v2kit dùng static message), xuất hiện ở MỌI trang —
// không phải lỗi của 2 màn NangCap27, lọc ra để test bắt đúng lỗi thật.
const IGNORED_CONSOLE = [
  'favicon',
  'Download the React DevTools',
  'ResizeObserver loop',
  '[antd: message] Static function can not consume context',
  '[antd: Modal] `destroyOnClose` is deprecated',
];

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[placeholder*="ên đăng nhập"], input#username, input[name="username"]', 'admin');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
}

function collectErrors(page: Page, sink: string[]) {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((i) => text.includes(i))) return;
    sink.push(text);
  });
  page.on('pageerror', (err) => sink.push(`pageerror: ${err.message}`));
}

// BE áp last-wins session (#384): 2 test đăng nhập song song cùng tài khoản admin sẽ
// đá phiên của nhau → phải chạy tuần tự.
test.describe.configure({ mode: 'serial' });

test.describe('NangCap27 smoke', () => {
  test('Phiếu vận chuyển người bệnh render + mở form lập phiếu', async ({ page }) => {
    const errors: string[] = [];
    collectErrors(page, errors);
    await login(page);

    const failed: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/api/transport-slips') && r.status() >= 400) {
        failed.push(`${r.status()} ${r.url()}`);
      }
    });

    await page.goto('/v2/transport-slips');
    await expect(page.getByRole('button', { name: /Lập phiếu/i })).toBeVisible({ timeout: 20000 });
    // KPI strip của trang phải render (4 ô)
    await expect(page.locator('.ab').first()).toBeVisible();

    await page.getByRole('button', { name: /Lập phiếu/i }).click();
    await expect(page.getByText('Lập phiếu vận chuyển')).toBeVisible({ timeout: 10000 });
    // Ô loại nhiên liệu phải có — đây là field chống tính sai tiền xăng
    await expect(page.getByText('Loại nhiên liệu')).toBeVisible();

    expect(failed, `API transport-slips lỗi: ${failed.join(', ')}`).toEqual([]);
    expect(errors, `Console error: ${errors.join(' | ')}`).toEqual([]);
  });

  test('Hợp đồng KSK theo đoàn render + chuyển tab danh mục công ty', async ({ page }) => {
    const errors: string[] = [];
    collectErrors(page, errors);
    await login(page);

    const failed: string[] = [];
    page.on('response', (r) => {
      if (r.url().includes('/api/checkup-contracts') && r.status() >= 400) {
        failed.push(`${r.status()} ${r.url()}`);
      }
    });

    await page.goto('/v2/checkup-contracts');
    await expect(page.getByRole('button', { name: /Thêm hợp đồng/i })).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Danh mục công ty' }).click();
    await expect(page.getByRole('button', { name: /Thêm công ty/i })).toBeVisible({ timeout: 10000 });

    expect(failed, `API checkup-contracts lỗi: ${failed.join(', ')}`).toEqual([]);
    expect(errors, `Console error: ${errors.join(' | ')}`).toEqual([]);
  });
});
