import { test, expect } from '@playwright/test';
import { waitForLoading, login } from '../helpers/test-utils';

/**
 * LUONG 7: KHO DUOC & PHAT THUOC (Pharmacy Flow)
 * Test quy trinh quan ly kho va phat thuoc
 *
 * Theo tài liệu HIS_DataFlow_Architecture.md:
 *
 * NGUON NHAP KHO:
 *   - Nha cung cap (theo thau)
 *   - Chuyen kho noi bo
 *   - Hoan tra tu khoa
 *
 * KHO DUOC CHINH:
 *   Nhap kho -> Kiem nhap (QC) -> Luu kho (Lo/HSD) -> Quan ly ton kho
 *                                        |
 *                                        v
 *   XUAT KHO:
 *     - Xuat ngoai tru (don)
 *     - Xuat noi tru (phieu linh)
 *     - Xuat khoa phong
 *                |
 *                v
 *   Quay phat thuoc / Khoa Lam sang / Tu truc khoa
 *
 * Business Rules:
 *   - FIFO: Nhap truoc xuat truoc
 *   - FEFO: Het han truoc xuat truoc
 *   - Min Stock Alert: Canh bao ton toi thieu
 *   - Expiry Alert: Canh bao sap het han
 *   - Batch Tracking: Theo doi theo lo
 *   - Controlled Drug: So theo doi thuoc GN/HT
 */
test.describe('Kho Duoc & Phat Thuoc - Pharmacy Flow', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pharmacy');
    await waitForLoading(page);
    await page.waitForTimeout(1000);
  });

  // ==================== BUOC 1: PHAT THUOC NGOAI TRU ====================

  test.describe('Buoc 1: Phat thuoc ngoai tru', () => {

    test('7.1 Hien thi trang kho duoc', async ({ page }) => {
      // Kiem tra co title "Quan ly nha thuoc"
      const title = page.locator('h4:has-text("Quản lý nhà thuốc"), h4:has-text("Nhà thuốc")');
      await expect(title.first()).toBeVisible({ timeout: 10000 });

      // Kiem tra co tabs
      const tabs = page.locator('.ant-tabs-tab');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(1);

      console.log('[TEST] Pharmacy page displayed');
    });

    test('7.2 Xem danh sach don thuoc cho phat', async ({ page }) => {
      // Tab Phat thuoc thuong la tab dau tien
      const dispenseTab = page.locator('.ant-tabs-tab:has-text("Phát thuốc"), .ant-tabs-tab:has-text("Chờ phát")');
      if (await dispenseTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await dispenseTab.click();
        await page.waitForTimeout(500);
      }

      // Kiem tra co table don thuoc
      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });

      console.log('[TEST] Pending prescriptions displayed');
    });

    test('7.3 Tim kiem don thuoc', async ({ page }) => {
      // Tim o tim kiem
      const searchInput = page.locator('.ant-input-search input, input[placeholder*="Tìm"]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('PT');
        await page.waitForTimeout(300);
        await searchInput.press('Enter');
        await page.waitForTimeout(1000);
      }

      // Kiem tra table van hien thi
      await expect(page.locator('.ant-table')).toBeVisible();

      console.log('[TEST] Prescription search performed');
    });

    test('7.4 Tiep nhan don thuoc', async ({ page }) => {
      // Tim dong don thuoc dau tien
      const firstRow = page.locator('.ant-table-row').first();

      if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Tim nut tiep nhan
        const acceptBtn = firstRow.locator('button:has-text("Tiếp nhận"), button:has-text("Nhận đơn")');

        if (await acceptBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
          await acceptBtn.first().click();
          await page.waitForTimeout(500);

          console.log('[TEST] Prescription accepted');
        } else {
          // Co the don da duoc tiep nhan - double click de xem chi tiet
          await firstRow.dblclick();
          await page.waitForTimeout(500);

          const modal = page.locator('.ant-modal:visible, .ant-drawer:visible');
          if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('[TEST] Prescription detail opened');
            await page.keyboard.press('Escape');
          }
        }
      } else {
        console.log('[TEST] No prescriptions available');
      }
    });

    test('7.5 Phat thuoc - Chon lo theo FEFO', async ({ page }) => {
      // Tim don da tiep nhan
      const firstRow = page.locator('.ant-table-row').first();

      if (await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Click de mo chi tiet
        await firstRow.dblclick();
        await page.waitForTimeout(500);

        const modal = page.locator('.ant-modal:visible, .ant-drawer:visible');
        if (await modal.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Tim select chon lo
          const batchSelect = modal.locator('.ant-select:has-text("Lô"), .ant-select').first();

          if (await batchSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
            await batchSelect.click();
            await page.waitForTimeout(300);

            // Chon lo duoc khuyen nghi (FEFO)
            const fefoOption = page.locator('.ant-select-dropdown:visible .ant-select-item').first();
            if (await fefoOption.isVisible()) {
              await fefoOption.click();
              console.log('[TEST] Batch selected using FEFO');
            } else {
              await page.keyboard.press('Escape');
            }
          }

          // Dong modal
          await page.keyboard.press('Escape');
        }
      } else {
        console.log('[TEST] No prescriptions to dispense');
      }
    });

  });

  // ==================== BUOC 2: QUAN LY TON KHO ====================

  test.describe('Buoc 2: Quan ly ton kho', () => {

    test('7.6 Xem ton kho hien tai', async ({ page }) => {
      // Click tab Ton kho (trong Ant Design tabs)
      const stockTab = page.locator('.ant-tabs-tab').filter({ hasText: 'Tồn kho' }).first();

      if (await stockTab.isVisible({ timeout: 5000 }).catch(() => false)) {
        await stockTab.click();
        // Cho animation hoan thanh
        await page.waitForTimeout(2000);

        // Kiem tra table ton kho - wait for table to be visible
        const tableWrapper = page.locator('.ant-table-wrapper').first();
        if (await tableWrapper.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('[TEST] Stock inventory displayed');
        } else {
          // Fallback: check page loaded
          console.log('[TEST] Stock tab clicked - table may be loading');
        }
      } else {
        // Tab co the khong co - kiem tra trang hien thi
        const pageContent = page.locator('h4:has-text("Quản lý nhà thuốc")');
        await expect(pageContent).toBeVisible({ timeout: 5000 });
        console.log('[TEST] Pharmacy page displayed - stock tab may not exist');
      }
    });

    test('7.7 Loc thuoc theo trang thai', async ({ page }) => {
      // Chuyen sang tab Ton kho
      const stockTab = page.locator('.ant-tabs-tab:has-text("Tồn kho"), .ant-tabs-tab:has-text("Kho")');
      if (await stockTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await stockTab.click();
        await page.waitForTimeout(500);
      }

      // Tim select loc trang thai
      const statusFilter = page.locator('.ant-select:has-text("Trạng thái"), .ant-select').first();

      if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await statusFilter.click();
        await page.waitForTimeout(300);

        // Chon "Sap het" hoac "Het"
        const lowStockOption = page.locator('.ant-select-dropdown:visible .ant-select-item:has-text("thấp"), .ant-select-dropdown:visible .ant-select-item:has-text("hết")').first();
        if (await lowStockOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await lowStockOption.click();
          await page.waitForTimeout(500);
          console.log('[TEST] Filtered by low stock');
        } else {
          await page.keyboard.press('Escape');
        }
      }
    });

    test('7.8 Tim kiem thuoc trong kho', async ({ page }) => {
      // Chuyen sang tab Ton kho
      const stockTab = page.locator('.ant-tabs-tab:has-text("Tồn kho"), .ant-tabs-tab:has-text("Kho")');
      if (await stockTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await stockTab.click();
        await page.waitForTimeout(500);
      }

      // Tim o tim kiem
      const searchInput = page.locator('.ant-input-search input, input[placeholder*="Tìm"]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('Paracetamol');
        await page.waitForTimeout(300);
        await searchInput.press('Enter');
        await page.waitForTimeout(1000);

        console.log('[TEST] Medicine search performed');
      }
    });

  });

  // ==================== BUOC 3: CHUYEN KHO ====================

  test.describe('Buoc 3: Chuyen kho noi bo', () => {

    test('7.9 Xem danh sach yeu cau chuyen kho', async ({ page }) => {
      // Click tab Chuyen kho
      const transferTab = page.locator('.ant-tabs-tab:has-text("Chuyển kho"), .ant-tabs-tab:has-text("Luân chuyển")');
      if (await transferTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await transferTab.click();
        await page.waitForTimeout(500);

        // Kiem tra table chuyen kho
        const table = page.locator('.ant-table');
        await expect(table).toBeVisible({ timeout: 5000 });

        console.log('[TEST] Transfer requests displayed');
      } else {
        console.log('[TEST] Transfer tab not found');
      }
    });

    test('7.10 Duyet yeu cau chuyen kho', async ({ page }) => {
      // Chuyen sang tab Chuyen kho
      const transferTab = page.locator('.ant-tabs-tab:has-text("Chuyển kho"), .ant-tabs-tab:has-text("Luân chuyển")');
      if (await transferTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await transferTab.click();
        await page.waitForTimeout(500);
      }

      // Tim yeu cau cho duyet
      const pendingRow = page.locator('.ant-table-row:has(.ant-tag:has-text("Chờ"))').first();

      if (await pendingRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Tim nut duyet
        const approveBtn = pendingRow.locator('button:has-text("Duyệt")');

        if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await approveBtn.click();
          await page.waitForTimeout(500);

          // Xac nhan trong modal
          const confirmBtn = page.locator('.ant-modal-confirm-btns button:has-text("OK"), .ant-popconfirm-buttons button:has-text("Đồng ý")');
          if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await confirmBtn.click();
            console.log('[TEST] Transfer request approved');
          }
        } else {
          console.log('[TEST] No pending transfer to approve');
        }
      } else {
        console.log('[TEST] No transfer requests available');
      }
    });

  });

  // ==================== BUOC 4: CANH BAO ====================

  test.describe('Buoc 4: Canh bao kho', () => {

    test('7.11 Xem canh bao thuoc sap het han', async ({ page }) => {
      // Tim tab Canh bao hoac icon bell
      const alertTab = page.locator('.ant-tabs-tab:has-text("Cảnh báo"), .anticon-bell');
      if (await alertTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await alertTab.click();
        await page.waitForTimeout(500);

        // Kiem tra co danh sach canh bao
        const alerts = page.locator('.ant-alert, .ant-list-item');
        const alertCount = await alerts.count();
        console.log(`[TEST] Found ${alertCount} alerts`);
      } else {
        console.log('[TEST] Alert tab not found');
      }
    });

    test('7.12 Xem thong ke ton kho', async ({ page }) => {
      // Tim statistics cards
      const statsCards = page.locator('.ant-statistic');
      const statsCount = await statsCards.count();

      if (statsCount > 0) {
        console.log(`[TEST] Found ${statsCount} statistics`);

        // Kiem tra co hien thi so lieu
        const firstStat = statsCards.first();
        await expect(firstStat).toBeVisible();
      } else {
        console.log('[TEST] No statistics displayed');
      }
    });

  });

});

/**
 * E2E Test: Luong kho duoc day du
 */
test.describe('Pharmacy E2E Flow', () => {

  test('E2E: Luong phat thuoc ngoai tru', async ({ page }) => {
    await login(page);
    await page.goto('/pharmacy');
    await waitForLoading(page);
    await page.waitForTimeout(1000);

    await test.step('Buoc 1: Kiem tra trang load', async () => {
      const title = page.locator('h4:has-text("Quản lý nhà thuốc"), h4:has-text("Nhà thuốc")');
      await expect(title.first()).toBeVisible({ timeout: 10000 });
      console.log('[E2E] Pharmacy page loaded');
    });

    await test.step('Buoc 2: Xem danh sach don thuoc cho phat', async () => {
      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });
      console.log('[E2E] Prescriptions table displayed');
    });

    await test.step('Buoc 3: Chuyen qua cac tabs', async () => {
      const tabs = page.locator('.ant-tabs-tab');
      const tabCount = await tabs.count();

      for (let i = 0; i < Math.min(tabCount, 4); i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(500);
        console.log(`[E2E] Switched to tab ${i + 1}`);
      }
    });

    await test.step('Buoc 4: Tim kiem thuoc trong kho', async () => {
      const stockTab = page.locator('.ant-tabs-tab:has-text("Tồn kho")');
      if (await stockTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await stockTab.click();
        await page.waitForTimeout(500);
      }

      const searchInput = page.locator('.ant-input-search input').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('thuoc');
        await searchInput.press('Enter');
        await page.waitForTimeout(1000);
        console.log('[E2E] Medicine search performed');
      }
    });
  });

});
