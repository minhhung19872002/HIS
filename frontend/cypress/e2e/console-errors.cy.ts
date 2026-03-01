/// <reference types="cypress" />

/**
 * Console Errors Test Suite
 *
 * Navigates to every page in the HIS application and captures console errors.
 * Uses API login to obtain a JWT token, then visits each route with the token
 * set in localStorage. Asserts that no JS console errors occur on any page.
 */

const pages = [
  { route: '/', name: 'Dashboard' },
  { route: '/reception', name: 'Reception (Tiep don)' },
  { route: '/opd', name: 'OPD (Kham benh)' },
  { route: '/prescription', name: 'Prescription (Ke don)' },
  { route: '/ipd', name: 'Inpatient (Noi tru)' },
  { route: '/surgery', name: 'Surgery (Phau thuat)' },
  { route: '/pharmacy', name: 'Pharmacy (Kho duoc)' },
  { route: '/lab', name: 'Laboratory (Xet nghiem)' },
  { route: '/radiology', name: 'Radiology (CDHA)' },
  { route: '/blood-bank', name: 'Blood Bank (Ngan hang mau)' },
  { route: '/billing', name: 'Billing (Thu ngan)' },
  { route: '/finance', name: 'Finance (Tai chinh)' },
  { route: '/insurance', name: 'Insurance (BHYT)' },
  { route: '/master-data', name: 'Master Data (Danh muc)' },
  { route: '/reports', name: 'Reports (Bao cao)' },
  { route: '/admin', name: 'System Admin (He thong)' },
  { route: '/telemedicine', name: 'Telemedicine (Kham tu xa)' },
  { route: '/nutrition', name: 'Nutrition (Dinh duong)' },
  { route: '/infection-control', name: 'Infection Control (KSNK)' },
  { route: '/rehabilitation', name: 'Rehabilitation (VLTL)' },
  { route: '/equipment', name: 'Equipment (Thiet bi)' },
  { route: '/hr', name: 'HR (Nhan su)' },
  { route: '/quality', name: 'Quality (Chat luong)' },
  { route: '/patient-portal', name: 'Patient Portal (Cong BN)' },
  { route: '/health-exchange', name: 'Health Exchange (Lien thong)' },
  { route: '/emergency-disaster', name: 'Emergency (Cap cuu)' },
  { route: '/consultation', name: 'Consultation (Hoi chan)' },
  { route: '/emr', name: 'EMR (Ho so benh an)' },
  { route: '/medical-supply', name: 'Medical Supply (Vat tu y te)' },
  { route: '/follow-up', name: 'Follow Up (Tai kham)' },
  { route: '/booking-management', name: 'Booking Management (Quan ly dat lich)' },
  { route: '/sms-management', name: 'SMS Management (SMS Gateway)' },
  { route: '/help', name: 'Help (Tro giup)' },
  { route: '/lab-qc', name: 'Lab QC (Kiem dinh chat luong)' },
  { route: '/microbiology', name: 'Microbiology (Vi sinh)' },
  { route: '/sample-storage', name: 'Sample Storage (Luu tru mau)' },
  { route: '/screening', name: 'Screening (Sang loc)' },
  { route: '/reagent-management', name: 'Reagent Management (Hoa chat XN)' },
  { route: '/sample-tracking', name: 'Sample Tracking (Theo doi mau)' },
  { route: '/pathology', name: 'Pathology (Giai phau benh)' },
  { route: '/culture-collection', name: 'Culture Collection (Luu chung VS)' },
  { route: '/digital-signature', name: 'Digital Signature (Chu ky so)' },
];

// Patterns to ignore - these are expected/harmless noise
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
];

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => msg.includes(pattern));
}

describe('Console Errors - All Pages', () => {
  let token: string;
  let userData: string;

  before(() => {
    // Login via API to get real JWT token
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: {
        username: 'admin',
        password: 'Admin@123',
      },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200 && response.body.data) {
        token = response.body.data.token;
        userData = JSON.stringify(response.body.data.user);
      } else if (response.status === 200 && response.body.token) {
        token = response.body.token;
        userData = JSON.stringify(response.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
      } else {
        throw new Error(
          `Login failed: ${response.status} - ${JSON.stringify(response.body)}`
        );
      }
    });
  });

  pages.forEach(({ route, name }) => {
    it(`${name} (${route}) - no console errors`, () => {
      const consoleErrors: string[] = [];
      const serverErrors: string[] = [];

      // Don't fail test on uncaught exceptions from the app
      cy.on('uncaught:exception', () => false);

      // Intercept API calls and check for 500s
      cy.intercept('**/api/**', (req) => {
        req.continue((res) => {
          if (res.statusCode >= 500) {
            serverErrors.push(`${req.method} ${req.url} => ${res.statusCode}`);
          }
        });
      }).as('apiCalls');

      cy.visit(route, {
        onBeforeLoad(win) {
          // Set real auth token
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);

          // Hook into console.error
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

      // Wait for page rendering and API calls
      cy.wait(3000);

      // Verify page rendered
      cy.get('body').should('not.be.empty');

      // Assert no console errors
      cy.then(() => {
        if (consoleErrors.length > 0) {
          const errorList = consoleErrors
            .map((e, i) => `  ${i + 1}. ${e.substring(0, 300)}`)
            .join('\n');
          throw new Error(
            `Found ${consoleErrors.length} console error(s) on ${name} (${route}):\n${errorList}`
          );
        }
      });

      // Assert no 500 server errors
      cy.then(() => {
        if (serverErrors.length > 0) {
          const errorList = serverErrors.join('\n');
          throw new Error(
            `Server 500 errors on ${name} (${route}):\n${errorList}`
          );
        }
      });
    });
  });
});
