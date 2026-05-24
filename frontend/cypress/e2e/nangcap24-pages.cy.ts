/// <reference types="cypress" />

const PAGES = [
  { path: '/v2/bank-payments',         name: 'Bank Payments (5 NH)' },
  { path: '/v2/biometric-enrollment',  name: 'Biometric Enrollment' },
  { path: '/v2/emr-hl7-export',        name: 'EMR HL7 Export' },
  { path: '/v2/emr-cloud-sync',        name: 'EMR Cloud Sync' },
  { path: '/v2/dicom-autosend',        name: 'DICOM Auto Send' },
  { path: '/v2/hl7-message-queue',     name: 'HL7 Queue' },
  { path: '/v2/dicom-study-audit-log', name: 'DICOM Study Log' },
];

const IGNORE_PATTERNS = [
  /useForm/, /\[antd:/, /not connected to any Form/, /SignalR/i,
  /\[HMR\]/, /\[vite\]/, /WebSocket/, /findDOMNode/,
];

describe('NangCap24 — 10 gap HSMT BV Đa khoa', () => {
  beforeEach(() => {
    cy.intercept('**/api/**').as('api');
    cy.request({
      method: 'POST',
      url: 'http://localhost:5106/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status === 200) {
        const data = resp.body;
        const token = data?.data?.token || data?.token;
        if (token) {
          cy.window().then((win) => {
            win.localStorage.setItem('token', token);
            win.localStorage.setItem('user', JSON.stringify({
              id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
              username: 'admin',
              fullName: 'Administrator',
              roles: ['Admin'],
              permissions: ['*'],
            }));
          });
        }
      }
    });
  });

  PAGES.forEach((p) => {
    it(`${p.name} loads without console errors`, () => {
      const errors: string[] = [];
      cy.on('window:before:load', (win) => {
        cy.stub(win.console, 'error').callsFake((...args) => {
          const msg = args.map(String).join(' ');
          if (!IGNORE_PATTERNS.some((re) => re.test(msg))) errors.push(msg);
        });
      });
      cy.visit(p.path, { timeout: 30000 });
      cy.wait(2500);
      cy.then(() => {
        if (errors.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(`Console errors on ${p.path}:`, errors);
        }
        expect(errors).to.have.length(0);
      });
    });
  });

  it('Bank list API returns 5 banks', () => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5106/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    }).then((r) => {
      const token = r.body?.data?.token;
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/payment/bank/list',
        headers: { Authorization: `Bearer ${token}` },
      }).then((banks) => {
        expect(banks.status).to.eq(200);
        expect(banks.body).to.have.length(5);
        const codes = banks.body.map((b: any) => b.code).sort();
        expect(codes).to.deep.eq(['agribank', 'bidv', 'msb', 'vcb', 'vietinbank']);
      });
    });
  });

  it('Inspector portal renders standalone login', () => {
    cy.visit('/inspector-portal');
    cy.wait(1500);
    cy.get('[data-testid="inspector-login-card"]').should('be.visible');
    cy.get('[data-testid="inspector-username"]').should('be.visible');
    cy.get('[data-testid="inspector-password"]').should('be.visible');
    cy.get('[data-testid="inspector-login-btn"]').should('be.visible');
  });

  it('Inspector portal login flow', () => {
    cy.visit('/inspector-portal');
    cy.wait(1500);
    cy.get('[data-testid="inspector-username"]').type('inspector');
    cy.get('[data-testid="inspector-password"]').type('Inspector@123');
    cy.get('[data-testid="inspector-login-btn"]').click();
    cy.wait(2500);
    cy.contains(/CỔNG GIÁM ĐỊNH BHXH/i).should('be.visible');
  });

  it('HL7 Queue API responds', () => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5106/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    }).then((r) => {
      const token = r.body?.data?.token;
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/hl7-queue?pageIndex=1&pageSize=10',
        headers: { Authorization: `Bearer ${token}` },
      }).then((qResp) => {
        expect(qResp.status).to.eq(200);
        expect(qResp.body).to.have.property('items');
        expect(qResp.body).to.have.property('totalCount');
      });
    });
  });

  it('Backend NangCap24 endpoints all respond', () => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5106/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    }).then((loginR) => {
      const token = loginR.body?.data?.token;
      const auth = { Authorization: `Bearer ${token}` };
      const endpoints = [
        '/api/payment/bank/list',
        '/api/inspector-portal/accounts',
        '/api/emr/cloud-sync/status',
        '/api/emr/cloud-sync/logs',
        '/api/dicom-autosend/rules',
        '/api/dicom-autosend/transmissions',
        '/api/hl7-queue',
        '/api/dicom-study-log',
      ];
      endpoints.forEach((ep) => {
        cy.request({
          method: 'GET',
          url: `http://localhost:5106${ep}`,
          headers: auth,
          failOnStatusCode: false,
        }).then((resp) => {
          expect(resp.status, `${ep} status`).to.be.lessThan(500);
        });
      });
    });
  });
});
