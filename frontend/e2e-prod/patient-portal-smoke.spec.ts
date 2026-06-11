/**
 * Prod smoke — cổng bệnh nhân /patient-portal hiển thị auth card (sau fix route shadow 2026-06-11).
 * Chỉ kiểm tra UI render — KHÔNG tạo data trên prod.
 */
import { test, expect } from '@playwright/test';

test('prod /patient-portal render auth card cổng bệnh nhân (không bị đẩy về login nhân viên)', async ({ page }) => {
  await page.goto('/patient-portal', { timeout: 45000 });
  await expect(page.getByTestId('patient-portal-auth-card')).toBeVisible({ timeout: 30000 });
  await expect(page.getByTestId('portal-login-btn')).toBeVisible();
  await expect(page.locator('text=CỔNG BỆNH NHÂN').first()).toBeVisible();
});
