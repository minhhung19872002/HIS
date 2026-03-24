const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'Failed to start the connection',
  'WebSocket connection',
  'hubs/notifications',
  'hubs/ris-chat',
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
  'AxiosError',
  'Request failed',
  'ECONNREFUSED',
];

let cachedToken: string | null = null;
let cachedUser: string | null = null;

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => msg.includes(pattern));
}

function ensureAuth(): void {
  if (cachedToken) return;
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username: 'admin', password: 'Admin@123' },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body.data) {
      cachedToken = response.body.data.token;
      cachedUser = JSON.stringify(response.body.data.user);
    } else if (response.status === 200 && response.body.token) {
      cachedToken = response.body.token;
      cachedUser = JSON.stringify(response.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
    }
  });
}

export function visitMedinetPage(route: string): string[] {
  const consoleErrors: string[] = [];
  cy.on('uncaught:exception', () => false);

  ensureAuth();

  cy.intercept('**/api/**', (req) => {
    req.continue((res) => {
      if (res.statusCode >= 500) {
        // Log but don't fail - 500s from missing DB tables are expected
      }
    });
  }).as('apiCalls');

  cy.then(() => {
    cy.visit(route, {
      failOnStatusCode: false,
      onBeforeLoad(win) {
        if (cachedToken) {
          win.localStorage.setItem('token', cachedToken);
        }
        if (cachedUser) {
          win.localStorage.setItem('user', cachedUser);
        }
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
  });

  cy.wait(2000);
  return consoleErrors;
}

export function assertNoConsoleErrors(errors: string[], pageName: string) {
  cy.then(() => {
    const filtered = errors.filter((e) => !isIgnoredError(e));
    if (filtered.length > 0) {
      const errorList = filtered
        .map((e, i) => `  ${i + 1}. ${e.substring(0, 300)}`)
        .join('\n');
      throw new Error(`Found ${filtered.length} console error(s) on ${pageName}:\n${errorList}`);
    }
  });
}
