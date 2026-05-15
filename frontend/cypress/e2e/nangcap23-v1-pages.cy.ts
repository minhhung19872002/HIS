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

const PAGES: { path: string; cardTitle: string | RegExp; name: string }[] = [
  { path: '/national-gateways',      cardTitle: /Cổng quốc gia/, name: 'National Gateways' },
  { path: '/de-an-06',               cardTitle: /Đề án 06/, name: 'Đề án 06 Liaison' },
  { path: '/linen-management',       cardTitle: /đồ giặt vải/i, name: 'Linen Management' },
  { path: '/functional-diagnostics', cardTitle: /Thăm dò chức năng/, name: 'Functional Diagnostics' },
  { path: '/zalo-notifications',     cardTitle: /Zalo Official Account/, name: 'Zalo Notifications' },
  { path: '/quality-dashboard-live', cardTitle: /Bảng điều khiển chất lượng/, name: 'Quality Dashboard Live' },
];

describe('NangCap23 v1 — 6 pages in MainLayout', () => {
  beforeEach(() => {
    cy.intercept('**/api/**').as('apiAny');
    cy.login('admin', 'Admin@123');
  });

  PAGES.forEach(({ path, cardTitle, name }) => {
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
      // Scope contains to .ant-card-head-title so sidebar menu items don't match
      cy.contains('.ant-card-head-title', cardTitle, { timeout: 12000 }).should('be.visible');
      cy.wait(800);
      cy.then(() => {
        expect(consoleErrors, `console errors on ${path}`).to.deep.eq([]);
      });
    });
  });

  it('National Gateways v1 — 3 tabs work', () => {
    cy.visit('/national-gateways');
    cy.contains('.ant-card-head-title', /Cổng quốc gia/, { timeout: 10000 }).should('be.visible');
    cy.contains('.ant-tabs-tab', 'Dược Quốc Gia').click();
    cy.contains('button', 'Tạo & gửi').should('be.visible');
    cy.contains('.ant-tabs-tab', 'Cấu hình').click();
    cy.contains('.ant-card-head-title', 'Cấu hình cổng quốc gia').should('be.visible');
  });

  it('Đề án 06 v1 — 3 cert tabs work', () => {
    cy.visit('/de-an-06');
    cy.contains('.ant-card-head-title', /Đề án 06/, { timeout: 10000 }).should('be.visible');
    cy.contains('.ant-tabs-tab', 'Giấy báo tử').click();
    cy.wait(300);
    cy.contains('.ant-tabs-tab', 'Giấy KSK lái xe').click();
    cy.wait(300);
    cy.contains('.ant-tabs-tab', 'Giấy chứng sinh').click();
  });

  it('Linen v1 — 3 tabs work', () => {
    cy.visit('/linen-management');
    cy.contains('.ant-card-head-title', /đồ giặt/i, { timeout: 10000 }).should('be.visible');
    cy.contains('.ant-tabs-tab', 'Giao nhận giặt').click();
    cy.wait(300);
    cy.contains('.ant-tabs-tab', 'Lịch tiệt trùng').click();
    cy.wait(300);
  });

  it('Functional Diagnostics v1 — page loads', () => {
    cy.visit('/functional-diagnostics');
    cy.contains('.ant-card-head-title', /Thăm dò chức năng/, { timeout: 10000 }).should('be.visible');
    // Verify 4 KPI cards
    cy.get('.ant-statistic-title').should('have.length.gte', 4);
  });

  it('Zalo Notifications v1 — send modal opens', () => {
    cy.visit('/zalo-notifications');
    cy.contains('.ant-card-head-title', /Zalo Official Account/, { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Gửi thử').click();
    cy.contains('.ant-modal-title', 'Gửi tin Zalo (ZNS)').should('be.visible');
    cy.contains('.ant-modal button', 'Hủy').click();
  });

  it('Quality Dashboard Live v1 — 5 views switchable', () => {
    cy.visit('/quality-dashboard-live');
    cy.contains('.ant-card-head-title', /Bảng điều khiển chất lượng/, { timeout: 10000 }).should('be.visible');
    ['2. Nội trú', '3. Cận lâm sàng', '4. Xét nghiệm', '5. Doanh thu', '1. Phòng khám'].forEach((label) => {
      cy.contains('.ant-tabs-tab', label).click();
      cy.wait(300);
    });
  });

  it('Menu — 6 NangCap23 items appear in MainLayout sidebar', () => {
    cy.visit('/');
    cy.wait(1500);

    // Just verify items exist anywhere in sidebar (may be inside collapsed submenu)
    cy.get('.ant-menu').then(() => {
      // Open Cận lâm sàng submenu
      cy.contains('.ant-menu-submenu-title', 'Cận lâm sàng').click({ force: true });
      cy.wait(400);
      cy.contains('.ant-menu-item', 'Thăm dò chức năng').should('exist');
    });

    cy.contains('.ant-menu-submenu-title', 'Quản lý').first().click({ force: true });
    cy.wait(400);
    cy.contains('.ant-menu-item', /DB Chất lượng/).should('exist');
    cy.contains('.ant-menu-item', /Đồ giặt/).should('exist');

    cy.contains('.ant-menu-submenu-title', 'Liên thông').click({ force: true });
    cy.wait(400);
    cy.contains('.ant-menu-item', /Cổng Đơn thuốc \/ Dược QG/).should('exist');
    cy.contains('.ant-menu-item', /Đề án 06/).should('exist');
    cy.contains('.ant-menu-item', /Zalo OA/).should('exist');
  });

  it('Backend health — 12 endpoints return 200', () => {
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
          expect(resp.status, ep).to.eq(200);
        });
      });
    });
  });
});
