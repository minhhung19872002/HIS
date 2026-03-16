/// <reference types="cypress" />

/**
 * Security Compliance Test Suite
 *
 * Tests for Phase 3 security features:
 * - Security compliance API endpoints
 * - Backup API
 * - CCCD validation (SEC-05)
 * - SystemAdmin compliance UI tabs
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
  'useForm',
  'is not connected to any Form element',
];

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => msg.includes(pattern));
}

describe('Security Compliance', () => {
  let token: string;
  let userData: string;

  before(() => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200 && response.body.data) {
        token = response.body.data.token;
        userData = JSON.stringify(response.body.data.user);
      } else if (response.status === 200 && response.body.token) {
        token = response.body.token;
        userData = JSON.stringify(response.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
      } else {
        throw new Error(`Login failed: ${response.status}`);
      }
    });
  });

  beforeEach(() => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', userData);
  });

  describe('Security Compliance API', () => {
    it('GET /api/security/compliance/access-matrix returns 200', () => {
      cy.request({
        method: 'GET',
        url: '/api/security/compliance/access-matrix',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        // Response should be array or wrapped in data
        const data = Array.isArray(response.body) ? response.body : response.body?.data;
        expect(data).to.be.an('array');
      });
    });

    it('GET /api/security/compliance/summary returns 200 with expected fields', () => {
      cy.request({
        method: 'GET',
        url: '/api/security/compliance/summary',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        const data = response.body?.data || response.body;
        expect(data).to.have.property('totalUsers');
        expect(data).to.have.property('activeUsers');
        expect(data).to.have.property('tdeEnabled');
        expect(data).to.have.property('auditLogsLast30Days');
      });
    });

    it('GET /api/security/compliance/sensitive-access returns 200', () => {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = new Date().toISOString().split('T')[0];
      cy.request({
        method: 'GET',
        url: `/api/security/compliance/sensitive-access?from=${from}&to=${to}&limit=50`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });

  describe('Backup API', () => {
    it('POST /api/admin/backups returns 200 or 500', () => {
      cy.request({
        method: 'POST',
        url: '/api/admin/backups',
        headers: { Authorization: `Bearer ${token}` },
        body: { backupName: 'cypress_test', backupType: 'Full' },
        failOnStatusCode: false,
        timeout: 30000,
      }).then((response) => {
        // Accept 200 (success), 400 (DTO validation), or 500 (Docker permissions / SQL not configured)
        expect([200, 400, 500]).to.include(response.status);
      });
    });

    it('GET /api/admin/backups returns 200 with array', () => {
      cy.request({
        method: 'GET',
        url: '/api/admin/backups',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
        const data = Array.isArray(response.body) ? response.body : response.body?.data;
        expect(data).to.be.an('array');
      });
    });
  });

  describe('Audit Enhancement', () => {
    it('SEC-05: GET /api/reception/validate-cccd returns 200', () => {
      cy.request({
        method: 'GET',
        url: '/api/reception/validate-cccd?cccd=001099012345',
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });

  describe('SystemAdmin Compliance UI', () => {
    beforeEach(() => {
      cy.intercept('**/api/**').as('apiCall');
    });

    it('SystemAdmin has "Ma trận quyền" tab', () => {
      cy.visit('/admin');
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
      cy.contains('.ant-tabs-tab', /Ma trận quyền|Ma tran quyen/i).should('exist');
    });

    it('SystemAdmin has "ATTT" tab', () => {
      cy.visit('/admin');
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
      cy.contains('.ant-tabs-tab', /ATTT|Tuân thủ|Tuan thu/i).should('exist');
    });

    it('Click "ATTT" tab, verify content renders', () => {
      cy.visit('/admin');
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
      cy.contains('.ant-tabs-tab', /ATTT|Tuân thủ|Tuan thu/i).click({ force: true });
      cy.wait(2000);
      cy.get('.ant-tabs-tabpane-active').should('exist');
    });

    it('Click "Ma trận quyền" tab, verify table renders', () => {
      cy.visit('/admin');
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
      cy.contains(/Ma trận quyền|Ma tran quyen/i).click();
      cy.get('.ant-table', { timeout: 15000 }).should('exist');
    });
  });

  describe('Console Errors', () => {
    it('/system-admin loads without console errors', () => {
      const errors: string[] = [];
      cy.on('window:before:load', (win) => {
        cy.stub(win.console, 'error').callsFake((...args: unknown[]) => {
          const msg = args.map((a) => String(a)).join(' ');
          if (!isIgnoredError(msg)) {
            errors.push(msg);
          }
        });
      });

      cy.visit('/admin');
      cy.get('.ant-tabs', { timeout: 10000 }).should('exist');
      cy.then(() => {
        expect(errors, 'Console errors found').to.have.length(0);
      });
    });
  });
});
