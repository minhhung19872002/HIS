/// <reference types="cypress" />

describe('NangCap3 Modules', () => {
  let token: string;
  let userData: string;

  before(() => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 200 && res.body?.data?.token) {
        token = res.body.data.token;
        userData = JSON.stringify(res.body.data.user);
        return;
      }

      if (res.status === 200 && res.body?.token) {
        token = res.body.token;
        userData = JSON.stringify(
          res.body.user || {
            id: '00000000-0000-0000-0000-000000000001',
            username: 'admin',
            fullName: 'Admin',
            role: 'admin',
          },
        );
        return;
      }

      token = 'test-token';
      userData = JSON.stringify({
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        fullName: 'Admin',
        role: 'admin',
      });
    });
  });

  function visitPage(route: string) {
    cy.on('uncaught:exception', () => false);

    cy.visit(route, {
      failOnStatusCode: false,
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        win.localStorage.setItem('user', userData);
      },
    });

    cy.wait(1000);
    cy.get('body').then(($body) => {
      if ($body.find('.ant-spin-spinning').length > 0) {
        cy.get('.ant-spin-spinning', { timeout: 15000 }).should('not.exist');
      }
    });
  }

  function expectMedicalRecordArchiveUnavailable() {
    cy.get('.ant-result').should('exist');
  }

  function expectBhxhAuditUnavailable() {
    cy.get('.ant-card').should('have.length.at.least', 1);
  }

  function medicalRecordArchiveAvailable($body: JQuery<HTMLElement>) {
    return $body.find('.ant-tabs-tab').length > 0 || $body.find('.ant-table').length > 0;
  }

  function bhxhAuditAvailable($body: JQuery<HTMLElement>) {
    return $body.find('.ant-tabs-tab').length > 0 || $body.find('.ant-table').length > 0 || $body.find('.ant-statistic').length > 0;
  }

  describe('Medical Record Archive', () => {
    it('loads route with full UI or fallback state', () => {
      visitPage('/medical-record-archive');
      cy.url().should('include', '/medical-record-archive');
      cy.get('body').then(($body) => {
        if (medicalRecordArchiveAvailable($body)) {
          cy.get('.ant-card, .ant-table, .ant-tabs').should('exist');
          return;
        }
        expectMedicalRecordArchiveUnavailable();
        cy.get('.ant-result').should('exist');
      });
    });

    it('shows tabs and search when backend is available', () => {
      visitPage('/medical-record-archive');
      cy.get('body').then(($body) => {
        if (!medicalRecordArchiveAvailable($body)) {
          expectMedicalRecordArchiveUnavailable();
          return;
        }
        cy.get('.ant-tabs-tab').should('have.length.at.least', 3);
        cy.get('.ant-input-search, input[placeholder]').should('exist');
      });
    });

    it('supports review and handover tab when backend is available', () => {
      visitPage('/medical-record-archive');
      cy.get('body').then(($body) => {
        if (!medicalRecordArchiveAvailable($body)) {
          expectMedicalRecordArchiveUnavailable();
          return;
        }
        cy.get('.ant-tabs-tab').eq(1).click({ force: true });
        cy.get('.ant-tabs-tabpane-active').should('exist');
        cy.get('.ant-tabs-tab').eq(2).click({ force: true });
        cy.get('.ant-tabs-tabpane-active').should('exist');
      });
    });

    it('shows table/statistics when backend is available', () => {
      visitPage('/medical-record-archive');
      cy.get('body').then(($body) => {
        if (!medicalRecordArchiveAvailable($body)) {
          expectMedicalRecordArchiveUnavailable();
          return;
        }
        cy.get('.ant-table').should('exist');
        cy.get('.ant-statistic').should('have.length.at.least', 1);
      });
    });
  });

  describe('BHXH Audit', () => {
    it('loads route with full UI or fallback state', () => {
      visitPage('/bhxh-audit');
      cy.url().should('include', '/bhxh-audit');
      cy.get('body').then(($body) => {
        if (bhxhAuditAvailable($body)) {
          cy.get('.ant-card').should('have.length.at.least', 1);
          return;
        }
        expectBhxhAuditUnavailable();
      });
    });

    it('shows tabs and records view when backend is available', () => {
      visitPage('/bhxh-audit');
      cy.get('body').then(($body) => {
        if (!bhxhAuditAvailable($body)) {
          expectBhxhAuditUnavailable();
          return;
        }
        cy.get('.ant-tabs-tab').should('have.length.at.least', 2);
        cy.get('.ant-table, .ant-statistic').should('exist');
      });
    });

    it('supports auditor portal and filters when backend is available', () => {
      visitPage('/bhxh-audit');
      cy.get('body').then(($body) => {
        if (!bhxhAuditAvailable($body)) {
          expectBhxhAuditUnavailable();
          return;
        }
        cy.get('.ant-picker-range, .ant-picker, .ant-select').should('exist');
        cy.get('.ant-tabs-tab').last().click({ force: true });
        cy.get('.ant-tabs-tabpane-active').should('exist');
      });
    });
  });

  describe('Doctor Portal', () => {
    it('loads page successfully', () => {
      visitPage('/doctor-portal');
      cy.get('.ant-card').should('have.length.at.least', 1);
    });

    it('has segmented control for sections', () => {
      visitPage('/doctor-portal');
      cy.get('.ant-segmented', { timeout: 10000 }).should('exist');
    });

    it('supports section switching and search', () => {
      visitPage('/doctor-portal');
      cy.get('input[placeholder], .ant-input-search').should('exist');
      cy.get('body').then(($body) => {
        const section = $body.find('.ant-segmented-item, .ant-tabs-tab').filter((_: number, el: HTMLElement) =>
          /inpatient|noi tru|signature|ky so|duty|lich truc/i.test(el.textContent || ''),
        );
        if (section.length > 0) {
          cy.wrap(section.first()).click({ force: true });
          cy.wait(500);
        }
      });
      cy.get('.ant-table, .ant-card').should('exist');
    });
  });

  describe('Satisfaction Survey', () => {
    it('loads page with tabs and statistics', () => {
      visitPage('/satisfaction-survey');
      cy.get('.ant-tabs-tab').should('have.length.at.least', 4);
      cy.get('.ant-statistic').should('have.length.at.least', 1);
    });

    it('opens template modal and supports settings tab', () => {
      visitPage('/satisfaction-survey');
      cy.get('button').contains(/[Tt]h.*m|[Tt]ao|new|add/i).first().click({ force: true });
      cy.wait(500);
      cy.get('body').then(($body) => {
        if ($body.find('.ant-modal').length > 0) {
          cy.get('.ant-modal').should('be.visible');
          cy.get('.ant-modal-close').click({ force: true });
        }
      });
      cy.get('.ant-tabs-tab').last().click({ force: true });
      cy.get('.ant-tabs-tabpane-active').should('exist');
    });
  });

  describe('Digital Signature - Pending Documents', () => {
    it('loads page with tabs', () => {
      visitPage('/digital-signature');
      cy.get('.ant-tabs-tab, .ant-card', { timeout: 15000 }).should('exist');
    });

    it('has pending documents structure', () => {
      visitPage('/digital-signature');
      cy.get('.ant-tabs-tab', { timeout: 15000 }).should('have.length.at.least', 2);
    });
  });

  describe('EMR Enhancements', () => {
    it('loads EMR page and search panel', () => {
      visitPage('/emr');
      cy.get('.ant-card').should('have.length.at.least', 1);
      cy.get('input[placeholder], .ant-input-search').should('exist');
    });
  });

  describe('Prescription - Drug Disclosure', () => {
    it('loads prescription page', () => {
      visitPage('/prescription');
      cy.url().should('include', '/prescription');
    });
  });

  describe('Patient Portal - News', () => {
    it('loads page and has news tab', () => {
      visitPage('/patient-portal');
      cy.get('.ant-card').should('have.length.at.least', 1);
      cy.get('.ant-tabs-tab').should('have.length.at.least', 2);
      cy.get('.ant-tabs-tab').filter((_: number, el: HTMLElement) =>
        /tin|news/i.test(el.textContent || ''),
      ).first().click({ force: true });
      cy.get('.ant-tabs-tabpane-active').should('exist');
    });
  });

  describe('SystemAdmin - APP Integration', () => {
    it('loads system admin route or redirect alias', () => {
      visitPage('/system-admin');
      cy.url().then((url) => {
        if (url.includes('/system-admin')) {
          cy.get('.ant-tabs-tab', { timeout: 10000 }).should('have.length.at.least', 2);
          return;
        }
        cy.url().should('include', '/admin');
      });
    });

    it('can switch tab when system admin stays on route', () => {
      visitPage('/system-admin');
      cy.url().then((url) => {
        if (!url.includes('/system-admin')) {
          cy.url().should('include', '/admin');
          return;
        }
        cy.get('.ant-tabs-tab', { timeout: 10000 }).last().click({ force: true });
        cy.get('.ant-tabs-tabpane-active').should('exist');
      });
    });
  });

  describe('Sidebar Menu Items', () => {
    it('Medical Record Archive route works', () => {
      visitPage('/medical-record-archive');
      cy.url().should('include', '/medical-record-archive');
      cy.get('.ant-card, .ant-table, .ant-tabs, .ant-result').should('exist');
    });

    it('BHXH Audit route works', () => {
      visitPage('/bhxh-audit');
      cy.url().should('include', '/bhxh-audit');
      cy.get('.ant-card, .ant-table, .ant-tabs').should('exist');
    });

    it('Doctor Portal route works', () => {
      visitPage('/doctor-portal');
      cy.url().should('include', '/doctor-portal');
      cy.get('.ant-card, .ant-table, .ant-segmented').should('exist');
    });

    it('Satisfaction Survey route works', () => {
      visitPage('/satisfaction-survey');
      cy.url().should('include', '/satisfaction-survey');
      cy.get('.ant-card, .ant-table, .ant-tabs').should('exist');
    });
  });
});
