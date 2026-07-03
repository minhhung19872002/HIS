/// <reference types="cypress" />
// TEMPLATE — HIS Cypress page-load smoke. Copy into frontend/cypress/e2e/<feature>-pages.cy.ts

const PAGES = [
  { path: '/v2/x-name',  name: 'X Name' },
  // ...add the v2 routes to smoke
];

const IGNORE_PATTERNS = [
  /useForm/, /\[antd:/, /not connected to any Form/, /SignalR/i,
  /\[HMR\]/, /\[vite\]/, /WebSocket/, /findDOMNode/,
];

describe('<Feature> — page load smoke', () => {
  beforeEach(() => {
    cy.intercept('**/api/**').as('api');                 // ONLY /api — NOT **/*
    cy.request({
      method: 'POST',
      url: 'http://localhost:5106/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then((resp) => {
      const token = resp.body?.data?.token;              // token is at data.data.token
      if (token) {
        cy.window().then((win) => {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify({
            username: 'admin', fullName: 'Administrator',
            roles: ['Admin'], permissions: ['*'],
          }));
        });
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
      cy.then(() => { expect(errors, `console errors on ${p.path}`).to.have.length(0); });
    });
  });

  it('Backend endpoints respond (< 500 unless validation)', () => {
    cy.request({ method: 'POST', url: 'http://localhost:5106/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' } }).then((r) => {
      const auth = { Authorization: `Bearer ${r.body.data.token}` };
      ['/x', '/x/types'].forEach((ep) => {
        cy.request({ method: 'GET', url: `http://localhost:5106/api${ep}`,
          headers: auth, failOnStatusCode: false }).then((resp) => {
          expect(resp.status, `${ep}`).to.be.lessThan(500);
        });
      });
    });
  });
});
