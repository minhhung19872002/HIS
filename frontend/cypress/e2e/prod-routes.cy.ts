/// <reference types="cypress" />

const apiBaseUrl = 'https://his-api-92850107096.asia-southeast1.run.app/api';

const routes = [
  '/', '/reception', '/opd', '/prescription', '/ipd', '/surgery', '/pharmacy', '/lab', '/radiology', '/blood-bank',
  '/billing', '/finance', '/insurance', '/master-data', '/reports', '/admin', '/dashboard-3cap', '/telemedicine',
  '/nutrition', '/infection-control', '/rehabilitation', '/equipment', '/hr', '/quality', '/patient-portal',
  '/health-exchange', '/emergency-disaster', '/consultation', '/emr', '/specialty-emr', '/medical-supply', '/follow-up',
  '/booking-management', '/sms-management', '/help', '/lab-qc', '/microbiology', '/sample-storage', '/screening',
  '/reagent-management', '/sample-tracking', '/pathology', '/ivf-lab', '/culture-collection', '/digital-signature',
  '/central-signing', '/medical-record-archive', '/bhxh-audit', '/doctor-portal', '/satisfaction-survey', '/lis-config',
  '/medical-record-planning', '/signing-workflow', '/endpoint-security', '/treatment-protocols', '/chronic-disease',
  '/hospital-pharmacy', '/clinical-guidance', '/tb-hiv', '/health-checkup', '/immunization', '/epidemiology',
  '/school-health', '/occupational-health', '/methadone-treatment', '/food-safety', '/community-health', '/hiv-management',
  '/medical-forensics', '/traditional-medicine', '/reproductive-health', '/mental-health', '/environmental-health',
  '/trauma-registry', '/population-health', '/health-education', '/practice-license', '/inter-hospital', '/asset-management',
  '/procurement', '/training-research',
];

const ignorePatterns = [
  'resizeobserver loop',
  'download the react devtools',
  'favicon.ico',
  'aborterror',
  'cancelederror',
  'failed to start the connection',
  'websocket connection',
  'hubs/notifications',
  'useform',
  'is not connected to any form element',
  'connection was stopped during negotiation',
  'econnrefused',
  'signalr',
  'negotiate',
  'static function can not consume context',
];

function isIgnored(message: string): boolean {
  const lower = message.toLowerCase();
  return ignorePatterns.some((pattern) => lower.includes(pattern));
}

describe('Prod routes audit', () => {
  let token = '';
  let userJson = '';

  before(() => {
    cy.request({
      method: 'POST',
      url: `${apiBaseUrl}/auth/login`,
      body: { username: 'admin', password: 'Admin@123' },
    }).then((response) => {
      token = response.body?.data?.token || '';
      userJson = JSON.stringify(response.body?.data?.user || {});
      expect(token, 'auth token').to.not.equal('');
    });
  });

  it('loads all production routes without console errors', () => {
    const findings: Array<{ route: string; errors: string[] }> = [];

    cy.wrap(routes).each((route) => {
      const routeErrors: string[] = [];

      cy.visit(route, {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userJson);

          const originalError = win.console.error.bind(win.console);
          win.console.error = (...args: unknown[]) => {
            const message = args
              .map((arg) => {
                if (typeof arg === 'string') return arg;
                if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
                try {
                  return JSON.stringify(arg);
                } catch {
                  return String(arg);
                }
              })
              .join(' ');

            if (!isIgnored(message)) {
              routeErrors.push(message);
            }

            originalError(...args);
          };
        },
      });

      cy.wait(1200);
      cy.get('body').should('not.be.empty');

      cy.then(() => {
        if (routeErrors.length > 0) {
          findings.push({ route, errors: [...new Set(routeErrors)] });
        }
      });
    });

    cy.then(() => {
      expect(findings, JSON.stringify(findings, null, 2)).to.deep.equal([]);
    });
  });
});
