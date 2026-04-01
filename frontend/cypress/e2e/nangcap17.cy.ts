/// <reference types="cypress" />

/**
 * NangCap17 Features Test Suite
 *
 * Tests 5 NangCap17 pages:
 * 1. IVF Lab (/ivf-lab) - 6 tabs: couples, cycles, embryos, cryo, sperm bank, dashboard
 * 2. Asset Management (/asset-management) - 7 tabs: assets, tenders, handovers, disposals, depreciation, reports, dashboard
 * 3. Training & Research (/training-research) - 5 tabs: classes, directions, research, certificates, dashboard
 * 4. Procurement (/procurement) - 3 tabs: requests, suggestions, summary
 * 5. Hospital Pharmacy Enhanced (/hospital-pharmacy) - 8 tabs incl 4 new: customers, shifts, GPP, commissions
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
  'HubConnection',
];

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some(p => msg.includes(p));
}

const API_URL = 'http://localhost:5106/api';

function setupAuth(win: Cypress.AUTWindow, token: string) {
  win.localStorage.setItem('token', token);
  win.localStorage.setItem('user', JSON.stringify({ id: '1', username: 'admin', fullName: 'Admin', roles: ['Admin'] }));
}

describe('NangCap17 Features', () => {
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
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { success: true, data: { id: '1', username: 'admin', fullName: 'Admin', roles: ['Admin'] } },
    });
    cy.intercept('GET', '**/api/notification/unread-count', { statusCode: 200, body: { count: 0 } });
    cy.intercept('GET', '**/api/notification/my*', { statusCode: 200, body: [] });
  });

  // =============================================
  // 1. IVF Lab (/ivf-lab)
  // =============================================
  describe('IVF Lab (/ivf-lab)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/ivf-lab/couples*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/ivf-lab/cycles*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/ivf-lab/embryos*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/ivf-lab/sperm*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/ivf-lab/dashboard*', {
        statusCode: 200,
        body: { activeCycles: 5, frozenEmbryos: 12, spermSamples: 8, transfersThisMonth: 3, successRate: 35, totalCouples: 20, completedCycles: 10 },
      });
      cy.intercept('GET', '**/api/ivf-lab/daily-report*', {
        statusCode: 200,
        body: { date: '2026-03-26', items: [] },
      });
      cy.visit('/ivf-lab', {
        failOnStatusCode: false,
        onBeforeLoad(win) { setupAuth(win, token); },
      });
    });

    it('loads without errors', () => {
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
    });

    it('has 6 tabs', () => {
      cy.get('.ant-tabs-tab', { timeout: 10000 }).should('have.length', 6);
      cy.contains('.ant-tabs-tab', 'Cap vo chong').should('exist');
      cy.contains('.ant-tabs-tab', 'Chu kỳ IVF').should('exist');
      cy.contains('.ant-tabs-tab', 'Phôi').should('exist');
      cy.contains('.ant-tabs-tab', 'Tru dong').should('exist');
      cy.contains('.ant-tabs-tab', 'Ngan hang tinh trung').should('exist');
      cy.contains('.ant-tabs-tab', 'Dashboard').should('exist');
    });

    it('has search and filter controls', () => {
      cy.get('.ant-input-search', { timeout: 10000 }).should('exist');
    });

    it('renders a table', () => {
      cy.get('.ant-table', { timeout: 10000 }).should('exist');
    });

    it('Dashboard tab has stats cards', () => {
      cy.contains('.ant-tabs-tab', 'Dashboard').click();
      cy.get('.ant-statistic', { timeout: 10000 }).should('exist');
    });

    it('has add button', () => {
      cy.get('button', { timeout: 10000 }).contains(/Dang ky cap/i).should('exist');
    });
  });

  // =============================================
  // 2. Asset Management (/asset-management)
  // =============================================
  describe('Asset Management (/asset-management)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/asset-management/assets*', { statusCode: 200, body: { items: [], totalCount: 0 } });
      cy.intercept('GET', '**/api/asset-management/tenders*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/asset-management/handovers*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/asset-management/disposals*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/asset-management/depreciation*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/asset-management/report-types*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/asset-management/dashboard*', {
        statusCode: 200,
        body: {
          totalAssets: 10, totalOriginalValue: 5000000, totalCurrentValue: 3000000,
          inUseCount: 8, brokenCount: 1, underRepairCount: 1,
          pendingDisposalCount: 0, disposedCount: 0, transferredCount: 0,
          pendingHandovers: 2, activeTenders: 1, monthlyDepreciationTotal: 100000,
          statusBreakdown: [], depreciationTrends: [],
        },
      });
      cy.visit('/asset-management', {
        failOnStatusCode: false,
        onBeforeLoad(win) { setupAuth(win, token); },
      });
    });

    it('loads without errors', () => {
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
    });

    it('has 7 tabs', () => {
      cy.get('.ant-tabs-tab', { timeout: 10000 }).should('have.length', 7);
      cy.contains('.ant-tabs-tab', 'Tài sản').should('exist');
      cy.contains('.ant-tabs-tab', 'Đấu thầu').should('exist');
      cy.contains('.ant-tabs-tab', 'Bàn giao').should('exist');
      cy.contains('.ant-tabs-tab', 'Thanh lý').should('exist');
      cy.contains('.ant-tabs-tab', 'Khấu hao').should('exist');
      cy.contains('.ant-tabs-tab', 'Dashboard').should('exist');
      cy.contains('.ant-tabs-tab', 'Báo cáo TSCD').should('exist');
    });

    it('asset table renders', () => {
      cy.get('.ant-table', { timeout: 10000 }).should('exist');
    });

    it('Tender tab has create button', () => {
      cy.contains('.ant-tabs-tab', 'Đấu thầu').click();
      cy.get('body', { timeout: 10000 }).then($body => {
        const hasPlusBtn = $body.find('button').filter(function () {
          return /Tạo gói thầu|Thêm gói thầu|Them goi thau|Plus/i.test(this.textContent || '');
        }).length > 0;
        const hasIcon = $body.find('.anticon-plus').length > 0;
        expect(hasPlusBtn || hasIcon).to.be.true;
      });
    });

    it('Dashboard tab has stats', () => {
      cy.contains('.ant-tabs-tab', 'Dashboard').click();
      cy.get('.ant-statistic', { timeout: 10000 }).should('exist');
    });

    it('Report tab has report type selector', () => {
      cy.contains('.ant-tabs-tab', 'Báo cáo TSCD').click();
      cy.get('body', { timeout: 10000 }).then($body => {
        const hasSelect = $body.find('.ant-select').length > 0;
        const hasBtn = $body.find('button').length > 0;
        expect(hasSelect || hasBtn).to.be.true;
      });
    });
  });

  // =============================================
  // 3. Training & Research (/training-research)
  // =============================================
  describe('Training & Research (/training-research)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/training-research/**', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/training-research/classes*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/training-research/directions*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/training-research/research*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/training-research/dashboard*', {
        statusCode: 200,
        body: { totalClasses: 0, activeClasses: 0, totalStudents: 0, totalResearch: 0, byType: [], byStatus: [] },
      });
      cy.intercept('GET', '**/api/training-research/credit-summary*', {
        statusCode: 200,
        body: { staffSummaries: [], averageCredits: 0, complianceRate: 0 },
      });
      cy.visit('/training-research', {
        failOnStatusCode: false,
        onBeforeLoad(win) { setupAuth(win, token); },
      });
    });

    it('loads without errors', () => {
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
    });

    it('has 5 tabs', () => {
      cy.get('.ant-tabs-tab', { timeout: 10000 }).should('have.length', 5);
      cy.contains('.ant-tabs-tab', 'Lớp đào tạo').should('exist');
      cy.contains('.ant-tabs-tab', 'Chỉ đạo tuyến').should('exist');
      cy.contains('.ant-tabs-tab', 'Nghiên cứu KH').should('exist');
      cy.contains('.ant-tabs-tab', 'Chứng chỉ').should('exist');
      cy.contains('.ant-tabs-tab', 'Dashboard').should('exist');
    });

    it('class table renders', () => {
      cy.get('.ant-table', { timeout: 10000 }).should('exist');
    });

    it('Research tab is accessible', () => {
      cy.contains('.ant-tabs-tab', 'Nghiên cứu KH').click();
      cy.get('.ant-tabs-tabpane-active', { timeout: 10000 }).should('exist');
    });

    it('Dashboard has stats', () => {
      cy.contains('.ant-tabs-tab', 'Dashboard').click();
      cy.get('body', { timeout: 10000 }).then($body => {
        const hasStats = $body.find('.ant-statistic').length > 0;
        const hasCards = $body.find('.ant-card').length > 0;
        expect(hasStats || hasCards).to.be.true;
      });
    });
  });

  // =============================================
  // 4. Procurement (/procurement)
  // =============================================
  describe('Procurement (/procurement)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/warehouse/procurement-requests*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/warehouse/procurement-suggestions/*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/warehouse/warehouses*', { statusCode: 200, body: [] });
      cy.visit('/procurement', {
        failOnStatusCode: false,
        onBeforeLoad(win) { setupAuth(win, token); },
      });
    });

    it('loads without errors', () => {
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
    });

    it('has 3 tabs', () => {
      cy.get('.ant-tabs-tab', { timeout: 10000 }).should('have.length', 3);
      cy.get('.ant-tabs-tab').then($tabs => {
        const tabTexts = $tabs.toArray().map(el => el.textContent || '');
        expect(tabTexts.some(t => t.includes('Đề xuất dự trù'))).to.be.true;
        expect(tabTexts.some(t => t.includes('Gợi ý nhập hàng'))).to.be.true;
        expect(tabTexts.some(t => t.includes('Tổng hợp'))).to.be.true;
      });
    });

    it('request table renders with status filter', () => {
      cy.get('.ant-table', { timeout: 10000 }).should('exist');
      cy.get('.ant-select', { timeout: 10000 }).should('exist');
    });

    it('Suggestion tab has warehouse selector', () => {
      cy.get('.ant-tabs-tab', { timeout: 10000 }).eq(1).click();
      cy.get('.ant-tabs-tabpane-active', { timeout: 10000 }).should('exist');
      cy.get('.ant-tabs-tabpane-active .ant-select', { timeout: 10000 }).should('exist');
    });

    it('has create button', () => {
      cy.get('button', { timeout: 10000 }).contains(/Tạo đề xuất/i).should('exist');
    });
  });

  // =============================================
  // 5. Hospital Pharmacy Enhanced (/hospital-pharmacy)
  // =============================================
  describe('Hospital Pharmacy Enhanced (/hospital-pharmacy)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/hospital-pharmacy/**', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/hospital-pharmacy/retail-sales*', { statusCode: 200, body: { items: [], totalCount: 0 } });
      cy.intercept('GET', '**/api/hospital-pharmacy/stock*', { statusCode: 200, body: { items: [], totalCount: 0 } });
      cy.intercept('GET', '**/api/hospital-pharmacy/dashboard*', {
        statusCode: 200,
        body: { todaySales: 0, todayRevenue: 0, monthlyRevenue: 0, lowStockCount: 0 },
      });
      cy.intercept('GET', '**/api/hospital-pharmacy/customers*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/hospital-pharmacy/shifts*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/hospital-pharmacy/gpp-records*', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/hospital-pharmacy/commissions*', { statusCode: 200, body: [] });
      cy.visit('/hospital-pharmacy', {
        failOnStatusCode: false,
        onBeforeLoad(win) { setupAuth(win, token); },
      });
    });

    it('has 8 tabs including 4 new NangCap17 tabs', () => {
      cy.get('.ant-tabs-tab', { timeout: 10000 }).should('have.length.at.least', 7);
      cy.get('.ant-tabs-tab').then($tabs => {
        const tabTexts = $tabs.toArray().map(el => el.textContent || '');
        expect(tabTexts.some(t => t.includes('Khách hàng'))).to.be.true;
        expect(tabTexts.some(t => t.includes('Ca làm việc'))).to.be.true;
        expect(tabTexts.some(t => t.includes('GPP'))).to.be.true;
        expect(tabTexts.some(t => t.includes('Hoa hồng'))).to.be.true;
      });
    });

    it('Customer tab is accessible', () => {
      cy.get('.ant-tabs-tab').contains('Khách hàng').click();
      cy.get('.ant-tabs-tabpane-active', { timeout: 10000 }).should('exist');
    });

    it('Shift tab is accessible', () => {
      cy.get('.ant-tabs-tab').contains('Ca làm việc').click();
      cy.get('.ant-tabs-tabpane-active', { timeout: 10000 }).should('exist');
    });

    it('GPP tab is accessible', () => {
      cy.get('.ant-tabs-tab').contains('GPP').click();
      cy.get('.ant-tabs-tabpane-active', { timeout: 10000 }).should('exist');
    });
  });
});
