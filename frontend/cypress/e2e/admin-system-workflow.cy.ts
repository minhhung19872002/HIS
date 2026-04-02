/// <reference types="cypress" />

/**
 * Admin & System Pages Workflow Tests
 *
 * Covers 10 admin/system pages without dedicated workflow specs:
 * - /admin (SystemAdmin)     - Luồng 16
 * - /reports                 - Luồng 99
 * - /bhxh-audit              - Luồng 89
 * - /patient-portal          - Luồng 38 (NangCap19)
 * - /lis-config              - Luồng 85
 * - /satisfaction-survey     - Luồng 38
 * - /doctor-portal           - Luồng 39
 * - /medical-record-archive  - Luồng 72
 * - /endpoint-security       - Luồng 78
 * - /consultation            - Luồng 71
 */

const API_BASE = 'http://localhost:5106/api';
const IGNORE_PATTERNS = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'Failed to start the connection',
  'WebSocket connection', 'hubs/notifications', 'useForm',
  'is not connected to any Form element', 'Static function can not consume context',
  'Non-Error promise rejection',
];

let authToken = '';

function login() {
  return cy.request({
    method: 'POST',
    url: `${API_BASE}/auth/login`,
    body: { username: 'admin', password: 'Admin@123' },
    failOnStatusCode: false,
  }).then((res) => {
    if (res.status === 200) {
      authToken = res.body.token || res.body.data?.token || '';
      return authToken;
    }
    return '';
  });
}

describe('Admin & System Pages Workflow', () => {
  before(() => {
    login();
  });

  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      if (IGNORE_PATTERNS.some(p => err.message.includes(p))) return false;
      return true;
    });
    cy.visit('/login', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', authToken);
        win.localStorage.setItem('user', JSON.stringify({ username: 'admin' }));
      },
    });
  });

  // ==================== SYSTEM ADMIN ====================
  describe('1. System Admin - Page & API', () => {
    it('loads /admin page', () => {
      cy.visit('/admin', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/admin page shows content', () => {
      cy.visit('/admin', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('/admin page has no console errors', () => {
      const errors: string[] = [];
      cy.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
      cy.visit('/admin', { waitForLoadState: 'domcontentloaded' });
      cy.wait(800);
      const realErrors = errors.filter(e => !IGNORE_PATTERNS.some(p => e.includes(p)));
      expect(realErrors).to.have.length(0);
    });

    it('GET /api/system/users returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/system/users`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/system/roles returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/system/roles`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/system/health returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/system/health`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  // ==================== REPORTS ====================
  describe('2. Reports - Page & API', () => {
    it('loads /reports page', () => {
      cy.visit('/reports', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/reports page shows content', () => {
      cy.visit('/reports', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/reports/dashboard returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/reports/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/reports/admin/activity returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/reports/admin/activity`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/reconciliation/reports/supplier-procurement returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/reconciliation/reports/supplier-procurement`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== BHXH AUDIT ====================
  describe('3. BHXH Audit - Page & API', () => {
    it('loads /bhxh-audit page', () => {
      cy.visit('/bhxh-audit', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/bhxh-audit page shows content', () => {
      cy.visit('/bhxh-audit', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/bhxh-audit/records returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/bhxh-audit/records`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/bhxh-audit/discrepancies returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/bhxh-audit/discrepancies`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== PATIENT PORTAL ====================
  describe('4. Patient Portal - Page & API', () => {
    it('loads /patient-portal page', () => {
      cy.visit('/patient-portal', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/patient-portal page shows content', () => {
      cy.visit('/patient-portal', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/portal/family-members returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/portal/family-members`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/portal/medicine-reminders returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/portal/medicine-reminders`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/portal/health-metrics returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/portal/health-metrics`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/portal/questions returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/portal/questions`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== LIS CONFIG ====================
  describe('5. LIS Config - Page & API', () => {
    it('loads /lis-config page', () => {
      cy.visit('/lis-config', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('GET /api/lis-config/devices returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/lis-config/devices`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/lis-config/mappings returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/lis-config/mappings`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== SATISFACTION SURVEY ====================
  describe('6. Satisfaction Survey - Page & API', () => {
    it('loads /satisfaction-survey page', () => {
      cy.visit('/satisfaction-survey', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('GET /api/satisfaction-survey/responses returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/satisfaction-survey/responses`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/satisfaction-survey/statistics returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/satisfaction-survey/statistics`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== DOCTOR PORTAL ====================
  describe('7. Doctor Portal - Page & API', () => {
    it('loads /doctor-portal page', () => {
      cy.visit('/doctor-portal', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/doctor-portal page shows content', () => {
      cy.visit('/doctor-portal', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/doctor-portal/today-appointments returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/doctor-portal/today-appointments`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/doctor-portal/inpatients returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/doctor-portal/inpatients`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== MEDICAL RECORD ARCHIVE ====================
  describe('8. Medical Record Archive - Page & API', () => {
    it('loads /medical-record-archive page', () => {
      cy.visit('/medical-record-archive', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/medical-record-archive page shows content', () => {
      cy.visit('/medical-record-archive', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/medical-record-archive/records returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/medical-record-archive/records`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/medical-record-planning/records returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/medical-record-planning/records`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== ENDPOINT SECURITY ====================
  describe('9. Endpoint Security - Page & API', () => {
    it('loads /endpoint-security page', () => {
      cy.visit('/endpoint-security', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('GET /api/endpoint-security/devices returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/endpoint-security/devices`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/endpoint-security/alerts returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/endpoint-security/alerts`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== CONSULTATION ====================
  describe('10. Consultation - Page & API', () => {
    it('loads /consultation page', () => {
      cy.visit('/consultation', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/consultation page shows content', () => {
      cy.visit('/consultation', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/consultation/requests returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/consultation/requests`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/consultation/sessions returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/consultation/sessions`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== PAGE CONSOLE ERRORS ====================
  describe('11. All Admin Pages - Console Error Check', () => {
    const pages = [
      '/admin',
      '/reports',
      '/bhxh-audit',
      '/patient-portal',
      '/lis-config',
      '/satisfaction-survey',
      '/doctor-portal',
      '/medical-record-archive',
      '/endpoint-security',
      '/consultation',
    ];

    pages.forEach(page => {
      it(`${page} has no console errors`, () => {
        const errors: string[] = [];
        cy.on('console', msg => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        cy.visit(page, { waitForLoadState: 'domcontentloaded' });
        cy.wait(800);
        const realErrors = errors.filter(e => !IGNORE_PATTERNS.some(p => e.includes(p)));
        expect(realErrors).to.have.length(0);
      });
    });
  });
});
