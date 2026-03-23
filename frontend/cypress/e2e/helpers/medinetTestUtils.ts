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
  'Failed to fetch',
  'net::ERR_',
  'SignalR',
  'HubConnection',
  'is deprecated',
  'Warning: [antd:',
];

const TEST_TOKEN = 'test-token';
const TEST_USER = JSON.stringify({ id: 1, username: 'admin', roles: ['Admin'] });

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => msg.includes(pattern));
}

export function visitMedinetPage(route: string): string[] {
  const consoleErrors: string[] = [];
  cy.on('uncaught:exception', () => false);

  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 200,
    body: { id: '1', fullName: 'Test User' },
  });
  cy.intercept('GET', '**/api/notifications/unread-count', {
    statusCode: 200,
    body: { count: 0 },
  });
  cy.intercept('GET', '**/api/dashboard/**', {
    statusCode: 200,
    body: {},
  });
  cy.intercept('**/api/**').as('apiCalls');

  cy.visit('/', {
    failOnStatusCode: false,
    onBeforeLoad(win) {
      win.localStorage.setItem('token', TEST_TOKEN);
      win.localStorage.setItem('authToken', TEST_TOKEN);
      win.localStorage.setItem('user', TEST_USER);
      const origError = win.console.error;
      win.console.error = (...args: unknown[]) => {
        const msg = args
          .map((a) => {
            if (typeof a === 'string') return a;
            if (a instanceof Error) return `${a.name}: ${a.message}`;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(' ');
        if (!isIgnoredError(msg)) {
          consoleErrors.push(msg);
        }
        origError.apply(win.console, args as []);
      };
    },
  });

  cy.window().then((win) => {
    win.history.pushState({}, '', route);
    win.dispatchEvent(new PopStateEvent('popstate'));
  });

  cy.wait(1200);
  return consoleErrors;
}

export function assertNoConsoleErrors(errors: string[], pageName: string) {
  cy.then(() => {
    if (errors.length > 0) {
      const errorList = errors
        .map((e, i) => `  ${i + 1}. ${e.substring(0, 300)}`)
        .join('\n');
      throw new Error(`Found ${errors.length} console error(s) on ${pageName}:\n${errorList}`);
    }
  });
}
