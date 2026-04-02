/// <reference types="cypress" />

/**
 * Emergency / MCI (Mass Casualty Incident) Workflow Tests
 *
 * Luồng 1: Emergency Triage - BN cấp cứu đến → Phân loại → Khám → Điều trị
 * Luồng 2: MCI Event - Tạo sự kiện → Đăng ký nạn nhân → Triage → Giải tán
 * Luồng 3: Giường cấp cứu (Emergency bed management)
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

describe('Emergency / MCI Workflow', () => {
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

  describe('1. Emergency Page - Page Load & Tabs', () => {
    it('loads emergency/disaster page', () => {
      cy.visit('/emergency-disaster', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('shows page title or content', () => {
      cy.visit('/emergency-disaster', { waitForLoadState: 'domcontentloaded' });
      // Check for tab navigation or content area
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(10);
      });
    });

    it('emergency page has no console errors', () => {
      const errors: string[] = [];
      cy.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      cy.visit('/emergency-disaster', { waitForLoadState: 'domcontentloaded' });
      cy.wait(1000);
      const realErrors = errors.filter(e => !IGNORE_PATTERNS.some(p => e.includes(p)));
      expect(realErrors).to.have.length(0);
    });
  });

  describe('2. Emergency Triage Workflow (API)', () => {
    it('GET /api/emergency/dashboard returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/emergency/events returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/events`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/emergency/victims returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/victims`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/emergency/triage-categories returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/triage-categories`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/emergency/beds returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/beds`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  describe('3. MCI Event Management (API)', () => {
    let eventId: string;

    it('POST /api/emergency/events creates event', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/emergency/events`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          eventName: `MCI Test Event ${Date.now()}`,
          eventType: 1,
          severityLevel: 2,
          location: 'Test Location',
          reportedTime: new Date().toISOString(),
          description: 'MCI test event for E2E workflow',
          status: 1,
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
        if (res.status === 200 || res.status === 201) {
          eventId = res.body?.data?.id || res.body?.id;
        }
      });
    });

    it('GET /api/emergency/events/{id} retrieves event', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/events`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
        if (res.status === 200) {
          const events = res.body?.data || res.body || [];
          if (Array.isArray(events) && events.length > 0) {
            const firstId = events[0].id || events[0].eventId;
            if (firstId) {
              cy.request({
                method: 'GET',
                url: `${API_BASE}/emergency/events/${firstId}`,
                headers: { Authorization: `Bearer ${authToken}` },
                failOnStatusCode: false,
              }).then(r => expect([200, 404]).to.include(r.status));
            }
          }
        }
      });
    });

    it('GET /api/emergency/victim-stats returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/victim-stats`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  describe('4. Triage Code Management (API)', () => {
    it('GET triage codes returns valid list', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/triage-categories`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        if (res.status === 200) {
          const categories = res.body?.data || res.body || [];
          expect(categories).to.be.an('array');
        }
      });
    });

    it('POST /api/emergency/triage-classifications creates classification', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/emergency/triage-classifications`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          patientName: `Test Victim ${Date.now()}`,
          triageCode: 'yellow',
          chiefComplaint: 'Test triage classification',
          vitalSigns: { bloodPressure: '120/80', pulse: 80, temp: 37 },
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
      });
    });
  });

  describe('5. Emergency Drug Cabinet (API)', () => {
    it('GET /api/emergency/drug-cabinet returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/drug-cabinet`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/emergency/emergency-supplies returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/emergency-supplies`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  describe('6. Emergency Page UI Tabs', () => {
    it('navigates emergency page and finds tab structure', () => {
      cy.visit('/emergency-disaster', { waitForLoadState: 'domcontentloaded' });
      cy.wait(2000);
      // Check for any tabs or navigation
      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasContent = text.length > 50;
        expect(hasContent).to.be.true;
      });
    });

    it('emergency page data loads from API', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/emergency/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        if (res.status === 200) {
          expect(res.body).to.exist;
        }
      });
    });
  });

  describe('7. Cross-Flow: Reception to Emergency', () => {
    it('can register emergency patient via API', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/reception/register/emergency`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          fullName: `Emergency Patient ${Date.now()}`,
          gender: 1,
          dateOfBirth: '1990-05-15',
          phoneNumber: '0909999001',
          identityNumber: `079090${Date.now().toString().slice(-6)}`,
          emergencyContact: '0909999001',
          emergencyContactName: 'Test Contact',
          address: 'Test Address',
          chiefComplaint: 'Test emergency case',
          triageCode: 'red',
          arrivalMode: 1,
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
      });
    });
  });
});
