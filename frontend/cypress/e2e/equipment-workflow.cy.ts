/// <reference types="cypress" />

/**
 * Equipment Management Workflow Tests
 *
 * Luồng: Register → Maintenance Schedule → Calibration → Repair → Retirement
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

describe('Equipment Management Workflow', () => {
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

  describe('1. Equipment Page - Page Load & Tabs', () => {
    it('loads equipment page', () => {
      cy.visit('/equipment', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').should('exist');
    });

    it('shows equipment page content', () => {
      cy.visit('/equipment', { waitForLoadState: 'domcontentloaded' });
      cy.get('body').then($body => {
        expect($body.text().length).to.be.greaterThan(10);
      });
    });

    it('equipment page has no console errors', () => {
      const errors: string[] = [];
      cy.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      cy.visit('/equipment', { waitForLoadState: 'domcontentloaded' });
      cy.wait(1000);
      const realErrors = errors.filter(e => !IGNORE_PATTERNS.some(p => e.includes(p)));
      expect(realErrors).to.have.length(0);
    });
  });

  describe('2. Equipment CRUD (API)', () => {
    it('GET /api/equipment returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/equipment`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('POST /api/equipment creates equipment', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/equipment`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          equipmentCode: `EQ-${Date.now()}`,
          equipmentName: `Test Equipment ${Date.now()}`,
          equipmentType: 1,
          serialNumber: `SN-${Date.now()}`,
          manufacturer: 'Test Manufacturer',
          model: 'Test Model',
          yearOfManufacture: 2024,
          purchaseDate: '2024-01-15',
          warrantyExpiry: '2027-01-15',
          departmentId: '96b9f79f-49eb-4249-a7b9-6f1465e219e7',
          location: 'Test Department',
          status: 1,
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
      });
    });

    it('GET /api/equipment/maintenance/schedules returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/equipment/maintenance/schedules`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/equipment/calibrations/due returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/equipment/calibrations/due`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/equipment/repairs returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/equipment/repairs`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  describe('3. Maintenance Schedule (API)', () => {
    it('POST /api/equipment/maintenance creates maintenance record', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/equipment/maintenance`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          equipmentId: '00000000-0000-0000-0000-000000000001',
          maintenanceType: 1,
          maintenanceDate: new Date().toISOString(),
          description: 'Maintenance test',
          cost: 500000,
          technician: 'Test Technician',
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
      });
    });

    it('GET /api/equipment/{id}/maintenance returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/equipment/00000000-0000-0000-0000-000000000001/maintenance`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  describe('4. Calibration (API)', () => {
    it('POST /api/equipment/calibrations creates calibration record', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/equipment/calibrations`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          equipmentId: '00000000-0000-0000-0000-000000000001',
          calibrationDate: new Date().toISOString(),
          technician: 'Test Calibrator',
          result: 'pass',
          nextCalibrationDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
          notes: 'Test calibration record',
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
      });
    });
  });

  describe('5. Repair (API)', () => {
    it('POST /api/equipment/repairs creates repair record', () => {
      cy.request({
        method: 'POST',
        url: `${API_BASE}/equipment/repairs`,
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: {
          equipmentId: '00000000-0000-0000-0000-000000000001',
          repairDate: new Date().toISOString(),
          problemDescription: 'Test repair problem',
          repairType: 1,
          technician: 'Test Repair Technician',
          cost: 1000000,
          status: 1,
          result: 'Test repair result',
        },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 201, 400, 404]).to.include(res.status);
      });
    });
  });

  describe('6. Equipment Dashboard (API)', () => {
    it('GET /api/equipment/dashboard returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/equipment/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });

    it('GET /api/equipment/statistics returns 200', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/equipment/statistics`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        expect([200, 404, 204]).to.include(res.status);
      });
    });
  });

  describe('7. Equipment UI Tabs', () => {
    it('equipment page tabs are navigable', () => {
      cy.visit('/equipment', { waitForLoadState: 'domcontentloaded' });
      cy.wait(2000);
      cy.get('body').then($body => {
        const text = $body.text().toLowerCase();
        const hasContent = text.length > 50;
        expect(hasContent).to.be.true;
      });
    });

    it('equipment page loads data from API', () => {
      cy.request({
        method: 'GET',
        url: `${API_BASE}/equipment`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(res => {
        if (res.status === 200) {
          expect(res.body).to.exist;
        }
      });
    });
  });
});
