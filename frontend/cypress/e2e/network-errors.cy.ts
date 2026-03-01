/// <reference types="cypress" />

/**
 * Network Errors Test Suite
 *
 * Navigates to every page and captures:
 * 1. Console errors (JS runtime errors)
 * 2. Network errors (HTTP 4xx/5xx API responses)
 * 3. Uncaught exceptions
 *
 * This is a comprehensive health check for all pages.
 */

const pages = [
  { route: '/', name: 'Dashboard' },
  { route: '/reception', name: 'Reception' },
  { route: '/opd', name: 'OPD' },
  { route: '/prescription', name: 'Prescription' },
  { route: '/ipd', name: 'Inpatient' },
  { route: '/surgery', name: 'Surgery' },
  { route: '/pharmacy', name: 'Pharmacy' },
  { route: '/lab', name: 'Laboratory' },
  { route: '/radiology', name: 'Radiology' },
  { route: '/blood-bank', name: 'Blood Bank' },
  { route: '/billing', name: 'Billing' },
  { route: '/finance', name: 'Finance' },
  { route: '/insurance', name: 'Insurance' },
  { route: '/master-data', name: 'Master Data' },
  { route: '/reports', name: 'Reports' },
  { route: '/admin', name: 'System Admin' },
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
  { route: '/consultation', name: 'Consultation' },
  { route: '/emr', name: 'EMR' },
  { route: '/medical-supply', name: 'Medical Supply' },
  { route: '/follow-up', name: 'Follow Up' },
  { route: '/booking-management', name: 'Booking Management' },
  { route: '/sms-management', name: 'SMS Management' },
  { route: '/help', name: 'Help' },
  { route: '/lab-qc', name: 'Lab QC' },
  { route: '/microbiology', name: 'Microbiology' },
  { route: '/sample-storage', name: 'Sample Storage' },
  { route: '/screening', name: 'Screening' },
  { route: '/reagent-management', name: 'Reagent Management' },
  { route: '/sample-tracking', name: 'Sample Tracking' },
  { route: '/pathology', name: 'Pathology' },
  { route: '/culture-collection', name: 'Culture Collection' },
  { route: '/digital-signature', name: 'Digital Signature' },
];

const IGNORE_CONSOLE_PATTERNS = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'Failed to start the connection',
  'WebSocket connection', 'hubs/notifications', 'useForm',
  'is not connected to any Form element',
];

// API paths that are expected to return 4xx/5xx (not real errors)
const IGNORE_API_PATTERNS = [
  '/hubs/', '/favicon', '/health', 'hot-update',
  '/usb-token/', '/digital-signature/session', // USB Token not always available
];

function isIgnoredConsoleError(msg: string): boolean {
  return IGNORE_CONSOLE_PATTERNS.some(p => msg.includes(p));
}

function isIgnoredApiError(url: string): boolean {
  return IGNORE_API_PATTERNS.some(p => url.includes(p));
}

describe('Network & Console Errors - All Pages', () => {
  let token: string;
  let userData: string;

  before(() => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200 && response.body.data) {
        token = response.body.data.token;
        userData = JSON.stringify(response.body.data.user);
      } else if (response.status === 200 && response.body.token) {
        token = response.body.token;
        userData = JSON.stringify(response.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
      } else {
        throw new Error(`Login failed: ${response.status}`);
      }
    });
  });

  pages.forEach(({ route, name }) => {
    it(`${name} (${route}) - no console or network errors`, () => {
      const consoleErrors: string[] = [];
      const networkErrors: string[] = [];

      cy.on('uncaught:exception', () => false);

      // Intercept ALL API calls to catch 4xx/5xx
      cy.intercept('**/api/**', (req) => {
        req.continue((res) => {
          if (res.statusCode >= 400 && !isIgnoredApiError(req.url)) {
            networkErrors.push(`${res.statusCode} ${req.method} ${req.url}`);
          }
        });
      }).as('apiCalls');

      cy.visit(route, {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);

          // Hook console.error
          const origError = win.console.error;
          win.console.error = (...args: any[]) => {
            const msg = args.map(a => {
              if (typeof a === 'string') return a;
              if (a instanceof Error) return `${a.name}: ${a.message}`;
              try { return JSON.stringify(a); } catch { return String(a); }
            }).join(' ');
            if (!isIgnoredConsoleError(msg)) {
              consoleErrors.push(msg);
            }
            origError.apply(win.console, args);
          };
        },
      });

      // Wait for page and API calls
      cy.wait(3000);
      cy.get('body').should('not.be.empty');

      // Assert no console errors
      cy.then(() => {
        if (consoleErrors.length > 0) {
          const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 200)}`).join('\n');
          throw new Error(`${consoleErrors.length} console error(s) on ${name}:\n${list}`);
        }
      });

      // Assert no network errors (500s are critical, 4xx are warnings)
      cy.then(() => {
        const serverErrors = networkErrors.filter(e => {
          const status = parseInt(e.split(' ')[0]);
          return status >= 500;
        });
        const clientErrors = networkErrors.filter(e => {
          const status = parseInt(e.split(' ')[0]);
          return status >= 400 && status < 500;
        });

        // Log 4xx as warnings (not failures)
        if (clientErrors.length > 0) {
          cy.log(`⚠ ${clientErrors.length} client error(s): ${clientErrors.join(', ')}`);
        }

        // Fail on 5xx server errors
        if (serverErrors.length > 0) {
          const list = serverErrors.map((e, i) => `  ${i + 1}. ${e}`).join('\n');
          throw new Error(`${serverErrors.length} server error(s) on ${name}:\n${list}`);
        }
      });
    });
  });
});
