/// <reference types="cypress" />

describe('HIV Management Regression', () => {
  it('loads the HIV management dashboard without backend contract errors', () => {
    const user = {
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: [],
    };

    cy.request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'Admin@123',
    }).then((response) => {
      const token = response.body?.data?.token;
      expect(response.status).to.eq(200);
      expect(token).to.be.a('string').and.not.be.empty;

      cy.visit('/hiv-management', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify(user));
        },
      });

      cy.contains(/quan ly hiv\/aids/i, { timeout: 20000 }).should('be.visible');
      cy.contains(/bn dang theo doi/i).should('be.visible');
      cy.contains(/dang art/i).should('be.visible');
      cy.contains(/uc che virus/i).should('be.visible');
      cy.contains(/pmtct/i).should('be.visible');
      cy.contains(/danh sach bn/i).should('be.visible');
      cy.contains(/ma hiv/i).should('be.visible');
      cy.contains(/ho ten/i).should('be.visible');

      const authHeaders = {
        Authorization: `Bearer ${token}`,
      };

      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/hiv-management/patients',
        headers: authHeaders,
      }).its('status').should('eq', 200);

      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/hiv-management/patients/stats',
        headers: authHeaders,
      }).its('status').should('eq', 200);

      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/hiv-management/pmtct/stats',
        headers: authHeaders,
      }).its('status').should('eq', 200);
    });
  });
});
