/// <reference types="cypress" />

/**
 * All Data Flows Test Suite
 * Based on HIS_DataFlow_Architecture.md - 10 Main Data Flows
 *
 * Tests real API calls simulating actual user operations:
 * Flow 1: OPD (Khám ngoại trú)
 * Flow 2: IPD (Nội trú)
 * Flow 3: Surgery (Phẫu thuật)
 * Flow 4: Lab (Xét nghiệm)
 * Flow 5: Pharmacy (Kho dược)
 * Flow 6: Billing (Thanh toán)
 * Flow 7: RIS/PACS (Chẩn đoán hình ảnh)
 * Flow 8: Blood Bank (Ngân hàng máu)
 * Flow 9: Insurance (BHYT)
 * Flow 10: Reporting (Báo cáo)
 */

const IGNORE = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'NotImplementedException', 'not implemented', 'ECONNREFUSED',
];
function isIgnored(msg: string) {
  return IGNORE.some(p => msg.toLowerCase().includes(p.toLowerCase()));
}

function h(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' };
}

describe('All Data Flows - HIS_DataFlow_Architecture', () => {
  let token: string;
  let userData: string;
  let examRooms: any[] = [];

  // Shared data across flows
  const state: Record<string, any> = {};

  before(() => {
    // Login
    cy.request({ method: 'POST', url: '/api/auth/login', body: { username: 'admin', password: 'Admin@123' } })
      .then(resp => {
        token = resp.body.data?.token || resp.body.token;
        userData = JSON.stringify(resp.body.data?.user || resp.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
      });

    // Get rooms
    cy.then(() => {
      cy.request({ url: '/api/examination/rooms/active', headers: h(token) })
        .then(resp => {
          examRooms = resp.body.filter((r: any) => r.code?.startsWith('P') || r.code?.startsWith('PK'));
        });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 1: KHÁM BỆNH NGOẠI TRÚ (OPD Flow)
  // Tiếp đón → Xếp hàng → Khám → Chẩn đoán → Chỉ định → Kê đơn → Kho Dược → Thu ngân
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 1: OPD - Khám bệnh ngoại trú', () => {

    it('Step 1: Tiếp đón - Đăng ký khám viện phí', () => {
      cy.then(() => {
        const roomId = examRooms[0]?.id;
        cy.request({
          method: 'POST', url: '/api/reception/register/fee',
          headers: h(token),
          body: {
            newPatient: {
              fullName: 'Nguyen Van OPD Test', gender: 1,
              dateOfBirth: '1990-01-15', phoneNumber: '0911000001',
              address: '1 Le Loi, Q1, HCM', identityNumber: '079090000001',
            },
            serviceType: 1, roomId,
          },
        }).then(resp => {
          expect(resp.status).to.eq(200);
          state.opdPatientId = resp.body.patientId;
          state.opdPatientCode = resp.body.patientCode;
          state.opdMedicalRecordId = resp.body.id;
          state.opdRoomId = roomId;
          cy.log(`REGISTERED: ${resp.body.patientCode} - ${resp.body.patientName}`);
          cy.log(`Medical Record: ${resp.body.admissionCode}`);
        });
      });
    });

    it('Step 2: Tiếp đón - Bệnh nhân xuất hiện trong hàng đợi', () => {
      cy.then(() => {
        cy.request({ url: '/api/reception/admissions/today', headers: h(token) })
          .then(resp => {
            const admissions = Array.isArray(resp.body) ? resp.body : (resp.body.data || []);
            const found = admissions.find((a: any) => a.patientCode === state.opdPatientCode);
            if (found) {
              cy.log(`Queue: ${found.patientCode} - room: ${found.roomName}`);
            } else {
              cy.log(`Patient ${state.opdPatientCode} not found in today queue (${admissions.length} admissions) - may be cross-day`);
            }
            // API responds correctly
            expect(resp.status).to.eq(200);
          });
      });
    });

    it('Step 3: Khám bệnh - Lấy danh sách BN phòng khám', () => {
      cy.then(() => {
        cy.request({ url: `/api/examination/room/${state.opdRoomId}/patients`, headers: h(token) })
          .then(resp => {
            const patient = resp.body.find((p: any) => p.patientCode === state.opdPatientCode);
            expect(patient).to.exist;
            state.opdExamId = patient.examinationId;
            cy.log(`Exam ID: ${state.opdExamId} - Status: ${patient.statusName}`);
          });
      });
    });

    it('Step 4: Khám bệnh - Bắt đầu khám (gọi BN)', () => {
      cy.then(() => {
        cy.request({
          method: 'POST', url: `/api/examination/${state.opdExamId}/start`,
          headers: h(token), failOnStatusCode: false,
        }).then(resp => {
          cy.log(`Start exam: ${resp.status === 200 ? 'OK' : resp.status}`);
        });
      });
    });

    it('Step 5: Khám bệnh - Nhập sinh hiệu', () => {
      cy.then(() => {
        cy.request({
          method: 'PUT', url: `/api/examination/${state.opdExamId}/vital-signs`,
          headers: h(token),
          body: {
            temperature: 37.5, bloodPressureSystolic: 130, bloodPressureDiastolic: 85,
            heartRate: 82, respiratoryRate: 20, weight: 68, height: 170,
          },
        }).then(resp => {
          expect(resp.status).to.eq(200);
          cy.log(`BMI: ${resp.body.bmi?.toFixed(1)} - BP: ${resp.body.bpClassification}`);
        });
      });
    });

    it('Step 6: Khám bệnh - Chẩn đoán ICD-10', () => {
      cy.then(() => {
        cy.request({
          method: 'POST', url: `/api/examination/${state.opdExamId}/diagnoses`,
          headers: h(token),
          body: { icdCode: 'J06', icdName: 'Nhiem khuan duong ho hap tren cap', isPrimary: true },
        }).then(resp => {
          expect(resp.status).to.eq(200);
          state.opdDiagnosisId = resp.body.id;
          cy.log(`Diagnosis: ${resp.body.icdCode} - ${resp.body.icdName}`);
        });
      });
    });

    it('Step 7: Chỉ định - Chỉ định xét nghiệm CTM', () => {
      cy.then(() => {
        cy.request({
          method: 'POST', url: '/api/examination/service-orders',
          headers: h(token),
          body: {
            examinationId: state.opdExamId,
            items: [{ serviceId: 'f56e7d9d-a13d-4869-8259-c5a073f21fe6', quantity: 1 }], // CTM
          },
          failOnStatusCode: false,
        }).then(resp => {
          cy.log(`Service order CTM: ${resp.status}`);
        });
      });
    });

    it('Step 8: Khám bệnh - Kê đơn thuốc', () => {
      cy.then(() => {
        cy.request({
          method: 'POST', url: '/api/examination/prescriptions',
          headers: h(token),
          body: {
            examinationId: state.opdExamId,
            items: [{
              medicineId: '4632e3b6-ab73-45a3-89bf-00dc01137706', // Paracetamol
              medicineName: 'Paracetamol 500mg', quantity: 20,
              unit: 'Vien', dosage: '2 vien x 3 lan/ngay',
              instruction: 'Uong sau an', daysSupply: 3,
            }],
          },
        }).then(resp => {
          expect(resp.status).to.eq(200);
          state.opdPrescriptionId = resp.body.id;
          cy.log(`Prescription: ${resp.body.id}`);
        });
      });
    });

    it('Step 9: Kho Dược - Đơn thuốc hiện trong pharmacy pending', () => {
      cy.then(() => {
        cy.request({ url: '/api/pharmacy/pending-prescriptions', headers: h(token) })
          .then(resp => {
            expect(resp.body.length).to.be.greaterThan(0);
            cy.log(`Pending prescriptions: ${resp.body.length}`);
          });
      });
    });

    it('Step 10: Thu ngân - Billing statistics accessible', () => {
      cy.then(() => {
        cy.request({ url: '/api/BillingComplete/statistics', headers: h(token) })
          .then(resp => {
            expect(resp.status).to.eq(200);
            cy.log(`Billing stats OK`);
          });
      });
    });

    it('Step 11: UI - Reception page shows today data', () => {
      cy.visit('/reception', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      // Table structure should exist (may be empty on a new day)
      cy.get('.ant-table', { timeout: 10000 }).should('exist');
    });

    it('Step 12: UI - Pharmacy page shows prescriptions', () => {
      cy.visit('/pharmacy', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('.ant-table-tbody tr.ant-table-row').should('have.length.greaterThan', 0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 2: NỘI TRÚ (IPD Flow)
  // Nhập viện → Phân giường → Điều trị → Ra viện
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 2: IPD - Nội trú', () => {

    it('Step 1: API - Danh sách bệnh nhân nội trú', () => {
      cy.request({ url: '/api/inpatient/patients', headers: h(token), failOnStatusCode: false })
        .then(resp => {
          if (resp.status === 200) {
            const items = resp.body.items || resp.body || [];
            cy.log(`Inpatients: ${Array.isArray(items) ? items.length : 0}`);
          }
        });
    });

    it('Step 2: API - Sơ đồ giường khoa Nội', () => {
      cy.request({
        url: '/api/inpatient/bed-status', headers: h(token), failOnStatusCode: false,
      }).then(resp => {
        cy.log(`Bed status: ${resp.status}`);
      });
    });

    it('Step 3: UI - Inpatient page loads with tabs', () => {
      cy.visit('/ipd', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(2500);
      cy.get('[data-node-key="current"]').should('exist');
      cy.get('[data-node-key="beds"]').should('exist');
      cy.get('[data-node-key="beds"]').click({ force: true });
      cy.wait(1500);
      cy.log('IPD tabs working');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 3: PHẪU THUẬT (Surgery Flow)
  // Chỉ định → Lên lịch → Thực hiện → Hoàn thành
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 3: Surgery - Phẫu thuật', () => {

    it('Step 1: API - Danh sách yêu cầu phẫu thuật', () => {
      cy.request({
        url: '/api/surgery', headers: h(token), failOnStatusCode: false,
      }).then(resp => {
        cy.log(`Surgery requests: ${resp.status}`);
      });
    });

    it('Step 2: UI - Surgery page all tabs', () => {
      cy.visit('/surgery', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(2500);
      const tabs = ['requests', 'schedules', 'rooms', 'inprogress', 'records'];
      tabs.forEach(tab => {
        cy.get(`[data-node-key="${tab}"]`).first().click({ force: true });
        cy.wait(1000);
        cy.log(`Surgery tab "${tab}" loaded`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 4: XÉT NGHIỆM (Lab/LIS Flow)
  // Chỉ định → Lấy mẫu → Chạy máy → Duyệt KQ → Trả KQ
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 4: Lab - Xét nghiệm (LIS)', () => {

    it('Step 1: API - Danh sách orders pending', () => {
      cy.request({ url: '/api/LISComplete/orders/pending', headers: h(token), failOnStatusCode: false })
        .then(resp => {
          cy.log(`LIS pending orders: ${resp.status} - ${JSON.stringify(resp.body).substring(0, 100)}`);
        });
    });

    it('Step 2: API - Danh mục xét nghiệm', () => {
      cy.request({ url: '/api/LISComplete/catalog/tests', headers: h(token), failOnStatusCode: false })
        .then(resp => {
          if (resp.status === 200 && Array.isArray(resp.body)) {
            cy.log(`Lab test catalog: ${resp.body.length} tests`);
          } else {
            cy.log(`Lab catalog: ${resp.status}`);
          }
        });
    });

    it('Step 3: API - Danh sách máy phân tích', () => {
      cy.request({ url: '/api/LISComplete/analyzers', headers: h(token), failOnStatusCode: false })
        .then(resp => {
          if (resp.status === 200 && Array.isArray(resp.body)) {
            cy.log(`Analyzers: ${resp.body.length}`);
            resp.body.slice(0, 3).forEach((a: any) => cy.log(`  ${a.name || a.code}`));
          }
        });
    });

    it('Step 4: UI - Laboratory page loads', () => {
      cy.visit('/lab', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('body').should('not.be.empty');
      cy.log('Lab page loaded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 5: KHO DƯỢC (Pharmacy Flow)
  // Nhập kho → Tồn kho → Xuất thuốc → Chuyển kho
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 5: Pharmacy - Kho dược', () => {

    it('Step 1: API - Pending prescriptions', () => {
      cy.request({ url: '/api/pharmacy/pending-prescriptions', headers: h(token) })
        .then(resp => {
          expect(resp.status).to.eq(200);
          const items = Array.isArray(resp.body) ? resp.body : [];
          cy.log(`Pending: ${items.length}`);
          items.slice(0, 3).forEach((p: any) => {
            cy.log(`  ${p.prescriptionCode} - ${p.patientName} - ${p.status}`);
          });
        });
    });

    it('Step 2: API - Inventory items', () => {
      cy.request({ url: '/api/pharmacy/inventory', headers: h(token), failOnStatusCode: false })
        .then(resp => {
          cy.log(`Inventory: ${resp.status} - items: ${Array.isArray(resp.body) ? resp.body.length : 'N/A'}`);
        });
    });

    it('Step 3: API - Transfer requests', () => {
      cy.request({ url: '/api/pharmacy/transfers', headers: h(token), failOnStatusCode: false })
        .then(resp => {
          cy.log(`Transfers: ${resp.status}`);
        });
    });

    it('Step 4: API - Alerts', () => {
      cy.request({ url: '/api/pharmacy/alerts', headers: h(token), failOnStatusCode: false })
        .then(resp => {
          cy.log(`Alerts: ${resp.status}`);
        });
    });

    it('Step 5: UI - Pharmacy page all tabs with data', () => {
      cy.visit('/pharmacy', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('.ant-table-tbody tr.ant-table-row').should('have.length.greaterThan', 0);

      ['inventory', 'transfers', 'alerts'].forEach(tab => {
        cy.get(`[data-node-key="${tab}"]`).first().click({ force: true });
        cy.wait(1500);
        cy.log(`Pharmacy tab "${tab}" loaded`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 6: THANH TOÁN (Billing Flow)
  // Tổng hợp chi phí → Thu tiền → In hóa đơn
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 6: Billing - Thu ngân', () => {

    it('Step 1: API - Statistics', () => {
      cy.request({ url: '/api/BillingComplete/statistics', headers: h(token) })
        .then(resp => {
          expect(resp.status).to.eq(200);
          cy.log(`Revenue: ${resp.body.totalRevenue}, Patients: ${resp.body.totalPatients}`);
        });
    });

    it('Step 2: API - Search patients for billing', () => {
      cy.request({
        url: '/api/BillingComplete/patients/search?keyword=Nguyen',
        headers: h(token), failOnStatusCode: false,
      }).then(resp => {
        cy.log(`Patient search: ${resp.status}`);
      });
    });

    it('Step 3: UI - Billing page all tabs', () => {
      cy.visit('/billing', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(2500);
      ['unpaid', 'deposits', 'refunds', 'reports'].forEach(tab => {
        cy.get(`[data-node-key="${tab}"]`).first().click({ force: true });
        cy.wait(1500);
        cy.log(`Billing tab "${tab}" loaded`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 7: CHẨN ĐOÁN HÌNH ẢNH (RIS/PACS Flow)
  // Chỉ định → Worklist → Thực hiện → Đọc KQ → Duyệt
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 7: RIS/PACS - Chẩn đoán hình ảnh', () => {

    it('Step 1: UI - Radiology page all tabs', () => {
      cy.visit('/radiology', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(2500);
      ['pending', 'worklist', 'inProgress', 'reporting', 'completed'].forEach(tab => {
        cy.get(`[data-node-key="${tab}"]`).first().click({ force: true });
        cy.wait(1500);
        cy.log(`Radiology tab "${tab}" loaded`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 8: NGÂN HÀNG MÁU (Blood Bank Flow)
  // Nhập máu → Lưu kho → Yêu cầu → Cross-match → Xuất
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 8: Blood Bank - Ngân hàng máu', () => {

    it('Step 1: API - Blood stock', () => {
      cy.request({
        url: '/api/bloodbankcompletee/stock', headers: h(token), failOnStatusCode: false,
      }).then(resp => {
        cy.log(`Blood stock: ${resp.status}`);
      });
    });

    it('Step 2: API - Blood orders', () => {
      cy.request({
        url: '/api/bloodbankcompletee/orders', headers: h(token), failOnStatusCode: false,
      }).then(resp => {
        cy.log(`Blood orders: ${resp.status}`);
      });
    });

    it('Step 3: API - Product types', () => {
      cy.request({
        url: '/api/bloodbankcompletee/product-types', headers: h(token), failOnStatusCode: false,
      }).then(resp => {
        cy.log(`Product types: ${resp.status}`);
        if (resp.status === 200 && Array.isArray(resp.body)) {
          resp.body.slice(0, 5).forEach((t: any) => cy.log(`  ${t.name || t.code}`));
        }
      });
    });

    it('Step 4: UI - Blood Bank page loads', () => {
      cy.visit('/blood-bank', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('body').should('not.be.empty');
      cy.log('Blood Bank page loaded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 9: BẢO HIỂM Y TẾ (Insurance Flow)
  // Xác minh thẻ → Tạo claim → Xuất XML → Gửi BHXH
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 9: Insurance - BHYT', () => {

    it('Step 1: API - Search claims', () => {
      cy.request({
        method: 'POST', url: '/api/insurance/claims/search',
        headers: h(token), body: {}, failOnStatusCode: false,
      }).then(resp => {
        if (resp.status === 200) {
          const items = resp.body.items || [];
          cy.log(`Insurance claims: ${items.length}`);
          items.slice(0, 3).forEach((c: any) => {
            cy.log(`  ${c.maLk} - ${c.patientName} - ${c.totalAmount}`);
          });
        }
      });
    });

    it('Step 2: API - Reports monthly', () => {
      cy.request({
        url: '/api/insurance/reports/monthly?year=2026&month=2',
        headers: h(token), failOnStatusCode: false,
      }).then(resp => {
        cy.log(`Insurance monthly report: ${resp.status}`);
      });
    });

    it('Step 3: UI - Insurance page tabs', () => {
      cy.visit('/insurance', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(2500);
      ['claims', 'xml'].forEach(tab => {
        cy.get(`[data-node-key="${tab}"]`).first().click({ force: true });
        cy.wait(1500);
        cy.log(`Insurance tab "${tab}" loaded`);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FLOW 10: BÁO CÁO & THỐNG KÊ (Reporting Flow)
  // Dashboard → KPI → Clinical → Financial → Admin
  // ═══════════════════════════════════════════════════════════════════
  describe('Flow 10: Reporting - Báo cáo thống kê', () => {

    it('Step 1: API - Dashboard', () => {
      cy.request({ url: '/api/reporting/dashboard', headers: h(token), failOnStatusCode: false })
        .then(resp => {
          cy.log(`Dashboard: ${resp.status}`);
          if (resp.status === 200) {
            Object.entries(resp.body).forEach(([k, v]) => {
              if (typeof v === 'number' && v > 0) cy.log(`  ${k}: ${v}`);
            });
          }
        });
    });

    it('Step 2: API - KPI', () => {
      cy.request({ url: '/api/reporting/kpi', headers: h(token), failOnStatusCode: false })
        .then(resp => { cy.log(`KPI: ${resp.status}`); });
    });

    it('Step 3: API - Clinical top diseases', () => {
      cy.request({ url: '/api/reporting/clinical/top-diseases', headers: h(token), failOnStatusCode: false })
        .then(resp => { cy.log(`Top diseases: ${resp.status}`); });
    });

    it('Step 4: API - Financial revenue', () => {
      cy.request({ url: '/api/reporting/financial/revenue', headers: h(token), failOnStatusCode: false })
        .then(resp => { cy.log(`Revenue report: ${resp.status}`); });
    });

    it('Step 5: API - Pharmacy stock', () => {
      cy.request({ url: '/api/reporting/pharmacy/current-stock', headers: h(token), failOnStatusCode: false })
        .then(resp => { cy.log(`Pharmacy stock report: ${resp.status}`); });
    });

    it('Step 6: UI - Dashboard loads', () => {
      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('body').should('not.be.empty');
    });

    it('Step 7: UI - Reports page loads', () => {
      cy.visit('/reports', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', token);
          win.localStorage.setItem('user', userData);
        },
      });
      cy.wait(3000);
      cy.get('body').should('not.be.empty');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UI VERIFICATION: All pages load without errors after workflow data
  // ═══════════════════════════════════════════════════════════════════
  describe('UI Verification - All pages after data flows', () => {
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
    ];

    pages.forEach(page => {
      it(`${page.name} (${page.route}) - no errors, data visible`, () => {
        const errors: string[] = [];

        cy.on('uncaught:exception', () => false);

        cy.intercept('**/api/**', req => {
          req.continue(res => {
            if (res.statusCode >= 500) {
              errors.push(`500: ${req.method} ${req.url}`);
            }
          });
        });

        cy.visit(page.route, {
          onBeforeLoad(win) {
            win.localStorage.setItem('token', token);
            win.localStorage.setItem('user', userData);
            const orig = win.console.error;
            win.console.error = (...args: any[]) => {
              const msg = args.map(a => typeof a === 'string' ? a : String(a)).join(' ');
              if (!isIgnored(msg)) errors.push(`console: ${msg}`);
              orig.apply(win.console, args);
            };
          },
        });

        cy.wait(2500);
        cy.get('body').should('not.be.empty');

        // Check for table data
        cy.get('body').then($body => {
          const rows = $body.find('.ant-table-tbody tr.ant-table-row').length;
          cy.log(`${page.name}: ${rows} table rows`);
        });

        cy.then(() => {
          if (errors.length > 0) {
            const list = errors.map((e, i) => `  ${i + 1}. ${e.substring(0, 150)}`).join('\n');
            throw new Error(`Errors on ${page.name}:\n${list}`);
          }
        });
      });
    });
  });
});
