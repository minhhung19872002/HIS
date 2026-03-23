import { test, expect } from '@playwright/test';
import { login, waitForLoading } from '../helpers/test-utils';

/**
 * MEDINET HEALTHCARE MODULES - Playwright E2E Tests
 * Test 10 specialized healthcare modules:
 * 1. Medical Forensics (/medical-forensics)
 * 2. Traditional Medicine (/traditional-medicine)
 * 3. Reproductive Health (/reproductive-health)
 * 4. Mental Health (/mental-health)
 * 5. Environmental Health (/environmental-health)
 * 6. Trauma Registry (/trauma-registry)
 * 7. Population Health (/population-health)
 * 8. Health Education (/health-education)
 * 9. Practice License (/practice-license)
 * 10. Inter-Hospital Sharing (/inter-hospital)
 */

test.describe('Medinet Healthcare Modules', () => {
  test.describe.configure({ timeout: 60000 });

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // =====================================================
  // 1. MEDICAL FORENSICS - Giam dinh Y khoa
  // =====================================================
  test.describe('1. Medical Forensics (/medical-forensics)', () => {

    test('1.1 Page loads and shows title', async ({ page }) => {
      await page.goto('/medical-forensics', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Giám định Y khoa")');
      await expect(title).toBeVisible({ timeout: 15000 });
    });

    test('1.2 Statistics cards are visible (4 cards)', async ({ page }) => {
      await page.goto('/medical-forensics', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });
      const count = await statsCards.count();
      expect(count).toBeGreaterThanOrEqual(4);

      // Verify specific statistic titles
      await expect(page.locator('.ant-statistic-title:has-text("Tổng hồ sơ")')).toBeVisible();
      await expect(page.locator('.ant-statistic-title:has-text("Chờ giám định")')).toBeVisible();
      await expect(page.locator('.ant-statistic-title:has-text("Hoàn thành tháng")')).toBeVisible();
      await expect(page.locator('.ant-statistic-title:has-text("TB % thương tật")')).toBeVisible();
    });

    test('1.3 Table structure with tabs visible', async ({ page }) => {
      await page.goto('/medical-forensics', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      // Verify tabs exist
      const tabs = page.locator('.ant-tabs-tab');
      await expect(tabs.first()).toBeVisible({ timeout: 15000 });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(3); // pending, examining, completed, all

      // Verify table structure
      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('1.4 Create button opens modal', async ({ page }) => {
      await page.goto('/medical-forensics', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const createBtn = page.locator('button:has-text("Tạo hồ sơ")');
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('.ant-modal:visible');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Close modal
      await page.keyboard.press('Escape');
    });
  });

  // =====================================================
  // 2. TRADITIONAL MEDICINE - Y hoc co truyen
  // =====================================================
  test.describe('2. Traditional Medicine (/traditional-medicine)', () => {

    test('2.1 Page loads and shows title', async ({ page }) => {
      await page.goto('/traditional-medicine', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Y học cổ truyền")');
      await expect(title).toBeVisible({ timeout: 15000 });
    });

    test('2.2 Has treatment tabs (active, completed, all)', async ({ page }) => {
      await page.goto('/traditional-medicine', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const tabs = page.locator('.ant-tabs-tab');
      await expect(tabs.first()).toBeVisible({ timeout: 15000 });

      // Verify at least 3 tabs (Dang DT, Hoan thanh, Tat ca)
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(3);
    });

    test('2.3 Table renders with correct columns', async ({ page }) => {
      await page.goto('/traditional-medicine', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });

      // Verify key column headers
      await expect(page.locator('.ant-table-thead th:has-text("Mã LT")')).toBeVisible();
      await expect(page.locator('.ant-table-thead th:has-text("Bệnh nhân")')).toBeVisible();
      await expect(page.locator('.ant-table-thead th:has-text("Loại điều trị")')).toBeVisible();
    });

    test('2.4 Create button and statistics visible', async ({ page }) => {
      await page.goto('/traditional-medicine', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const createBtn = page.locator('button:has-text("Tạo liệu trình")');
      await expect(createBtn).toBeVisible({ timeout: 10000 });

      // Stats cards
      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 10000 });
      const count = await statsCards.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  // =====================================================
  // 3. REPRODUCTIVE HEALTH - Suc khoe sinh san
  // =====================================================
  test.describe('3. Reproductive Health (/reproductive-health)', () => {

    test('3.1 Page loads with dual tabs (Prenatal + Family Planning)', async ({ page }) => {
      await page.goto('/reproductive-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Sức khỏe sinh sản")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Verify prenatal and FP tabs
      const prenatalTab = page.locator('.ant-tabs-tab:has-text("Quản thai")');
      const fpTab = page.locator('.ant-tabs-tab:has-text("KHHGĐ")');
      await expect(prenatalTab).toBeVisible({ timeout: 10000 });
      await expect(fpTab).toBeVisible({ timeout: 5000 });
    });

    test('3.2 Statistics cards visible (4 cards)', async ({ page }) => {
      await page.goto('/reproductive-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });
      const count = await statsCards.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });

    test('3.3 Both tab panels render tables', async ({ page }) => {
      await page.goto('/reproductive-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      // Prenatal tab should be default - verify table
      const table = page.locator('.ant-table');
      await expect(table.first()).toBeVisible({ timeout: 10000 });

      // Switch to KHHGD tab
      const fpTab = page.locator('.ant-tabs-tab:has-text("KHHGĐ")');
      await fpTab.click();
      await page.waitForTimeout(500);

      // Table should still be visible
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 5000 });
    });

    test('3.4 Create buttons for prenatal and FP', async ({ page }) => {
      await page.goto('/reproductive-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      // On prenatal tab
      const prenatalCreateBtn = page.locator('button:has-text("Tạo hồ sơ quản thai")');
      await expect(prenatalCreateBtn).toBeVisible({ timeout: 10000 });

      // Switch to FP tab
      const fpTab = page.locator('.ant-tabs-tab:has-text("KHHGĐ")');
      await fpTab.click();
      await page.waitForTimeout(500);

      const fpCreateBtn = page.locator('button:has-text("Tạo hồ sơ KHHGĐ")');
      await expect(fpCreateBtn).toBeVisible({ timeout: 5000 });
    });
  });

  // =====================================================
  // 4. MENTAL HEALTH - Suc khoe tam than
  // =====================================================
  test.describe('4. Mental Health (/mental-health)', () => {

    test('4.1 Page loads with case management tabs', async ({ page }) => {
      await page.goto('/mental-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Sức khỏe tâm thần")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Verify tabs exist (Dang DT, On dinh, Thuyen giam, Tat ca)
      const tabs = page.locator('.ant-tabs-tab');
      await expect(tabs.first()).toBeVisible({ timeout: 10000 });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(4);
    });

    test('4.2 KPI cards visible (4 cards)', async ({ page }) => {
      await page.goto('/mental-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });

      // Verify specific KPI titles
      await expect(page.locator('.ant-statistic-title:has-text("Đang điều trị")')).toBeVisible();
      await expect(page.locator('.ant-statistic-title:has-text("Nặng")')).toBeVisible();
    });

    test('4.3 PHQ-9 screening button exists', async ({ page }) => {
      await page.goto('/mental-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const screeningBtn = page.locator('button:has-text("Sàng lọc PHQ-9")');
      await expect(screeningBtn).toBeVisible({ timeout: 10000 });

      // Click and verify modal opens
      await screeningBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('.ant-modal:has-text("PHQ-9")');
      await expect(modal).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Escape');
    });

    test('4.4 Table and create button', async ({ page }) => {
      await page.goto('/mental-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });

      const createBtn = page.locator('button:has-text("Tạo hồ sơ")');
      await expect(createBtn).toBeVisible({ timeout: 5000 });
    });
  });

  // =====================================================
  // 5. ENVIRONMENTAL HEALTH - Moi truong y te
  // =====================================================
  test.describe('5. Environmental Health (/environmental-health)', () => {

    test('5.1 Page loads with waste and monitoring tabs', async ({ page }) => {
      await page.goto('/environmental-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Quản lý môi trường y tế")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Two main tabs
      const wasteTab = page.locator('.ant-tabs-tab:has-text("Rác thải y tế")');
      const monitoringTab = page.locator('.ant-tabs-tab:has-text("Giám sát môi trường")');
      await expect(wasteTab).toBeVisible({ timeout: 10000 });
      await expect(monitoringTab).toBeVisible({ timeout: 5000 });
    });

    test('5.2 Statistics visible for waste management', async ({ page }) => {
      await page.goto('/environmental-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });
    });

    test('5.3 Both tab panels render tables', async ({ page }) => {
      await page.goto('/environmental-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      // Waste tab (default) - verify table
      const table = page.locator('.ant-table');
      await expect(table.first()).toBeVisible({ timeout: 10000 });

      // Switch to Monitoring tab
      const monitoringTab = page.locator('.ant-tabs-tab:has-text("Giám sát môi trường")');
      await monitoringTab.click();
      await page.waitForTimeout(500);

      // Table should still be visible
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 5000 });
    });

    test('5.4 Create buttons for each tab', async ({ page }) => {
      await page.goto('/environmental-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      // On waste tab
      const wasteCreateBtn = page.locator('button:has-text("Tạo phiếu rác thải")');
      await expect(wasteCreateBtn).toBeVisible({ timeout: 10000 });

      // Switch to monitoring tab
      const monitoringTab = page.locator('.ant-tabs-tab:has-text("Giám sát môi trường")');
      await monitoringTab.click();
      await page.waitForTimeout(500);

      const monitoringCreateBtn = page.locator('button:has-text("Tạo phiếu GS")');
      await expect(monitoringCreateBtn).toBeVisible({ timeout: 5000 });
    });
  });

  // =====================================================
  // 6. TRAUMA REGISTRY - So chan thuong
  // =====================================================
  test.describe('6. Trauma Registry (/trauma-registry)', () => {

    test('6.1 Page loads with trauma table', async ({ page }) => {
      await page.goto('/trauma-registry', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Sổ chấn thương")');
      await expect(title).toBeVisible({ timeout: 15000 });

      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });
    });

    test('6.2 ISS/GCS/RTS columns visible in table', async ({ page }) => {
      await page.goto('/trauma-registry', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      await expect(page.locator('.ant-table-thead th:has-text("ISS")')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('.ant-table-thead th:has-text("GCS")')).toBeVisible();
      await expect(page.locator('.ant-table-thead th:has-text("RTS")')).toBeVisible();
    });

    test('6.3 Create button opens modal with triage fields', async ({ page }) => {
      await page.goto('/trauma-registry', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const createBtn = page.locator('button:has-text("Tạo hồ sơ")');
      await expect(createBtn).toBeVisible({ timeout: 10000 });
      await createBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('.ant-modal:visible');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify triage and trauma specific fields in the modal
      await expect(modal.locator('text=Phân loại')).toBeVisible();
      await expect(modal.locator('text=GCS')).toBeVisible();
      await expect(modal.locator('text=ISS')).toBeVisible();

      await page.keyboard.press('Escape');
    });

    test('6.4 Statistics cards with trauma metrics', async ({ page }) => {
      await page.goto('/trauma-registry', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });

      await expect(page.locator('.ant-statistic-title:has-text("Ca trong tháng")')).toBeVisible();
      await expect(page.locator('.ant-statistic-title:has-text("Tỷ lệ tử vong")')).toBeVisible();
      await expect(page.locator('.ant-statistic-title:has-text("ISS trung bình")')).toBeVisible();
    });
  });

  // =====================================================
  // 7. POPULATION HEALTH - Dan so - KHHGD
  // =====================================================
  test.describe('7. Population Health (/population-health)', () => {

    test('7.1 Page loads with title', async ({ page }) => {
      await page.goto('/population-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Dân số - KHHGĐ")');
      await expect(title).toBeVisible({ timeout: 15000 });
    });

    test('7.2 Statistics cards visible (4 cards)', async ({ page }) => {
      await page.goto('/population-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });
      const count = await statsCards.count();
      expect(count).toBeGreaterThanOrEqual(4);

      await expect(page.locator('.ant-statistic-title:has-text("Tổng hồ sơ")')).toBeVisible();
      await expect(page.locator('.ant-statistic-title:has-text("KHHGĐ đang dùng")')).toBeVisible();
    });

    test('7.3 Table renders with record type columns', async ({ page }) => {
      await page.goto('/population-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });

      await expect(page.locator('.ant-table-thead th:has-text("Mã HS")')).toBeVisible();
      await expect(page.locator('.ant-table-thead th:has-text("Họ tên")')).toBeVisible();
      await expect(page.locator('.ant-table-thead th:has-text("Loại HS")')).toBeVisible();
    });

    test('7.4 Create button exists', async ({ page }) => {
      await page.goto('/population-health', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const createBtn = page.locator('button:has-text("Tạo hồ sơ")');
      await expect(createBtn).toBeVisible({ timeout: 10000 });
    });
  });

  // =====================================================
  // 8. HEALTH EDUCATION - Truyen thong GDSK
  // =====================================================
  test.describe('8. Health Education (/health-education)', () => {

    test('8.1 Page loads with campaigns and materials tabs', async ({ page }) => {
      await page.goto('/health-education', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Truyền thông GDSK")');
      await expect(title).toBeVisible({ timeout: 15000 });

      const campaignTab = page.locator('.ant-tabs-tab:has-text("Chiến dịch")');
      const materialTab = page.locator('.ant-tabs-tab:has-text("Tài liệu")');
      await expect(campaignTab).toBeVisible({ timeout: 10000 });
      await expect(materialTab).toBeVisible({ timeout: 5000 });
    });

    test('8.2 Both tabs render content', async ({ page }) => {
      await page.goto('/health-education', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      // Campaigns tab (default)
      let table = page.locator('.ant-table');
      await expect(table.first()).toBeVisible({ timeout: 10000 });

      // Switch to Materials tab
      const materialTab = page.locator('.ant-tabs-tab:has-text("Tài liệu")');
      await materialTab.click();
      await page.waitForTimeout(500);

      // Table should still be visible
      await expect(page.locator('.ant-table').first()).toBeVisible({ timeout: 5000 });
    });

    test('8.3 Statistics cards (4 cards)', async ({ page }) => {
      await page.goto('/health-education', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });
      const count = await statsCards.count();
      expect(count).toBeGreaterThanOrEqual(4);

      await expect(page.locator('.ant-statistic-title:has-text("Chiến dịch năm")')).toBeVisible();
      await expect(page.locator('.ant-statistic-title:has-text("Đang diễn ra")')).toBeVisible();
    });

    test('8.4 Create buttons for campaigns and materials', async ({ page }) => {
      await page.goto('/health-education', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      // On campaigns tab
      const campaignCreateBtn = page.locator('button:has-text("Tạo chiến dịch")');
      await expect(campaignCreateBtn).toBeVisible({ timeout: 10000 });

      // Switch to materials tab
      const materialTab = page.locator('.ant-tabs-tab:has-text("Tài liệu")');
      await materialTab.click();
      await page.waitForTimeout(500);

      const materialCreateBtn = page.locator('button:has-text("Tạo tài liệu")');
      await expect(materialCreateBtn).toBeVisible({ timeout: 5000 });
    });
  });

  // =====================================================
  // 9. PRACTICE LICENSE - Quan ly hanh nghe
  // =====================================================
  test.describe('9. Practice License (/practice-license)', () => {

    test('9.1 Page loads with license tabs', async ({ page }) => {
      await page.goto('/practice-license', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Quản lý hành nghề")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Verify tabs (Active, Expiring, Expired, All)
      const tabs = page.locator('.ant-tabs-tab');
      await expect(tabs.first()).toBeVisible({ timeout: 10000 });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(4);
    });

    test('9.2 Statistics cards with expiry warnings', async ({ page }) => {
      await page.goto('/practice-license', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });
      const count = await statsCards.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });

    test('9.3 Create and table visible', async ({ page }) => {
      await page.goto('/practice-license', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const createBtn = page.locator('button:has-text("Tạo chứng chỉ")');
      await expect(createBtn).toBeVisible({ timeout: 10000 });

      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });

      // Verify key column headers
      await expect(page.locator('.ant-table-thead th:has-text("Mã CC")')).toBeVisible();
      await expect(page.locator('.ant-table-thead th:has-text("Số CCHN")')).toBeVisible();
    });

    test('9.4 Tab switching between active and expiring', async ({ page }) => {
      await page.goto('/practice-license', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      // Click expiring tab
      const expiringTab = page.locator('.ant-tabs-tab:has-text("Sắp hết hạn")');
      await expect(expiringTab).toBeVisible({ timeout: 10000 });
      await expiringTab.click();
      await page.waitForTimeout(500);

      // Table should remain visible
      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 5000 });

      // Click expired tab - use data-node-key to avoid ambiguity with "Sap het han"
      const expiredTab = page.locator('.ant-tabs-tab[data-node-key="expired"]');
      await expiredTab.click();
      await page.waitForTimeout(500);

      await expect(table).toBeVisible({ timeout: 5000 });
    });
  });

  // =====================================================
  // 10. INTER-HOSPITAL SHARING - Chia se lien vien
  // =====================================================
  test.describe('10. Inter-Hospital Sharing (/inter-hospital)', () => {

    test('10.1 Page loads with request tabs', async ({ page }) => {
      await page.goto('/inter-hospital', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const title = page.locator('h4:has-text("Chia sẻ liên viện")');
      await expect(title).toBeVisible({ timeout: 15000 });

      // Verify tabs (Incoming, Outgoing, All)
      const tabs = page.locator('.ant-tabs-tab');
      await expect(tabs.first()).toBeVisible({ timeout: 10000 });
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(3);
    });

    test('10.2 Table with urgency-related columns', async ({ page }) => {
      await page.goto('/inter-hospital', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const table = page.locator('.ant-table');
      await expect(table).toBeVisible({ timeout: 10000 });

      // Verify urgency column exists
      await expect(page.locator('.ant-table-thead th:has-text("Khẩn cấp")')).toBeVisible();
      await expect(page.locator('.ant-table-thead th:has-text("Mã YC")')).toBeVisible();
      await expect(page.locator('.ant-table-thead th:has-text("Loại")')).toBeVisible();
    });

    test('10.3 Create request button', async ({ page }) => {
      await page.goto('/inter-hospital', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const createBtn = page.locator('button:has-text("Tạo yêu cầu")');
      await expect(createBtn).toBeVisible({ timeout: 10000 });

      // Click and verify modal
      await createBtn.click();
      await page.waitForTimeout(500);

      const modal = page.locator('.ant-modal:visible');
      await expect(modal).toBeVisible({ timeout: 5000 });

      await page.keyboard.press('Escape');
    });

    test('10.4 Statistics cards visible', async ({ page }) => {
      await page.goto('/inter-hospital', { waitUntil: 'domcontentloaded' });
      await waitForLoading(page);

      const statsCards = page.locator('.ant-statistic');
      await expect(statsCards.first()).toBeVisible({ timeout: 15000 });
      const count = await statsCards.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  // =====================================================
  // CROSS-MODULE TESTS
  // =====================================================
  test.describe('Cross-Module Tests', () => {

    test('All 10 modules load without errors', async ({ page }) => {
      const modules = [
        { path: '/medical-forensics', title: 'Giám định Y khoa' },
        { path: '/traditional-medicine', title: 'Y học cổ truyền' },
        { path: '/reproductive-health', title: 'Sức khỏe sinh sản' },
        { path: '/mental-health', title: 'Sức khỏe tâm thần' },
        { path: '/environmental-health', title: 'Quản lý môi trường y tế' },
        { path: '/trauma-registry', title: 'Sổ chấn thương' },
        { path: '/population-health', title: 'Dân số - KHHGĐ' },
        { path: '/health-education', title: 'Truyền thông GDSK' },
        { path: '/practice-license', title: 'Quản lý hành nghề' },
        { path: '/inter-hospital', title: 'Chia sẻ liên viện' },
      ];

      for (const mod of modules) {
        await page.goto(mod.path, { waitUntil: 'domcontentloaded' });
        await waitForLoading(page);

        const title = page.locator(`h4:has-text("${mod.title}")`);
        await expect(title).toBeVisible({ timeout: 15000 });

        // Verify no crash / redirect to login
        const url = page.url();
        expect(url).not.toContain('/login');
      }
    });

    test('Each module has search input and reload button', async ({ page }) => {
      const paths = [
        '/medical-forensics', '/traditional-medicine', '/reproductive-health',
        '/mental-health', '/environmental-health', '/trauma-registry',
        '/population-health', '/health-education', '/practice-license',
        '/inter-hospital',
      ];

      for (const path of paths) {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await waitForLoading(page);

        // Each module has a search input
        const searchInput = page.locator('.ant-input-search, input[placeholder*="Tìm kiếm"]').first();
        await expect(searchInput).toBeVisible({ timeout: 15000 });

        // Each module has a Reload/Lam moi button
        const reloadBtn = page.locator('button:has-text("Làm mới")');
        await expect(reloadBtn).toBeVisible({ timeout: 5000 });
      }
    });

    test('Each module has a table component', async ({ page }) => {
      const paths = [
        '/medical-forensics', '/traditional-medicine', '/reproductive-health',
        '/mental-health', '/environmental-health', '/trauma-registry',
        '/population-health', '/health-education', '/practice-license',
        '/inter-hospital',
      ];

      for (const path of paths) {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        await waitForLoading(page);

        const table = page.locator('.ant-table');
        await expect(table.first()).toBeVisible({ timeout: 15000 });
      }
    });
  });
});
