import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * NangCap27 — xuất PDF khổ A4 THẬT của 8 biểu mẫu in mới.
 * Khác `nangcap27-print-a4.spec.ts` (đo DOM): file này để Chromium tự dàn trang theo `@page`,
 * cho ra đúng thứ sẽ chạy ra máy in — dùng để soi mắt thường + đếm số trang.
 * Chỉ chạy headless (page.pdf của Chromium yêu cầu headless).
 */

const FORMS: { label: string; slug: string }[] = [
  { label: 'Theo dõi ôxy liệu pháp', slug: 'oxygen-monitor' },
  { label: 'BB thanh lý thuốc/HC/VTYT', slug: 'pharmacy-disposal' },
  { label: 'BB xác nhận mất/hỏng/vỡ', slug: 'pharmacy-damage' },
  { label: 'XN · Huyết - tủy đồ', slug: 'xn-myelogram' },
  { label: 'XN · Sinh thiết tủy xương', slug: 'xn-bonemarrow' },
  { label: 'XN · Nước dịch', slug: 'xn-bodyfluid' },
  { label: 'BA Phá thai', slug: 'sp-phathai' },
  { label: 'BA Bệnh tay chân miệng', slug: 'sp-taychanmieng' },
  // 4 biểu mẫu CŨ — kiểm regression sau khi sửa printStyles dùng chung (110+ mẫu cùng dùng).
  { label: 'Tóm tắt bệnh án ra viện', slug: 'ref-summary' },
  { label: 'Phiếu điều trị hàng ngày', slug: 'ref-treatment' },
  { label: 'Bệnh án tổng quát', slug: 'ref-finalsummary' },
  { label: 'BA Tâm thần', slug: 'ref-sp-tamthan' },
];

const OUT_DIR = path.resolve('../docs/architecture/evidence/nc27-nangcap27/pdf');

test.describe.configure({ mode: 'serial' });

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input#username, input[name="username"], input[placeholder*="ên đăng nhập"]', 'admin');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
}

test('xuất PDF A4 thật cho 8 biểu mẫu NangCap27', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'page.pdf chỉ có ở Chromium headless');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await login(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/v2/emr/edit');

  const firstRecord = page.locator('aside .mono').first();
  await expect(firstRecord).toBeVisible({ timeout: 30000 });
  await firstRecord.click();
  await expect(page.getByRole('button', { name: /In biểu mẫu/i })).toBeVisible({ timeout: 20000 });

  for (const form of FORMS) {
    await page.getByRole('button', { name: /In biểu mẫu/i }).click();
    const labelSpan = page.getByText(form.label, { exact: true });
    await expect(labelSpan).toBeVisible({ timeout: 15000 });
    await labelSpan.locator('xpath=..').getByRole('button', { name: /In/ }).click();

    const container = page.locator('.emr-print-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // Không truyền margin: để `@page { margin: 15mm 20mm }` của printStyles quyết định —
    // đúng bằng cái người dùng bấm Ctrl+P sẽ nhận.
    await page.pdf({
      path: path.join(OUT_DIR, `${form.slug}.pdf`),
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    await page.getByRole('button', { name: /^Đóng$/ }).last().click();
    await expect(container).toBeHidden({ timeout: 10000 });
  }

  for (const form of FORMS) {
    const p = path.join(OUT_DIR, `${form.slug}.pdf`);
    expect(fs.existsSync(p), `thiếu PDF ${form.slug}`).toBe(true);
    expect(fs.statSync(p).size, `PDF ${form.slug} rỗng`).toBeGreaterThan(2000);
  }
});
