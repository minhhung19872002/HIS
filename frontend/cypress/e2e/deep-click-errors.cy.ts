/// <reference types="cypress" />

/**
 * Deep Click Error Detection - Click into EVERY control, data item, modal, form
 * on pages that have complex interactions.
 *
 * Focuses on pages with many data/controls: EMR, OPD, Reception, Billing,
 * Inpatient, Laboratory, Pharmacy, Radiology, MasterData, etc.
 *
 * Captures console errors + network errors (HTTP 400+).
 */

const IGNORE_CONSOLE_PATTERNS = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'Failed to start the connection',
  'WebSocket connection', 'hubs/notifications', 'useForm',
  'is not connected to any Form element', 'connection was stopped during negotiation',
  'ECONNREFUSED', 'NotImplementedException', 'not implemented',
  'net::ERR_CONNECTION_REFUSED', 'SignalR', 'negotiate',
  'popup', 'blocked', 'Popup',
];

const IGNORE_NETWORK_PATTERNS = [
  '/hubs/', '/favicon', '/health', 'hot-update', '__vite',
  '/usb-token/', '/digital-signature/session',
];

function isIgnored(msg: string): boolean {
  return IGNORE_CONSOLE_PATTERNS.some(p => msg.toLowerCase().includes(p.toLowerCase()));
}
function isIgnoredUrl(url: string): boolean {
  return IGNORE_NETWORK_PATTERNS.some(p => url.includes(p));
}

// Helper: safely close any open modal/drawer
function closeOverlay() {
  cy.get('body').then($b => {
    const $close = $b.find('.ant-modal-close:visible, .ant-drawer-close:visible');
    if ($close.length > 0) {
      cy.wrap($close.first()).click({ force: true });
      cy.wait(500);
    }
  });
}

// Helper: setup error tracking
function setupErrorTracking(
  consoleErrors: string[],
  networkErrors: Array<{ method: string; path: string; status: number }>,
  pageName: string,
) {
  cy.on('uncaught:exception', (err) => {
    const msg = err.message || String(err);
    if (!isIgnored(msg)) consoleErrors.push(`[UNCAUGHT] ${msg.substring(0, 200)}`);
    return false;
  });

  cy.intercept('**/api/**', (req) => {
    req.continue((res) => {
      if (res.statusCode >= 400 && !isIgnoredUrl(req.url)) {
        const path = req.url.replace(/^https?:\/\/[^/]+/, '');
        networkErrors.push({ method: req.method, path, status: res.statusCode });
      }
    });
  }).as('api');
}

// Helper: report errors
function reportErrors(
  pageName: string,
  consoleErrors: string[],
  networkErrors: Array<{ method: string; path: string; status: number }>,
) {
  cy.then(() => {
    const has500 = networkErrors.filter(e => e.status >= 500);
    const has4xx = networkErrors.filter(e => e.status >= 400 && e.status < 500);

    if (consoleErrors.length > 0 || networkErrors.length > 0) {
      let report = `\n--- ${pageName} ---`;
      if (consoleErrors.length > 0) {
        report += `\n  Console errors (${consoleErrors.length}):`;
        consoleErrors.forEach(e => { report += `\n    - ${e}`; });
      }
      if (has500.length > 0) {
        report += `\n  HTTP 500 (${has500.length}):`;
        has500.forEach(e => { report += `\n    - ${e.status} ${e.method} ${e.path}`; });
      }
      if (has4xx.length > 0) {
        report += `\n  HTTP 4xx (${has4xx.length}):`;
        has4xx.forEach(e => { report += `\n    - ${e.status} ${e.method} ${e.path}`; });
      }
      cy.task('log', report);
    } else {
      cy.task('log', `  [${pageName}] ✓ OK - no errors`);
    }

    if (has500.length > 0) {
      const list = has500.map(e => `${e.status} ${e.method} ${e.path}`).join('\n  ');
      throw new Error(`HTTP 500 errors on ${pageName}:\n  ${list}`);
    }
  });
}

describe('Deep Click Error Detection - Data-heavy Pages', () => {
  let token: string;
  let userData: string;

  before(() => {
    cy.request({
      method: 'POST', url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then(resp => {
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

  function visitPage(route: string) {
    cy.visit(route, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        win.localStorage.setItem('user', userData);
      },
    });
    cy.get('body').should('not.be.empty');
    cy.wait(2000);
  }

  // ==================== EMR PAGE ====================
  describe('EMR Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('EMR: Load + Search + Click rows + Open detail tabs + Modals + Print + Pagination', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'EMR');
      visitPage('/emr');

      // 1. Search with keyword
      cy.task('log', '  [EMR] Phase 1: Search');
      cy.get('body').then($b => {
        const $search = $b.find('.ant-input-search input:visible, input[placeholder*="Tìm"]:visible');
        if ($search.length > 0) {
          cy.wrap($search.first()).clear().type('Nguyễn{enter}');
          cy.wait(2000);
        }
      });

      // 2. Change status filter
      cy.task('log', '  [EMR] Phase 2: Status filter');
      cy.get('body').then($b => {
        const $select = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        if ($select.length > 0) {
          cy.wrap($select.first()).click({ force: true });
          cy.wait(500);
          // Click first option in dropdown
          cy.get('.ant-select-dropdown:visible .ant-select-item').first().click({ force: true });
          cy.wait(1500);
        }
      });

      // 3. Clear search, reload all
      cy.get('body').then($b => {
        const $reload = $b.find('button .anticon-reload:visible');
        if ($reload.length > 0) {
          cy.wrap($reload.first().closest('button')).click({ force: true });
          cy.wait(1500);
        }
      });

      // 4. Click first 3 table rows (each triggers loadDetail with 5 API calls)
      cy.task('log', '  [EMR] Phase 3: Click table rows');
      const clickEMRRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(2500); // 5 parallel API calls
          }
          clickEMRRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickEMRRow(0, rowCount);
      });

      // 5. Click all detail tabs (Hồ sơ BA, Lịch sử, Timeline, Phiếu điều trị, Hội chẩn, Chăm sóc)
      cy.task('log', '  [EMR] Phase 4: Click all detail tabs');
      const clickDetailTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickDetailTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const tabCount = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (tabCount > 0) clickDetailTab(0, tabCount);
      });

      // 6. Open "Thêm phiếu" (Treatment) modal from Phiếu điều trị tab
      cy.task('log', '  [EMR] Phase 5: Open modals');
      cy.get('body').then($b => {
        // Click "Phiếu điều trị" tab first
        const $tabs = $b.find('[role="tab"]:visible');
        $tabs.each(function () {
          if (Cypress.$(this).text().includes('Phiếu điều trị')) {
            cy.wrap(Cypress.$(this)).click({ force: true });
            cy.wait(800);
            return false; // break
          }
        });
      });
      cy.get('body').then($b => {
        const $addBtn = $b.find('button:contains("Thêm phiếu"):visible');
        if ($addBtn.length > 0) {
          cy.wrap($addBtn.first()).click({ force: true });
          cy.wait(1000);
          // Verify modal appeared and close it
          closeOverlay();
        }
      });

      // 7. Open "Thêm biên bản" (Consultation) modal
      cy.get('body').then($b => {
        const $tabs = $b.find('[role="tab"]:visible');
        $tabs.each(function () {
          if (Cypress.$(this).text().includes('Hội chẩn')) {
            cy.wrap(Cypress.$(this)).click({ force: true });
            cy.wait(800);
            return false;
          }
        });
      });
      cy.get('body').then($b => {
        const $addBtn = $b.find('button:contains("Thêm biên bản"):visible');
        if ($addBtn.length > 0) {
          cy.wrap($addBtn.first()).click({ force: true });
          cy.wait(1000);
          closeOverlay();
        }
      });

      // 8. Open "Thêm phiếu" (Nursing) modal
      cy.get('body').then($b => {
        const $tabs = $b.find('[role="tab"]:visible');
        $tabs.each(function () {
          if (Cypress.$(this).text().includes('Chăm sóc')) {
            cy.wrap(Cypress.$(this)).click({ force: true });
            cy.wait(800);
            return false;
          }
        });
      });
      cy.get('body').then($b => {
        const $addBtn = $b.find('button:contains("Thêm phiếu"):visible');
        if ($addBtn.length > 0) {
          cy.wrap($addBtn.first()).click({ force: true });
          cy.wait(1000);
          closeOverlay();
        }
      });

      // 9. Click print preview buttons
      cy.task('log', '  [EMR] Phase 6: Print previews');
      cy.get('body').then($b => {
        // Click first printer icon button (Tóm tắt BA)
        const $printBtns = $b.find('button .anticon-printer:visible');
        if ($printBtns.length > 0) {
          cy.wrap($printBtns.first().closest('button')).click({ force: true });
          cy.wait(1500);
          closeOverlay();
        }
      });

      // 10. Click "Biểu mẫu khác" dropdown
      cy.get('body').then($b => {
        const $dropdown = $b.find('button:contains("Biểu mẫu khác"):visible');
        if ($dropdown.length > 0) {
          cy.wrap($dropdown.first()).click({ force: true });
          cy.wait(800);
          // Click first menu item
          cy.get('.ant-dropdown:visible .ant-dropdown-menu-item').first().click({ force: true });
          cy.wait(1500);
          closeOverlay();
        }
      });

      // 11. Click "In PDF" dropdown
      cy.get('body').then($b => {
        const $pdfBtn = $b.find('button:contains("In PDF"):visible');
        if ($pdfBtn.length > 0) {
          cy.wrap($pdfBtn.first()).click({ force: true });
          cy.wait(800);
          cy.get('.ant-dropdown:visible .ant-dropdown-menu-item').first().click({ force: true });
          cy.wait(1500);
        }
      });

      // 12. Pagination
      cy.task('log', '  [EMR] Phase 7: Pagination');
      cy.get('body').then($b => {
        const $page2 = $b.find('.ant-pagination-item').filter(function () {
          return Cypress.$(this).text().trim() === '2';
        });
        if ($page2.length > 0) {
          cy.wrap($page2.first()).click({ force: true });
          cy.wait(2000);
        }
      });

      // 13. Date range picker
      cy.task('log', '  [EMR] Phase 8: Date range picker');
      cy.get('body').then($b => {
        const $rangePicker = $b.find('.ant-picker-range:visible');
        if ($rangePicker.length > 0) {
          cy.wrap($rangePicker.first()).click({ force: true });
          cy.wait(500);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('EMR', consoleErrors, networkErrors);
    });
  });

  // ==================== OPD PAGE ====================
  describe('OPD Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('OPD: Room select + Patient queue + Vital signs + Forms + Buttons', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'OPD');
      visitPage('/opd');

      // 1. Click room selector
      cy.task('log', '  [OPD] Phase 1: Room selection');
      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        if ($selects.length > 0) {
          cy.wrap($selects.first()).click({ force: true });
          cy.wait(500);
          cy.get('.ant-select-dropdown:visible .ant-select-item').first().click({ force: true });
          cy.wait(2000);
        }
      });

      // 2. Click patient rows in queue table
      cy.task('log', '  [OPD] Phase 2: Patient queue');
      const clickOPDRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(2000);
          }
          clickOPDRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickOPDRow(0, rowCount);
      });

      // 3. Click all tabs
      cy.task('log', '  [OPD] Phase 3: All tabs');
      const clickOPDTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1200);
          }
          clickOPDTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const tabCount = Math.min($b.find('[role="tab"]:visible').length, 15);
        if (tabCount > 0) clickOPDTab(0, tabCount);
      });

      // 4. Click safe buttons
      cy.get('body').then($b => {
        ['Lưu nháp', 'Hoàn thành', 'Làm mới', 'In phiếu'].forEach(btn => {
          const $btn = $b.find(`button:contains("${btn}"):visible`);
          if ($btn.length > 0) {
            cy.wrap($btn.first()).click({ force: true });
            cy.wait(1000);
            closeOverlay();
          }
        });
      });

      // 5. Click form inputs/textareas (focus triggers)
      cy.get('body').then($b => {
        const $inputs = $b.find('input:visible:not([type="hidden"]):not(.ant-select-selection-search-input)');
        const inputCount = Math.min($inputs.length, 5);
        for (let i = 0; i < inputCount; i++) {
          cy.get('input:visible:not([type="hidden"]):not(.ant-select-selection-search-input)').eq(i).click({ force: true });
          cy.wait(300);
        }
      });

      // 6. Click ClinicalTermSelector tags if present
      cy.get('body').then($b => {
        const $tags = $b.find('.ant-tag:visible');
        const tagCount = Math.min($tags.length, 5);
        for (let i = 0; i < tagCount; i++) {
          cy.get('.ant-tag:visible').eq(i).click({ force: true });
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('OPD', consoleErrors, networkErrors);
    });
  });

  // ==================== RECEPTION PAGE ====================
  describe('Reception Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Reception: Tabs + Registration modal + Search + Table rows + Barcode + Filters', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Reception');
      visitPage('/reception');

      // 1. Click all tabs
      cy.task('log', '  [Reception] Phase 1: Tabs');
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1200);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click table rows
      cy.task('log', '  [Reception] Phase 2: Table rows');
      const clickRRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRRow(0, rowCount);
      });

      // 3. Open registration modal
      cy.task('log', '  [Reception] Phase 3: Registration modal');
      cy.get('body').then($b => {
        const $regBtn = $b.find('button:contains("Đăng ký"):visible, button:contains("Đăng ký kh"):visible');
        if ($regBtn.length > 0) {
          cy.wrap($regBtn.first()).click({ force: true });
          cy.wait(1500);
          // Click through form selects in modal
          cy.get('body').then($modal => {
            const $selects = $modal.find('.ant-modal:visible .ant-select:not(.ant-select-disabled)');
            const selectCount = Math.min($selects.length, 4);
            for (let i = 0; i < selectCount; i++) {
              cy.get('.ant-modal:visible .ant-select:not(.ant-select-disabled)').eq(i).click({ force: true });
              cy.wait(500);
              cy.get('body').type('{esc}');
              cy.wait(300);
            }
          });
          closeOverlay();
        }
      });

      // 4. Click barcode scan button if present
      cy.get('body').then($b => {
        const $scanBtn = $b.find('button:contains("Quét"):visible, button .anticon-scan:visible');
        if ($scanBtn.length > 0) {
          cy.wrap($scanBtn.first().closest ? $scanBtn.first() : $scanBtn.first()).click({ force: true });
          cy.wait(1000);
          closeOverlay();
        }
      });

      // 5. Pagination
      cy.get('body').then($b => {
        const $page2 = $b.find('.ant-pagination-item').filter(function () {
          return Cypress.$(this).text().trim() === '2';
        });
        if ($page2.length > 0) {
          cy.wrap($page2.first()).click({ force: true });
          cy.wait(1500);
        }
      });

      cy.wait(2000);
      reportErrors('Reception', consoleErrors, networkErrors);
    });
  });

  // ==================== BILLING PAGE ====================
  describe('Billing Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Billing: Tabs + Table rows + Modals + Filters + Action buttons', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Billing');
      visitPage('/billing');

      // 1. Click all tabs
      cy.task('log', '  [Billing] Phase 1: Tabs');
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click multiple table rows
      const clickBRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickBRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickBRow(0, rowCount);
      });

      // 3. Click action buttons
      cy.get('body').then($b => {
        ['Tạm ứng', 'Thanh toán', 'Hoàn tiền', 'Tìm kiếm', 'Làm mới'].forEach(btn => {
          const $btn = $b.find(`button:contains("${btn}"):visible`);
          if ($btn.length > 0) {
            cy.wrap($btn.first()).click({ force: true });
            cy.wait(1000);
            closeOverlay();
          }
        });
      });

      // 4. Selects
      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        const selectCount = Math.min($selects.length, 3);
        for (let i = 0; i < selectCount; i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(400);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('Billing', consoleErrors, networkErrors);
    });
  });

  // ==================== INPATIENT PAGE ====================
  describe('Inpatient Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Inpatient: Tabs + Rows + Admission modal + Bed management + Forms', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Inpatient');
      visitPage('/ipd');

      // 1. Click all tabs
      cy.task('log', '  [IPD] Phase 1: All tabs');
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click table rows on each tab
      cy.task('log', '  [IPD] Phase 2: Table rows');
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 3. Open admission modal
      cy.task('log', '  [IPD] Phase 3: Admission modal');
      cy.get('body').then($b => {
        const $admitBtn = $b.find('button:contains("Nhập viện"):visible');
        if ($admitBtn.length > 0) {
          cy.wrap($admitBtn.first()).click({ force: true });
          cy.wait(1500);
          // Click selects in modal
          cy.get('body').then($modal => {
            const $selects = $modal.find('.ant-modal:visible .ant-select:not(.ant-select-disabled)');
            const selectCount = Math.min($selects.length, 4);
            for (let i = 0; i < selectCount; i++) {
              cy.get('.ant-modal:visible .ant-select:not(.ant-select-disabled)').eq(i).click({ force: true });
              cy.wait(500);
              cy.get('body').type('{esc}');
              cy.wait(300);
            }
          });
          closeOverlay();
        }
      });

      // 4. Click bed management tab specific controls
      cy.get('body').then($b => {
        const $tabs = $b.find('[role="tab"]:visible');
        $tabs.each(function () {
          if (Cypress.$(this).text().includes('Giường') || Cypress.$(this).text().includes('giường')) {
            cy.wrap(Cypress.$(this)).click({ force: true });
            cy.wait(1200);
            return false;
          }
        });
      });
      cy.get('body').then($b => {
        const $segments = $b.find('.ant-segmented-item:visible');
        const segCount = Math.min($segments.length, 5);
        for (let i = 0; i < segCount; i++) {
          cy.get('.ant-segmented-item:visible').eq(i).click({ force: true });
          cy.wait(800);
        }
      });

      cy.wait(2000);
      reportErrors('Inpatient', consoleErrors, networkErrors);
    });
  });

  // ==================== LABORATORY PAGE ====================
  describe('Laboratory Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Lab: Tabs + Table rows + Action buttons + Selects + Filters', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Laboratory');
      visitPage('/lab');

      // 1. Click all tabs
      cy.task('log', '  [Lab] Phase 1: All tabs');
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click table rows
      cy.task('log', '  [Lab] Phase 2: Table rows');
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 3. Click action icons in tables
      cy.get('body').then($b => {
        const $actions = $b.find('.ant-table-tbody .anticon-eye:visible, .ant-table-tbody .anticon-edit:visible, .ant-table-tbody .anticon-check:visible');
        const actionCount = Math.min($actions.length, 3);
        for (let i = 0; i < actionCount; i++) {
          cy.get('.ant-table-tbody .anticon-eye:visible, .ant-table-tbody .anticon-edit:visible').eq(i).click({ force: true });
          cy.wait(1500);
          closeOverlay();
        }
      });

      // 4. Selects
      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        const selectCount = Math.min($selects.length, 3);
        for (let i = 0; i < selectCount; i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(400);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('Laboratory', consoleErrors, networkErrors);
    });
  });

  // ==================== PHARMACY PAGE ====================
  describe('Pharmacy Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Pharmacy: Tabs + Rows + Search + Dispense actions + Inventory', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Pharmacy');
      visitPage('/pharmacy');

      // 1. Click all tabs
      cy.task('log', '  [Pharmacy] Phase 1: All tabs');
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click table rows on active tab
      cy.task('log', '  [Pharmacy] Phase 2: Table rows');
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 3. Search in active tab
      cy.get('body').then($b => {
        const $search = $b.find('.ant-tabs-tabpane-active input[type="text"]:visible, .ant-tabs-tabpane-active .ant-input-search input:visible');
        if ($search.length > 0) {
          cy.wrap($search.first()).clear().type('Paracetamol{enter}');
          cy.wait(1500);
        }
      });

      // 4. Click transfer/add buttons
      cy.get('body').then($b => {
        ['Điều chuyển', 'Phát thuốc', 'Tiếp nhận'].forEach(btn => {
          const $btn = $b.find(`button:contains("${btn}"):visible`);
          if ($btn.length > 0) {
            cy.wrap($btn.first()).click({ force: true });
            cy.wait(1000);
            closeOverlay();
          }
        });
      });

      cy.wait(2000);
      reportErrors('Pharmacy', consoleErrors, networkErrors);
    });
  });

  // ==================== RADIOLOGY PAGE ====================
  describe('Radiology Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Radiology: Tabs + Rows + Result forms + Print + Selects', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Radiology');
      visitPage('/radiology');

      // 1. Click all 8 tabs
      cy.task('log', '  [Radiology] Phase 1: All tabs');
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click table rows
      cy.task('log', '  [Radiology] Phase 2: Table rows');
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 3. Selects
      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        const selectCount = Math.min($selects.length, 3);
        for (let i = 0; i < selectCount; i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(400);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      // 4. Segmented controls
      cy.get('body').then($b => {
        const $segments = $b.find('.ant-segmented-item:visible');
        const segCount = Math.min($segments.length, 5);
        for (let i = 0; i < segCount; i++) {
          cy.get('.ant-segmented-item:visible').eq(i).click({ force: true });
          cy.wait(800);
        }
      });

      cy.wait(2000);
      reportErrors('Radiology', consoleErrors, networkErrors);
    });
  });

  // ==================== MASTER DATA PAGE ====================
  describe('MasterData Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('MasterData: Category tree + CRUD modals + Table rows + Pagination + Search', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'MasterData');
      visitPage('/master-data');

      // 1. Click category tree items
      cy.task('log', '  [MasterData] Phase 1: Category tree');
      cy.get('body').then($b => {
        const $treeNodes = $b.find('.ant-tree-treenode:visible .ant-tree-node-content-wrapper');
        const nodeCount = Math.min($treeNodes.length, 8);
        if (nodeCount > 0) {
          cy.task('log', `  [MasterData] Clicking ${nodeCount} tree nodes...`);
        }
      });
      const clickTreeNode = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $nodes = $b.find('.ant-tree-treenode:visible .ant-tree-node-content-wrapper');
          if (idx < $nodes.length) {
            cy.wrap($nodes.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTreeNode(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('.ant-tree-treenode:visible .ant-tree-node-content-wrapper').length, 8);
        if (max > 0) clickTreeNode(0, max);
      });

      // 2. Click tabs
      cy.task('log', '  [MasterData] Phase 2: Tabs');
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 5);
        if (max > 0) clickTab(0, max);
      });

      // 3. Click table rows (double click for detail)
      cy.task('log', '  [MasterData] Phase 3: Table rows');
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(800);
            cy.wrap($rows.eq(idx)).dblclick({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 4. "Thêm mới" button
      cy.get('body').then($b => {
        const $addBtn = $b.find('button:contains("Thêm"):visible');
        if ($addBtn.length > 0) {
          cy.wrap($addBtn.first()).click({ force: true });
          cy.wait(1500);
          closeOverlay();
        }
      });

      // 5. Search (force: true to handle modal overlay)
      cy.get('body').then($b => {
        const $search = $b.find('.ant-input-search input:visible, input[placeholder*="Tìm"]:visible');
        if ($search.length > 0) {
          cy.wrap($search.first()).clear({ force: true }).type('khoa{enter}', { force: true });
          cy.wait(1500);
        }
      });

      // 6. Pagination
      cy.get('body').then($b => {
        const $pages = $b.find('.ant-pagination-item');
        if ($pages.length > 1) {
          cy.wrap($pages.eq(1)).click({ force: true });
          cy.wait(1500);
        }
      });

      cy.wait(2000);
      reportErrors('MasterData', consoleErrors, networkErrors);
    });
  });

  // ==================== SURGERY PAGE ====================
  describe('Surgery Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Surgery: Tabs + Rows + Request modal + Calendar + Selects', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Surgery');
      visitPage('/surgery');

      // 1. Click all tabs
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click table rows
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 3. Selects
      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        const selectCount = Math.min($selects.length, 3);
        for (let i = 0; i < selectCount; i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(400);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      // 4. Action buttons
      cy.get('body').then($b => {
        ['Yêu cầu', 'Thêm', 'Lịch mổ'].forEach(btn => {
          const $btn = $b.find(`button:contains("${btn}"):visible`);
          if ($btn.length > 0) {
            cy.wrap($btn.first()).click({ force: true });
            cy.wait(1000);
            closeOverlay();
          }
        });
      });

      cy.wait(2000);
      reportErrors('Surgery', consoleErrors, networkErrors);
    });
  });

  // ==================== INSURANCE PAGE ====================
  describe('Insurance Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Insurance: Tabs + Rows + Sync + Filters + Selects', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Insurance');
      visitPage('/insurance');

      // 1. Click all tabs
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click table rows
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 3. Safe buttons
      cy.get('body').then($b => {
        ['Đồng bộ', 'Tìm kiếm', 'Làm mới', 'Kiểm tra'].forEach(btn => {
          const $btn = $b.find(`button:contains("${btn}"):visible`);
          if ($btn.length > 0) {
            cy.wrap($btn.first()).click({ force: true });
            cy.wait(1000);
          }
        });
      });

      // 4. Selects
      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        const selectCount = Math.min($selects.length, 3);
        for (let i = 0; i < selectCount; i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(400);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      // 5. Date pickers
      cy.get('body').then($b => {
        const $pickers = $b.find('.ant-picker:visible');
        if ($pickers.length > 0) {
          cy.wrap($pickers.first()).click({ force: true });
          cy.wait(500);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('Insurance', consoleErrors, networkErrors);
    });
  });

  // ==================== REPORTS PAGE ====================
  describe('Reports Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Reports: All tabs + Cards + Filters + Action buttons', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Reports');
      visitPage('/reports');

      // 1. Click all tabs
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 12);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click report cards/buttons (re-query DOM each time to avoid detached elements)
      const clickCard = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $cards = $b.find('.ant-card:visible');
          if (idx < $cards.length) {
            cy.wrap($cards.eq(idx)).click({ force: true });
            cy.wait(500);
          }
          clickCard(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const cardCount = Math.min($b.find('.ant-card:visible').length, 5);
        if (cardCount > 0) clickCard(0, cardCount);
      });

      // 3. Click "Xem" / "Xuất" / "In" buttons
      cy.get('body').then($b => {
        ['Xem báo cáo', 'Xuất Excel', 'In', 'Xem', 'Tải'].forEach(btn => {
          const $btn = $b.find(`button:contains("${btn}"):visible`);
          if ($btn.length > 0) {
            cy.wrap($btn.first()).click({ force: true });
            cy.wait(1000);
            closeOverlay();
          }
        });
      });

      // 4. Date pickers
      cy.get('body').then($b => {
        const $pickers = $b.find('.ant-picker:visible');
        if ($pickers.length > 0) {
          cy.wrap($pickers.first()).click({ force: true });
          cy.wait(500);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('Reports', consoleErrors, networkErrors);
    });
  });

  // ==================== SYSTEM ADMIN PAGE ====================
  describe('SystemAdmin Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('SystemAdmin: All tabs + User/Role tables + CRUD modals + Config + Audit log', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'SystemAdmin');
      visitPage('/admin');

      // 1. Click all tabs
      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      // 2. Click table rows
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 3. Add user/role buttons
      cy.get('body').then($b => {
        ['Thêm', 'Tạo', 'Thêm mới'].forEach(btn => {
          const $btn = $b.find(`button:contains("${btn}"):visible`);
          if ($btn.length > 0) {
            cy.wrap($btn.first()).click({ force: true });
            cy.wait(1000);
            closeOverlay();
          }
        });
      });

      // 4. Audit log filters
      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        const selectCount = Math.min($selects.length, 4);
        for (let i = 0; i < selectCount; i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(400);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      // 5. Pagination
      cy.get('body').then($b => {
        const $pages = $b.find('.ant-pagination-item');
        if ($pages.length > 1) {
          cy.wrap($pages.eq(1)).click({ force: true });
          cy.wait(1500);
        }
      });

      cy.wait(2000);
      reportErrors('SystemAdmin', consoleErrors, networkErrors);
    });
  });

  // ==================== PRESCRIPTION PAGE ====================
  describe('Prescription Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Prescription: Search + Patient select + Medicine modal + Interaction check', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Prescription');
      visitPage('/prescription');

      // 1. Search patient
      cy.get('body').then($b => {
        const $search = $b.find('input[placeholder*="Tìm"]:visible, .ant-input-search input:visible');
        if ($search.length > 0) {
          cy.wrap($search.first()).clear().type('Nguyễn{enter}');
          cy.wait(2000);
        }
      });

      // 2. Click table rows
      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      // 3. Click "Thêm thuốc" or medicine-related buttons
      cy.get('body').then($b => {
        ['Thêm thuốc', 'Thêm', 'Kê đơn'].forEach(btn => {
          const $btn = $b.find(`button:contains("${btn}"):visible`);
          if ($btn.length > 0) {
            cy.wrap($btn.first()).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
        });
      });

      // 4. Selects
      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        const selectCount = Math.min($selects.length, 3);
        for (let i = 0; i < selectCount; i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(400);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('Prescription', consoleErrors, networkErrors);
    });
  });

  // ==================== DASHBOARD ====================
  describe('Dashboard Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Dashboard: Charts + Segmented + Stats + Refresh', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Dashboard');
      visitPage('/');

      // 1. Click Segmented controls (chart views)
      cy.get('body').then($b => {
        const $segments = $b.find('.ant-segmented-item:visible');
        const segCount = Math.min($segments.length, 5);
        for (let i = 0; i < segCount; i++) {
          cy.get('.ant-segmented-item:visible').eq(i).click({ force: true });
          cy.wait(1000);
        }
      });

      // 2. Click statistic cards
      cy.get('body').then($b => {
        const $stats = $b.find('.ant-statistic:visible');
        const statCount = Math.min($stats.length, 6);
        for (let i = 0; i < statCount; i++) {
          cy.get('.ant-statistic:visible').eq(i).click({ force: true });
          cy.wait(300);
        }
      });

      // 3. Click refresh
      cy.get('body').then($b => {
        const $refresh = $b.find('button:contains("Làm mới"):visible, button .anticon-reload:visible');
        if ($refresh.length > 0) {
          cy.wrap($refresh.first().closest ? $refresh.first() : $refresh.first()).click({ force: true });
          cy.wait(2000);
        }
      });

      // 4. Click cards/progress bars
      cy.get('body').then($b => {
        const $cards = $b.find('.ant-card:visible');
        const cardCount = Math.min($cards.length, 5);
        for (let i = 0; i < cardCount; i++) {
          cy.get('.ant-card:visible').eq(i).click({ force: true });
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('Dashboard', consoleErrors, networkErrors);
    });
  });

  // ==================== FINANCE PAGE ====================
  describe('Finance Page - Deep Interactions', () => {
    const consoleErrors: string[] = [];
    const networkErrors: Array<{ method: string; path: string; status: number }> = [];

    it('Finance: Tabs + Table rows + Selects + Buttons', () => {
      setupErrorTracking(consoleErrors, networkErrors, 'Finance');
      visitPage('/finance');

      const clickTab = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $tabs = $b.find('[role="tab"]:visible');
          if (idx < $tabs.length) {
            cy.wrap($tabs.eq(idx)).click({ force: true });
            cy.wait(1500);
          }
          clickTab(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const max = Math.min($b.find('[role="tab"]:visible').length, 10);
        if (max > 0) clickTab(0, max);
      });

      const clickRow = (idx: number, max: number) => {
        if (idx >= max) return;
        cy.get('body').then($b => {
          const $rows = $b.find('.ant-table-tbody tr.ant-table-row');
          if (idx < $rows.length) {
            cy.wrap($rows.eq(idx)).click({ force: true });
            cy.wait(1500);
            closeOverlay();
          }
          clickRow(idx + 1, max);
        });
      };
      cy.get('body').then($b => {
        const rowCount = Math.min($b.find('.ant-table-tbody tr.ant-table-row').length, 3);
        if (rowCount > 0) clickRow(0, rowCount);
      });

      cy.get('body').then($b => {
        const $selects = $b.find('.ant-select:visible:not(.ant-select-disabled)');
        for (let i = 0; i < Math.min($selects.length, 3); i++) {
          cy.get('.ant-select:visible:not(.ant-select-disabled)').eq(i).click({ force: true });
          cy.wait(400);
          cy.get('body').type('{esc}');
          cy.wait(300);
        }
      });

      cy.wait(2000);
      reportErrors('Finance', consoleErrors, networkErrors);
    });
  });
});
