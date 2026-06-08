/// <reference types="cypress" />
export {}; // module scope — tránh trùng biến top-level với spec khác khi tsc compile gộp

/**
 * Regression smoke — feature deploy 2026-06-06.
 *
 * Bám pattern console-errors.cy.ts: STUB toàn bộ /api/** (không cần backend),
 * set token giả + localStorage, hook console.error, lọc IGNORE_PATTERNS, assert sạch.
 *
 * Mục tiêu: bảo đảm các trang chứa thay đổi phiên này render KHÔNG vỡ:
 *  - /reception : VisitActionsModals (fix đảo nhãn đối tượng BHYT/Viện phí — PAYMENT_TYPES)
 *  - /ipd       : Inpatient → TreatmentMonitorSection → DischargePrescriptionModal (G-07 toa về)
 *                 + CabinetIssueModal export ItemPicker (reuse)
 *  - /emr       : PrintTemplateRenderer (G-37 thêm printType xn-coagulation/xn-urinalysis)
 *
 * KHÔNG mock data sâu (visit/admission) nên đây là smoke render-level; flow đầy đủ
 * (mở modal toa về, dropdown đối tượng) cần backend + data → để spec functional riêng/CI.
 */

const PAGES = [
  { route: '/reception', name: 'Reception — fix doi tuong BHYT (VisitActionsModals)' },
  { route: '/ipd', name: 'Inpatient — G-07 toa ve (TreatmentMonitorSection)' },
  { route: '/emr', name: 'EMR — G-37 print XN (PrintTemplateRenderer)' },
];

const IGNORE_PATTERNS = [
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
  'Static function can not consume context',
  '%o',
];

const isIgnored = (msg: string) => IGNORE_PATTERNS.some((p) => msg.includes(p));

const user = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  fullName: 'Cypress Admin',
  roles: ['Admin'],
  permissions: [],
};

function stubBody(url: string) {
  if (url.includes('/api/auth/me')) return { success: true, data: user };
  if (url.includes('/api/notification/unread-count')) return { count: 0 };
  if (url.includes('/api/notification/my')) return [];
  return { items: [], totalCount: 0 };
}

describe('Regression smoke — deploy 2026-06-06', () => {
  const token = 'cypress-recent-features-token';
  const userData = JSON.stringify(user);

  PAGES.forEach(({ route, name }) => {
    it(`${name} (${route}) — render khong console error`, () => {
      const consoleErrors: string[] = [];
      cy.on('uncaught:exception', () => false);

      cy.intercept('**/api/**', (req) => {
        req.reply((res) => res.send({ statusCode: 200, body: stubBody(req.url) }));
      }).as('apiCalls');

      cy.visit(route, {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
          const orig = win.console.error;
          win.console.error = (...args: unknown[]) => {
            const msg = args
              .map((a) => (typeof a === 'string' ? a : a instanceof Error ? `${a.name}: ${a.message}` : (() => { try { return JSON.stringify(a); } catch { return String(a); } })()))
              .join(' ');
            if (!isIgnored(msg)) consoleErrors.push(msg);
            orig.apply(win.console, args);
          };
        },
      });

      cy.wait(3000);
      cy.get('body').should('not.be.empty');

      cy.then(() => {
        if (consoleErrors.length > 0) {
          const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 300)}`).join('\n');
          throw new Error(`Console error tren ${name} (${route}):\n${list}`);
        }
      });
    });
  });
});
