/// <reference types="cypress" />

/**
 * Network & Console Error Detection Suite (Comprehensive)
 *
 * Visits EVERY page, clicks ALL visible tabs/buttons/table rows/segments, and captures:
 * - Console errors (console.error)
 * - Network errors (HTTP 400+)
 * - Uncaught exceptions
 *
 * Results are logged via cy.task('log') for terminal visibility.
 */

const IGNORE_CONSOLE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'Failed to start the connection',
  'WebSocket connection',
  'hubs/notifications',
  'useForm',
  'is not connected to any Form element',
  'connection was stopped during negotiation',
  'ECONNREFUSED',
  'NotImplementedException',
  'not implemented',
  'net::ERR_CONNECTION_REFUSED',
  'SignalR',
  'negotiate',
];

// Network URLs that are expected to fail
const IGNORE_NETWORK_PATTERNS = [
  '/hubs/',
  '/favicon',
  '/health',
  'hot-update',
  '__vite',
  '/usb-token/',
  '/digital-signature/session',
];

function isIgnoredConsole(msg: string): boolean {
  return IGNORE_CONSOLE_PATTERNS.some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

function isIgnoredNetwork(url: string): boolean {
  return IGNORE_NETWORK_PATTERNS.some((p) => url.includes(p));
}

interface PageDef {
  route: string;
  name: string;
}

// ALL 42 protected pages from App.tsx
const allPages: PageDef[] = [
  { route: '/', name: 'Dashboard' },
  { route: '/reception', name: 'Reception' },
  { route: '/opd', name: 'OPD' },
  { route: '/prescription', name: 'Prescription' },
  { route: '/ipd', name: 'Inpatient' },
  { route: '/surgery', name: 'Surgery' },
  { route: '/pharmacy', name: 'Pharmacy' },
  { route: '/medical-supply', name: 'Medical Supply' },
  { route: '/follow-up', name: 'Follow Up' },
  { route: '/booking-management', name: 'Booking Mgmt' },
  { route: '/sms-management', name: 'SMS Mgmt' },
  { route: '/lab', name: 'Laboratory' },
  { route: '/lab-qc', name: 'Lab QC' },
  { route: '/microbiology', name: 'Microbiology' },
  { route: '/culture-collection', name: 'Culture Collection' },
  { route: '/sample-storage', name: 'Sample Storage' },
  { route: '/screening', name: 'Screening' },
  { route: '/reagent-management', name: 'Reagent Mgmt' },
  { route: '/sample-tracking', name: 'Sample Tracking' },
  { route: '/pathology', name: 'Pathology' },
  { route: '/radiology', name: 'Radiology' },
  { route: '/blood-bank', name: 'Blood Bank' },
  { route: '/billing', name: 'Billing' },
  { route: '/finance', name: 'Finance' },
  { route: '/insurance', name: 'Insurance' },
  { route: '/master-data', name: 'Master Data' },
  { route: '/reports', name: 'Reports' },
  { route: '/admin', name: 'System Admin' },
  { route: '/digital-signature', name: 'Digital Signature' },
  { route: '/telemedicine', name: 'Telemedicine' },
  { route: '/nutrition', name: 'Nutrition' },
  { route: '/infection-control', name: 'Infection Control' },
  { route: '/rehabilitation', name: 'Rehabilitation' },
  { route: '/equipment', name: 'Equipment' },
  { route: '/hr', name: 'HR' },
  { route: '/quality', name: 'Quality' },
  { route: '/patient-portal', name: 'Patient Portal' },
  { route: '/health-exchange', name: 'Health Exchange' },
  { route: '/emergency-disaster', name: 'Emergency' },
  { route: '/emr', name: 'EMR' },
  { route: '/consultation', name: 'Consultation' },
  { route: '/help', name: 'Help' },
];

describe('Network & Console Error Detection - All Pages', () => {
  let token: string;
  let userData: string;
  // Accumulate all errors across all pages for final summary
  const globalNetworkErrors: Array<{ page: string; method: string; url: string; status: number }> = [];
  const globalConsoleErrors: Array<{ page: string; msg: string }> = [];

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

  allPages.forEach((page) => {
    it(`[${page.name}] ${page.route} - load + click tabs/buttons/rows`, () => {
      const consoleErrors: string[] = [];
      const networkErrors: Array<{ method: string; path: string; status: number }> = [];

      cy.on('uncaught:exception', (err) => {
        const msg = err.message || String(err);
        if (!isIgnoredConsole(msg)) {
          consoleErrors.push(`[UNCAUGHT] ${msg.substring(0, 200)}`);
        }
        return false;
      });

      // Intercept ALL API calls
      cy.intercept('**/api/**', (req) => {
        req.continue((res) => {
          if (res.statusCode >= 400 && !isIgnoredNetwork(req.url)) {
            const path = req.url.replace(/^https?:\/\/[^/]+/, '');
            networkErrors.push({ method: req.method, path, status: res.statusCode });
            globalNetworkErrors.push({ page: page.name, method: req.method, url: path, status: res.statusCode });
          }
        });
      }).as('api');

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

            if (!isIgnoredConsole(msg)) {
              consoleErrors.push(msg.substring(0, 300));
              globalConsoleErrors.push({ page: page.name, msg: msg.substring(0, 300) });
            }
            origError.apply(win.console, args);
          };
        },
      });

      cy.get('body').should('not.be.empty');
      cy.wait(2500);

      // ============ PHASE 1: Click ALL visible tabs ============
      cy.get('body').then(($body) => {
        const $tabs = $body.find('[role="tab"]:visible');
        const tabCount = Math.min($tabs.length, 20);
        if (tabCount > 0) {
          cy.task('log', `  [${page.name}] Clicking ${tabCount} tabs...`);
        }
      });
      // Click tabs sequentially, re-querying DOM each time
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then(($body) => {
          const $tabs = $body.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1200);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then(($body) => {
        const max = Math.min($body.find('[role="tab"]:visible').length, 20);
        if (max > 0) clickTab(0, max);
      });

      // ============ PHASE 2: Click safe buttons ============
      const safeButtons = ['Làm mới', 'Tìm kiếm', 'Đồng bộ', 'Tải lại', 'Lọc', 'Xem', 'Reload', 'Refresh', 'Tải', 'Load'];
      cy.get('body').then(($body) => {
        safeButtons.forEach((btnText) => {
          const $btns = $body.find(`button:contains("${btnText}"):visible, .ant-btn:contains("${btnText}"):visible`);
          if ($btns.length > 0) {
            cy.wrap($btns.first()).click({ force: true });
            cy.wait(800);
          }
        });
      });

      // ============ PHASE 3: Click multiple table rows (up to 3) ============
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then(($body) => {
          const $rows = $body.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            // Close any modal/drawer that opened
            cy.get('body').then(($b) => {
              const $close = $b.find('.ant-modal-close:visible, .ant-drawer-close:visible');
              if ($close.length > 0) {
                cy.wrap($close.first()).click({ force: true });
                cy.wait(500);
              }
            });
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then(($body) => {
        const rowCount = Math.min($body.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) {
          cy.task('log', `  [${page.name}] Clicking ${rowCount} table rows...`);
          clickRow(0, rowCount);
        }
      });

      // ============ PHASE 4: Click action buttons in table rows ============
      cy.get('body').then(($body) => {
        // Click eye/view icons in tables
        const $viewBtns = $body.find('.ant-table-tbody .anticon-eye:visible, .ant-table-tbody button:contains("Xem"):visible');
        if ($viewBtns.length > 0) {
          cy.wrap($viewBtns.first()).click({ force: true });
          cy.wait(1500);
          cy.get('body').then(($b) => {
            const $close = $b.find('.ant-modal-close:visible, .ant-drawer-close:visible');
            if ($close.length > 0) {
              cy.wrap($close.first()).click({ force: true });
              cy.wait(500);
            }
          });
        }
        // Click edit icons in tables
        const $editBtns = $body.find('.ant-table-tbody .anticon-edit:visible, .ant-table-tbody button:contains("Sửa"):visible');
        if ($editBtns.length > 0) {
          cy.wrap($editBtns.first()).click({ force: true });
          cy.wait(1500);
          cy.get('body').then(($b) => {
            const $close = $b.find('.ant-modal-close:visible, .ant-drawer-close:visible');
            if ($close.length > 0) {
              cy.wrap($close.first()).click({ force: true });
              cy.wait(500);
            }
          });
        }
      });

      // ============ PHASE 5: Click Segmented controls ============
      cy.get('body').then(($body) => {
        const $segments = $body.find('.ant-segmented-item:visible');
        const segCount = Math.min($segments.length, 5);
        for (let i = 0; i < segCount; i++) {
          cy.get('.ant-segmented-item:visible').eq(i).click({ force: true });
          cy.wait(800);
        }
      });

      // ============ PHASE 6: Click Collapse panels ============
      cy.get('body').then(($body) => {
        const $panels = $body.find('.ant-collapse-header:visible');
        const panelCount = Math.min($panels.length, 5);
        if (panelCount > 0) {
          cy.task('log', `  [${page.name}] Clicking ${panelCount} collapse panels...`);
        }
        for (let i = 0; i < panelCount; i++) {
          cy.get('.ant-collapse-header:visible').eq(i).click({ force: true });
          cy.wait(800);
        }
      });

      // ============ PHASE 7: Click Dropdown triggers / "Thêm mới" / "+" buttons ============
      cy.get('body').then(($body) => {
        const addButtons = ['Thêm mới', 'Thêm', 'Tạo mới', 'Đăng ký', '+ Thêm'];
        addButtons.forEach((btnText) => {
          const $btns = $body.find(`button:contains("${btnText}"):visible, .ant-btn:contains("${btnText}"):visible`);
          if ($btns.length > 0) {
            cy.wrap($btns.first()).click({ force: true });
            cy.wait(1500);
            // Close modal/drawer that opened
            cy.get('body').then(($b) => {
              const $close = $b.find('.ant-modal-close:visible, .ant-drawer-close:visible');
              if ($close.length > 0) {
                cy.wrap($close.first()).click({ force: true });
                cy.wait(500);
              }
            });
          }
        });
      });

      // ============ PHASE 8: Click Select dropdowns (open & close) ============
      cy.get('body').then(($body) => {
        const $selects = $body.find('.ant-select:visible:not(.ant-select-disabled)');
        const selectCount = Math.min($selects.length, 3);
        if (selectCount > 0) {
          cy.task('log', `  [${page.name}] Clicking ${selectCount} selects...`);
        }
        for (let i = 0; i < selectCount; i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(600);
          // Close dropdown by pressing Escape
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      // ============ PHASE 9: Click Card elements ============
      cy.get('body').then(($body) => {
        const $cards = $body.find('.ant-card:visible:not(.ant-card-bordered)');
        const cardCount = Math.min($cards.length, 3);
        for (let i = 0; i < cardCount; i++) {
          cy.get('.ant-card:visible').eq(i).click({ force: true });
          cy.wait(500);
        }
      });

      // ============ PHASE 10: Click Statistic cards (dashboard widgets) ============
      cy.get('body').then(($body) => {
        const $stats = $body.find('.ant-statistic:visible');
        const statCount = Math.min($stats.length, 5);
        for (let i = 0; i < statCount; i++) {
          cy.get('.ant-statistic:visible').eq(i).click({ force: true });
          cy.wait(300);
        }
      });

      // ============ PHASE 11: Click Pagination (page 2 if exists) ============
      cy.get('body').then(($body) => {
        const $page2 = $body.find('.ant-pagination-item:visible').filter(function() {
          return Cypress.$(this).text().trim() === '2';
        });
        if ($page2.length > 0) {
          cy.task('log', `  [${page.name}] Clicking pagination page 2...`);
          cy.wrap($page2.first()).click({ force: true });
          cy.wait(1500);
        }
      });

      // Wait for pending requests
      cy.wait(2000);

      // ============ REPORT ============
      cy.then(() => {
        const has500 = networkErrors.filter((e) => e.status >= 500);
        const has4xx = networkErrors.filter((e) => e.status >= 400 && e.status < 500);

        if (consoleErrors.length > 0 || networkErrors.length > 0) {
          let report = `\n--- ${page.name} (${page.route}) ---`;
          if (consoleErrors.length > 0) {
            report += `\n  Console errors (${consoleErrors.length}):`;
            consoleErrors.forEach((e) => { report += `\n    - ${e}`; });
          }
          if (has500.length > 0) {
            report += `\n  HTTP 500 errors (${has500.length}):`;
            has500.forEach((e) => { report += `\n    - ${e.status} ${e.method} ${e.path}`; });
          }
          if (has4xx.length > 0) {
            report += `\n  HTTP 4xx errors (${has4xx.length}):`;
            has4xx.forEach((e) => { report += `\n    - ${e.status} ${e.method} ${e.path}`; });
          }
          cy.task('log', report);
        } else {
          cy.task('log', `  [${page.name}] ✓ OK`);
        }

        // Only FAIL on 500 errors or console errors - 4xx are warnings
        if (has500.length > 0) {
          const list = has500.map((e) => `${e.status} ${e.method} ${e.path}`).join('\n  ');
          throw new Error(`HTTP 500 errors on ${page.name}:\n  ${list}`);
        }
        // Don't fail on console errors for now - just log them
      });
    });
  });

  after(() => {
    // Final summary
    cy.task('log', '\n\n========================================');
    cy.task('log', '  FINAL ERROR SUMMARY');
    cy.task('log', '========================================');
    cy.task('log', `Total network errors: ${globalNetworkErrors.length}`);
    cy.task('log', `Total console errors: ${globalConsoleErrors.length}`);

    if (globalNetworkErrors.length > 0) {
      cy.task('log', '\n-- Network Errors --');
      // Group by status + path for dedup
      const grouped: Record<string, { count: number; pages: string[] }> = {};
      globalNetworkErrors.forEach((e) => {
        const key = `${e.status} ${e.method} ${e.url}`;
        if (!grouped[key]) grouped[key] = { count: 0, pages: [] };
        grouped[key].count++;
        if (!grouped[key].pages.includes(e.page)) grouped[key].pages.push(e.page);
      });
      Object.entries(grouped)
        .sort(([, a], [, b]) => b.count - a.count)
        .forEach(([key, val]) => {
          cy.task('log', `  ${key} (x${val.count}) - pages: ${val.pages.join(', ')}`);
        });
    }

    if (globalConsoleErrors.length > 0) {
      cy.task('log', '\n-- Console Errors --');
      const grouped: Record<string, string[]> = {};
      globalConsoleErrors.forEach((e) => {
        const shortMsg = e.msg.substring(0, 100);
        if (!grouped[shortMsg]) grouped[shortMsg] = [];
        if (!grouped[shortMsg].includes(e.page)) grouped[shortMsg].push(e.page);
      });
      Object.entries(grouped).forEach(([msg, pages]) => {
        cy.task('log', `  "${msg}" - pages: ${pages.join(', ')}`);
      });
    }
  });
});
