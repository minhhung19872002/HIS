/// <reference types="cypress" />

/**
 * Debug test: Visit /emr and capture ALL output:
 * - Console: log, warn, error
 * - Network: all API requests with status >= 400
 * - Uncaught exceptions
 * Then click through controls to trigger more errors.
 */
describe('Debug EMR page - deep controls', () => {
  const logs: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  const uncaughtErrors: string[] = [];
  const networkErrors: string[] = [];
  const allRequests: string[] = [];

  // Shared setup
  function setupInterceptsAndVisit() {
    cy.on('uncaught:exception', (err) => {
      uncaughtErrors.push(`${err.name}: ${err.message}\n${err.stack?.substring(0, 500)}`);
      return false;
    });

    // Intercept ALL API requests to capture network errors
    cy.intercept('**/api/**', (req) => {
      const method = req.method;
      const url = req.url;
      const body = req.body ? JSON.stringify(req.body).substring(0, 200) : '';

      req.continue((res) => {
        const status = res.statusCode;
        const entry = `${method} ${status} ${url}${body ? ' BODY=' + body : ''}`;
        allRequests.push(entry);

        if (status >= 400) {
          let respBody = '';
          try {
            respBody = typeof res.body === 'string'
              ? res.body.substring(0, 500)
              : JSON.stringify(res.body).substring(0, 500);
          } catch { respBody = '(cannot serialize)'; }
          networkErrors.push(`${method} ${status} ${url}\n  REQUEST: ${body}\n  RESPONSE: ${respBody}`);
        }
      });
    });

    // Login via API
    cy.request('POST', 'http://localhost:5106/api/auth/login', {
      username: 'admin',
      password: 'Admin@123'
    }).then(resp => {
      const token = resp.body.data?.token || resp.body.token;
      const user = resp.body.data?.user || resp.body.user;

      cy.visit('/emr', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', JSON.stringify(user));

          const origLog = win.console.log;
          win.console.log = (...args: any[]) => {
            const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
            logs.push(msg);
            origLog.apply(win.console, args);
          };

          const origWarn = win.console.warn;
          win.console.warn = (...args: any[]) => {
            const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
            warnings.push(msg);
            origWarn.apply(win.console, args);
          };

          const origError = win.console.error;
          win.console.error = (...args: any[]) => {
            const msg = args.map(a => {
              if (typeof a === 'string') return a;
              if (a instanceof Error) return `${a.name}: ${a.message}`;
              try { return JSON.stringify(a); } catch { return String(a); }
            }).join(' ');
            if (!msg.includes('Failed to start the connection') && !msg.includes('connection was stopped during negotiation')) {
              errors.push(msg);
            }
            origError.apply(win.console, args);
          };
        },
      });
    });
  }

  function printReport(phase: string) {
    cy.then(() => {
      cy.task('log', `\n========== [${phase}] API REQUESTS ==========`);
      if (allRequests.length === 0) cy.task('log', '(none)');
      allRequests.forEach((r, i) => cy.task('log', `  [${i}] ${r}`));

      cy.task('log', `\n========== [${phase}] NETWORK ERRORS (status >= 400) ==========`);
      if (networkErrors.length === 0) cy.task('log', '(none)');
      networkErrors.forEach((e, i) => cy.task('log', `  NET_ERR[${i}]: ${e}`));

      cy.task('log', `\n========== [${phase}] CONSOLE.ERROR ==========`);
      if (errors.length === 0) cy.task('log', '(none)');
      errors.forEach((e, i) => cy.task('log', `  ERROR[${i}]: ${e.substring(0, 500)}`));

      cy.task('log', `\n========== [${phase}] UNCAUGHT EXCEPTIONS ==========`);
      if (uncaughtErrors.length === 0) cy.task('log', '(none)');
      uncaughtErrors.forEach((e, i) => cy.task('log', `  UNCAUGHT[${i}]: ${e.substring(0, 500)}`));

      cy.task('log', `\n========== [${phase}] CONSOLE.WARN (truncated) ==========`);
      warnings.slice(0, 10).forEach((w, i) => cy.task('log', `  WARN[${i}]: ${w.substring(0, 300)}`));
      if (warnings.length > 10) cy.task('log', `  ... and ${warnings.length - 10} more warnings`);

      cy.task('log', `\n========== [${phase}] SUMMARY ==========`);
      cy.task('log', `  Requests: ${allRequests.length}, Network Errors: ${networkErrors.length}`);
      cy.task('log', `  Warns: ${warnings.length}, Errors: ${errors.length}, Uncaught: ${uncaughtErrors.length}`);
    });
  }

  it('captures errors on page load + clicking all controls', () => {
    setupInterceptsAndVisit();

    // Phase 1: Wait for initial page load
    cy.wait(3000);
    cy.task('log', '\n\n====== PHASE 1: PAGE LOAD ======');
    printReport('LOAD');

    // Phase 2: Click search button
    cy.task('log', '\n\n====== PHASE 2: SEARCH ======');
    cy.get('body').then($body => {
      // Try clicking the search button
      if ($body.find('button').filter(':contains("Tìm kiếm")').length > 0) {
        cy.contains('button', 'Tìm kiếm').click({ force: true });
        cy.wait(2000);
      } else if ($body.find('[class*="ant-input-search"] button').length > 0) {
        cy.get('[class*="ant-input-search"] button').first().click({ force: true });
        cy.wait(2000);
      }
    });
    printReport('SEARCH');

    // Phase 3: Click status filter dropdown
    cy.task('log', '\n\n====== PHASE 3: STATUS FILTER ======');
    cy.get('body').then($body => {
      const selects = $body.find('.ant-select:not(.ant-select-open)');
      if (selects.length > 0) {
        cy.wrap(selects.first()).click({ force: true });
        cy.wait(500);
        // Click first option if dropdown opened
        cy.get('body').then($b => {
          if ($b.find('.ant-select-item-option').length > 0) {
            cy.get('.ant-select-item-option').first().click({ force: true });
            cy.wait(2000);
          }
        });
      }
    });
    printReport('FILTER');

    // Phase 4: Click first row in the table (if any data)
    cy.task('log', '\n\n====== PHASE 4: TABLE ROW CLICK ======');
    cy.get('body').then($body => {
      const rows = $body.find('.ant-table-tbody tr.ant-table-row');
      if (rows.length > 0) {
        cy.get('.ant-table-tbody tr.ant-table-row').first().click({ force: true });
        cy.wait(3000); // Wait for detail APIs to load
      } else {
        cy.task('log', '  (no table rows to click)');
      }
    });
    printReport('ROW_CLICK');

    // Phase 5: Click through tabs in the detail panel
    cy.task('log', '\n\n====== PHASE 5: TAB CLICKS ======');
    cy.get('body').then($body => {
      const tabs = $body.find('.ant-tabs-tab');
      if (tabs.length > 1) {
        // Click each tab
        for (let i = 1; i < Math.min(tabs.length, 8); i++) {
          cy.get('.ant-tabs-tab').eq(i).click({ force: true });
          cy.wait(1000);
        }
      } else {
        cy.task('log', '  (no tabs to click)');
      }
    });
    printReport('TABS');

    // Phase 6: Click buttons like "Tạo phiếu điều trị", "Tạo hội chẩn", "Tạo chăm sóc"
    cy.task('log', '\n\n====== PHASE 6: ACTION BUTTONS ======');
    cy.get('body').then($body => {
      // Try clicking "Tạo phiếu điều trị" button
      const createBtns = $body.find('button').filter(function() {
        const text = Cypress.$(this).text();
        return text.includes('Tạo phiếu') || text.includes('Tạo hội chẩn') || text.includes('Tạo chăm sóc');
      });
      if (createBtns.length > 0) {
        cy.wrap(createBtns.first()).click({ force: true });
        cy.wait(1000);
        // Close the modal if it opened
        cy.get('body').then($b2 => {
          if ($b2.find('.ant-modal-close').length > 0) {
            cy.get('.ant-modal-close').last().click({ force: true });
            cy.wait(500);
          }
        });
      } else {
        cy.task('log', '  (no create buttons found)');
      }
    });
    printReport('BUTTONS');

    // Phase 7: Click print dropdown
    cy.task('log', '\n\n====== PHASE 7: PRINT DROPDOWN ======');
    cy.get('body').then($body => {
      const printBtn = $body.find('button').filter(function() {
        const text = Cypress.$(this).text();
        return text.includes('In biểu mẫu') || text.includes('In phiếu');
      });
      if (printBtn.length > 0) {
        cy.wrap(printBtn.first()).click({ force: true });
        cy.wait(1000);
        // Click first menu item if dropdown opened
        cy.get('body').then($b2 => {
          if ($b2.find('.ant-dropdown-menu-item').length > 0) {
            cy.get('.ant-dropdown-menu-item').first().click({ force: true });
            cy.wait(1000);
            // Close drawer if opened
            cy.get('body').then($b3 => {
              if ($b3.find('.ant-drawer-close').length > 0) {
                cy.get('.ant-drawer-close').last().click({ force: true });
                cy.wait(500);
              }
            });
          }
        });
      } else {
        cy.task('log', '  (no print button found)');
      }
    });
    printReport('PRINT');

    // Phase 8: Click Refresh / Reload button
    cy.task('log', '\n\n====== PHASE 8: RELOAD ======');
    cy.get('body').then($body => {
      const reloadBtn = $body.find('button').filter(function() {
        const text = Cypress.$(this).text();
        return text.includes('Làm mới') || text.includes('Tải lại');
      });
      if (reloadBtn.length > 0) {
        cy.wrap(reloadBtn.first()).click({ force: true });
        cy.wait(2000);
      }
    });
    printReport('RELOAD');

    // FINAL: Write full report to file
    cy.then(() => {
      const all = [
        `EMR Debug Report - ${new Date().toISOString()}`,
        '',
        '========== ALL API REQUESTS ==========',
        ...allRequests.map((r, i) => `[${i}] ${r}`),
        '',
        '========== NETWORK ERRORS (status >= 400) ==========',
        ...networkErrors.map((e, i) => `NET_ERR[${i}]: ${e}`),
        '',
        '========== CONSOLE.ERROR ==========',
        ...errors.map((e, i) => `ERROR[${i}]: ${e}`),
        '',
        '========== UNCAUGHT EXCEPTIONS ==========',
        ...uncaughtErrors.map((e, i) => `UNCAUGHT[${i}]: ${e}`),
        '',
        '========== CONSOLE.WARN ==========',
        ...warnings.map((w, i) => `WARN[${i}]: ${w}`),
        '',
        `SUMMARY: Requests=${allRequests.length} NetErrors=${networkErrors.length} Warns=${warnings.length} Errors=${errors.length} Uncaught=${uncaughtErrors.length}`,
      ];
      cy.writeFile('cypress/debug-emr-output.txt', all.join('\n'));
      cy.task('log', '\n\nFull report written to cypress/debug-emr-output.txt');
    });
  });
});
