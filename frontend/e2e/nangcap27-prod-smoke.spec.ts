import { test, expect, type Page } from '@playwright/test';

/**
 * NangCap27 — smoke trên PRODUCTION (Vercel FE + Azure Container Apps BE).
 * Chạy tay sau khi deploy: `npx playwright test nangcap27-prod-smoke --project=chromium --workers=1`.
 * Không nằm trong regression suite local vì phụ thuộc môi trường thật.
 */

const PROD = 'https://his-psi.vercel.app';

test.describe.configure({ mode: 'serial' });

async function loginProd(page: Page) {
  await page.goto(`${PROD}/login`);
  await page.fill('input#username, input[name="username"], input[placeholder*="ên đăng nhập"]', 'admin');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 40000 });
}

test('prod: 2 màn NangCap27 sống + gọi API prod không lỗi', async ({ page }) => {
  test.setTimeout(120000);
  const failed: string[] = [];
  page.on('response', (r) => {
    const u = r.url();
    if ((u.includes('/transport-slips') || u.includes('/checkup-contracts')) && r.status() >= 400) {
      failed.push(`${r.status()} ${u}`);
    }
  });

  await loginProd(page);

  await page.goto(`${PROD}/v2/transport-slips`);
  await expect(page.getByRole('button', { name: /Lập phiếu/i })).toBeVisible({ timeout: 40000 });

  await page.goto(`${PROD}/v2/checkup-contracts`);
  await expect(page.getByRole('button', { name: /Thêm hợp đồng/i })).toBeVisible({ timeout: 40000 });
  await page.getByRole('button', { name: 'Danh mục công ty' }).click();
  await expect(page.getByRole('button', { name: /Thêm công ty/i })).toBeVisible({ timeout: 20000 });

  expect(failed, `API prod lỗi: ${failed.join(', ')}`).toEqual([]);
});
