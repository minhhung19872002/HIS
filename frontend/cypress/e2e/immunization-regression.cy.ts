/// <reference types="cypress" />

describe('Immunization Regression', () => {
  it('loads the immunization dashboard without backend route mismatches', () => {
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

      cy.visit('/immunization', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify(user));
        },
      });

      cy.contains(/tiem chung mo rong|tiêm chủng mở rộng/i, { timeout: 20000 }).should('be.visible');
      cy.contains(/lich tiem chung|lịch tiêm chủng/i).should('be.visible');
      cy.contains(/chien dich|chiến dịch/i).should('be.visible');
      cy.contains(/phan ung sau tiem|phản ứng sau tiêm/i).should('be.visible');
      cy.contains(/thong ke|thống kê/i).should('be.visible');

      const authHeaders = {
        Authorization: `Bearer ${token}`,
      };

      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/immunization',
        headers: authHeaders,
      }).its('status').should('eq', 200);

      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/immunization/statistics',
        headers: authHeaders,
      }).its('status').should('eq', 200);

      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/immunization/overdue',
        headers: authHeaders,
      }).its('status').should('eq', 200);
    });
  });
});
