/// <reference types="cypress" />

const API_BASE = 'http://localhost:5106/api';

describe('SMS Management', () => {
  let authToken: string;
  let userData: string;

  before(() => {
    cy.request('POST', `${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'Admin@123',
    }).then((res) => {
      if (res.body.data) {
        authToken = res.body.data.token;
        userData = JSON.stringify(res.body.data.user);
      } else {
        authToken = res.body.token;
        userData = JSON.stringify(res.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
      }
    });
  });

  const visitWithAuth = (route: string) => {
    cy.visit(route, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', authToken);
        win.localStorage.setItem('user', userData);
      },
    });
  };

  describe('Page Load & Navigation', () => {
    it('should load SMS management page', () => {
      visitWithAuth('/sms-management');
      cy.contains('Quản lý SMS Gateway', { timeout: 15000 }).should('be.visible');
    });

    it('should show 3 tabs', () => {
      visitWithAuth('/sms-management');
      cy.contains('Tổng quan').should('be.visible');
      cy.contains('Nhật ký SMS').should('be.visible');
      cy.contains('Thử nghiệm').should('be.visible');
    });

    it('should appear in sidebar menu', () => {
      visitWithAuth('/');
      cy.get('.ant-menu', { timeout: 10000 }).should('exist');
    });
  });

  describe('Dashboard Tab', () => {
    beforeEach(() => {
      visitWithAuth('/sms-management');
    });

    it('should show SMS provider info', () => {
      cy.contains('SMS Provider').should('be.visible');
    });

    it('should show balance card', () => {
      cy.contains('Số dư tài khoản').should('be.visible');
    });

    it('should show status card', () => {
      cy.contains('Trạng thái').should('be.visible');
    });

    it('should show success rate', () => {
      cy.contains('Tỷ lệ thành công').should('be.visible');
    });

    it('should show action buttons', () => {
      cy.contains('Kiểm tra kết nối').should('be.visible');
      cy.contains('Làm mới').should('be.visible');
    });
  });

  describe('Logs Tab', () => {
    beforeEach(() => {
      visitWithAuth('/sms-management');
      cy.contains('Nhật ký SMS').click();
    });

    it('should show search and filters', () => {
      cy.get('input[placeholder*="Tìm SĐT"]').should('be.visible');
      cy.get('.ant-select').should('exist');
    });

    it('should show table with correct columns', () => {
      cy.get('.ant-table').should('exist');
      cy.get('.ant-table-thead').within(() => {
        cy.contains('Thời gian').should('exist');
        cy.contains('SĐT').should('exist');
        cy.contains('Loại').should('exist');
      });
    });
  });

  describe('Test Tab', () => {
    beforeEach(() => {
      visitWithAuth('/sms-management');
      cy.contains('Thử nghiệm').click();
    });

    it('should show send test SMS form', () => {
      cy.contains('Gửi SMS thử nghiệm').should('be.visible');
      cy.get('input[placeholder*="0912345678"]').should('be.visible');
    });

    it('should show configuration info', () => {
      cy.contains('Cấu hình SMS Gateway').should('be.visible');
      cy.contains('appsettings.json').should('be.visible');
    });

    it('should validate phone number', () => {
      cy.contains('button', 'Gửi SMS thử').click();
      cy.contains('Vui lòng nhập số điện thoại').should('be.visible');
    });
  });

  describe('SMS API Endpoints', () => {
    it('GET /api/sms/balance returns balance', () => {
      cy.request({
        url: `${API_BASE}/sms/balance`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('provider');
        expect(res.body).to.have.property('currency');
      });
    });

    it('GET /api/sms/logs returns paginated logs', () => {
      cy.request({
        url: `${API_BASE}/sms/logs`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('items');
        expect(res.body).to.have.property('totalCount');
      });
    });

    it('GET /api/sms/stats returns statistics', () => {
      cy.request({
        url: `${API_BASE}/sms/stats`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.have.property('totalSent');
        expect(res.body).to.have.property('successRate');
        expect(res.body).to.have.property('byType');
      });
    });

    it('POST /api/sms/send-test sends and logs SMS', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/sms/send-test`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: { phoneNumber: '0987654321' },
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.success).to.be.true;
      });

      // Verify log was created
      cy.request({
        url: `${API_BASE}/sms/logs?messageType=Test&pageSize=5`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((res) => {
        expect(res.body.items.length).to.be.greaterThan(0);
        expect(res.body.items[0].messageType).to.eq('Test');
      });
    });

    it('POST /api/sms/send-test validates phone', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/sms/send-test`,
        headers: { Authorization: `Bearer ${authToken}` },
        body: { phoneNumber: '' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
      });
    });
  });
});
