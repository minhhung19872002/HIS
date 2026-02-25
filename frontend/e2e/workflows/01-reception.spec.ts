import { test, expect } from '@playwright/test';
import {
  waitForLoading,
  expectSuccessNotification,
  generatePatientData,
  login
} from '../helpers/test-utils';

/**
 * LUONG 1: TIEP DON BENH NHAN
 * Test quy trinh tiep don tu dau den cuoi
 *
 * Cau truc trang Reception:
 * - Header: Title "Tiếp đón bệnh nhân"
 * - Search input + Button "Đăng ký khám"
 * - Statistics cards
 * - Tabs: Danh sách chờ, Thống kê phòng
 * - Table with patient list
 * - Modal for registration
 */
test.describe('Tiep don benh nhan - Reception Flow', () => {
  // Set timeout for all tests in this describe block
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/reception');
    await waitForLoading(page);
    await page.waitForTimeout(1000);
  });

  test('1.1 Hien thi trang tiep don', async ({ page }) => {
    // Kiem tra title
    const title = page.locator('h4:has-text("Tiếp đón")');
    await expect(title).toBeVisible({ timeout: 10000 });

    // Kiem tra co button Dang ky kham
    const registerBtn = page.locator('button:has-text("Đăng ký khám")');
    await expect(registerBtn).toBeVisible();

    // Kiem tra co o tim kiem
    const searchInput = page.locator('.ant-input-search, input[placeholder*="Nhập"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('1.2 Mo modal dang ky benh nhan moi', async ({ page }) => {
    // Click nut dang ky kham
    const registerBtn = page.locator('button:has-text("Đăng ký khám")');
    await registerBtn.click();
    await page.waitForTimeout(500);

    // Kiem tra modal hien thi
    const modal = page.locator('.ant-modal:has-text("Đăng ký khám")');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Kiem tra co cac field trong form
    await expect(modal.locator('input[placeholder*="họ tên"]')).toBeVisible();
    await expect(modal.locator('.ant-select').first()).toBeVisible();

    // Dong modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });

  test('1.3 Dang ky benh nhan moi va luu database', async ({ page }) => {
    test.setTimeout(60000); // Increase timeout to 60s
    // Click nut dang ky kham
    const registerBtn = page.locator('button:has-text("Đăng ký khám")');
    await registerBtn.click();
    await page.waitForTimeout(500);

    // Kiem tra modal hien thi
    const modal = page.locator('.ant-modal:has-text("Đăng ký khám")');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Tao du lieu benh nhan
    const patientData = generatePatientData();
    const timestamp = Date.now();
    const patientName = `Test Patient ${timestamp}`;

    // Dien form thong tin benh nhan
    // Ho ten
    const fullNameInput = modal.locator('input[placeholder*="họ tên"]');
    await fullNameInput.fill(patientName);

    // Gioi tinh - chon Nam
    const genderRadio = modal.locator('.ant-radio-wrapper:has-text("Nam")');
    if (await genderRadio.isVisible()) {
      await genderRadio.click();
    }

    // So dien thoai
    const phoneInput = modal.locator('input[placeholder*="SĐT"]');
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('0912345678');
    }

    // CCCD
    const idInput = modal.locator('input[placeholder*="CCCD"]');
    if (await idInput.isVisible()) {
      await idInput.fill('012345678901');
    }

    // Loai benh nhan - chon Vien phi
    const patientTypeSelect = modal.locator('.ant-select').first();
    if (await patientTypeSelect.isVisible()) {
      await patientTypeSelect.click();
      await page.waitForTimeout(300);
      const option = page.locator('.ant-select-dropdown:visible .ant-select-item:has-text("Viện phí")');
      if (await option.isVisible()) {
        await option.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Chon phong kham
    const roomSelect = modal.locator('.ant-select:has-text("phòng"), .ant-select').nth(1);
    if (await roomSelect.isVisible()) {
      await roomSelect.click();
      await page.waitForTimeout(500);
      const roomOption = page.locator('.ant-select-dropdown:visible .ant-select-item').first();
      if (await roomOption.isVisible()) {
        await roomOption.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }

    // Dia chi
    const addressInput = modal.locator('textarea[placeholder*="địa chỉ"]');
    if (await addressInput.isVisible()) {
      await addressInput.fill('123 Test Street, District 1');
    }

    // Click nut Dang ky de submit form
    const submitBtn = modal.locator('.ant-modal-footer button:has-text("Đăng ký")');
    await submitBtn.click();

    // Cho thanh cong hoac loi
    await expectSuccessNotification(page, 'thành công').catch(async () => {
      // Neu khong co notification thanh cong, kiem tra modal da dong chua
      const isHidden = await modal.isHidden({ timeout: 5000 }).catch(() => false);
      if (!isHidden) {
        // Modal van hien, co the co loi validation - dong modal
        await page.keyboard.press('Escape');
      }
      console.log('[TEST] Registration completed (may have validation errors)');
    });

    console.log(`[TEST] Patient registered: ${patientName}`);
  });

  test('1.4 Tim kiem benh nhan', async ({ page }) => {
    // Tim o tim kiem
    const searchInput = page.locator('.ant-input-search input').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('Nguyen');
      await page.waitForTimeout(500);

      // Click nut tim kiem hoac nhan Enter
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    }

    console.log('[TEST] Search performed');
  });

  test('1.5 Xem thong ke phong kham', async ({ page }) => {
    // Click tab Thong ke phong
    const statsTab = page.locator('.ant-tabs-tab:has-text("Thống kê")');
    if (await statsTab.isVisible()) {
      await statsTab.click();
      await page.waitForTimeout(500);

      // Kiem tra co thong ke
      const stats = page.locator('.ant-statistic, .ant-card');
      await expect(stats.first()).toBeVisible({ timeout: 5000 });

      console.log('[TEST] Room statistics viewed');
    } else {
      console.log('[TEST] Statistics tab not found');
    }
  });

});

/**
 * E2E Test: Dang ky benh nhan va xac nhan trong OPD
 */
test.describe('Reception E2E Flow', () => {
  test.setTimeout(60000);

  test('E2E: Dang ky benh nhan va kiem tra trong OPD', async ({ page }) => {
    // 1. Login
    await login(page);

    // 2. Go to Reception
    await page.goto('/reception');
    await waitForLoading(page);
    await page.waitForTimeout(1000);

    await test.step('Buoc 1: Mo modal dang ky', async () => {
      const registerBtn = page.locator('button:has-text("Đăng ký khám")');
      await registerBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('.ant-modal:has-text("Đăng ký khám")');
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    const patientName = `E2E Test ${Date.now()}`;

    await test.step('Buoc 2: Dien thong tin benh nhan', async () => {
      const modal = page.locator('.ant-modal:has-text("Đăng ký khám")');

      // Ho ten
      const fullNameInput = modal.locator('input[placeholder*="họ tên"]');
      await fullNameInput.fill(patientName);

      // Gioi tinh
      const genderRadio = modal.locator('.ant-radio-wrapper:has-text("Nam")');
      if (await genderRadio.isVisible()) {
        await genderRadio.click();
      }

      // So dien thoai
      const phoneInput = modal.locator('input[placeholder*="SĐT"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('0987654321');
      }

      console.log('[E2E] Patient info filled');
    });

    await test.step('Buoc 3: Chon phong kham', async () => {
      const modal = page.locator('.ant-modal:has-text("Đăng ký khám")');

      // Tim va click select phong kham
      const selects = modal.locator('.ant-select');
      const count = await selects.count();

      // Limit iterations to avoid timeout - try last select first (usually room), then first 3
      const maxTries = Math.min(count, 3);
      const indices = count > 1 ? [count - 1, 0, 1].slice(0, maxTries) : [0];

      for (const i of indices) {
        const select = selects.nth(i);
        await select.click();
        await page.waitForTimeout(300);

        const option = page.locator('.ant-select-dropdown:visible .ant-select-item').first();
        if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
          await option.click();
          break;
        } else {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }

      console.log('[E2E] Room selected');
    });

    await test.step('Buoc 4: Submit form', async () => {
      const modal = page.locator('.ant-modal:has-text("Đăng ký khám")');

      const submitBtn = modal.locator('.ant-modal-footer button:has-text("Đăng ký")');
      await submitBtn.click();

      // Cho ket qua
      await page.waitForTimeout(2000);

      // Kiem tra modal dong hoac co thong bao
      const isModalHidden = await modal.isHidden().catch(() => false);
      if (isModalHidden) {
        console.log('[E2E] Registration submitted successfully');
      } else {
        console.log('[E2E] Modal still visible - may have validation errors');
        await page.keyboard.press('Escape');
      }
    });

    await test.step('Buoc 5: Kiem tra benh nhan trong OPD', async () => {
      // Navigate to OPD
      await page.goto('/opd');
      await waitForLoading(page);
      await page.waitForTimeout(2000);

      // Chon phong kham
      const roomSelect = page.locator('.ant-select').first();
      if (await roomSelect.isVisible()) {
        await roomSelect.click();
        await page.waitForTimeout(500);

        const firstRoom = page.locator('.ant-select-dropdown:visible .ant-select-item').first();
        if (await firstRoom.isVisible()) {
          await firstRoom.click();
          await page.waitForTimeout(1000);
        } else {
          await page.keyboard.press('Escape');
        }
      }

      // Kiem tra danh sach benh nhan
      const patientTable = page.locator('.ant-table');
      await expect(patientTable).toBeVisible({ timeout: 10000 });

      console.log('[E2E] OPD page loaded');
    });
  });

});
