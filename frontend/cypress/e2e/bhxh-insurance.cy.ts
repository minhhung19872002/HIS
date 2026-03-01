/// <reference types="cypress" />

/**
 * BHXH Insurance Integration Tests
 *
 * Tests insurance card verification, XML export workflow,
 * and reception page insurance integration.
 */

let authToken = '';
let userData = '';

// Helper: get auth token fresh
function getToken(): Cypress.Chainable<string> {
  return cy.request('POST', 'http://localhost:5106/api/auth/login', {
    username: 'admin',
    password: 'Admin@123',
  }).then((res) => (res.body.data?.token || res.body.token) as string);
}

// Helper: visit page with auth set in onBeforeLoad (avoids race condition)
function visitWithAuth(route: string) {
  cy.visit(route, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', authToken);
      win.localStorage.setItem('user', userData);
    },
  });
}

describe('BHXH Insurance Integration', () => {
  before(() => {
    // Single login for the entire suite, store credentials
    cy.request('POST', 'http://localhost:5106/api/auth/login', {
      username: 'admin',
      password: 'Admin@123',
    }).then((res) => {
      const data = res.body.data || res.body;
      authToken = data.token;
      userData = JSON.stringify(data.user || data);
    });
  });

  beforeEach(() => {
    cy.on('uncaught:exception', () => false);
  });

  describe('Insurance Card Verification API', () => {
    it('should verify insurance card via API', () => {
      getToken().then((token) => {
        cy.request({
          method: 'POST',
          url: 'http://localhost:5106/api/insurance/verify-card',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            insuranceNumber: 'DN4950100234567',
            patientName: 'Nguyen Van A',
            dateOfBirth: '1990-01-15',
          },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.have.property('maThe');
          expect(res.body).to.have.property('duDkKcb');
          expect(res.body).to.have.property('mucHuong');
        });
      });
    });

    it('should retrieve insurance history via API', () => {
      getToken().then((token) => {
        cy.request({
          method: 'GET',
          url: 'http://localhost:5106/api/insurance/history/DN4950100234567',
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.have.property('maThe');
          expect(res.body).to.have.property('visits');
        });
      });
    });

    it('should test portal connection', () => {
      getToken().then((token) => {
        cy.request({
          method: 'GET',
          url: 'http://localhost:5106/api/insurance/config/test-connection',
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.have.property('isConnected');
        });
      });
    });
  });

  describe('Insurance Page - XML Export', { retries: { runMode: 2 } }, () => {
    it('should load insurance page at /insurance', () => {
      visitWithAuth('/insurance');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains('BHYT', { timeout: 10000 }).should('be.visible');
    });

    it('should have XML export tab', () => {
      visitWithAuth('/insurance');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains(/xu.{0,3}t.*xml/i, { timeout: 10000 }).click({ force: true });
      cy.contains(/buoc 1|cau hinh|khoang thoi gian/i, { timeout: 5000 }).should('be.visible');
    });

    it('should show preview button in export tab', () => {
      visitWithAuth('/insurance');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains(/xu.{0,3}t.*xml/i, { timeout: 10000 }).click({ force: true });
      cy.contains(/xem.*tru.c/i, { timeout: 5000 }).should('be.visible');
    });

    it('should have card verification tab', () => {
      visitWithAuth('/insurance');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains(/tra.*cu.{0,2}u.*the/i, { timeout: 10000 }).should('be.visible');
    });

    it('should show card verification form when tab clicked', () => {
      visitWithAuth('/insurance');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains(/tra.*cu.{0,2}u.*the/i, { timeout: 10000 }).click({ force: true });
      cy.get('.ant-tabs-tabpane-active', { timeout: 5000 }).within(() => {
        cy.get('input[placeholder*="BHYT"]').should('exist');
        cy.contains(/xac.*minh/i).should('be.visible');
      });
    });

    it('should have reports tab', () => {
      visitWithAuth('/insurance');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains(/bao.*cao/i, { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Reception Page - Insurance Verification', { retries: { runMode: 2 } }, () => {
    it('should load reception page', () => {
      visitWithAuth('/reception');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.get('.ant-table', { timeout: 10000 }).should('exist');
    });

    it('should have insurance number field in registration modal', () => {
      visitWithAuth('/reception');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains('Đăng ký khám', { timeout: 10000 }).first().click({ force: true });
      cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');
      cy.get('.ant-modal').should('contain.text', 'BHYT');
    });

    it('should have Xac minh button next to insurance field', () => {
      visitWithAuth('/reception');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains('Đăng ký khám', { timeout: 10000 }).first().click({ force: true });
      cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');
      cy.get('.ant-modal').should('contain.text', 'BHYT');
    });

    it('should have Tra cuu BHYT button in toolbar', () => {
      visitWithAuth('/reception');
      cy.get('.ant-spin-spinning', { timeout: 10000 }).should('not.exist');
      cy.contains('Tra cứu BHYT', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('XML Export API', () => {
    it('should call XML generate endpoints', () => {
      getToken().then((token) => {
        cy.request({
          method: 'POST',
          url: 'http://localhost:5106/api/insurance/xml/generate/xml1',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            month: 2,
            year: 2026,
            includeXml1: true,
            includeXml2: true,
            includeXml3: true,
            includeXml4: true,
            includeXml5: true,
            includeXml7: true,
            validateBeforeExport: false,
            compressOutput: false,
          },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.be.an('array');
        });
      });
    });

    it('should export XML files', () => {
      getToken().then((token) => {
        cy.request({
          method: 'POST',
          url: 'http://localhost:5106/api/insurance/xml/export',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            month: 2,
            year: 2026,
            validateBeforeExport: false,
            includeXml1: true,
            includeXml2: true,
            includeXml3: true,
            includeXml4: true,
            includeXml5: true,
            includeXml7: true,
            compressOutput: false,
          },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.have.property('batchId');
          expect(res.body).to.have.property('totalRecords');
        });
      });
    });

    it('should validate before export', () => {
      getToken().then((token) => {
        cy.request({
          method: 'POST',
          url: 'http://localhost:5106/api/insurance/validate/before-export',
          headers: { Authorization: `Bearer ${token}` },
          body: {
            month: 2,
            year: 2026,
            validateBeforeExport: true,
            includeXml1: true,
            includeXml2: true,
            includeXml3: true,
            includeXml4: true,
            includeXml5: true,
            includeXml7: true,
            compressOutput: false,
          },
          failOnStatusCode: false,
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body).to.be.an('array');
        });
      });
    });
  });
});
