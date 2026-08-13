import { expect, test, type Page } from '@playwright/test';

/**
 * Regression for the real OPD -> prescription workflows reported on production:
 * 1. A waiting patient must enter the editor with patient/examination context.
 *    The API separately blocks saving before examination starts.
 * 2. Opening an existing prescription must carry prescription/examination/patient context.
 *
 * Set HIS_E2E_BASE_URL to run the same non-mutating checks against production.
 */
const TARGET = process.env.HIS_E2E_BASE_URL || 'http://localhost:3001';

async function login(page: Page) {
  await page.goto(`${TARGET}/login`);
  await page.fill('input#username, input[name="username"], input[placeholder*="ên đăng nhập"]', 'admin');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 40_000 });
}

test.describe.configure({ mode: 'serial' });

test('waiting OPD patient opens prescription editor with selected patient context', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto(`${TARGET}/v2/opd`);

  await page.getByRole('button', { name: /Chờ khám/i }).click();
  const firstWaitingPatient = page.locator('tbody tr').first();
  await expect(firstWaitingPatient).toBeVisible({ timeout: 30_000 });
  if ((await firstWaitingPatient.innerText()).includes('Không có bệnh nhân')) {
    test.skip(true, 'Môi trường không có bệnh nhân chờ khám để kiểm tra luồng');
  }
  await firstWaitingPatient.click();

  const prescribe = page.getByRole('button', { name: /^Kê đơn$/i });
  await expect(prescribe).toBeVisible();
  await prescribe.click();

  await expect(page).toHaveURL(/\/v2\/prescription\/edit\?[^#]*examId=/);
  await expect(page.getByText('Chưa chọn BN')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText(/BN đang kê/i)).toBeVisible();
});

test('existing prescription opens editor with selected patient context', async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);
  await page.goto(`${TARGET}/v2/prescription`);

  const firstPrescription = page.locator('tbody tr').first();
  await expect(firstPrescription).toBeVisible({ timeout: 30_000 });
  if ((await firstPrescription.innerText()).includes('Không có đơn thuốc')) {
    test.skip(true, 'Môi trường không có đơn thuốc để kiểm tra luồng');
  }
  await firstPrescription.click();
  await page.getByRole('button', { name: /Mở editor kê đơn/i }).click();

  await expect(page).toHaveURL(/\/v2\/prescription\/edit\?[^#]*prescriptionId=/);
  await expect(page.getByText('Chưa chọn BN')).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText(/BN đang kê/i)).toBeVisible();
});
