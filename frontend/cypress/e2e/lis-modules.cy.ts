/// <reference types="cypress" />

/**
 * LIS Sub-modules Tests
 * Tests for Sample Storage, Screening, Reagent Management, Sample Tracking
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'Failed to start the connection',
  'WebSocket connection', 'hubs/notifications', 'useForm',
  'is not connected to any Form element',
];

describe('LIS Sub-modules', () => {
  let token: string;
  let userData: string;

  before(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5106/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 200) {
        if (res.body?.data?.token) {
          token = res.body.data.token;
          userData = JSON.stringify(res.body.data.user || {});
        } else if (res.body?.token) {
          token = res.body.token;
          userData = JSON.stringify(res.body.user || {});
        }
      }
    });
  });

  function visitPage(route: string) {
    cy.on('uncaught:exception', () => false);
    cy.visit(route, {
      onBeforeLoad(win) {
        if (token) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        }
      },
    });
    cy.get('body', { timeout: 15000 }).should('be.visible');
    cy.wait(2000);
  }

  describe('Sample Storage (/sample-storage)', () => {
    beforeEach(() => visitPage('/sample-storage'));

    it('should load sample storage page', () => {
      cy.url().should('include', '/sample-storage');
    });

    it('should have page title', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTitle = text.includes('Lưu trữ mẫu') || text.includes('Sample Storage') ||
          text.includes('mẫu xét nghiệm') || text.includes('sample');
        expect(hasTitle).to.be.true;
      });
    });

    it('should have statistics or content', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasStats = text.includes('Tổng mẫu') || text.includes('Đã lấy') ||
          text.includes('Hết hạn') || text.includes('Cảnh báo') ||
          text.includes('Lưu trữ') || text.includes('Đang lưu');
        expect(hasStats).to.be.true;
      });
    });

    it('should have tabs', () => {
      cy.get('body').then(($body) => {
        const hasTabs = $body.find('.ant-tabs-tab').length > 0 ||
          $body.text().includes('Đang lưu') || $body.text().includes('Tất cả');
        expect(hasTabs).to.be.true;
      });
    });

    it('should have action buttons', () => {
      cy.get('button').should('have.length.greaterThan', 0);
    });

    it('should have data display area', () => {
      cy.get('body').then(($body) => {
        const hasDisplay = $body.find('.ant-table').length > 0 ||
          $body.text().includes('Trống') || $body.text().includes('Không có');
        expect(hasDisplay).to.be.true;
      });
    });
  });

  describe('Screening (/screening)', () => {
    beforeEach(() => visitPage('/screening'));

    it('should load screening page', () => {
      cy.url().should('include', '/screening');
    });

    it('should have page title', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTitle = text.includes('Sàng lọc') || text.includes('Screening') ||
          text.includes('Sơ sinh') || text.includes('Tiền sản');
        expect(hasTitle).to.be.true;
      });
    });

    it('should have screening type selector', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTypes = text.includes('Sơ sinh') || text.includes('Tiền sản') ||
          text.includes('Newborn') || text.includes('Prenatal') ||
          $body.find('.ant-segmented').length > 0;
        expect(hasTypes).to.be.true;
      });
    });

    it('should have data display', () => {
      cy.get('body').then(($body) => {
        const hasDisplay = $body.find('.ant-table').length > 0 ||
          $body.text().includes('Trống') || $body.text().includes('Không có');
        expect(hasDisplay).to.be.true;
      });
    });

    it('should have action buttons', () => {
      cy.get('button').should('have.length.greaterThan', 0);
    });
  });

  describe('Reagent Management (/reagent-management)', () => {
    beforeEach(() => visitPage('/reagent-management'));

    it('should load reagent management page', () => {
      cy.url().should('include', '/reagent-management');
    });

    it('should have page title', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTitle = text.includes('Hóa chất') || text.includes('Reagent') ||
          text.includes('Thuốc thử') || text.includes('hóa chất');
        expect(hasTitle).to.be.true;
      });
    });

    it('should have statistics or content', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasContent = text.includes('Tổng') || text.includes('Tồn kho') ||
          text.includes('Hết hạn') || text.includes('Cảnh báo') ||
          text.includes('Hóa chất') || text.includes('Reagent');
        expect(hasContent).to.be.true;
      });
    });

    it('should have data display', () => {
      cy.get('body').then(($body) => {
        const hasDisplay = $body.find('.ant-table').length > 0 ||
          $body.text().includes('Trống') || $body.text().includes('Không có');
        expect(hasDisplay).to.be.true;
      });
    });

    it('should have action buttons', () => {
      cy.get('button').should('have.length.greaterThan', 0);
    });
  });

  describe('Sample Tracking (/sample-tracking)', () => {
    beforeEach(() => visitPage('/sample-tracking'));

    it('should load sample tracking page', () => {
      cy.url().should('include', '/sample-tracking');
    });

    it('should have page title', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTitle = text.includes('Theo dõi mẫu') || text.includes('Sample Tracking') ||
          text.includes('Từ chối mẫu') || text.includes('mẫu');
        expect(hasTitle).to.be.true;
      });
    });

    it('should have statistics or content', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasContent = text.includes('Tổng') || text.includes('Từ chối') ||
          text.includes('Chấp nhận') || text.includes('Thu thập lại') ||
          text.includes('mẫu') || text.includes('Sample');
        expect(hasContent).to.be.true;
      });
    });

    it('should have data display', () => {
      cy.get('body').then(($body) => {
        const hasDisplay = $body.find('.ant-table').length > 0 ||
          $body.text().includes('Trống') || $body.text().includes('Không có');
        expect(hasDisplay).to.be.true;
      });
    });

    it('should have action buttons', () => {
      cy.get('button').should('have.length.greaterThan', 0);
    });
  });
});
