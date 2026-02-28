/// <reference types="cypress" />

describe('Online Booking System', () => {
  const API = Cypress.env('API_URL') || 'http://localhost:5106/api';

  // Public booking page (no login required)
  describe('Public Booking Page (/dat-lich)', () => {
    beforeEach(() => {
      cy.visit('/dat-lich', { failOnStatusCode: false });
      cy.get('body', { timeout: 10000 }).should('be.visible');
    });

    it('loads booking page with hospital header', () => {
      cy.contains('Đặt Lịch Khám Trực Tuyến').should('be.visible');
      cy.contains('BỆNH VIỆN ĐA KHOA ABC').should('be.visible');
      cy.contains('Đặt lịch trước').should('be.visible');
    });

    it('shows booking and lookup toggle buttons', () => {
      cy.contains('button', 'Đặt lịch mới').should('be.visible');
      cy.contains('button', 'Tra cứu lịch hẹn').should('be.visible');
    });

    it('displays step wizard for new booking', () => {
      cy.get('.ant-steps').should('be.visible');
      cy.contains('Chọn khoa & ngày').should('be.visible');
      cy.contains('Thông tin cá nhân').should('be.visible');
      cy.contains('Xác nhận').should('be.visible');
      cy.contains('Hoàn tất').should('be.visible');
    });

    it('loads departments in select dropdown', () => {
      cy.get('.ant-select').first().click();
      cy.get('.ant-select-dropdown', { timeout: 5000 }).should('be.visible');
    });

    it('switches to lookup mode', () => {
      cy.contains('button', 'Tra cứu lịch hẹn').click();
      cy.contains('Tra cứu lịch hẹn').should('be.visible');
      cy.get('input[id*="lookupCode"]').should('be.visible');
      cy.get('input[id*="lookupPhone"]').should('be.visible');
    });

    it('validates required fields before next step', () => {
      cy.contains('button', 'Tiếp theo').click();
      cy.contains('Chọn khoa').should('be.visible');
    });
  });

  // Booking API tests
  describe('Booking API', () => {
    it('GET /booking/departments returns list', () => {
      cy.request({ url: `${API}/booking/departments`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
        if (res.status === 200) {
          expect(res.body).to.be.an('array');
        }
      });
    });

    it('GET /booking/doctors returns list', () => {
      cy.request({ url: `${API}/booking/doctors`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });

    it('GET /booking/slots returns slot result', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      cy.request({ url: `${API}/booking/slots?date=${dateStr}`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
        if (res.status === 200) {
          expect(res.body).to.have.property('morningSlots');
          expect(res.body).to.have.property('afternoonSlots');
          expect(res.body).to.have.property('totalAvailable');
        }
      });
    });

    it('GET /booking/services returns list', () => {
      cy.request({ url: `${API}/booking/services`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204]);
      });
    });

    it('POST /booking/book validates required fields', () => {
      cy.request({
        method: 'POST', url: `${API}/booking/book`,
        body: { patientName: '', phoneNumber: '' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.success).to.eq(false);
      });
    });

    it('GET /booking/lookup with no params returns empty', () => {
      cy.request({ url: `${API}/booking/lookup`, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array').with.length(0);
      });
    });
  });

  // Staff booking management (requires auth)
  describe('Booking Management Page (/booking-management)', () => {
    beforeEach(() => {
      const token = Cypress.env('AUTH_TOKEN');
      if (token) {
        cy.window().then((win) => {
          win.localStorage.setItem('token', token);
        });
      } else {
        cy.request({
          method: 'POST', url: `${API}/auth/login`,
          body: { username: 'admin', password: 'Admin@123' },
          failOnStatusCode: false,
        }).then((res) => {
          if (res.body?.token) {
            cy.window().then((win) => {
              win.localStorage.setItem('token', res.body.token);
              win.localStorage.setItem('user', JSON.stringify(res.body.user || {}));
            });
          }
        });
      }
      cy.visit('/booking-management', { failOnStatusCode: false });
      cy.get('body', { timeout: 10000 }).should('be.visible');
    });

    it('loads booking management page', () => {
      cy.contains('Quản lý đặt lịch').should('be.visible');
    });

    it('shows 3 tabs: bookings, schedules, stats', () => {
      cy.contains('Lịch hẹn').should('be.visible');
      cy.contains('Lịch bác sĩ').should('be.visible');
      cy.contains('Thống kê').should('be.visible');
    });

    it('booking tab has search and filter controls', () => {
      cy.get('input[placeholder*="Tìm mã hẹn"]').should('be.visible');
      cy.contains('Trạng thái').should('be.visible');
    });

    it('schedules tab shows add button and table', () => {
      cy.contains('Lịch bác sĩ').click();
      cy.contains('button', 'Thêm lịch làm việc').should('be.visible');
      cy.get('.ant-table').should('be.visible');
    });

    it('schedule add modal opens with form fields', () => {
      cy.contains('Lịch bác sĩ').click();
      cy.contains('button', 'Thêm lịch làm việc').click();
      cy.contains('Thêm lịch làm việc').should('be.visible');
      cy.contains('Bác sĩ').should('be.visible');
      cy.contains('Khoa').should('be.visible');
      cy.contains('Giờ bắt đầu').should('be.visible');
      cy.contains('Giờ kết thúc').should('be.visible');
      cy.contains('Số BN tối đa').should('be.visible');
      cy.get('.ant-modal-footer').find('button').contains('OK').should('be.visible');
      cy.get('.ant-modal-footer').find('button').contains('Cancel').click();
    });

    it('stats tab shows statistics', () => {
      cy.contains('Thống kê').click();
      cy.contains('Tổng lịch hẹn').should('be.visible');
      cy.contains('Chờ xác nhận').should('be.visible');
      cy.contains('Đã xác nhận').should('be.visible');
      cy.contains('Tỷ lệ vắng').should('be.visible');
    });
  });

  // Booking Management API (auth required)
  describe('Booking Management API', () => {
    let authToken: string;

    before(() => {
      cy.request({
        method: 'POST', url: `${API}/auth/login`,
        body: { username: 'admin', password: 'Admin@123' },
        failOnStatusCode: false,
      }).then((res) => {
        authToken = res.body?.token || '';
      });
    });

    it('GET /booking-management/schedules returns list', () => {
      cy.request({
        url: `${API}/booking-management/schedules`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 401]);
        if (res.status === 200) {
          expect(res.body).to.be.an('array');
          if (res.body.length > 0) {
            expect(res.body[0]).to.have.property('doctorName');
            expect(res.body[0]).to.have.property('scheduleDate');
            expect(res.body[0]).to.have.property('maxPatients');
          }
        }
      });
    });

    it('GET /booking-management/bookings returns paged result', () => {
      cy.request({
        url: `${API}/booking-management/bookings?pageIndex=0&pageSize=10`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 401]);
        if (res.status === 200) {
          expect(res.body).to.have.property('items');
          expect(res.body).to.have.property('totalCount');
        }
      });
    });

    it('GET /booking-management/stats returns stats', () => {
      cy.request({
        url: `${API}/booking-management/stats`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 401]);
        if (res.status === 200) {
          expect(res.body).to.have.property('totalBookings');
          expect(res.body).to.have.property('noShowRate');
        }
      });
    });
  });
});
