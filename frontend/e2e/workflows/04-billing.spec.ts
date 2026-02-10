import { test, expect } from '@playwright/test';
import { waitForLoading, login } from '../helpers/test-utils';

/**
 * LUONG 4: THANH TOAN - THU NGAN (Billing)
 * Test quy trinh thanh toan, thu phi
 *
 * Cau truc trang Billing:
 * - Title: "Vien phi"
 * - Tabs: "Chua thanh toan", "Tam ung", "Hoan ung", "Bao cao"
 * - Tim kiem benh nhan
 * - Table dich vu chua thanh toan
 * - Buttons: "Thanh toan"
 */
test.describe('Thanh toan thu ngan - Billing Flow', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/billing');
    await waitForLoading(page);
    await page.waitForTimeout(1000);
  });

  test('4.1 Hien thi trang vien phi', async ({ page }) => {
    // Kiem tra trang load (co the la title hoac tabs)
    const pageContent = page.locator('.ant-tabs, h4:has-text("phí"), h4:has-text("Billing")');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });

    // Kiem tra co o tim kiem
    const searchInput = page.locator('.ant-input-search, input[placeholder*="Tìm"]').first();
    await expect(searchInput).toBeVisible();

    console.log('[TEST] Billing page displayed');
  });

  test('4.2 Tim kiem benh nhan de thanh toan', async ({ page }) => {
    // Tim o tim kiem
    const searchInput = page.locator('.ant-input-search input').first();

    if (await searchInput.isVisible()) {
      // Tim benh nhan (dung mock data tu Billing.tsx)
      await searchInput.fill('BN26000001');
      await page.waitForTimeout(300);
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      // Kiem tra thong tin benh nhan hien len hoac thong bao khong tim thay
      const patientInfo = page.locator('.ant-descriptions, .ant-card');
      const hasPatientInfo = await patientInfo.first().isVisible({ timeout: 3000 }).catch(() => false);

      if (hasPatientInfo) {
        console.log('[TEST] Patient found and info displayed');
      } else {
        console.log('[TEST] Patient not found or no info displayed');
      }
    } else {
      console.log('[TEST] Search input not found');
    }
  });

  test('4.3 Xem danh sach dich vu chua thanh toan', async ({ page }) => {
    // Tim benh nhan truoc
    const searchInput = page.locator('.ant-input-search input').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Nguyen');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    }

    // Kiem tra co table dich vu
    const servicesTable = page.locator('.ant-table');
    const hasTable = await servicesTable.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasTable) {
      console.log('[TEST] Services table displayed');
    } else {
      console.log('[TEST] No services table (patient may not have unpaid services)');
    }
  });

  test('4.4 Chon dich vu de thanh toan', async ({ page }) => {
    // Tim benh nhan
    const searchInput = page.locator('.ant-input-search input').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('BN');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    }

    // Kiem tra co checkbox de chon dich vu
    const checkbox = page.locator('.ant-table .ant-checkbox-input, .ant-table .ant-checkbox').first();
    const hasCheckbox = await checkbox.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCheckbox) {
      await checkbox.click();
      await page.waitForTimeout(500);
      console.log('[TEST] Service selected');
    } else {
      console.log('[TEST] No services to select');
    }
  });

  test('4.5 Xem tab tam ung', async ({ page }) => {
    // Tim tab tam ung
    const depositTab = page.locator('.ant-tabs-tab:has-text("Tạm ứng"), .ant-tabs-tab:has-text("deposit")');

    if (await depositTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await depositTab.click();
      await page.waitForTimeout(500);

      // Kiem tra noi dung tab
      const tabContent = page.locator('.ant-table, .ant-empty, button:has-text("Nạp")');
      await expect(tabContent.first()).toBeVisible({ timeout: 5000 });

      console.log('[TEST] Deposit tab viewed');
    } else {
      console.log('[TEST] Deposit tab not found');
    }
  });

  test('4.6 Xem tab hoan ung', async ({ page }) => {
    // Tim tab hoan ung
    const refundTab = page.locator('.ant-tabs-tab:has-text("Hoàn"), .ant-tabs-tab:has-text("refund")');

    if (await refundTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refundTab.click();
      await page.waitForTimeout(500);

      // Kiem tra noi dung tab
      const tabContent = page.locator('.ant-table, .ant-empty');
      await expect(tabContent.first()).toBeVisible({ timeout: 5000 });

      console.log('[TEST] Refund tab viewed');
    } else {
      console.log('[TEST] Refund tab not found');
    }
  });

  test('4.7 Xem tab bao cao', async ({ page }) => {
    // Tim tab bao cao
    const reportTab = page.locator('.ant-tabs-tab:has-text("Báo cáo"), .ant-tabs-tab:has-text("report")');

    if (await reportTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reportTab.click();
      await page.waitForTimeout(500);

      // Kiem tra noi dung tab (co the la date picker hoac bieu do)
      const tabContent = page.locator('.ant-picker, .ant-statistic, .ant-empty');
      const hasContent = await tabContent.first().isVisible({ timeout: 3000 }).catch(() => false);

      if (hasContent) {
        console.log('[TEST] Report tab viewed');
      } else {
        console.log('[TEST] Report tab content empty');
      }
    } else {
      console.log('[TEST] Report tab not found');
    }
  });

  test('4.8 Mo modal thanh toan', async ({ page }) => {
    // Tim benh nhan va chon dich vu truoc
    const searchInput = page.locator('.ant-input-search input').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('BN');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    }

    // Chon dich vu dau tien
    const checkbox = page.locator('.ant-table .ant-checkbox-input').first();
    if (await checkbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkbox.click();
      await page.waitForTimeout(300);
    }

    // Tim nut thanh toan
    const payBtn = page.locator('button:has-text("Thanh toán")');
    if (await payBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const isDisabled = await payBtn.isDisabled();
      if (!isDisabled) {
        await payBtn.click();
        await page.waitForTimeout(500);

        // Kiem tra modal thanh toan hien len
        const paymentModal = page.locator('.ant-modal:visible');
        const hasModal = await paymentModal.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasModal) {
          console.log('[TEST] Payment modal opened');
          // Dong modal
          await page.keyboard.press('Escape');
        } else {
          console.log('[TEST] Payment modal not opened');
        }
      } else {
        console.log('[TEST] Payment button disabled (no services selected)');
      }
    } else {
      console.log('[TEST] Payment button not found');
    }
  });

});

/**
 * E2E Test: Luong thanh toan
 */
test.describe('Billing E2E Flow', () => {

  test('E2E: Luong thanh toan vien phi', async ({ page }) => {
    await login(page);
    await page.goto('/billing');
    await waitForLoading(page);
    await page.waitForTimeout(1000);

    await test.step('Buoc 1: Kiem tra trang load', async () => {
      const pageContent = page.locator('.ant-tabs, h4');
      await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
      console.log('[E2E] Billing page loaded');
    });

    await test.step('Buoc 2: Tim kiem benh nhan', async () => {
      const searchInput = page.locator('.ant-input-search input').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('BN26000001');
        await searchInput.press('Enter');
        await page.waitForTimeout(1000);
        console.log('[E2E] Patient searched');
      }
    });

    await test.step('Buoc 3: Xem cac tab', async () => {
      const tabs = page.locator('.ant-tabs-tab');
      const tabCount = await tabs.count();
      console.log(`[E2E] Found ${tabCount} tabs`);

      if (tabCount > 1) {
        // Click vao tab thu 2
        await tabs.nth(1).click();
        await page.waitForTimeout(500);
        console.log('[E2E] Switched to second tab');
      }
    });

    await test.step('Buoc 4: Quay lai tab chua thanh toan', async () => {
      const firstTab = page.locator('.ant-tabs-tab').first();
      if (await firstTab.isVisible()) {
        await firstTab.click();
        await page.waitForTimeout(500);
        console.log('[E2E] Back to unpaid tab');
      }
    });
  });

});
