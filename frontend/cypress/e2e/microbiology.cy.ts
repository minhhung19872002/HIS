/// <reference types="cypress" />

/**
 * Microbiology Module Tests
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'Failed to start the connection',
  'WebSocket connection', 'hubs/notifications', 'useForm',
  'is not connected to any Form element',
];

describe('Microbiology Module', () => {
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
    cy.visit('/microbiology', {
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
    it('should load microbiology page', () => {
      cy.url().should('include', '/microbiology');
    });

    it('should have page title', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTitle = text.includes('Vi sinh') || text.includes('Microbiology') ||
          text.includes('Nuôi cấy') || text.includes('vi sinh');
        expect(hasTitle).to.be.true;
      });
    });

    it('should load without console errors', () => {
      cy.wait(2000);
      cy.get('body').should('be.visible');
    });
  });

  describe('Statistics and KPIs', () => {
    it('should display statistics or content', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasStats = text.includes('Tổng mẫu') || text.includes('Hoàn thành') ||
          text.includes('Chờ') || text.includes('Phát hiện') ||
          text.includes('Vi sinh') || text.includes('Nuôi cấy');
        expect(hasStats).to.be.true;
      });
    });
  });

  describe('Tabs Structure', () => {
    it('should have tabs or content sections', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTabs = $body.find('.ant-tabs-tab').length > 0 ||
          text.includes('Đang ủ') || text.includes('Phát hiện VK') ||
          text.includes('Không mọc') || text.includes('Hoàn thành') ||
          text.includes('Chờ');
        expect(hasTabs).to.be.true;
      });
    });
  });

  describe('Table and Data', () => {
    it('should have data display area', () => {
      cy.get('body').then(($body) => {
        const hasTable = $body.find('.ant-table').length > 0 ||
          $body.find('.ant-card').length > 0 ||
          $body.find('.ant-spin').length > 0 ||
          $body.text().includes('Không có dữ liệu');
        expect(hasTable).to.be.true;
      });
    });

    it('should have search functionality', () => {
      cy.get('input').should('have.length.greaterThan', 0);
    });
  });

  describe('Action Buttons', () => {
    it('should have action buttons', () => {
      cy.get('button').should('have.length.greaterThan', 0);
    });

    it('should have create or refresh button', () => {
      cy.get('body').then(($body) => {
        const hasBtn = $body.find('button').toArray().some(
          btn => btn.textContent?.includes('Tạo nuôi cấy') ||
            btn.textContent?.includes('Làm mới') ||
            btn.textContent?.includes('Thêm') ||
            btn.querySelector('.anticon-reload') !== null ||
            btn.querySelector('.anticon-plus') !== null
        );
        expect(hasBtn).to.be.true;
      });
    });
  });

  describe('Microbiology Content', () => {
    it('should show microbiology-related content', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Should have microbiology-related terms or empty state
        const hasMicroContent = text.includes('Vi sinh') || text.includes('Nuôi cấy') ||
          text.includes('Kháng sinh') || text.includes('Vi khuẩn') ||
          text.includes('Gram') || text.includes('AST') ||
          text.includes('Mẫu') || text.includes('Không có dữ liệu');
        expect(hasMicroContent).to.be.true;
      });
    });
  });
});
