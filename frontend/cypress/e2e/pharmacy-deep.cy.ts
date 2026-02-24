/// <reference types="cypress" />

/**
 * Deep test Pharmacy page - catch EVERYTHING from console
 */

describe('Pharmacy Deep Console Test', () => {
  let token: string;
  let userData: string;
  const allOutput: string[] = [];

  before(() => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    }).then((res) => {
      token = res.body.data.token;
      userData = JSON.stringify(res.body.data.user);
    });
  });

  it('Capture ALL console output on /pharmacy', () => {
    cy.on('uncaught:exception', (err) => {
      allOutput.push(`[UNCAUGHT] ${err.message}`);
      return false;
    });

    const failedRequests: string[] = [];

    // Intercept ALL requests to log failures
    cy.intercept('**/*', (req) => {
      req.continue((res) => {
        if (res.statusCode >= 400) {
          failedRequests.push(`${req.method} ${req.url} => ${res.statusCode}`);
        }
      });
    });

    cy.visit('/pharmacy', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        win.localStorage.setItem('user', userData);

        // Hook ALL console methods
        const origError = win.console.error;
        win.console.error = (...args: any[]) => {
          const msg = args.map(a => {
            if (typeof a === 'string') return a;
            if (a instanceof Error) return `${a.name}: ${a.message}`;
            try { return JSON.stringify(a).substring(0, 200); } catch { return String(a); }
          }).join(' ');
          if (!msg.includes('ResizeObserver')) {
            allOutput.push(`[console.error] ${msg}`);
          }
          origError.apply(win.console, args);
        };

        const origWarn = win.console.warn;
        win.console.warn = (...args: any[]) => {
          const msg = args.map(a => typeof a === 'string' ? a : String(a)).join(' ');
          if (msg.includes('Warning') || msg.includes('deprecated') || msg.includes('[antd')) {
            allOutput.push(`[console.warn] ${msg}`);
          }
          origWarn.apply(win.console, args);
        };
      },
    });

    // Wait for initial load
    cy.wait(4000);

    // Click each tab
    cy.get('[data-node-key="inventory"]').click({ force: true });
    cy.wait(2000);
    cy.get('[data-node-key="transfers"]').click({ force: true });
    cy.wait(2000);
    cy.get('[data-node-key="alerts"]').click({ force: true });
    cy.wait(2000);
    cy.get('[data-node-key="pending"]').click({ force: true });
    cy.wait(2000);

    // Try clicking first table row if any
    cy.get('body').then(($body) => {
      if ($body.find('.ant-table-tbody tr.ant-table-row').length > 0) {
        cy.get('.ant-table-tbody tr.ant-table-row').first().click({ force: true });
        cy.wait(2000);
      }
    });

    // Print everything
    cy.then(() => {
      cy.log('=== FAILED HTTP REQUESTS ===');
      failedRequests.forEach(r => cy.log(r));

      cy.log('=== CONSOLE OUTPUT ===');
      allOutput.forEach(o => cy.log(o));

      // Combine all issues
      const issues = [...allOutput, ...failedRequests.map(r => `[HTTP] ${r}`)];
      if (issues.length > 0) {
        const list = issues.map((e, i) => `  ${i + 1}. ${e.substring(0, 400)}`).join('\n');
        throw new Error(`Found ${issues.length} issues on /pharmacy:\n${list}`);
      }
    });
  });
});
