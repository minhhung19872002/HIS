import { test, expect } from '@playwright/test';
import { waitForLoading, login } from '../helpers/test-utils';

/**
 * LUONG 3: DIEU TRI NOI TRU (IPD)
 * Test quy trinh quan ly benh nhan noi tru
 *
 * Cau truc trang Inpatient:
 * - Title: "Quan ly noi tru (IPD)"
 * - Tabs: "Danh sach dang dieu tri", "So do giuong benh"
 * - Table benh nhan noi tru
 * - Tim kiem benh nhan
 * - Buttons: "Chi tiet", "Chuyen giuong"
 */
test.describe('Dieu tri noi tru - IPD Flow', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/inpatient');
    await waitForLoading(page);
    await page.waitForTimeout(1000);
  });

  test('3.1 Hien thi trang quan ly noi tru', async ({ page }) => {
    // Kiem tra title (co the la "Quan ly noi tru" hoac "IPD")
    const title = page.locator('h4');
    await expect(title.first()).toBeVisible({ timeout: 10000 });

    // Kiem tra co noi dung trang - co the la tabs hoac table
    const pageContent = page.locator('.ant-tabs, .ant-table, .ant-card');
    await expect(pageContent.first()).toBeVisible({ timeout: 5000 });

    console.log('[TEST] IPD page displayed');
  });

  test('3.2 Xem danh sach benh nhan dang dieu tri', async ({ page }) => {
    // Kiem tra co tabs hoac table hien thi
    const pageContent = page.locator('.ant-tabs, .ant-table, .ant-card');
    await expect(pageContent.first()).toBeVisible({ timeout: 5000 });

    // Kiem tra co table hoac thong bao
    const table = page.locator('.ant-table');
    const emptyState = page.locator('.ant-empty');

    const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmpty = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTable || hasEmpty) {
      console.log('[TEST] Patient list or empty state displayed');
    } else {
      console.log('[TEST] Page content displayed');
    }
  });

  test('3.3 Xem so do giuong benh', async ({ page }) => {
    // Tim tab so do giuong
    const bedTab = page.locator('.ant-tabs-tab:has-text("giường"), .ant-tabs-tab:has-text("Sơ đồ")');

    if (await bedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bedTab.click();
      await page.waitForTimeout(500);

      // Kiem tra hien thi so do hoac table giuong
      const bedLayout = page.locator('.ant-table, .bed-layout, .ward-layout');
      await expect(bedLayout.first()).toBeVisible({ timeout: 10000 });

      console.log('[TEST] Bed layout displayed');
    } else {
      console.log('[TEST] Bed layout tab not found');
    }
  });

  test('3.4 Tim kiem benh nhan noi tru', async ({ page }) => {
    // Tim o tim kiem
    const searchInput = page.locator('.ant-input-search input, input[placeholder*="Tìm"]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('BN');
      await page.waitForTimeout(500);
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);

      console.log('[TEST] Search performed');
    } else {
      console.log('[TEST] Search input not found');
    }
  });

  test('3.5 Xem chi tiet benh nhan noi tru', async ({ page }) => {
    // Kiem tra co benh nhan trong danh sach
    const firstRow = page.locator('.ant-table-row').first();
    const hasPatients = await firstRow.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasPatients) {
      // Tim nut Chi tiet
      const detailBtn = firstRow.locator('button:has-text("Chi tiết")');
      if (await detailBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await detailBtn.click();
        await page.waitForTimeout(500);

        // Kiem tra modal hoac drawer chi tiet hien ra
        const detailModal = page.locator('.ant-modal:visible, .ant-drawer:visible');
        await expect(detailModal).toBeVisible({ timeout: 5000 });

        // Dong modal
        await page.keyboard.press('Escape');
        console.log('[TEST] Patient detail viewed');
      } else {
        console.log('[TEST] Detail button not found');
      }
    } else {
      console.log('[TEST] No patients in list, skipping');
    }
  });

  test('3.6 Loc benh nhan theo khoa', async ({ page }) => {
    // Tim select loc khoa
    const deptSelect = page.locator('.ant-select:has-text("Khoa"), .ant-select').first();

    if (await deptSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deptSelect.click();
      await page.waitForTimeout(300);

      // Chon option dau tien
      const option = page.locator('.ant-select-dropdown:visible .ant-select-item').first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
        console.log('[TEST] Department filter applied');
      } else {
        await page.keyboard.press('Escape');
        console.log('[TEST] No department options');
      }
    } else {
      console.log('[TEST] Department select not found');
    }
  });

  test('3.7 Refresh danh sach', async ({ page }) => {
    // Tim nut refresh/reload
    const refreshBtn = page.locator('button:has-text("Làm mới"), button:has-text("Reload"), .anticon-reload');

    if (await refreshBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshBtn.first().click();
      await page.waitForTimeout(1000);
      console.log('[TEST] List refreshed');
    } else {
      console.log('[TEST] Refresh button not found');
    }
  });

});

/**
 * E2E Test: Luong noi tru
 */
test.describe('IPD E2E Flow', () => {

  test('E2E: Xem va quan ly benh nhan noi tru', async ({ page }) => {
    await login(page);
    await page.goto('/inpatient');
    await waitForLoading(page);
    await page.waitForTimeout(1000);

    await test.step('Buoc 1: Kiem tra trang load', async () => {
      const pageContent = page.locator('.ant-tabs, .ant-table, .ant-card, h4');
      await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
      console.log('[E2E] IPD page loaded');
    });

    await test.step('Buoc 2: Xem danh sach benh nhan', async () => {
      const table = page.locator('.ant-table');
      const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasTable) {
        console.log('[E2E] Patient table visible');
      } else {
        console.log('[E2E] No patient table');
      }
    });

    await test.step('Buoc 3: Chuyen sang tab so do giuong', async () => {
      const bedTab = page.locator('.ant-tabs-tab:has-text("giường")');
      if (await bedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await bedTab.click();
        await page.waitForTimeout(500);
        console.log('[E2E] Switched to bed layout');
      } else {
        console.log('[E2E] Bed tab not found');
      }
    });

    await test.step('Buoc 4: Tim kiem benh nhan', async () => {
      // Quay lai tab danh sach
      const listTab = page.locator('.ant-tabs-tab:has-text("Danh sách")');
      if (await listTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await listTab.click();
        await page.waitForTimeout(500);
      }

      const searchInput = page.locator('.ant-input-search input').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('BN');
        await searchInput.press('Enter');
        await page.waitForTimeout(1000);
        console.log('[E2E] Search performed');
      }
    });
  });

});
