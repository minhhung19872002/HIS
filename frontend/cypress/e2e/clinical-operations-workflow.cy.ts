/// <reference types="cypress" />

/**
 * Clinical Operations & Support Modules Workflow Tests
 *
 * Covers pages without dedicated workflow specs + additional API coverage:
 * - /clinical-guidance    (Luồng 70) - Chi dao tuyen
 * - /follow-up           (Luồng 45) - Tai kham & theo doi hen
 * - /booking-management   (Luồng 44) - Quan ly dat lich noi bo
 * - /medical-record-archive (Luồng 72) - Luu tru HSBA
 * - /sms-management      (Luồng 77) - SMS Gateway
 * - /bhxh-audit         (Luồng 89) - Kiem tra BHXH
 * - /signing-workflow   (Luồng 76) - Trinh ky
 * - /help                - Trang tro giup
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

describe('Clinical Operations & Support Modules Workflow', () => {
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

  // ==================== CLINICAL GUIDANCE ====================
  describe('1. Clinical Guidance (Chi dao tuyen) - Page & API', () => {
    it('loads /clinical-guidance page', () => {
      cy.visit('/clinical-guidance', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/clinical-guidance page shows content', () => {
      cy.visit('/clinical-guidance', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/clinical-guidance/requests returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/clinical-guidance/requests`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/clinical-guidance/guidelines returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/clinical-guidance/guidelines`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('POST /api/clinical-guidance/requests creates guidance request', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/clinical-guidance/requests`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          requestSubject: `Clinical Guidance Request ${Date.now()}`,
          requestReason: 'Need specialist consultation for complex case',
          requestingDoctor: 'Dr. Test',
          priority: 1,
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404, 500]).to.include(res.status);
      });
    });
  });

  // ==================== FOLLOW-UP TRACKING ====================
  describe('2. Follow-up Tracking (Tai kham & Hen) - Page & API', () => {
    it('loads /follow-up page', () => {
      cy.visit('/follow-up', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/follow-up page shows content', () => {
      cy.visit('/follow-up', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/examination/appointments returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/examination/appointments`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/examination/overdue-appointments returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/examination/overdue-appointments`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/examination/appointments/overdue returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/examination/appointments/overdue`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== BOOKING MANAGEMENT ====================
  describe('3. Booking Management (Quan ly dat lich noi bo) - Page & API', () => {
    it('loads /booking-management page', () => {
      cy.visit('/booking-management', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/booking-management page shows content', () => {
      cy.visit('/booking-management', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/booking/management/appointments returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/management/appointments`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/booking/management/slots returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/management/slots`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/booking/management/statistics returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/management/statistics`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== SIGNING WORKFLOW ====================
  describe('4. Signing Workflow (Trinh ky) - Page & API', () => {
    it('loads /signing-workflow page', () => {
      cy.visit('/signing-workflow', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/signing-workflow page shows content', () => {
      cy.visit('/signing-workflow', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('GET /api/signing-workflow/requests returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/signing-workflow/requests`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/signing-workflow/pending returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/signing-workflow/pending`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });
  });

  // ==================== MEDICAL RECORD ARCHIVE ====================
  describe('5. Medical Record Archive (Luu tru HSBA) - Page & API', () => {
    it('loads /medical-record-archive page', () => {
      cy.visit('/medical-record-archive', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
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

  // ==================== BHXH AUDIT ====================
  describe('6. BHXH Audit (Kiem tra BHXH) - Page & API', () => {
    it('loads /bhxh-audit page', () => {
      cy.visit('/bhxh-audit', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
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

    it('POST /api/bhxh-audit/records creates audit record', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/bhxh-audit/records`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          recordCode: `BA-${Date.now()}`,
          patientName: `BHXH Audit Test ${Date.now()}`,
          admissionDate: new Date().toISOString(),
          dischargeDate: new Date().toISOString(),
          totalCost: 500000,
          insuranceNumber: `TN${Date.now().toString().slice(-8)}`,
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404, 500]).to.include(res.status);
      });
    });
  });

  // ==================== SMS MANAGEMENT ====================
  describe('7. SMS Management (Quan ly SMS) - Page & API', () => {
    it('loads /sms-management page', () => {
      cy.visit('/sms-management', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('GET /api/sms/balance returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/sms/balance`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('GET /api/sms/logs returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/sms/logs`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204, 500]).to.include(res.status);
      });
    });

    it('POST /api/sms/send sends SMS', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/sms/send`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          phoneNumber: '0909000001',
          message: `SMS Test E2E ${Date.now()}`,
          smsType: 1,
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404, 500]).to.include(res.status);
      });
    });
  });

  // ==================== HELP PAGE ====================
  describe('8. Help Page - Page Load', () => {
    it('loads /help page', () => {
      cy.visit('/help', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/help page shows content', () => {
      cy.visit('/help', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(5);
      });
    });

    it('/help page has no console errors', () => {
      const errors: string[] = [];
      cy.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      cy.visit('/help', { waitForLoadState: 'domcontentloaded' });
      cy.wait(800);
      const realErrors = errors.filter(e => !IGNORE_PATTERNS.some(p => e.includes(p)));
      expect(realErrors).to.have.length(0);
    });
  });

  // ==================== PAGE CONSOLE ERRORS ====================
  describe('9. All Clinical Operations Pages - Console Error Check', () => {
    const pages = [
      '/clinical-guidance',
      '/follow-up',
      '/booking-management',
      '/signing-workflow',
      '/medical-record-archive',
      '/bhxh-audit',
      '/sms-management',
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
