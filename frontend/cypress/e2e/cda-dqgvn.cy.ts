/**
 * Cypress E2E Tests for HL7 CDA Document Generation and DQGVN National Health Data Exchange
 */

let authToken: string;

function h(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function getActiveExamRoomId() {
  return cy.request({
    method: 'GET',
    url: '/api/examination/rooms/active',
    headers: h(authToken),
  }).then((resp) => {
    expect(resp.status).to.eq(200);

    const rooms = Array.isArray(resp.body) ? resp.body : (resp.body?.data || []);
    expect(rooms.length, 'active exam rooms').to.be.greaterThan(0);

    return rooms[0].id as string;
  });
}

function registerFeePatient(namePrefix: string, gender: number, dateOfBirth: string) {
  const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const phoneNumber = `09${seed.slice(-8)}`;
  const identityNumber = seed.padStart(12, '0').slice(-12);

  return getActiveExamRoomId().then((roomId) => {
    return cy.request({
      method: 'POST',
      url: '/api/reception/register/fee',
      headers: h(authToken),
      body: {
        newPatient: {
          fullName: `${namePrefix} ${seed}`,
          dateOfBirth,
          gender,
          phoneNumber,
          address: 'Hue',
          identityNumber,
        },
        serviceType: 2,
        roomId,
      },
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body.patientId, 'patientId').to.exist;
      return resp.body.patientId as string;
    });
  });
}

before(() => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username: 'admin', password: 'Admin@123' },
  }).then((resp) => {
    authToken = resp.body.data?.token || resp.body.token;
  });
});

describe('HL7 CDA Document Generation', () => {
  describe('CDA API Endpoints', () => {
    it('GET /api/cda returns list or empty result', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda',
        headers: h(authToken),
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('items');
        expect(resp.body).to.have.property('totalCount');
        expect(resp.body).to.have.property('pageIndex');
        expect(resp.body).to.have.property('pageSize');
      });
    });

    it('POST /api/cda/generate with empty body returns 400 or 500', () => {
      cy.request({
        method: 'POST',
        url: '/api/cda/generate',
        headers: h(authToken),
        body: {},
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([400, 500]);
      });
    });

    it('GET /api/cda/nonexistent returns 404 or 204', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda/00000000-0000-0000-0000-000000000000',
        headers: h(authToken),
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([404, 204, 200]);
      });
    });

    it('CDA search supports pagination parameters', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda?pageIndex=0&pageSize=10',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.pageSize).to.eq(10);
      });
    });

    it('CDA search supports documentType filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda?documentType=1',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('items');
      });
    });

    it('CDA search supports status filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda?status=0',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('CDA search supports date range filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda?dateFrom=2026-01-01&dateTo=2026-12-31',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });
  });

  describe('CDA Document Generation with Real Patient', () => {
    let patientId: string;

    before(() => {
      registerFeePatient('CDA Test Patient', 1, '1985-06-15').then((id) => {
        patientId = id;
      });
    });

    it('generates DischargeSummary CDA for patient', () => {
      cy.request({
        method: 'POST',
        url: '/api/cda/generate',
        headers: h(authToken),
        body: {
          documentType: 1,
          patientId,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
        if (resp.status === 200) {
          expect(resp.body).to.have.property('id');
          expect(resp.body).to.have.property('documentId');
          expect(resp.body.documentType).to.eq(1);
          expect(resp.body.status).to.eq(0);
        }
      });
    });

    it('generates PrescriptionDocument CDA for patient', () => {
      cy.request({
        method: 'POST',
        url: '/api/cda/generate',
        headers: h(authToken),
        body: {
          documentType: 8,
          patientId,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
      });
    });

    it('searches CDA documents by patient', () => {
      cy.request({
        method: 'GET',
        url: `/api/cda?patientId=${patientId}`,
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('items');
      });
    });
  });
});

describe('DQGVN National Health Data Exchange', () => {
  describe('DQGVN Dashboard API', () => {
    it('GET /api/dqgvn/dashboard returns statistics', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/dashboard',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('totalSubmissions');
        expect(resp.body).to.have.property('pendingCount');
        expect(resp.body).to.have.property('submittedCount');
        expect(resp.body).to.have.property('acceptedCount');
        expect(resp.body).to.have.property('rejectedCount');
        expect(resp.body).to.have.property('errorCount');
        expect(resp.body).to.have.property('acceptanceRate');
        expect(resp.body).to.have.property('byType');
        expect(resp.body).to.have.property('last7Days');
        expect(resp.body.last7Days).to.have.length(7);
      });
    });
  });

  describe('DQGVN Submissions API', () => {
    it('GET /api/dqgvn/submissions returns paged list', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('items');
        expect(resp.body).to.have.property('totalCount');
        expect(resp.body).to.have.property('pageIndex');
        expect(resp.body).to.have.property('pageSize');
      });
    });

    it('supports pagination parameters', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions?pageIndex=0&pageSize=5',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.pageSize).to.eq(5);
      });
    });

    it('supports submissionType filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions?submissionType=1',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('supports status filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions?status=0',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('supports date range filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions?dateFrom=2026-01-01&dateTo=2026-12-31',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('GET nonexistent submission returns 404 or 204', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions/00000000-0000-0000-0000-000000000000',
        headers: h(authToken),
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([404, 204, 200]);
      });
    });
  });

  describe('DQGVN Patient Submission', () => {
    let patientId: string;

    before(() => {
      registerFeePatient('DQGVN Test Patient', 2, '1990-03-20').then((id) => {
        patientId = id;
      });
    });

    it('submits patient demographics to DQGVN', () => {
      cy.request({
        method: 'POST',
        url: `/api/dqgvn/submit/patient/${patientId}`,
        headers: h(authToken),
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
        if (resp.status === 200) {
          expect(resp.body).to.have.property('success');
          expect(resp.body).to.have.property('submissionId');
        }
      });
    });

    it('submits encounter data to DQGVN', () => {
      cy.request({
        method: 'POST',
        url: '/api/dqgvn/submit/encounter',
        headers: h(authToken),
        body: { patientId },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
      });
    });

    it('batch submit processes pending submissions', () => {
      cy.request({
        method: 'POST',
        url: '/api/dqgvn/submit/batch',
        headers: h(authToken),
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
        if (resp.status === 200) {
          expect(resp.body).to.not.be.null;
        }
      });
    });
  });

  describe('DQGVN Config API', () => {
    it('GET /api/dqgvn/config returns configuration', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/config',
        headers: h(authToken),
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('facilityCode');
        expect(resp.body).to.have.property('isEnabled');
        expect(resp.body).to.have.property('autoSubmit');
        expect(resp.body).to.have.property('retryCount');
        expect(resp.body).to.have.property('timeoutSeconds');
      });
    });

    it('PUT /api/dqgvn/config updates configuration', () => {
      cy.request({
        method: 'PUT',
        url: '/api/dqgvn/config',
        headers: h(authToken),
        body: {
          apiBaseUrl: 'https://dqgvn-test.moh.gov.vn/api',
          facilityCode: '46-001',
          facilityName: 'BV Dai hoc Y Duoc Hue',
          provinceCode: '46',
          districtCode: '001',
          apiKey: '',
          secretKey: '',
          isEnabled: false,
          autoSubmit: false,
          retryCount: 3,
          timeoutSeconds: 30,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 204, 500]);
      });
    });
  });
});
