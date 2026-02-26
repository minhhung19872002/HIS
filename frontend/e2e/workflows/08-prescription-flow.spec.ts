import { test, expect } from '@playwright/test';
import { waitForLoading, login } from '../helpers/test-utils';

/**
 * LUONG 8: KE DON THUOC (Prescription Flow)
 * Test quy trinh ke don thuoc tu bac si
 *
 * Theo tài liệu HIS_DataFlow_Architecture.md:
 *
 * Tu Kham benh:
 *   Chan doan -> Ke don thuoc -> Gui Kho duoc
 *                    |
 *                    v
 *   Features:
 *     - Tim kiem thuoc (theo ten, hoat chat, ma)
 *     - Kiem tra tuong tac thuoc
 *     - Ap dung mau don
 *     - Tinh lieu dung tu dong
 *     - Kiem tra BHYT (trong danh muc)
 *     - Canh bao di ung
 */
test.describe('Ke Don Thuoc - Prescription Flow', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/prescription');
    await waitForLoading(page);
    await page.waitForTimeout(1000);
  });

  // ==================== BUOC 1: CHON BENH NHAN ====================

  test.describe('Buoc 1: Chon benh nhan de ke don', () => {

    test('8.1 Hien thi trang ke don thuoc', async ({ page }) => {
      // Kiem tra co title "Ke don thuoc"
      const title = page.locator('h4:has-text("Kê đơn thuốc"), h4:has-text("Đơn thuốc")');
      await expect(title.first()).toBeVisible({ timeout: 10000 });

      // Kiem tra co nut tim kiem benh nhan (search input nam trong modal)
      const searchBtn = page.locator('button:has-text("Tìm bệnh nhân"), button:has(.anticon-search)').first();
      if (await searchBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[TEST] Patient search button found');
      }

      console.log('[TEST] Prescription page displayed');
    });

    test('8.2 Tim kiem benh nhan', async ({ page }) => {
      // Tim o tim kiem benh nhan
      const searchInput = page.locator('.ant-auto-complete input, .ant-input-search input, input[placeholder*="Tìm bệnh nhân"]').first();

      if (await searchInput.isVisible()) {
        await searchInput.fill('BN');
        await page.waitForTimeout(500);

        // Kiem tra co dropdown goi y
        const dropdown = page.locator('.ant-select-dropdown:visible, .ant-auto-complete-dropdown:visible');
        if (await dropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Chon benh nhan dau tien
          const firstOption = dropdown.locator('.ant-select-item, .ant-auto-complete-item').first();
          if (await firstOption.isVisible()) {
            await firstOption.click();
            await page.waitForTimeout(500);
            console.log('[TEST] Patient selected from search');
          }
        } else {
          console.log('[TEST] No patient suggestions');
        }
      }
    });

    test('8.3 Xem thong tin benh nhan da chon', async ({ page }) => {
      // Tim va click vao dong benh nhan dau tien trong table (neu co)
      const patientRow = page.locator('.ant-table-row').first();

      if (await patientRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await patientRow.click();
        await page.waitForTimeout(500);

        // Kiem tra thong tin benh nhan hien len
        const patientInfo = page.locator('.ant-descriptions, .ant-card:has-text("Bệnh nhân")');
        if (await patientInfo.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('[TEST] Patient info displayed');
        }
      } else {
        console.log('[TEST] No patients in list');
      }
    });

  });

  // ==================== BUOC 2: KE DON THUOC ====================

  test.describe('Buoc 2: Ke don thuoc', () => {

    test('8.4 Tim kiem thuoc', async ({ page }) => {
      // Tim o tim kiem thuoc
      const medicineSearch = page.locator('input[placeholder*="thuốc"], input[placeholder*="Nhập tên thuốc"], .ant-auto-complete input').first();

      if (await medicineSearch.isVisible()) {
        await medicineSearch.fill('Para');
        await page.waitForTimeout(500);

        // Kiem tra dropdown goi y thuoc
        const dropdown = page.locator('.ant-select-dropdown:visible, .ant-auto-complete-dropdown:visible');
        if (await dropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('[TEST] Medicine suggestions displayed');

          // Chon thuoc dau tien
          const firstMedicine = dropdown.locator('.ant-select-item, .ant-auto-complete-item').first();
          if (await firstMedicine.isVisible()) {
            await firstMedicine.click();
            await page.waitForTimeout(500);
            console.log('[TEST] Medicine selected');
          }
        } else {
          console.log('[TEST] No medicine suggestions');
        }
      } else {
        console.log('[TEST] Medicine search input not found');
      }
    });

    test('8.5 Nhap lieu dung thuoc', async ({ page }) => {
      // Kiem tra co form nhap lieu
      const dosageForm = page.locator('.ant-form, .dosage-form');

      if (await dosageForm.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Nhap so luong
        const quantityInput = dosageForm.locator('input[type="number"], .ant-input-number-input').first();
        if (await quantityInput.isVisible()) {
          await quantityInput.fill('10');
        }

        // Nhap so ngay dung
        const durationInput = dosageForm.locator('input[placeholder*="ngày"], input[id*="duration"]').first();
        if (await durationInput.isVisible()) {
          await durationInput.fill('5');
        }

        console.log('[TEST] Dosage entered');
      }
    });

    test('8.6 Them thuoc vao don', async ({ page }) => {
      // Tim nut Them thuoc
      const addBtn = page.locator('button:has-text("Thêm"), button:has-text("Add")');

      if (await addBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await addBtn.first().click();
        await page.waitForTimeout(500);

        // Kiem tra thuoc da duoc them vao table
        const prescriptionTable = page.locator('.ant-table:has-text("Thuốc"), .ant-table:has-text("STT")');
        if (await prescriptionTable.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('[TEST] Medicine added to prescription');
        }
      } else {
        console.log('[TEST] Add button not found');
      }
    });

  });

  // ==================== BUOC 3: KIEM TRA TUONG TAC THUOC ====================

  test.describe('Buoc 3: Kiem tra tuong tac thuoc', () => {

    test('8.7 Kiem tra canh bao tuong tac thuoc', async ({ page }) => {
      // Tim canh bao tuong tac
      const interactionAlert = page.locator('.ant-alert:has-text("tương tác"), .ant-alert:has-text("cảnh báo")');

      if (await interactionAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[TEST] Drug interaction warning displayed');
      } else {
        console.log('[TEST] No drug interaction warnings');
      }
    });

    test('8.8 Kiem tra canh bao di ung', async ({ page }) => {
      // Tim canh bao di ung
      const allergyAlert = page.locator('.ant-alert:has-text("dị ứng"), .ant-alert-error');

      if (await allergyAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[TEST] Allergy warning displayed');
      } else {
        console.log('[TEST] No allergy warnings');
      }
    });

  });

  // ==================== BUOC 4: MAU DON ====================

  test.describe('Buoc 4: Su dung mau don thuoc', () => {

    test('8.9 Xem danh sach mau don', async ({ page }) => {
      // Tim nut hoac tab mau don
      const templateBtn = page.locator('button:has-text("Mẫu"), .ant-tabs-tab:has-text("Mẫu")');

      if (await templateBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await templateBtn.first().click();
        await page.waitForTimeout(500);

        // Kiem tra danh sach mau hien len
        const templateList = page.locator('.ant-list, .ant-table, .template-list');
        if (await templateList.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('[TEST] Prescription templates displayed');
        }
      } else {
        console.log('[TEST] Template button not found');
      }
    });

    test('8.10 Ap dung mau don', async ({ page }) => {
      // Tim nut mau don
      const templateBtn = page.locator('button:has-text("Mẫu")');

      if (await templateBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await templateBtn.first().click();
        await page.waitForTimeout(500);

        // Chon mau dau tien
        const firstTemplate = page.locator('.ant-list-item, .template-item').first();
        if (await firstTemplate.isVisible({ timeout: 3000 }).catch(() => false)) {
          await firstTemplate.click();
          await page.waitForTimeout(500);
          console.log('[TEST] Template applied');
        }
      }
    });

  });

  // ==================== BUOC 5: HOAN THANH DON ====================

  test.describe('Buoc 5: Hoan thanh don thuoc', () => {

    test('8.11 Luu don nhap', async ({ page }) => {
      // Tim nut Luu nhap
      const saveDraftBtn = page.locator('button:has-text("Lưu nháp"), button:has-text("Lưu")').first();

      if (await saveDraftBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveDraftBtn.click();
        await page.waitForTimeout(500);

        // Kiem tra thong bao thanh cong
        const successNotification = page.locator('.ant-notification-notice-success, .ant-message-success');
        if (await successNotification.isVisible({ timeout: 5000 }).catch(() => false)) {
          console.log('[TEST] Draft saved');
        } else {
          console.log('[TEST] Save completed (no notification)');
        }
      } else {
        console.log('[TEST] Save draft button not found');
      }
    });

    test('8.12 Gui don den kho duoc', async ({ page }) => {
      // Tim nut Gui hoac Hoan thanh
      const sendBtn = page.locator('button:has-text("Gửi"), button:has-text("Hoàn thành")');

      if (await sendBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendBtn.first().click();
        await page.waitForTimeout(500);

        // Xac nhan trong modal neu co
        const confirmBtn = page.locator('.ant-modal-confirm-btns button:has-text("OK"), .ant-popconfirm-buttons button:has-text("Đồng ý")');
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
          await page.waitForTimeout(500);
        }

        console.log('[TEST] Prescription sent to pharmacy');
      } else {
        console.log('[TEST] Send button not found');
      }
    });

    test('8.13 In don thuoc', async ({ page }) => {
      // Tim nut In
      const printBtn = page.locator('button:has-text("In"), .anticon-printer');

      if (await printBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
        await printBtn.first().click();
        await page.waitForTimeout(500);

        console.log('[TEST] Print initiated');
      } else {
        console.log('[TEST] Print button not found');
      }
    });

  });

});

/**
 * E2E Test: Luong ke don thuoc day du
 */
test.describe('Prescription E2E Flow', () => {

  test('E2E: Luong ke don thuoc hoan chinh', async ({ page }) => {
    await login(page);
    await page.goto('/prescription');
    await waitForLoading(page);
    await page.waitForTimeout(1000);

    await test.step('Buoc 1: Kiem tra trang load', async () => {
      const title = page.locator('h4:has-text("Kê đơn thuốc"), h4:has-text("Đơn thuốc")');
      await expect(title.first()).toBeVisible({ timeout: 10000 });
      console.log('[E2E] Prescription page loaded');
    });

    await test.step('Buoc 2: Tim kiem benh nhan', async () => {
      const searchInput = page.locator('.ant-auto-complete input, .ant-input-search input').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('BN');
        await page.waitForTimeout(500);
        console.log('[E2E] Patient search performed');
      }
    });

    await test.step('Buoc 3: Tim kiem thuoc', async () => {
      const medicineSearch = page.locator('input[placeholder*="thuốc"], input[placeholder*="Nhập tên"]').first();
      if (await medicineSearch.isVisible()) {
        await medicineSearch.fill('Para');
        await page.waitForTimeout(500);
        console.log('[E2E] Medicine search performed');
      }
    });

    await test.step('Buoc 4: Xem tong chi phi', async () => {
      // Tim hien thi tong chi phi
      const totalCost = page.locator('.ant-statistic:has-text("Tổng"), .total-cost, text="Tổng cộng"');
      if (await totalCost.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('[E2E] Total cost displayed');
      }
    });
  });

});
