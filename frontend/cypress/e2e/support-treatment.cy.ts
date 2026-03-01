/// <reference types="cypress" />

/**
 * Test nhóm "Hỗ trợ điều trị": Pharmacy, Nutrition, Rehabilitation
 * Click vào từng tab, kiểm tra console errors.
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'Failed to start the connection',
  'connection was stopped during negotiation',
];

function isIgnored(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => msg.includes(p));
}

describe('Hỗ trợ điều trị - Deep Tab Testing', () => {
  let token: string;
  let userData: string;

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

  function setupPage(route: string, consoleErrors: string[], serverErrors: string[]) {
    cy.on('uncaught:exception', () => false);

    cy.intercept('**/api/**', (req) => {
      req.continue((res) => {
        if (res.statusCode >= 500) {
          serverErrors.push(`${req.method} ${req.url} => ${res.statusCode}`);
        }
      });
    }).as('api');

    cy.visit(route, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        win.localStorage.setItem('user', userData);
        const origError = win.console.error;
        win.console.error = (...args: any[]) => {
          const msg = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
          if (!isIgnored(msg)) consoleErrors.push(msg);
          origError.apply(win.console, args);
        };
      },
    });

    cy.wait(2000);
  }

  function assertNoErrors(name: string, consoleErrors: string[], serverErrors: string[]) {
    cy.then(() => {
      if (consoleErrors.length > 0) {
        const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 300)}`).join('\n');
        throw new Error(`Console errors on ${name}:\n${list}`);
      }
    });
    cy.then(() => {
      if (serverErrors.length > 0) {
        throw new Error(`Server 500 on ${name}:\n${serverErrors.join('\n')}`);
      }
    });
  }

  // ==================== PHARMACY ====================
  describe('Pharmacy (/pharmacy)', () => {
    const tabs = [
      { key: 'pending', label: 'Don thuoc cho xu ly' },
      { key: 'inventory', label: 'Ton kho' },
      { key: 'transfers', label: 'Dieu chuyen' },
      { key: 'alerts', label: 'Canh bao' },
    ];

    tabs.forEach(({ key, label }) => {
      it(`Tab: ${label} (${key})`, () => {
        const errors: string[] = [];
        const serverErrors: string[] = [];
        setupPage('/pharmacy', errors, serverErrors);

        // Click tab
        cy.get(`[data-node-key="${key}"]`).click({ force: true });
        cy.wait(2000);

        assertNoErrors(`Pharmacy/${key}`, errors, serverErrors);
      });
    });
  });

  // ==================== NUTRITION ====================
  describe('Nutrition (/nutrition)', () => {
    const tabs = [
      { key: 'patients', label: 'Benh nhan noi tru' },
      { key: 'meals', label: 'Quan ly bua an' },
      { key: 'diet_types', label: 'Che do an dac biet' },
    ];

    tabs.forEach(({ key, label }) => {
      it(`Tab: ${label} (${key})`, () => {
        const errors: string[] = [];
        const serverErrors: string[] = [];
        setupPage('/nutrition', errors, serverErrors);

        cy.get(`[data-node-key="${key}"]`).click({ force: true });
        cy.wait(2000);

        assertNoErrors(`Nutrition/${key}`, errors, serverErrors);
      });
    });
  });

  // ==================== REHABILITATION ====================
  describe('Rehabilitation (/rehabilitation)', () => {
    const tabs = [
      { key: 'patients', label: 'Benh nhan PHCN' },
      { key: 'schedule', label: 'Lich tap hom nay' },
      { key: 'exercises', label: 'Bai tap mau' },
    ];

    tabs.forEach(({ key, label }) => {
      it(`Tab: ${label} (${key})`, () => {
        const errors: string[] = [];
        const serverErrors: string[] = [];
        setupPage('/rehabilitation', errors, serverErrors);

        cy.get(`[data-node-key="${key}"]`).click({ force: true });
        cy.wait(2000);

        assertNoErrors(`Rehabilitation/${key}`, errors, serverErrors);
      });
    });
  });
});
