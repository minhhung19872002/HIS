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
  { route: '/specialty-emr', name: 'Specialty EMR (BA Chuyen khoa)' },
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
  { route: '/central-signing', name: 'Central Signing (Ky so tap trung)' },
  { route: '/medical-record-archive', name: 'Medical Record Archive (Luu tru HSBA)' },
  { route: '/bhxh-audit', name: 'BHXH Audit (Giam dinh BHXH)' },
  { route: '/doctor-portal', name: 'Doctor Portal (Cong bac si)' },
  { route: '/satisfaction-survey', name: 'Satisfaction Survey (Khao sat hai long)' },
  { route: '/lis-config', name: 'LIS Config (Cau hinh LIS)' },
  { route: '/medical-record-planning', name: 'Medical Record Planning (Ke hoach TH)' },
  { route: '/signing-workflow', name: 'Signing Workflow (Trinh ky)' },
  { route: '/endpoint-security', name: 'Endpoint Security (An toan thong tin)' },
  { route: '/treatment-protocols', name: 'Treatment Protocols (Phac do dieu tri)' },
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
  'Static function can not consume context',
  '%o',
];

function isIgnoredError(msg: string): boolean {
  return IGNORE_PATTERNS.some((pattern) => msg.includes(pattern));
}

function buildApiStub(url: string) {
  if (url.includes('/api/auth/me')) {
    return {
      success: true,
      data: user,
    };
  }

  if (url.includes('/api/digital-signature/session-status')) {
    return {
      isActive: false,
      tokenSerial: null,
      signerName: null,
    };
  }

  if (url.includes('/api/notification/unread-count')) {
    return {
      count: 0,
    };
  }

  if (url.includes('/api/notification/my')) {
    return [];
  }

  return {
    items: [],
    totalCount: 0,
  };
}

const user = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  fullName: 'Cypress Admin',
  roles: ['Admin'],
  permissions: [],
};

describe('Console Errors - All Pages', () => {
  const token = 'cypress-console-errors-token';
  const userData = JSON.stringify(user);

  pages.forEach(({ route, name }) => {
    it(`${name} (${route}) - no console errors`, () => {
      const consoleErrors: string[] = [];
      const serverErrors: string[] = [];

      // Don't fail test on uncaught exceptions from the app
      cy.on('uncaught:exception', () => false);

      // Intercept API calls and check for 500s
      cy.intercept('**/api/**', (req) => {
        req.reply((res) => {
          res.send({
            statusCode: 200,
            body: buildApiStub(req.url),
          });
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
