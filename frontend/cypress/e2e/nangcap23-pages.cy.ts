/// <reference types="cypress" />

const IGNORE_PATTERNS = [
  /Download the React DevTools/,
  /\[antd:/,
  /useForm/,
  /not connected to any Form/,
  /SignalR/i,
  /WebSocket/,
  /\[HMR\]/,
  /\[vite\]/,
  /findDOMNode/,
];

const PAGES: { path: string; testId: string; name: string }[] = [
  { path: '/v2/national-gateways',      testId: 'national-gateways-page',      name: 'National Gateways' },
  { path: '/v2/de-an-06',               testId: 'de-an-06-page',               name: 'Đề án 06 Liaison' },
  { path: '/v2/linen-management',       testId: 'linen-management-page',       name: 'Linen Management' },
  { path: '/v2/functional-diagnostics', testId: 'functional-diagnostics-page', name: 'Functional Diagnostics' },
  { path: '/v2/zalo-notifications',     testId: 'zalo-notifications-page',     name: 'Zalo Notifications' },
  { path: '/v2/quality-dashboard-live', testId: 'quality-dashboard-page',      name: 'Quality Dashboard Live' },
];

describe('NangCap23 — 6 new pages (gap #1-9)', () => {
  beforeEach(() => {
    cy.intercept('**/api/**').as('apiAny');
    cy.login('admin', 'Admin@123');
  });

  PAGES.forEach(({ path, testId, name }) => {
    it(`${name} loads at ${path}`, () => {
      const consoleErrors: string[] = [];
      cy.on('window:before:load', (win) => {
        const orig = win.console.error;
        win.console.error = (...args: unknown[]) => {
          const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
          if (!IGNORE_PATTERNS.some((p) => p.test(msg))) consoleErrors.push(msg);
          orig.apply(win.console, args as never);
        };
      });
      cy.visit(path);
      cy.get(`[data-testid="${testId}"]`, { timeout: 15000 }).should('be.visible');
      cy.wait(1000);
      cy.then(() => {
        expect(consoleErrors, `console errors on ${path}`).to.deep.eq([]);
      });
    });
  });

  it('National Gateways — switches 3 tabs and shows config panel', () => {
    cy.visit('/v2/national-gateways');
    cy.get('[data-testid="national-gateways-page"]', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Dược QG').click();
    cy.wait(400);
    cy.contains('button', 'Cấu hình').click();
    cy.get('[data-testid="gateway-config-panel"]', { timeout: 5000 }).should('be.visible');
    cy.contains('Cổng quốc gia').should('be.visible');
  });

  it('Đề án 06 — switches 3 certificate tabs', () => {
    cy.visit('/v2/de-an-06');
    cy.get('[data-testid="de-an-06-page"]', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Giấy báo tử').click();
    cy.wait(300);
    cy.contains('button', 'Giấy KSK lái xe').click();
    cy.wait(300);
    cy.contains('button', 'Giấy chứng sinh').click();
  });

  it('Linen Management — switches items / transactions / sterilization tabs', () => {
    cy.visit('/v2/linen-management');
    cy.get('[data-testid="linen-management-page"]', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Giao nhận giặt').click();
    cy.wait(300);
    cy.contains('button', 'Lịch tiệt trùng').click();
    cy.wait(300);
    cy.contains('button', 'Danh mục đồ vải').click();
  });

  it('Functional Diagnostics — 8 test types in filter', () => {
    cy.visit('/v2/functional-diagnostics');
    cy.get('[data-testid="functional-diagnostics-page"]', { timeout: 10000 }).should('be.visible');
    cy.get('select.ab-sel').first().select('ECG');
    cy.wait(300);
    cy.get('select.ab-sel').first().select('Endoscopy');
    cy.wait(300);
  });

  it('Zalo Notifications — opens send modal with templates', () => {
    cy.visit('/v2/zalo-notifications');
    cy.get('[data-testid="zalo-notifications-page"]', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Gửi thử').click();
    cy.contains('Gửi tin Zalo (ZNS)').should('be.visible');
    // Cancel
    cy.contains('button', 'Hủy').click();
  });

  it('Quality Dashboard Live — 5 views switchable', () => {
    cy.visit('/v2/quality-dashboard-live');
    cy.get('[data-testid="quality-dashboard-page"]', { timeout: 10000 }).should('be.visible');
    const tabs = ['Nội trú', 'Cận lâm sàng', 'Xét nghiệm', 'Doanh thu trong ngày', 'Phòng khám'];
    tabs.forEach((label) => {
      cy.contains('button', label).first().click();
      cy.wait(300);
    });
  });

  it('Backend health — all 6 endpoints return 200', () => {
    cy.window().then((win) => {
      const token = win.localStorage.getItem('token');
      const endpoints = [
        '/api/national-prescription-gateway',
        '/api/national-pharmacy',
        '/api/de-an-06/birth-certificates',
        '/api/de-an-06/death-certificates',
        '/api/de-an-06/driving-license-checks',
        '/api/linen/items',
        '/api/linen/transactions',
        '/api/linen/sterilization-schedules',
        '/api/functional-diagnostics',
        '/api/zalo-notification',
        '/api/quality-dashboard',
        '/api/functional-diagnostics/test-types',
      ];
      endpoints.forEach((ep) => {
        cy.request({
          url: ep,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((resp) => {
          expect(resp.status, `${ep}`).to.eq(200);
        });
      });
    });
  });
});
