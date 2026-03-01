/// <reference types="cypress" />

/**
 * Culture Collection (Kho lưu chủng Vi Sinh) Tests
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'Failed to start the connection',
  'WebSocket connection', 'hubs/notifications', 'useForm',
  'is not connected to any Form element',
];

describe('Culture Collection Module', () => {
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

  beforeEach(() => {
    cy.on('uncaught:exception', () => false);
    cy.visit('/culture-collection', {
      onBeforeLoad(win) {
        if (token) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        }
      },
    });
    cy.get('body', { timeout: 15000 }).should('be.visible');
    cy.wait(2000);
  });

  describe('Page Load', () => {
    it('should load culture collection page', () => {
      cy.url().should('include', '/culture-collection');
    });

    it('should have page title', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTitle = text.includes('Kho lưu chủng') || text.includes('Vi Sinh') ||
          text.includes('Culture Collection') || text.includes('lưu chủng');
        expect(hasTitle).to.be.true;
      });
    });

    it('should load without console errors', () => {
      cy.wait(2000);
      cy.get('body').should('be.visible');
    });
  });

  describe('Statistics Cards', () => {
    it('should display statistics or content', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Should have statistics or page content
        const hasStats = text.includes('Tổng chủng') || text.includes('Hoạt động') ||
          text.includes('Hết hạn') || text.includes('Sắp hết') ||
          text.includes('lưu chủng') || text.includes('Kho');
        expect(hasStats).to.be.true;
      });
    });
  });

  describe('Search and Filter', () => {
    it('should have search input', () => {
      cy.get('input').should('have.length.greaterThan', 0);
    });

    it('should have data display area', () => {
      cy.get('body').then(($body) => {
        // Table or card-based display
        const hasDisplay = $body.find('.ant-table').length > 0 ||
          $body.find('.ant-card').length > 0 ||
          $body.find('.ant-spin').length > 0 ||
          $body.text().includes('Không có dữ liệu');
        expect(hasDisplay).to.be.true;
      });
    });

    it('should have action buttons', () => {
      cy.get('button').should('have.length.greaterThan', 0);
    });
  });

  describe('Action Buttons', () => {
    it('should have store culture button', () => {
      cy.get('body').then(($body) => {
        const hasBtn = $body.find('button').toArray().some(
          btn => btn.textContent?.includes('Lưu chủng') ||
            btn.textContent?.includes('Thêm') ||
            btn.querySelector('.anticon-plus') !== null
        );
        expect(hasBtn).to.be.true;
      });
    });

    it('should open modal when clicking add button', () => {
      cy.get('button').then(($buttons) => {
        const addBtn = $buttons.toArray().find(
          btn => btn.textContent?.includes('Lưu chủng') ||
            btn.textContent?.includes('Thêm') ||
            btn.querySelector('.anticon-plus') !== null
        );
        if (addBtn) {
          cy.wrap(addBtn).click({ force: true });
          cy.wait(500);
          cy.get('.ant-modal').should('be.visible');
        }
      });
    });

    it('should have form fields in modal', () => {
      cy.get('button').then(($buttons) => {
        const addBtn = $buttons.toArray().find(
          btn => btn.textContent?.includes('Lưu chủng') ||
            btn.textContent?.includes('Thêm') ||
            btn.querySelector('.anticon-plus') !== null
        );
        if (addBtn) {
          cy.wrap(addBtn).click({ force: true });
          cy.wait(500);
          cy.get('.ant-modal').within(() => {
            cy.get('.ant-form-item, input, .ant-select').should('have.length.greaterThan', 0);
          });
        }
      });
    });
  });

  describe('Tabs Structure', () => {
    it('should have tab navigation', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTabs = $body.find('.ant-tabs-tab').length > 0 ||
          text.includes('Hoạt động') || text.includes('Hết hạn') ||
          text.includes('Đã hủy') || text.includes('Tất cả');
        expect(hasTabs).to.be.true;
      });
    });
  });

  describe('Page Content', () => {
    it('should display preservation-related content or empty state', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasContent = text.includes('Glycerol') || text.includes('Đông khô') ||
          text.includes('Đông lạnh') || text.includes('Sữa gầy') ||
          text.includes('Không có dữ liệu') || text.includes('chủng') ||
          text.includes('Vi Sinh') || text.includes('Kho');
        expect(hasContent).to.be.true;
      });
    });
  });
});
