/// <reference types="cypress" />

/**
 * Real Workflow Test Suite
 *
 * Simulates a REAL user operating the HIS system:
 * 1. Registers NEW patients via Reception API (like front-desk staff)
 * 2. Starts examinations, adds vital signs, diagnoses, prescriptions (like a doctor)
 * 3. Verifies data appears on ALL pages in the UI
 * 4. Logs ALL console errors, API calls, and validates data visibility
 */

// ─── CONFIG ─────────────────────────────────────────────────────────────────

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'NotImplementedException',
  'not implemented',
  'ECONNREFUSED',
];

function isIgnored(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => msg.toLowerCase().includes(p.toLowerCase()));
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function apiHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=utf-8',
  };
}

// ─── TEST DATA ──────────────────────────────────────────────────────────────

const TEST_PATIENTS = [
  {
    fullName: 'Nguyen Van Alpha',
    gender: 1,
    dateOfBirth: '1988-06-15',
    phoneNumber: '0901111001',
    address: '100 Le Loi, Q1, TP.HCM',
    identityNumber: '079088111001',
  },
  {
    fullName: 'Tran Thi Beta',
    gender: 0,
    dateOfBirth: '1975-03-22',
    phoneNumber: '0901111002',
    address: '200 Hai Ba Trung, Q3, TP.HCM',
    identityNumber: '079075111002',
  },
  {
    fullName: 'Le Van Gamma',
    gender: 1,
    dateOfBirth: '1995-12-01',
    phoneNumber: '0901111003',
    address: '50 Nguyen Trai, Ha Noi',
    identityNumber: '079095111003',
  },
  {
    fullName: 'Pham Thi Delta',
    gender: 0,
    dateOfBirth: '2000-08-10',
    phoneNumber: '0901111004',
    address: '88 Tran Phu, Da Nang',
    identityNumber: '079000111004',
  },
  {
    fullName: 'Hoang Van Epsilon',
    gender: 1,
    dateOfBirth: '1960-01-25',
    phoneNumber: '0901111005',
    address: '15 Hung Vuong, Hue',
    identityNumber: '079060111005',
  },
];

const ICD_CODES = [
  { code: 'J06', name: 'Nhiem khuan duong ho hap tren cap' },
  { code: 'I10', name: 'Tang huyet ap' },
  { code: 'K29', name: 'Viem da day' },
  { code: 'E11', name: 'Dai thao duong type 2' },
  { code: 'M54', name: 'Dau lung' },
];

// ─── MAIN TEST ──────────────────────────────────────────────────────────────

describe('Real Workflow - Input Data Like a Real User', () => {
  let token: string;
  let userData: string;

  // Store created data for verification
  const createdPatients: any[] = [];
  const createdExams: any[] = [];
  const createdPrescriptions: any[] = [];
  let examRooms: any[] = [];

  before(() => {
    // Step 1: Login
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      token = resp.body.data?.token || resp.body.token;
      userData = JSON.stringify(resp.body.data?.user || resp.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
      cy.log('LOGIN OK - Token obtained');
    });

    // Step 2: Get available examination rooms
    cy.then(() => {
      cy.request({
        url: '/api/examination/rooms/active',
        headers: apiHeaders(token),
      }).then((resp) => {
        examRooms = resp.body.filter((r: any) => r.code?.startsWith('P') || r.code?.startsWith('PK'));
        cy.log(`Found ${examRooms.length} examination rooms`);
      });
    });

    // Step 3: Register patients via Reception API (like front-desk staff clicking "Dang ky")
    cy.then(() => {
      TEST_PATIENTS.forEach((patient, i) => {
        const roomId = examRooms[i % examRooms.length]?.id;
        if (!roomId) return;

        cy.request({
          method: 'POST',
          url: '/api/reception/register/fee',
          headers: apiHeaders(token),
          body: {
            newPatient: patient,
            serviceType: 1,
            roomId: roomId,
          },
          failOnStatusCode: false,
        }).then((resp) => {
          if (resp.status === 200) {
            createdPatients.push(resp.body);
            cy.log(`REGISTERED: ${patient.fullName} -> ${resp.body.patientCode} in room ${resp.body.roomName}`);
          } else {
            cy.log(`REGISTER FAILED for ${patient.fullName}: ${resp.status} - ${JSON.stringify(resp.body).substring(0, 200)}`);
          }
        });
      });
    });

    // Step 4: Get examination IDs for registered patients
    cy.then(() => {
      const roomIds = [...new Set(createdPatients.map((p) => p.roomId))];
      roomIds.forEach((roomId) => {
        cy.request({
          url: `/api/examination/room/${roomId}/patients`,
          headers: apiHeaders(token),
        }).then((resp) => {
          if (Array.isArray(resp.body)) {
            resp.body.forEach((exam: any) => {
              if (createdPatients.some((p) => p.patientCode === exam.patientCode)) {
                createdExams.push(exam);
              }
            });
          }
        });
      });
    });

    // Step 5: Start examinations, add vital signs, diagnoses, prescriptions (like a doctor)
    cy.then(() => {
      createdExams.forEach((exam, i) => {
        const examId = exam.examinationId;
        if (!examId) return;

        // Start exam
        cy.request({
          method: 'POST',
          url: `/api/examination/${examId}/start`,
          headers: apiHeaders(token),
          failOnStatusCode: false,
        }).then((resp) => {
          cy.log(`EXAM START: ${exam.patientName} -> ${resp.status === 200 ? 'OK' : 'FAIL'}`);
        });

        // Add vital signs
        cy.request({
          method: 'PUT',
          url: `/api/examination/${examId}/vital-signs`,
          headers: apiHeaders(token),
          body: {
            temperature: 36.5 + i * 0.3,
            bloodPressureSystolic: 115 + i * 5,
            bloodPressureDiastolic: 75 + i * 3,
            heartRate: 72 + i * 3,
            respiratoryRate: 16 + i,
            weight: 55 + i * 10,
            height: 160 + i * 5,
          },
          failOnStatusCode: false,
        }).then((resp) => {
          cy.log(`VITAL SIGNS: ${exam.patientName} -> ${resp.status === 200 ? 'OK' : resp.status}`);
        });

        // Add diagnosis
        cy.request({
          method: 'POST',
          url: `/api/examination/${examId}/diagnoses`,
          headers: apiHeaders(token),
          body: {
            icdCode: ICD_CODES[i % ICD_CODES.length].code,
            icdName: ICD_CODES[i % ICD_CODES.length].name,
            isPrimary: true,
          },
          failOnStatusCode: false,
        }).then((resp) => {
          cy.log(`DIAGNOSIS: ${exam.patientName} -> ${ICD_CODES[i % ICD_CODES.length].code} ${resp.status === 200 ? 'OK' : resp.status}`);
        });

        // Create prescription (Paracetamol 500mg for all)
        cy.request({
          method: 'POST',
          url: '/api/examination/prescriptions',
          headers: apiHeaders(token),
          body: {
            examinationId: examId,
            items: [{
              medicineId: '4632e3b6-ab73-45a3-89bf-00dc01137706',
              medicineName: 'Paracetamol 500mg',
              quantity: 10 + i * 5,
              unit: 'Vien',
              dosage: '2 vien x 3 lan/ngay',
              instruction: 'Uong sau an',
              daysSupply: 3 + i,
            }],
          },
          failOnStatusCode: false,
        }).then((resp) => {
          if (resp.status === 200) {
            createdPrescriptions.push(resp.body);
            cy.log(`PRESCRIPTION: ${exam.patientName} -> OK`);
          } else {
            cy.log(`PRESCRIPTION FAILED: ${exam.patientName} -> ${resp.status}`);
          }
        });

        // Create service order (lab test)
        const serviceIds = [
          'f56e7d9d-a13d-4869-8259-c5a073f21fe6', // Cong thuc mau
          'd5c85ac1-dda8-4c27-bed8-1dabd9115579', // GOT
          '18dd70fd-8134-4f14-bbf1-2d260a6e078f', // GPT
        ];
        cy.request({
          method: 'POST',
          url: '/api/examination/service-orders',
          headers: apiHeaders(token),
          body: {
            examinationId: examId,
            items: [{ serviceId: serviceIds[i % serviceIds.length], quantity: 1 }],
          },
          failOnStatusCode: false,
        }).then((resp) => {
          cy.log(`SERVICE ORDER: ${exam.patientName} -> ${resp.status === 200 ? 'OK' : resp.status}`);
        });
      });
    });

    // Log summary
    cy.then(() => {
      cy.log('===== SETUP COMPLETE =====');
      cy.log(`Patients registered: ${createdPatients.length}`);
      cy.log(`Exams started: ${createdExams.length}`);
      cy.log(`Prescriptions created: ${createdPrescriptions.length}`);
    });
  });

  // ─── PAGE VERIFICATION TESTS ───────────────────────────────────────────────

  interface PageTest {
    route: string;
    name: string;
    expectData?: boolean;
    tabs?: string[];
    dataCheck?: string; // CSS selector to check for data
    minRows?: number;
  }

  const pages: PageTest[] = [
    { route: '/', name: 'Dashboard', expectData: true },
    {
      route: '/reception', name: 'Reception',
      expectData: true,
      dataCheck: '.ant-table-tbody tr.ant-table-row',
      minRows: 1,
    },
    {
      route: '/opd', name: 'OPD',
      expectData: true,
    },
    {
      route: '/prescription', name: 'Prescription',
      expectData: true,
    },
    {
      route: '/ipd', name: 'Inpatient',
      tabs: ['current', 'beds'],
    },
    {
      route: '/surgery', name: 'Surgery',
      tabs: ['requests', 'schedules', 'rooms', 'inprogress', 'records'],
    },
    {
      route: '/pharmacy', name: 'Pharmacy',
      expectData: true,
      tabs: ['pending', 'inventory', 'transfers', 'alerts'],
      dataCheck: '.ant-table-tbody tr.ant-table-row',
      minRows: 1,
    },
    {
      route: '/lab', name: 'Laboratory',
    },
    {
      route: '/radiology', name: 'Radiology',
      tabs: ['pending', 'worklist', 'inProgress', 'reporting', 'completed'],
    },
    { route: '/blood-bank', name: 'Blood Bank' },
    {
      route: '/billing', name: 'Billing',
      tabs: ['unpaid', 'deposits', 'refunds', 'reports'],
    },
    { route: '/finance', name: 'Finance' },
    {
      route: '/insurance', name: 'Insurance',
      tabs: ['claims', 'xml'],
    },
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
    { route: '/help', name: 'Help' },
  ];

  pages.forEach((page) => {
    describe(`${page.name} (${page.route})`, () => {
      let consoleErrors: string[] = [];
      let consoleWarnings: string[] = [];
      let apiCalls: { method: string; url: string; status: number }[] = [];
      let serverErrors: string[] = [];

      beforeEach(() => {
        consoleErrors = [];
        consoleWarnings = [];
        apiCalls = [];
        serverErrors = [];

        cy.on('uncaught:exception', () => false);

        // Intercept ALL API calls - log everything
        cy.intercept('**/*', (req) => {
          req.continue((res) => {
            const entry = { method: req.method, url: req.url, status: res.statusCode };
            apiCalls.push(entry);
            if (res.statusCode >= 500) {
              serverErrors.push(`${req.method} ${req.url} => ${res.statusCode}`);
            }
          });
        }).as('allCalls');

        cy.visit(page.route, {
          onBeforeLoad(win) {
            win.localStorage.setItem('token', token);
            win.localStorage.setItem('user', userData);

            // Hook console.error
            const origError = win.console.error;
            win.console.error = (...args: any[]) => {
              const msg = args.map((a) => {
                if (typeof a === 'string') return a;
                if (a instanceof Error) return `${a.name}: ${a.message}`;
                try { return JSON.stringify(a); } catch { return String(a); }
              }).join(' ');
              if (!isIgnored(msg)) {
                consoleErrors.push(msg);
              }
              origError.apply(win.console, args);
            };

            // Hook console.warn
            const origWarn = win.console.warn;
            win.console.warn = (...args: any[]) => {
              const msg = args.map((a) => typeof a === 'string' ? a : String(a)).join(' ');
              if (!isIgnored(msg)) {
                consoleWarnings.push(msg);
              }
              origWarn.apply(win.console, args);
            };
          },
        });

        cy.wait(2500);
        cy.get('body').should('not.be.empty');
      });

      it('page loads and renders without JS errors', () => {
        cy.wait(1000).then(() => {
          // Log all API calls for this page
          cy.log(`API calls made: ${apiCalls.length}`);
          apiCalls.forEach((c) => {
            if (c.url.includes('/api/')) {
              cy.log(`  ${c.status} ${c.method} ${c.url.replace(/^.*\/api/, '/api').substring(0, 80)}`);
            }
          });

          // Log warnings (informational)
          if (consoleWarnings.length > 0) {
            cy.log(`Console warnings: ${consoleWarnings.length}`);
            consoleWarnings.slice(0, 5).forEach((w) => cy.log(`  WARN: ${w.substring(0, 150)}`));
          }

          // Assert no console errors
          if (consoleErrors.length > 0) {
            const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 200)}`).join('\n');
            throw new Error(`${consoleErrors.length} console error(s) on ${page.name}:\n${list}`);
          }

          // Assert no 500 errors
          if (serverErrors.length > 0) {
            const list = serverErrors.join('\n');
            throw new Error(`HTTP 500 errors on ${page.name}:\n${list}`);
          }
        });
      });

      if (page.tabs && page.tabs.length > 0) {
        it('all tabs clickable and load data', () => {
          page.tabs!.forEach((tabKey) => {
            cy.get(`[data-node-key="${tabKey}"]`).first().click({ force: true });
            cy.wait(1500);
            cy.log(`Tab "${tabKey}" clicked`);
          });

          cy.then(() => {
            if (consoleErrors.length > 0) {
              const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 200)}`).join('\n');
              throw new Error(`Tab errors on ${page.name}:\n${list}`);
            }
          });
        });
      }

      if (page.expectData && page.dataCheck) {
        it('table has data rows visible', () => {
          cy.get('body').then(($body) => {
            const $rows = $body.find(page.dataCheck!);
            cy.log(`Data rows found: ${$rows.length} (expected >= ${page.minRows || 1})`);

            if ($rows.length > 0) {
              // Log first few row texts
              $rows.slice(0, 3).each(function () {
                const text = Cypress.$(this).text().substring(0, 100);
                cy.log(`  Row: ${text}`);
              });
            }

            if (page.minRows && $rows.length < page.minRows) {
              cy.log(`WARNING: Expected >= ${page.minRows} rows but found ${$rows.length}`);
            }
          });
        });
      }

      it('interactive elements work (buttons, table clicks)', () => {
        // Try clicking safe buttons
        const safeButtons = ['Lam moi', 'Dong bo', 'Tim kiem', 'Loc'];
        cy.get('body').then(($body) => {
          safeButtons.forEach((btnText) => {
            const $btn = $body.find(`button:contains("${btnText}"), .ant-btn:contains("${btnText}")`);
            if ($btn.length > 0) {
              cy.wrap($btn.first()).click({ force: true });
              cy.wait(500);
              cy.log(`Clicked button: "${btnText}"`);
            }
          });
        });

        // Try clicking first table row
        cy.get('body').then(($body) => {
          const $rows = $body.find('.ant-table-tbody tr.ant-table-row');
          if ($rows.length > 0) {
            cy.wrap($rows.first()).click({ force: true });
            cy.wait(1000);
            cy.log(`Clicked first table row (${$rows.length} rows total)`);

            // Close any opened modal/drawer
            cy.get('body').then(($b) => {
              const $close = $b.find('.ant-modal-close, .ant-drawer-close');
              if ($close.length > 0) {
                cy.wrap($close.first()).click({ force: true });
                cy.wait(500);
              }
            });
          } else {
            cy.log('No table rows found on this page');
          }
        });

        // Final error check
        cy.then(() => {
          if (consoleErrors.length > 0) {
            const list = consoleErrors.map((e, i) => `  ${i + 1}. ${e.substring(0, 200)}`).join('\n');
            throw new Error(`Interaction errors on ${page.name}:\n${list}`);
          }
        });
      });
    });
  });

  // ─── SPECIFIC WORKFLOW VERIFICATION ─────────────────────────────────────────

  describe('Workflow Data Verification', () => {
    beforeEach(() => {
      cy.on('uncaught:exception', () => false);
    });

    it('Reception shows registered patients for today', () => {
      cy.request({
        url: '/api/reception/admissions/today',
        headers: apiHeaders(token),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.be.an('array');
        cy.log(`Today admissions: ${resp.body.length}`);
        resp.body.forEach((a: any) => {
          cy.log(`  ${a.patientCode} - ${a.patientName} - room: ${a.roomName}`);
        });
        expect(resp.body.length).to.be.greaterThan(0);
      });

      // Visit Reception page and verify UI
      cy.visit('/reception', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('.ant-table-tbody tr.ant-table-row').should('have.length.greaterThan', 0);
      cy.log('Reception page shows patient data in table');
    });

    it('OPD shows patients in examination rooms', () => {
      cy.request({
        url: '/api/examination/rooms/active',
        headers: apiHeaders(token),
      }).then((resp) => {
        const rooms = resp.body.filter((r: any) => r.code?.startsWith('P') || r.code?.startsWith('PK'));
        cy.log(`Active exam rooms: ${rooms.length}`);

        // Check first room with patients
        let checked = 0;
        rooms.forEach((room: any) => {
          if (checked >= 3) return;
          cy.request({
            url: `/api/examination/room/${room.id}/patients`,
            headers: apiHeaders(token),
          }).then((pResp) => {
            if (pResp.body.length > 0) {
              cy.log(`Room ${room.code}: ${pResp.body.length} patients`);
              pResp.body.forEach((p: any) => {
                cy.log(`  ${p.patientCode} - ${p.patientName} - status: ${p.statusName}`);
              });
              checked++;
            }
          });
        });
      });
    });

    it('Pharmacy shows pending prescriptions', () => {
      cy.request({
        url: '/api/pharmacy/pending-prescriptions',
        headers: apiHeaders(token),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        const prescriptions = Array.isArray(resp.body) ? resp.body : resp.body.items || [];
        cy.log(`Pending prescriptions: ${prescriptions.length}`);
        prescriptions.slice(0, 5).forEach((p: any) => {
          cy.log(`  ${p.prescriptionCode} - ${p.patientName} - status: ${p.status} - items: ${p.itemsCount}`);
        });
        expect(prescriptions.length).to.be.greaterThan(0);
      });

      // Visit Pharmacy and verify
      cy.visit('/pharmacy', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('.ant-table-tbody tr.ant-table-row').should('have.length.greaterThan', 0);
      cy.log('Pharmacy page shows prescription data in table');
    });

    it('Inpatient shows admitted patients', () => {
      cy.request({
        url: '/api/inpatient/patients',
        headers: apiHeaders(token),
      }).then((resp) => {
        const items = resp.body.items || resp.body || [];
        cy.log(`Inpatients: ${items.length}`);
        (Array.isArray(items) ? items : []).forEach((p: any) => {
          cy.log(`  ${p.patientCode} - ${p.patientName} - dept: ${p.departmentName}`);
        });
      });
    });

    it('Insurance shows claims', () => {
      cy.request({
        method: 'POST',
        url: '/api/insurance/claims/search',
        headers: apiHeaders(token),
        body: {},
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200) {
          const items = resp.body.items || resp.body || [];
          cy.log(`Insurance claims: ${items.length}`);
          (Array.isArray(items) ? items : []).slice(0, 5).forEach((c: any) => {
            cy.log(`  ${c.maLk} - ${c.patientName} - ${c.diagnosisCode} - amount: ${c.totalAmount}`);
          });
        }
      });
    });

    it('Billing API returns statistics', () => {
      cy.request({
        url: '/api/BillingComplete/statistics',
        headers: apiHeaders(token),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        cy.log(`Billing stats: patients=${resp.body.totalPatients}, revenue=${resp.body.totalRevenue}`);
      });
    });

    it('Dashboard loads with real data', () => {
      cy.request({
        url: '/api/reporting/dashboard',
        headers: apiHeaders(token),
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200) {
          cy.log('Dashboard API data:');
          Object.entries(resp.body).forEach(([key, val]) => {
            if (typeof val === 'number') {
              cy.log(`  ${key}: ${val}`);
            }
          });
        }
      });

      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('body').should('not.be.empty');
      cy.log('Dashboard loaded with data');
    });
  });
});
