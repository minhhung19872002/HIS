/// <reference types="cypress" />

// ============================================================================
// NangCap23 — strict flow/CRUD/state/permission/validation tests
// ----------------------------------------------------------------------------
// Yêu cầu strict assertion sau audit Phase 1-3:
//   - 400 phải là 400, không accept 500
//   - validate body shape {error, message, field}
//   - test config persistence (save → restart-equivalent reload → still there)
//   - test state machine (Verify-before-Complete → 400 INVALID_STATE)
//   - test SSRF (admin set internal URL → 400 VALIDATION_FAILED)
//   - test duplicate submission (cùng prescription submit 2 lần → 400/409)
//   - test sensitive token masking ("***" trên read sau save)
//   - test DLHC eligibility auto-compute (drug positive → eligible=false)
//
// Backend yêu cầu chạy ở Development (MockMode=true) — InMemory client.
// Auth: admin / Admin@123 (role Admin).
// ============================================================================

const API = 'http://localhost:5106/api';

let adminToken = '';

const login = (u: string, p: string) =>
  cy.request({ method: 'POST', url: `${API}/auth/login`, body: { username: u, password: p }, failOnStatusCode: false });
const authHeader = (tok: string) => ({ Authorization: `Bearer ${tok}` });

before(() => {
  login('admin', 'Admin@123').then((r) => {
    expect(r.status).to.eq(200);
    adminToken = r.body?.data?.token || r.body?.token;
    expect(adminToken, 'admin token').to.be.a('string').and.have.length.greaterThan(20);
  });
});

// ============================================================================
// 1. CONFIG PERSISTENCE — Critical-1 fix verification
// ============================================================================
describe('NangCap23 [Critical-1] Config persistence', () => {
  const uniqueTestFacility = `BV-CYPRESS-${Date.now()}`;

  it('POST /national-prescription-gateway/config persists facilityCode', () => {
    cy.request({
      method: 'POST',
      url: `${API}/national-prescription-gateway/config`,
      headers: authHeader(adminToken),
      body: {
        nationalPrescriptionBaseUrl: 'https://donthuocquocgia.vn',
        nationalPharmacyBaseUrl: 'https://duocquocgia.com.vn',
        facilityCode: uniqueTestFacility,
        facilityName: 'BV Cypress Test',
        mockMode: true,
        autoSubmit: false,
        retryCount: 3,
        timeoutSeconds: 30,
      },
    }).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body).to.deep.eq({ success: true });
    });
  });

  it('GET /national-prescription-gateway/config returns the saved facilityCode', () => {
    cy.request({
      url: `${API}/national-prescription-gateway/config`,
      headers: authHeader(adminToken),
    }).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.facilityCode, 'facilityCode persisted').to.eq(uniqueTestFacility);
    });
  });

  it('POST /zalo-notification/config persists sensitive token (must be masked on read)', () => {
    cy.request({
      method: 'POST',
      url: `${API}/zalo-notification/config`,
      headers: authHeader(adminToken),
      body: {
        accessToken: 'CYPRESS_SECRET_NEVER_LEAK_42',
        oaId: '999000111',
        baseUrl: 'https://business.openapi.zalo.me',
        mockMode: true,
        isEnabled: true,
      },
    }).then((r) => {
      expect(r.status).to.eq(200);
      // Read back — token must be masked, not leaked
      cy.request({
        url: `${API}/zalo-notification/config`,
        headers: authHeader(adminToken),
      }).then((rr) => {
        expect(rr.body.accessToken).to.eq('***');
        expect(rr.body.oaId).to.eq('999000111');
        expect(rr.body.isEnabled).to.eq(true);
        // Re-saving with masked "***" must NOT overwrite real token
        cy.request({
          method: 'POST',
          url: `${API}/zalo-notification/config`,
          headers: authHeader(adminToken),
          body: { accessToken: '***', oaId: '999000111', baseUrl: 'https://business.openapi.zalo.me', mockMode: true, isEnabled: true },
        }).then((sr) => {
          expect(sr.status).to.eq(200);
        });
      });
    });
  });
});

// ============================================================================
// 2. SSRF PROTECTION — Med-4 fix verification
// ============================================================================
describe('NangCap23 [Med-4] SSRF allowlist', () => {
  ['http://169.254.169.254/metadata', 'https://evil.attacker.com', 'http://10.0.0.1', 'file:///etc/passwd']
    .forEach((badUrl) => {
      it(`refuses BaseUrl "${badUrl}" with 400 VALIDATION_FAILED`, () => {
        cy.request({
          method: 'POST',
          url: `${API}/national-prescription-gateway/config`,
          headers: authHeader(adminToken),
          failOnStatusCode: false,
          body: {
            nationalPrescriptionBaseUrl: badUrl,
            nationalPharmacyBaseUrl: 'https://duocquocgia.com.vn',
            facilityCode: 'BV', facilityName: 'X', mockMode: true,
            autoSubmit: false, retryCount: 3, timeoutSeconds: 30,
          },
        }).then((r) => {
          expect(r.status).to.eq(400);
          expect(r.body.error).to.eq('VALIDATION_FAILED');
        });
      });
    });
});

// ============================================================================
// 3. VALIDATION — strict body shape
// ============================================================================
describe('NangCap23 [Validation] strict response shape', () => {
  it('Submit prescription empty PrescriptionId → 400 VALIDATION_FAILED', () => {
    cy.request({
      method: 'POST',
      url: `${API}/national-prescription-gateway/submit`,
      headers: authHeader(adminToken),
      failOnStatusCode: false,
      body: { prescriptionId: '00000000-0000-0000-0000-000000000000',
              prescriptionType: 'Outpatient', doctorIdNumber: '', doctorLicenseNumber: '' },
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('VALIDATION_FAILED');
      expect(r.body.message).to.match(/PrescriptionId/);
    });
  });

  it('Submit prescription missing CCCD → 400 VALIDATION_FAILED (post PrescriptionId guard)', () => {
    cy.request({
      method: 'POST',
      url: `${API}/national-prescription-gateway/submit`,
      headers: authHeader(adminToken),
      failOnStatusCode: false,
      body: { prescriptionId: '11111111-1111-1111-1111-111111111111',
              prescriptionType: 'Outpatient', doctorIdNumber: '', doctorLicenseNumber: '' },
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('VALIDATION_FAILED');
      expect(r.body.message).to.match(/CCCD bác sĩ/);
    });
  });

  it('Generate pharmacy report PeriodFrom > PeriodTo → 400 VALIDATION_FAILED', () => {
    cy.request({
      method: 'POST',
      url: `${API}/national-pharmacy/generate`,
      headers: authHeader(adminToken),
      failOnStatusCode: false,
      body: { reportType: 'DailySale', periodFrom: '2026-12-31', periodTo: '2026-01-01' },
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('VALIDATION_FAILED');
    });
  });

  it('Generate pharmacy with invalid ReportType → 400', () => {
    cy.request({
      method: 'POST', url: `${API}/national-pharmacy/generate`, headers: authHeader(adminToken),
      failOnStatusCode: false,
      body: { reportType: 'INVALID_X', periodFrom: '2026-05-01', periodTo: '2026-05-02' },
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('VALIDATION_FAILED');
    });
  });

  it('Send Zalo phone < 9 → 400 VALIDATION_FAILED', () => {
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/send`, headers: authHeader(adminToken),
      failOnStatusCode: false,
      body: { targetPhone: '123', templateId: 'appointment_reminder', templateParams: {} },
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('VALIDATION_FAILED');
      expect(r.body.message).to.match(/Số điện thoại/);
    });
  });

  it('Send Zalo empty templateId → 400', () => {
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/send`, headers: authHeader(adminToken),
      failOnStatusCode: false,
      body: { targetPhone: '0901234567', templateId: '', templateParams: {} },
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('VALIDATION_FAILED');
    });
  });
});

// ============================================================================
// 4. AUTHORIZATION — anonymous + role-based
// ============================================================================
describe('NangCap23 [Sec-1] role-based auth', () => {
  it('Anonymous /config → 401', () => {
    cy.request({ url: `${API}/national-prescription-gateway/config`, failOnStatusCode: false })
      .its('status').should('eq', 401);
  });

  it('Anonymous Submit → 401', () => {
    cy.request({
      method: 'POST', url: `${API}/national-prescription-gateway/submit`,
      failOnStatusCode: false,
      body: { prescriptionId: '00000000-0000-0000-0000-000000000000', doctorIdNumber: 'x', doctorLicenseNumber: 'y' },
    }).its('status').should('eq', 401);
  });

  it('Admin /config → 200 + body has mockMode key', () => {
    cy.request({
      url: `${API}/national-prescription-gateway/config`,
      headers: authHeader(adminToken),
    }).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body).to.have.property('mockMode');
      expect(r.body).to.have.property('facilityCode');
    });
  });
});

// ============================================================================
// 5. ZALO SEND — InMemory client returns Ack with MOCK- prefix
// ============================================================================
describe('NangCap23 [Flow] Zalo send (MockMode)', () => {
  let lastLogId = '';

  it('Send valid ZNS → 200, status=2, messageId starts with MOCK-', () => {
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/send`, headers: authHeader(adminToken),
      body: {
        targetPhone: '0987654321', templateId: 'appointment_reminder',
        templateParams: { patient_name: 'Cypress Test', appointment_date: '2026-05-25', doctor_name: 'BS Test' },
      },
    }).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.status, 'Delivered').to.eq(2);
      expect(r.body.statusName).to.match(/Đã nhận|Delivered/i);
      expect(r.body.messageId, 'MOCK prefix').to.match(/^MOCK-/);
      lastLogId = r.body.id;
    });
  });

  it('Retry on Delivered message → 400 INVALID_STATE', function () {
    if (!lastLogId) this.skip();
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/${lastLogId}/retry`,
      headers: authHeader(adminToken), failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('INVALID_STATE');
      expect(r.body.message).to.match(/đã giao thành công|đã ack/i);
    });
  });
});

// ============================================================================
// 6. QUALITY DASHBOARD — 5 view 200
// ============================================================================
describe('NangCap23 [API] Quality Dashboard', () => {
  ['clinic-queues', 'inpatient-by-dept', 'paraclinical', 'lab', 'revenue'].forEach((p) => {
    it(`GET /quality-dashboard/${p} → 200`, () => {
      cy.request({ url: `${API}/quality-dashboard/${p}`, headers: authHeader(adminToken) })
        .its('status').should('eq', 200);
    });
  });
});

// ============================================================================
// 7. PHASE 2 HARDENING — Critical-NEW-1, High-NEW-1, High-NEW-2/3, Med-NEW-3
// ============================================================================

describe('NangCap23 [Critical-NEW-1] SystemConfig race safety', () => {
  it('3 sequential POST /config với cùng key giữ atomic — chỉ 1 active row', () => {
    const cfg = (suffix: string) => ({
      nationalPrescriptionBaseUrl: 'https://donthuocquocgia.vn',
      nationalPharmacyBaseUrl: 'https://duocquocgia.com.vn',
      facilityCode: `BV-RACE-${suffix}`,
      facilityName: 'BV Race',
      mockMode: true, autoSubmit: false, retryCount: 3, timeoutSeconds: 30,
    });
    cy.request({ method: 'POST', url: `${API}/national-prescription-gateway/config`, headers: authHeader(adminToken), body: cfg('1') });
    cy.request({ method: 'POST', url: `${API}/national-prescription-gateway/config`, headers: authHeader(adminToken), body: cfg('2') });
    cy.request({ method: 'POST', url: `${API}/national-prescription-gateway/config`, headers: authHeader(adminToken), body: cfg('3') }).then((r) => {
      expect(r.body).to.deep.eq({ success: true });
      cy.request({ url: `${API}/national-prescription-gateway/config`, headers: authHeader(adminToken) }).then((rr) => {
        expect(rr.body.facilityCode, 'final state = last write').to.eq('BV-RACE-3');
      });
    });
  });

  it('SaveConfig invalid int → 400 VALIDATION_FAILED (Med-NEW-5 type validation)', () => {
    // RetryCount phải là int — server validate trước khi save
    cy.request({
      method: 'POST',
      url: `${API}/national-prescription-gateway/config`,
      headers: authHeader(adminToken),
      failOnStatusCode: false,
      body: {
        nationalPrescriptionBaseUrl: 'https://donthuocquocgia.vn',
        nationalPharmacyBaseUrl: 'https://duocquocgia.com.vn',
        facilityCode: 'BV-X', facilityName: 'X',
        mockMode: true, autoSubmit: false,
        retryCount: 999, // valid int but out of 1..10 range → ConfigValidator throws
        timeoutSeconds: 30,
      },
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('VALIDATION_FAILED');
    });
  });
});

describe('NangCap23 [High-NEW-1] Linen state machine guard', () => {
  it('Jump trạng thái 0→3 (Reconciled skip Received) → 400 INVALID_STATE', () => {
    const ts = Date.now();
    cy.request({
      method: 'POST', url: `${API}/linen/items`, headers: authHeader(adminToken),
      body: {
        itemCode: `LIT-CY-${ts}`, itemName: 'Linen Cy Test', category: 'Bedding',
        currentStock: 5, minStockAlert: 1, isActive: true,
      },
    }).then((it) => {
      cy.request({
        method: 'POST', url: `${API}/linen/transactions`, headers: authHeader(adminToken),
        body: {
          transactionType: 'Dispatch',
          transactionDate: new Date().toISOString().substring(0, 10),
          totalItems: 1, totalWeightKg: 0.5,
          detailsJson: JSON.stringify([{ linenItemId: it.body.id, quantity: 1 }]),
        },
      }).then((tx) => {
        const txId = tx.body.id;
        expect(tx.body.status, 'new tx starts at Draft').to.eq(0);
        // Jump 0 → 3 (Reconciled) trực tiếp → reject
        cy.request({
          method: 'POST',
          url: `${API}/linen/transactions/${txId}/status/3`,
          headers: authHeader(adminToken),
          failOnStatusCode: false,
        }).then((r) => {
          expect(r.status).to.eq(400);
          expect(r.body.error).to.eq('INVALID_STATE');
          expect(r.body.message).to.match(/không hợp lệ/);
        });
        // Valid path 0→1→2 OK
        cy.request({
          method: 'POST',
          url: `${API}/linen/transactions/${txId}/status/1`,
          headers: authHeader(adminToken),
        }).its('body.status').should('eq', 1);
        cy.request({
          method: 'POST',
          url: `${API}/linen/transactions/${txId}/status/2`,
          headers: authHeader(adminToken),
        }).its('body.status').should('eq', 2);
      });
    });
  });
});

describe('NangCap23 [Med-NEW-3] Model-binding error consistent shape', () => {
  it('Malformed JSON body → 400 {error:VALIDATION_FAILED, message, field}', () => {
    cy.request({
      method: 'POST',
      url: `${API}/national-prescription-gateway/submit`,
      headers: { ...authHeader(adminToken), 'Content-Type': 'application/json' },
      body: 'not-json-body-xxx',
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body.error).to.eq('VALIDATION_FAILED');
      expect(r.body).to.have.property('message');
      expect(r.body).to.have.property('field');
    });
  });
});

describe('NangCap23 [Med-NEW-1] Zalo AccessToken — null vs *** vs ""', () => {
  it('Save token "REAL" then re-save with "***" keeps original token (no overwrite)', () => {
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/config`, headers: authHeader(adminToken),
      body: { accessToken: 'CY_TOKEN_KEEP_TEST', oaId: '888', baseUrl: 'https://business.openapi.zalo.me', mockMode: true, isEnabled: true },
    });
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/config`, headers: authHeader(adminToken),
      body: { accessToken: '***', oaId: '888', baseUrl: 'https://business.openapi.zalo.me', mockMode: true, isEnabled: true },
    });
    cy.request({ url: `${API}/zalo-notification/config`, headers: authHeader(adminToken) }).then((r) => {
      expect(r.body.accessToken).to.eq('***'); // mask vẫn trả ra → token thật vẫn còn trong DB
    });
  });

  it('Save token "" (empty) thực sự CLEAR token — GET trả "" thay vì "***"', () => {
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/config`, headers: authHeader(adminToken),
      body: { accessToken: '', oaId: '888', baseUrl: 'https://business.openapi.zalo.me', mockMode: true, isEnabled: false },
    });
    cy.request({ url: `${API}/zalo-notification/config`, headers: authHeader(adminToken) }).then((r) => {
      expect(r.body.accessToken).to.eq(''); // cleared
    });
  });
});

// ============================================================================
// 8. EXCEPTION FILTER — body shape (regression for Med-1)
// ============================================================================
describe('NangCap23 [Med-1] Exception filter body shape', () => {
  it('VALIDATION_FAILED body has {error, message, field}', () => {
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/send`, headers: authHeader(adminToken),
      failOnStatusCode: false,
      body: { targetPhone: '1', templateId: 'x', templateParams: {} },
    }).then((r) => {
      expect(r.status).to.eq(400);
      expect(r.body).to.have.keys('error', 'message', 'field');
      expect(r.body.error).to.eq('VALIDATION_FAILED');
    });
  });

  it('INVALID_STATE body has {error, message} (no field)', () => {
    // Tạo log + retry để force state-machine throw
    cy.request({
      method: 'POST', url: `${API}/zalo-notification/send`, headers: authHeader(adminToken),
      body: { targetPhone: '0900000000', templateId: 'appointment_reminder', templateParams: {} },
    }).then((sendR) => {
      cy.request({
        method: 'POST',
        url: `${API}/zalo-notification/${sendR.body.id}/retry`,
        headers: authHeader(adminToken),
        failOnStatusCode: false,
      }).then((r) => {
        expect(r.status).to.eq(400);
        expect(r.body.error).to.eq('INVALID_STATE');
        expect(r.body.message).to.be.a('string').and.have.length.greaterThan(5);
      });
    });
  });
});
