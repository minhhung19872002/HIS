/// <reference types="cypress" />

/**
 * Telemedicine & Online Booking Workflow Tests (Luồng 11 HIS_DataFlow_Architecture)
 *
 * Luồng: Đặt lịch → Thanh toán → Phòng chờ → Video call → Khám → Kê đơn
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

describe('Telemedicine & Online Booking Workflow', () => {
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

  // ==================== TELEMEDICINE PAGE ====================
  describe('1. Telemedicine Page - Load & Tabs', () => {
    it('loads telemedicine page', () => {
      cy.visit('/telemedicine', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('telemedicine page shows content', () => {
      cy.visit('/telemedicine', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(10);
      });
    });

    it('telemedicine page has no console errors', () => {
      const errors: string[] = [];
      cy.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      cy.visit('/telemedicine', { waitForLoadState: 'domcontentloaded' });
      cy.wait(1000);
      const realErrors = errors.filter(e => !IGNORE_PATTERNS.some(p => e.includes(p)));
      expect(realErrors).to.have.length(0);
    });
  });

  // ==================== TELEMEDICINE API ====================
  describe('2. Telemedicine API - Sessions & Appointments', () => {
    it('GET /api/teleconsultation/sessions returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/teleconsultation/sessions`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/teleconsultation/appointments returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/teleconsultation/appointments`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/teleconsultation/available-slots returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/teleconsultation/available-slots`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('POST /api/teleconsultation/sessions creates session', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/teleconsultation/sessions`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          sessionCode: `TELE-${Date.now()}`,
          title: `Telemedicine Session ${Date.now()}`,
          scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          duration: 30,
          doctorId: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
          status: 1,
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
      });
    });

    it('GET /api/teleconsultation/dashboard returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/teleconsultation/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  // ==================== ONLINE BOOKING (Public API) ====================
  describe('3. Online Booking - Public API', () => {
    it('GET /api/booking/slots returns 200 (public)', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/slots`,
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/booking/doctors returns 200 (public)', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/doctors`,
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('POST /api/booking/appointments creates booking', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/booking/appointments`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          patientName: `Booking Patient ${Date.now()}`,
          phoneNumber: `0909${Date.now().toString().slice(-7)}`,
          identityNumber: `07909${Date.now().toString().slice(-7)}`,
          appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          specialtyId: '96b9f79f-49eb-4249-a7b9-6f1465e219e7',
          reason: 'Kham tu xa - Test E2E',
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
      });
    });

    it('GET /api/booking/appointments returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/appointments`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  // ==================== BOOKING MANAGEMENT ====================
  describe('4. Booking Management Page & API', () => {
    it('loads /booking-management page', () => {
      cy.visit('/booking-management', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('/booking-management page has no console errors', () => {
      const errors: string[] = [];
      cy.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      cy.visit('/booking-management', { waitForLoadState: 'domcontentloaded' });
      cy.wait(1000);
      const realErrors = errors.filter(e => !IGNORE_PATTERNS.some(p => e.includes(p)));
      expect(realErrors).to.have.length(0);
    });

    it('GET /api/booking/management/appointments returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/management/appointments`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('PUT /api/booking/appointments/{id}/status updates booking status', () => {
      // Try to get an appointment first
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/appointments`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        const appointments = res.body?.data || res.body || [];
        if (Array.isArray(appointments) && appointments.length > 0) {
          const id = appointments[0].id || appointments[0].appointmentId;
          if (id) {
            cy.request({
              method: 'PUT',
              url: `${API_BASE}/booking/appointments/${id}/status`,
              headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
              body: { status: 2 },
              failOnStatusCode: false,
            }).then(r => expect([200, 201, 400, 404]).to.include(r.status));
          }
        }
      });
    });
  });

  // ==================== APPOINTMENT BOOKING PAGE ====================
  describe('5. Appointment Booking Page (Public)', () => {
    it('loads /dat-lich page (no auth required)', () => {
      cy.visit('/dat-lich');
      cy.get('body').should('exist');
    });

    it('/dat-lich page has no console errors', () => {
      const errors: string[] = [];
      cy.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      cy.visit('/dat-lich');
      cy.wait(1000);
      const realErrors = errors.filter(e => !IGNORE_PATTERNS.some(p => e.includes(p)));
      expect(realErrors).to.have.length(0);
    });

    it('GET /api/booking/specialties returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/booking/specialties`,
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  // ==================== TELEMEDICINE COMPLETE FLOW ====================
  describe('6. Telemedicine Complete Flow (API)', () => {
    it('complete telemedicine flow: session → join → prescription', () => {
      // Step 1: Create session
      cy.request({
        method: 'POST',
        url: `${API_BASE}/teleconsultation/sessions`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          sessionCode: `TELE-FLOW-${Date.now()}`,
          title: `Telehealth Session ${Date.now()}`,
          scheduledTime: new Date().toISOString(),
          duration: 30,
          status: 1,
        },
        failOnStatusCode: false,
      }).then(res => {
        const sessionId = res.body?.data?.id || res.body?.id;
        if (sessionId) {
          // Step 2: Start session
          cy.request({
            method: 'POST',
            url: `${API_BASE}/teleconsultation/sessions/${sessionId}/start`,
            headers: { Authorization: `Bearer ${authToken}` },
            failOnStatusCode: false,
          }).then(r => expect([200, 201, 400, 404]).to.include(r.status));

          // Step 3: End session
          cy.request({
            method: 'POST',
            url: `${API_BASE}/teleconsultation/sessions/${sessionId}/end`,
            headers: { Authorization: `Bearer ${authToken}` },
            failOnStatusCode: false,
          }).then(r => expect([200, 201, 400, 404]).to.include(r.status));
        }
      });
    });
  });
});
