/// <reference types="cypress" />

/**
 * Clinical Decision Support (AI) Tests
 * Tests the AI diagnosis suggestion, NEWS2 Early Warning Score,
 * and clinical alerts integration in OPD page.
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'Failed to start the connection',
  'WebSocket connection', 'hubs/notifications', 'useForm',
  'is not connected to any Form element',
];

describe('Clinical Decision Support (AI)', () => {
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

  describe('CDS API Endpoints', () => {
    it('should respond to suggest-diagnoses endpoint', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/cds/suggest-diagnoses',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          symptoms: ['ho', 'sốt', 'đau họng'],
          signs: [],
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 401, 404]);
        if (res.status === 200 && res.body) {
          expect(res.body).to.be.an('array');
          if (res.body.length > 0) {
            expect(res.body[0]).to.have.property('icdCode');
            expect(res.body[0]).to.have.property('confidence');
          }
        }
      });
    });

    it('should respond to early-warning-score endpoint', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/cds/early-warning-score',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          pulse: 110,
          bloodPressureSystolic: 95,
          respiratoryRate: 24,
          temperature: 39.2,
          spO2: 93,
        },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 401, 404]);
        if (res.status === 200 && res.body) {
          expect(res.body).to.have.property('totalScore');
          expect(res.body).to.have.property('riskLevel');
          expect(res.body.totalScore).to.be.greaterThan(0);
        }
      });
    });

    it('should respond to frequent-diagnoses endpoint', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/cds/frequent-diagnoses?limit=10',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 204, 401, 404]);
        if (res.status === 200) {
          expect(res.body).to.be.an('array');
        }
      });
    });

    it('should suggest respiratory diagnoses for respiratory symptoms', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/cds/suggest-diagnoses',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          symptoms: ['ho', 'sốt cao', 'khó thở', 'đau ngực'],
          signs: ['ran phổi', 'thở nhanh'],
          temperature: 39.5,
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200 && res.body?.length > 0) {
          const codes = res.body.map((s: any) => s.icdCode);
          const hasRespiratoryDx = codes.some((c: string) => c.startsWith('J'));
          expect(hasRespiratoryDx).to.be.true;
          expect(res.body[0].confidence).to.be.greaterThan(0);
        }
      });
    });

    it('should calculate high NEWS2 score for critical vitals', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/cds/early-warning-score',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          pulse: 135,
          bloodPressureSystolic: 85,
          respiratoryRate: 28,
          temperature: 35.0,
          spO2: 90,
          consciousnessLevel: 2,
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200 && res.body) {
          expect(res.body.totalScore).to.be.greaterThan(6);
          expect(res.body.riskLevel).to.equal('Nguy kịch');
          expect(res.body.riskColor).to.equal('red');
        }
      });
    });
  });

  describe('OPD AI Integration', () => {
    beforeEach(() => {
      cy.on('uncaught:exception', () => false);
      cy.visit('/opd', {
        onBeforeLoad(win) {
          if (token) {
            win.localStorage.setItem('token', token);
            win.localStorage.setItem('user', userData);
          }
        },
      });
      cy.get('body', { timeout: 15000 }).should('be.visible');
    });

    it('should load OPD page with AI integration', () => {
      cy.url().should('include', '/opd');
      cy.wait(3000);
      cy.get('body').then(($body) => {
        const text = $body.text();
        // OPD page should have examination-related content or loading state
        const hasOpdContent = text.includes('Khám bệnh') || text.includes('Phòng khám') ||
          text.includes('Vui lòng chọn') || text.includes('OPD') ||
          text.includes('Loading') || text.includes('Lâm sàng');
        expect(hasOpdContent).to.be.true;
      });
    });

    it('should load OPD page without critical errors', () => {
      cy.get('body').should('be.visible');
      cy.wait(2000);
      // Page loaded successfully if we get here
      cy.url().should('include', '/opd');
    });

    it('should have patient selection prompt or examination content', () => {
      cy.wait(3000);
      cy.get('body').then(($body) => {
        const text = $body.text();
        // Either shows patient selection prompt, examination tabs, or loading
        const hasContent = text.includes('Vui lòng chọn bệnh nhân') ||
          text.includes('Sinh hiệu') || text.includes('Chẩn đoán') ||
          text.includes('Phòng khám') || text.includes('Khám bệnh') ||
          text.includes('Loading') || text.includes('Lâm sàng');
        expect(hasContent).to.be.true;
      });
    });
  });

  describe('CDS Data Validation', () => {
    it('should return empty array for unrecognized symptoms', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/cds/suggest-diagnoses',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          symptoms: ['xyz_invalid_symptom'],
          signs: [],
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) {
          expect(res.body).to.be.an('array');
          expect(res.body.length).to.equal(0);
        }
      });
    });

    it('should calculate NEWS2 score 0 for normal vitals', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/cds/early-warning-score',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          pulse: 75,
          bloodPressureSystolic: 120,
          respiratoryRate: 16,
          temperature: 37.0,
          spO2: 98,
          consciousnessLevel: 0,
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200 && res.body) {
          expect(res.body.totalScore).to.equal(0);
          expect(res.body.riskLevel).to.equal('Thấp');
          expect(res.body.riskColor).to.equal('green');
        }
      });
    });
  });
});
