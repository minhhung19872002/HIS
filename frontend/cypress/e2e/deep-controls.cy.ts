/// <reference types="cypress" />

/**
 * Deep Controls Test Suite
 *
 * For EACH page: visits, clicks every tab, clicks buttons, opens modals/drawers,
 * tries table row clicks. Captures ALL console.error + HTTP 500 errors.
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'NotImplementedException',
  'not implemented',
  'ECONNREFUSED',
];

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

interface PageDef {
  route: string;
  name: string;
  tabs?: string[];         // Tab key values to click
  buttons?: string[];      // Button text to click (partial match)
  skipButtons?: string[];  // Button text to skip (destructive)
}

const pages: PageDef[] = [
  { route: '/', name: 'Dashboard' },
  {
    route: '/reception', name: 'Reception',
    buttons: ['Làm mới'],
  },
  {
    route: '/opd', name: 'OPD',
    buttons: ['Làm mới'],
  },
  {
    route: '/prescription', name: 'Prescription',
  },
  {
    route: '/ipd', name: 'Inpatient',
    tabs: ['current', 'beds'],
    buttons: ['Làm mới'],
    skipButtons: ['Nhập viện'],
  },
  {
    route: '/surgery', name: 'Surgery',
    tabs: ['requests', 'schedules', 'rooms', 'inprogress', 'records'],
    buttons: ['Làm mới'],
    skipButtons: ['Tạo yêu cầu', 'Hoàn thành'],
  },
  {
    route: '/pharmacy', name: 'Pharmacy',
    tabs: ['pending', 'inventory', 'transfers', 'alerts'],
    buttons: ['Đồng bộ'],
  },
  {
    route: '/lab', name: 'Laboratory',
    buttons: ['Làm mới'],
  },
  {
    route: '/radiology', name: 'Radiology',
    tabs: ['pending', 'worklist', 'inProgress', 'reporting', 'completed'],
    buttons: ['Làm mới'],
  },
  {
    route: '/blood-bank', name: 'Blood Bank',
  },
  {
    route: '/billing', name: 'Billing',
    tabs: ['unpaid', 'deposits', 'refunds', 'reports'],
  },
  {
    route: '/finance', name: 'Finance',
  },
  {
    route: '/insurance', name: 'Insurance',
    tabs: ['claims', 'xml'],
    buttons: ['Đồng bộ'],
  },
  {
    route: '/master-data', name: 'Master Data',
  },
  {
    route: '/reports', name: 'Reports',
  },
  {
    route: '/admin', name: 'System Admin',
  },
  {
    route: '/telemedicine', name: 'Telemedicine',
  },
  {
    route: '/nutrition', name: 'Nutrition',
  },
  {
    route: '/infection-control', name: 'Infection Control',
  },
  {
    route: '/rehabilitation', name: 'Rehabilitation',
  },
  {
    route: '/equipment', name: 'Equipment',
  },
  {
    route: '/hr', name: 'HR',
  },
  {
    route: '/quality', name: 'Quality',
  },
  {
    route: '/patient-portal', name: 'Patient Portal',
  },
  {
    route: '/health-exchange', name: 'Health Exchange',
  },
  {
    route: '/emergency-disaster', name: 'Emergency',
  },
  {
    route: '/consultation', name: 'Consultation',
  },
  {
    route: '/help', name: 'Help',
  },
];

describe('Deep Controls - All Pages', () => {
  let token: string;
  let userData: string;

  before(() => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then((resp) => {
      if (resp.status === 200 && resp.body.data) {
        token = resp.body.data.token;
        userData = JSON.stringify(resp.body.data.user);
      } else if (resp.status === 200 && resp.body.token) {
        token = resp.body.token;
        userData = JSON.stringify(resp.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
      } else {
        throw new Error(`Login failed: ${resp.status}`);
      }
    });
  });

  pages.forEach((page) => {
    describe(`${page.name} (${page.route})`, () => {
      let consoleErrors: string[];
      let serverErrors: string[];

      beforeEach(() => {
        consoleErrors = [];
        serverErrors = [];

        cy.on('uncaught:exception', () => false);

        cy.intercept('**/*', (req) => {
          req.continue((res) => {
            if (res.statusCode >= 500) {
              serverErrors.push(`${req.method} ${req.url} => ${res.statusCode}`);
            }
          });
        }).as('apiCalls');

        cy.visit(page.route, {
          onBeforeLoad(win) {
            win.localStorage.setItem('token', token);
            win.localStorage.setItem('user', userData);

            const origError = win.console.error;
            win.console.error = (...args: any[]) => {
              const msg = args
                .map((a) => {
                  if (typeof a === 'string') return a;
                  if (a instanceof Error) return `${a.name}: ${a.message}`;
                  try { return JSON.stringify(a); } catch { return String(a); }
                })
                .join(' ');

              if (!isIgnoredError(msg)) {
                consoleErrors.push(msg);
              }
              origError.apply(win.console, args);
            };
          },
        });

        cy.wait(2000);
        cy.get('body').should('not.be.empty');
      });

      it('loads without console errors', () => {
        cy.wait(1000).then(() => {
          if (consoleErrors.length > 0) {
            const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 200)}`).join('\n');
            throw new Error(`${consoleErrors.length} console error(s) on ${page.name}:\n${list}`);
          }
        });
      });

      if (page.tabs && page.tabs.length > 0) {
        it('all tabs clickable without errors', () => {
          page.tabs!.forEach((tabKey) => {
            // Click tab by its key - Antd tabs use role="tab"
            cy.get(`[data-node-key="${tabKey}"]`).first().click({ force: true });
            cy.wait(1500);
          });

          cy.then(() => {
            if (consoleErrors.length > 0) {
              const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 200)}`).join('\n');
              throw new Error(`Tab click errors on ${page.name}:\n${list}`);
            }
          });
        });
      }

      if (page.buttons && page.buttons.length > 0) {
        it('safe buttons clickable without errors', () => {
          page.buttons!.forEach((btnText) => {
            if (page.skipButtons?.includes(btnText)) return;
            cy.get('body').then(($body) => {
              const $btn = $body.find(`button:contains("${btnText}"), .ant-btn:contains("${btnText}")`);
              if ($btn.length > 0) {
                cy.wrap($btn.first()).click({ force: true });
                cy.wait(1000);
              }
            });
          });

          cy.then(() => {
            if (consoleErrors.length > 0) {
              const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 200)}`).join('\n');
              throw new Error(`Button click errors on ${page.name}:\n${list}`);
            }
          });
        });
      }

      it('first table row clickable (if table exists)', () => {
        cy.get('body').then(($body) => {
          const $rows = $body.find('.ant-table-tbody tr.ant-table-row');
          if ($rows.length > 0) {
            cy.wrap($rows.first()).click({ force: true });
            cy.wait(1500);

            // Close any opened modal/drawer
            cy.get('body').then(($b) => {
              const $close = $b.find('.ant-modal-close, .ant-drawer-close');
              if ($close.length > 0) {
                cy.wrap($close.first()).click({ force: true });
                cy.wait(500);
              }
            });
          }
        });

        cy.then(() => {
          if (consoleErrors.length > 0) {
            const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 200)}`).join('\n');
            throw new Error(`Table row click errors on ${page.name}:\n${list}`);
          }
        });
      });

      it('no HTTP 500 errors', () => {
        cy.wait(2000).then(() => {
          // Also check tabs if applicable
          if (page.tabs) {
            const tabPromise = page.tabs.reduce((chain, tabKey) => {
              return chain.then(() => {
                return cy.get(`[data-node-key="${tabKey}"]`).first().click({ force: true }).wait(1000);
              });
            }, cy.wrap(null));
          }
        });

        cy.wait(2000).then(() => {
          if (serverErrors.length > 0) {
            const list = serverErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');
            throw new Error(`HTTP 500 errors on ${page.name}:\n${list}`);
          }
        });
      });
    });
  });
});
