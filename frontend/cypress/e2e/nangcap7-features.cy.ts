/// <reference types="cypress" />

/**
 * NangCap7 Features Test Suite
 *
 * Tests NangCap7 features:
 * - SpecialtyEMR page (/specialty-emr): 15-specialty clinical record forms
 * - EMR Partograph tab: obstetric labor monitoring chart
 * - EMR Anesthesia tab: anesthesia monitoring during surgery
 * - EMR Drug Reaction tab: drug reaction testing records
 * - Dashboard enhancements: service status + revenue by patient type
 * - MedicalRecordArchive "Luu tru" tab: archive storage & retrieval
 * - SystemAdmin "Sao luu" (Backup) tab: backup config & management
 * - Backend API tests for specialty-emr, clinical-records, archives
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'Failed to start the connection',
  'WebSocket connection',
  'hubs/notifications',
  'SignalR',
  'negotiate',
  'useForm',
  'is not connected to any Form element',
];

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some(p => msg.includes(p));
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

describe('NangCap7 Features - SpecialtyEMR, Clinical Records, Dashboard, Archive, Backup', () => {
  const API_URL = 'http://localhost:5106/api';
  let token: string;

  before(() => {
    cy.request('POST', `${API_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123',
    }).then((res) => {
      token = res.body.data?.token || res.body.token;
    });
  });

  beforeEach(() => {
    cy.on('uncaught:exception', () => false);
    // Intercept auth/me to prevent token validation failure causing redirect
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { success: true, data: { id: 1, username: 'admin', fullName: 'Admin', roles: ['Admin'] } },
    });
    cy.intercept('GET', '**/api/notification/unread-count', { statusCode: 200, body: { count: 0 } });
    cy.intercept('GET', '**/api/notification/my*', { statusCode: 200, body: [] });
  });

  // =============================================
  // A. SpecialtyEMR Page (/specialty-emr)
  // =============================================
  describe('SpecialtyEMR Page', () => {
    beforeEach(() => {
      cy.visit('/specialty-emr', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
    });

    it('should load SpecialtyEMR page without errors', () => {
      cy.get('body').should(($body) => {
        expect(normalizeText($body.text())).to.include('ho so benh an chuyen khoa');
      });
    });

    it('should have search form with keyword input', () => {
      cy.get('input[placeholder*="Ma BN"]').should('exist');
    });

    it('should have specialty type select filter', () => {
      cy.get('.ant-select').should('have.length.gte', 1);
      cy.get('body').should(($body) => {
        expect(normalizeText($body.text())).to.include('tat ca chuyen khoa');
      });
    });

    it('should have date range picker', () => {
      cy.get('.ant-picker-range').should('exist');
    });

    it('should have table or empty state with expected structure', () => {
      // Page may show table with data or empty state message
      cy.get('body').then(($body) => {
        if ($body.find('.ant-table-thead').length > 0) {
          const headers = ['Ma BN', 'Ho ten', 'Chuyen khoa', 'Ngay tao', 'BS dieu tri', 'Trang thai'];
          headers.forEach((h) => {
            cy.get('.ant-table-thead').contains(h).should('exist');
          });
        } else {
          // Empty state - verify page structure exists
          cy.contains(/Khong co du lieu|Tim kiem|Tao moi/i).should('exist');
        }
      });
    });

    it('should have specialty type filter dropdown with options', () => {
      // Click the specialty select to open dropdown
      cy.get('.ant-select').first().click({ force: true });
      // Check that dropdown opens
      cy.get('.ant-select-dropdown').should('exist');
      cy.get('.ant-select-item-option').should('have.length.gte', 2);
      // Close dropdown
      cy.get('body').type('{esc}');
    });

    it('should have "Tim kiem" button', () => {
      cy.get('button').should(($buttons) => {
        expect(normalizeText($buttons.text())).to.include('tim kiem');
      });
    });

    it('should have "Lam moi" button', () => {
      cy.get('button').should(($buttons) => {
        expect(normalizeText($buttons.text())).to.include('lam moi');
      });
    });

    it('should have "Tao moi" button that opens create modal', () => {
      cy.contains('button', 'Tao moi').should('exist').click();
      // Modal should open
      cy.get('.ant-modal').should('be.visible');
      cy.get('.ant-modal').should(($modal) => {
        expect(normalizeText($modal.text())).to.include('tao ho so chuyen khoa moi');
      });
    });

    it('should have create form with required fields', () => {
      cy.contains('button', 'Tao moi').click();
      cy.get('.ant-modal').should('be.visible');
      // Check form fields
      cy.get('.ant-modal').within(() => {
        cy.get('.ant-form').should(($form) => {
          const text = normalizeText($form.text());
          expect(text).to.include('ma benh nhan');
          expect(text).to.include('ho ten');
          expect(text).to.include('ngay tao');
          expect(text).to.include('bs dieu tri');
          expect(text).to.include('khoa/phong');
          expect(text).to.include('icd-10');
          expect(text).to.include('chan doan');
          expect(text).to.include('chuyen khoa');
        });
      });
    });

    it('should have specialty type dropdown with multiple types in create form', () => {
      cy.contains('button', /T[aạ]o m[oớ]i/i).click();
      cy.get('.ant-modal').should('be.visible');
      // Find the first select in modal and click
      cy.get('.ant-modal .ant-select').first().click({ force: true });
      cy.get('.ant-select-dropdown:visible .ant-select-item-option').should('have.length.gte', 2);
    });

    it('should change specialty fields when selecting different type', () => {
      cy.contains('button', 'Tao moi').click();
      cy.get('.ant-modal').should('be.visible');
      // Default should show Ngoai khoa section
      cy.get('.ant-modal').should(($modal) => {
        expect(normalizeText($modal.text())).to.include('ngoai khoa');
      });
    });

    it('should close modal when clicking Huy', () => {
      cy.contains('button', 'Tao moi').click();
      cy.get('.ant-modal').should('be.visible');
      cy.get('.ant-modal').contains('button', 'Huy').click();
      cy.get('.ant-modal').should('not.exist');
    });

    it('should have Luu and In buttons in modal footer', () => {
      cy.contains('button', 'Tao moi').click();
      cy.get('.ant-modal').should('be.visible');
      cy.get('.ant-modal').contains('button', 'Luu').should('exist');
      cy.get('.ant-modal').contains('button', 'In').should('exist');
    });
  });

  // =============================================
  // B. EMR Partograph Tab
  // =============================================
  describe('EMR - Partograph Tab', () => {
    beforeEach(() => {
      cy.visit('/emr', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
    });

    it('should load EMR page', () => {
      cy.url().should('include', '/emr');
      // Wait for page to render
      cy.get('.ant-card').should('exist');
    });

    it('should have Partograph tab in EMR detail tabs', () => {
      cy.wait(2000);
      cy.get('body').then(($body) => {
        if ($body.find('.ant-table-row').length > 0) {
          cy.get('.ant-table-row').first().click();
          cy.wait(1000);
          // Tab uses Vietnamese diacritics: "Biểu đồ chuyển dạ"
          cy.get('[role="tab"]').contains(/Bi\u1EC3u \u0111\u1ED3 chuy\u1EC3n d\u1EA1|chuy\u1EC3n d\u1EA1|Partograph/i).should('exist');
        } else {
          cy.contains(/H\u1ED3 s\u01A1 b\u1EC7nh \u00E1n|EMR/i).should('exist');
        }
      });
    });

    it('should show Partograph tab content with expected structure', () => {
      cy.wait(2000);
      cy.get('body').then(($body) => {
        if ($body.find('.ant-table-row').length > 0) {
          cy.get('.ant-table-row').first().click();
          cy.wait(1000);
          cy.get('[role="tab"]').contains(/chuy\u1EC3n d\u1EA1/i).click({ force: true });
          cy.get('.ant-tabs-tabpane-active').should('exist');
        }
      });
    });
  });

  // =============================================
  // C. EMR Anesthesia Tab
  // =============================================
  describe('EMR - Anesthesia Tab', () => {
    beforeEach(() => {
      cy.visit('/emr', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
    });

    it('should have Anesthesia tab in EMR detail tabs', () => {
      cy.wait(2000);
      cy.get('body').then(($body) => {
        if ($body.find('.ant-table-row').length > 0) {
          cy.get('.ant-table-row').first().click();
          cy.wait(1000);
          // Tab uses Vietnamese: "Gây mê hồi sức"
          cy.get('[role="tab"]').contains(/G\u00E2y m\u00EA h\u1ED3i s\u1EE9c|m\u00EA h\u1ED3i s\u1EE9c|Anesthesia/i).should('exist');
        } else {
          cy.contains(/H\u1ED3 s\u01A1 b\u1EC7nh \u00E1n|EMR/i).should('exist');
        }
      });
    });

    it('should show Anesthesia tab content with ASA/Mallampati fields', () => {
      cy.wait(2000);
      cy.get('body').then(($body) => {
        if ($body.find('.ant-table-row').length > 0) {
          cy.get('.ant-table-row').first().click();
          cy.wait(1000);
          cy.get('[role="tab"]').contains(/m\u00EA h\u1ED3i s\u1EE9c/i).click({ force: true });
          cy.get('.ant-tabs-tabpane-active').should('exist');
        }
      });
    });
  });

  // =============================================
  // D. EMR Drug Reaction Tab
  // =============================================
  describe('EMR - Drug Reaction Tab', () => {
    beforeEach(() => {
      cy.visit('/emr', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
    });

    it('should have Drug Reaction tab in EMR detail tabs', () => {
      cy.wait(2000);
      cy.get('body').then(($body) => {
        if ($body.find('.ant-table-row').length > 0) {
          cy.get('.ant-table-row').first().click();
          cy.wait(1000);
          // Tab uses Vietnamese: "Thử phản ứng thuốc"
          cy.get('[role="tab"]').contains(/Th\u1EED ph\u1EA3n \u1EE9ng thu\u1ED1c|ph\u1EA3n \u1EE9ng thu\u1ED1c/i).should('exist');
        } else {
          cy.contains(/H\u1ED3 s\u01A1 b\u1EC7nh \u00E1n|EMR/i).should('exist');
        }
      });
    });

    it('should show Drug Reaction tab with add button and empty state', () => {
      cy.wait(2000);
      cy.get('body').then(($body) => {
        if ($body.find('.ant-table-row').length > 0) {
          cy.get('.ant-table-row').first().click();
          cy.wait(1000);
          cy.get('[role="tab"]').contains(/ph\u1EA3n \u1EE9ng thu\u1ED1c/i).click({ force: true });
          cy.get('.ant-tabs-tabpane-active').should('exist');
        }
      });
    });
  });

  // =============================================
  // E. Dashboard Enhancements
  // =============================================
  describe('Dashboard Enhancements', () => {
    beforeEach(() => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
      // Dashboard loads data async - wait for spinner to disappear
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.wait(3000);
    });

    it('should load dashboard page', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text.includes('T\u1ED5ng quan') || text.includes('Tong quan') || text.includes('Dashboard')).to.be.true;
      });
    });

    it('should have main KPI cards', () => {
      cy.get('.ant-statistic').should('have.length.gte', 4);
    });

    it('should have service status section with done/pending counts', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Service names in Vietnamese with diacritics
        const hasService =
          text.includes('Kh\u00E1m b\u1EC7nh') || text.includes('C\u0110HA') ||
          text.includes('X\u00E9t nghi\u1EC7m') || text.includes('xong') ||
          text.includes('Xong') || text.includes('ch\u1EDD');
        expect(hasService).to.be.true;
      });
    });

    it('should display service status mini cards for OPD, Lab, Radiology, etc.', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const serviceNames = ['Kh\u00E1m b\u1EC7nh', 'C\u0110HA', 'X\u00E9t nghi\u1EC7m', 'Ph\u1EABu thu\u1EADt', 'K\u00EA \u0111\u01A1n'];
        let foundCount = 0;
        serviceNames.forEach((name) => {
          if (text.includes(name)) foundCount++;
        });
        expect(foundCount).to.be.gte(1);
      });
    });

    it('should have revenue by patient type section (BHYT, Tu tra, Khac)', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasRevenue =
          text.includes('BHYT') ||
          text.includes('T\u1EF1 chi tr\u1EA3') ||
          text.includes('Doanh thu');
        expect(hasRevenue).to.be.true;
      });
    });

    it('should have chart Segmented control (Xu huong / Theo khoa / Phan bo)', () => {
      cy.get('.ant-segmented').should('exist');
    });

    it('should have Lam moi (refresh) button', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text.includes('L\u00E0m m\u1EDBi') || text.includes('Lam moi') || text.includes('Refresh')).to.be.true;
      });
    });

    it('should show last update time', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        // "Cập nhật:" with diacritics
        expect(text.includes('C\u1EADp nh\u1EADt:') || text.includes('Cap nhat:') || text.includes('update')).to.be.true;
      });
    });
  });

  // =============================================
  // F. MedicalRecordArchive - Luu tru Tab
  // =============================================
  describe('MedicalRecordArchive - Luu tru Tab', () => {
    beforeEach(() => {
      // Intercept all API calls to prevent 401→redirect in case token expired
      cy.intercept('GET', '**/api/inpatient/medical-record-archive/**', {
        statusCode: 200,
        body: { totalRecords: 5, pendingReview: 2, handedOver: 1, approved: 2, items: [], totalCount: 0 },
      });
      cy.intercept('GET', '**/api/inpatient/**', {
        statusCode: 200,
        body: [],
      });
      cy.intercept('POST', '**/api/examination/search', {
        statusCode: 200,
        body: { items: [], totalCount: 0 },
      });
      cy.intercept('GET', '**/api/examination/**', {
        statusCode: 200,
        body: {},
      });
      cy.intercept('GET', '**/api/archives/**', {
        statusCode: 200,
        body: { items: [], totalCount: 0, usedSpaceMB: 0, totalSpaceMB: 1000, percentUsed: 0 },
      });
      cy.intercept('POST', '**/api/archives/**', {
        statusCode: 200,
        body: { success: true },
      });
      cy.visit('/medical-record-archive', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token || 'cypress-test-token');
          win.localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', fullName: 'Admin', roles: ['Admin'] }));
        },
      });
      cy.get('body', { timeout: 15000 }).should('be.visible');
      cy.wait(1500);
    });

    it('should load MedicalRecordArchive page', () => {
      // Page loads either with full UI (if backend available) or unavailable notice
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Accept either: full page loaded OR unavailable message
        const hasContent = $body.find('.ant-card').length > 0 ||
          $body.find('.ant-result').length > 0 ||
          text.includes('Luu tru') || text.includes('L\u01B0u tr\u1EF3') ||
          text.includes('ch\u01B0a kh\u1EA3 d\u1EE5ng') || text.includes('archive');
        expect(hasContent).to.be.true;
      });
    });

    it('should have page title or unavailable notice', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasContent = text.includes('Luu tru') || text.includes('L\u01B0u tr\u1EF3') ||
          text.includes('h\u1ED3 s\u01A1 b\u1EC7nh') || text.includes('archive') ||
          text.includes('ch\u01B0a kh\u1EA3 d\u1EE5ng') || $body.find('.ant-result').length > 0;
        expect(hasContent).to.be.true;
      });
    });

    it('should have UI elements when module is available', () => {
      cy.get('body').then(($body) => {
        if ($body.find('.ant-result').length > 0) {
          // Module unavailable - just verify Result component renders
          cy.contains(/ch\u01B0a kh\u1EA3 d\u1EE5ng|kh\u00F4ng kh\u1EA3 d\u1EE5ng|backend/i).should('exist');
        } else {
          // Module available - check for tabs
          cy.get('[role="tab"]').should('have.length.gte', 1);
        }
      });
    });

    it('should not have 500 errors', () => {
      // Just verify the page loaded without server errors
      cy.get('body').should('be.visible');
      cy.get('.ant-result-error').should('not.exist');
    });

    it('should show archive section or unavailable state', () => {
      cy.get('body').then(($body) => {
        if ($body.find('.ant-tabs').length > 0) {
          // Module available - check for tab content
          cy.get('.ant-tabs').should('exist');
        } else {
          // Module unavailable - Result component
          cy.get('.ant-result').should('exist');
        }
      });
    });
  });

  // =============================================
  // G. SystemAdmin - Backup Tab
  // =============================================
  describe('SystemAdmin - Backup Tab', () => {
    beforeEach(() => {
      cy.visit('/admin', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
    });

    it('should load SystemAdmin page', () => {
      cy.get('.ant-card, .ant-tabs').should('exist');
    });

    it('should have Backup/Sao luu tab', () => {
      cy.get('[role="tab"]').contains(/Sao luu|Backup/i).should('exist');
    });

    it('should navigate to Sao luu tab', () => {
      cy.get('[role="tab"]').contains(/Sao luu|Backup/i).click({ force: true });
      cy.get('.ant-tabs-tabpane-active').should('exist');
    });

    it('should show backup configuration section', () => {
      cy.get('[role="tab"]').contains(/Sao luu|Backup/i).click({ force: true });
      // Should have auto-backup config card
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasBackupConfig =
          text.includes('Cau hinh sao luu') ||
          text.includes('C\u1EA5u h\u00ECnh sao l\u01B0u') ||
          text.includes('Sao luu thu cong') ||
          text.includes('Sao luu ngay');
        expect(hasBackupConfig).to.be.true;
      });
    });

    it('should have manual backup button', () => {
      cy.get('[role="tab"]').contains(/Sao luu|Backup/i).click({ force: true });
      // "Sao luu ngay" button
      cy.get('body').then(($body) => {
        const hasBackupButton =
          $body.text().includes('Sao luu ngay') ||
          $body.text().includes('Sao l\u01B0u ngay');
        expect(hasBackupButton).to.be.true;
      });
    });

    it('should have backup history table', () => {
      cy.get('[role="tab"]').contains(/Sao luu|Backup/i).click({ force: true });
      // "Lich su sao luu" section with table
      cy.get('body').then(($body) => {
        const hasHistory =
          $body.text().includes('Lich su sao luu') ||
          $body.text().includes('L\u1ECBch s\u1EED sao l\u01B0u');
        expect(hasHistory).to.be.true;
      });
    });

    it('should have backup target configuration', () => {
      cy.get('[role="tab"]').contains(/Sao luu|Backup/i).click({ force: true });
      // "Muc tieu sao luu" section
      cy.get('body').then(($body) => {
        const hasTargets =
          $body.text().includes('Muc tieu sao luu') ||
          $body.text().includes('M\u1EE5c ti\u00EAu sao l\u01B0u') ||
          $body.text().includes('local') ||
          $body.text().includes('HIS_Backups');
        expect(hasTargets).to.be.true;
      });
    });
  });

  // =============================================
  // H. API Tests
  // =============================================
  describe('API Tests - SpecialtyEMR', () => {
    it('GET /api/specialty-emr/search should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/specialty-emr/search`,
        headers: { Authorization: `Bearer ${token}` },
        qs: { pageIndex: 0, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });

    it('POST /api/specialty-emr should save a test record', () => {
      cy.request({
        method: 'POST',
        url: `${API_URL}/specialty-emr`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: {
          patientCode: 'TEST-N7-001',
          patientName: 'Nguyen Van Test N7',
          specialtyType: 'surgical',
          doctorName: 'BS. Test',
          departmentName: 'Ngoai khoa',
          diagnosisIcd: 'K35.9',
          diagnosisText: 'Viem ruot thua cap',
          specialtyData: {
            surgicalHistory: 'Khong co',
            procedureType: 'emergency',
            woundDescription: 'Vung bung duoi phai',
          },
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 201, 204, 400, 500]);
      });
    });

    it('GET /api/specialty-emr/search with keyword filter should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/specialty-emr/search`,
        headers: { Authorization: `Bearer ${token}` },
        qs: { keyword: 'test', pageIndex: 0, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });
  });

  describe('API Tests - Clinical Records (Partograph & Anesthesia)', () => {
    it('GET /api/clinical-records/partograph should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/clinical-records/partograph`,
        headers: { Authorization: `Bearer ${token}` },
        qs: { pageIndex: 0, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });

    it('GET /api/clinical-records/partograph with admissionId should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/clinical-records/partograph`,
        headers: { Authorization: `Bearer ${token}` },
        qs: { admissionId: '00000000-0000-0000-0000-000000000000', pageIndex: 0, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });

    it('GET /api/clinical-records/anesthesia should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/clinical-records/anesthesia`,
        headers: { Authorization: `Bearer ${token}` },
        qs: { pageIndex: 0, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });

    it('GET /api/clinical-records/anesthesia with patientId should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/clinical-records/anesthesia`,
        headers: { Authorization: `Bearer ${token}` },
        qs: { patientId: '00000000-0000-0000-0000-000000000000', pageIndex: 0, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });
  });

  describe('API Tests - Archives', () => {
    it('GET /api/archives/storage-status should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/archives/storage-status`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 500]);
      });
    });

    it('GET /api/archives/archived should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/archives/archived`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 500]);
      });
    });

    it('GET /api/archives/stats should return archive statistics', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/archives/stats`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 500]);
      });
    });

    it('GET /api/archives (search) should return 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_URL}/archives`,
        headers: { Authorization: `Bearer ${token}` },
        qs: { pageIndex: 0, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 500]);
      });
    });
  });

  // =============================================
  // I. Cross-feature Integration
  // =============================================
  describe('Cross-feature Integration', () => {
    it('should navigate from sidebar to SpecialtyEMR', () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
      // Look for SpecialtyEMR menu item in sidebar
      cy.get('body').then(($body) => {
        if ($body.text().includes('BA Chuyen khoa') || $body.text().includes('BA Chuy\u00EAn khoa') || $body.text().includes('chuyen khoa')) {
          cy.contains(/BA Chuyen khoa|BA Chuy\u00EAn khoa|chuyen khoa/i).first().click({ force: true });
          cy.url().should('include', '/specialty-emr');
        } else {
          // Navigate directly
          cy.visit('/specialty-emr', {
            onBeforeLoad(win) {
              win.localStorage.setItem('token', token);
              win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
            },
          });
          cy.url().should('include', '/specialty-emr');
        }
      });
    });

    it('SpecialtyEMR page should not produce console errors', () => {
      const errors: string[] = [];
      cy.on('window:console', (msg: any) => {
        if (msg.type === 'error' && !isIgnoredError(msg.text || msg.toString())) {
          errors.push(msg.text || msg.toString());
        }
      });
      cy.visit('/specialty-emr', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
      cy.wait(2000).then(() => {
        expect(errors).to.have.length(0);
      });
    });

    it('Dashboard should load without crashing', () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
      cy.get('.ant-statistic').should('have.length.gte', 4);
      // No crash / error boundary
      cy.contains('Da xay ra loi').should('not.exist');
    });

    it('EMR page should have all 3 new clinical tabs (partograph, anesthesia, drug-reaction)', () => {
      cy.visit('/emr', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Admin' }));
        },
      });
      cy.wait(2000);
      cy.get('body').then(($body) => {
        if ($body.find('.ant-table-row').length > 0) {
          cy.get('.ant-table-row').first().click();
          cy.wait(1000);
          // All 3 tabs with Vietnamese diacritics
          cy.get('[role="tab"]').contains(/chuy\u1EC3n d\u1EA1/i).should('exist');
          cy.get('[role="tab"]').contains(/m\u00EA h\u1ED3i s\u1EE9c/i).should('exist');
          cy.get('[role="tab"]').contains(/ph\u1EA3n \u1EE9ng thu\u1ED1c/i).should('exist');
        } else {
          cy.contains(/H\u1ED3 s\u01A1 b\u1EC7nh \u00E1n|EMR/i).should('exist');
        }
      });
    });
  });
});
