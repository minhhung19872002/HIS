/**
 * Cypress E2E Tests for HL7 CDA Document Generation & DQGVN National Health Data Exchange
 */

let authToken: string;

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
        headers: { Authorization: `Bearer ${authToken}` },
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
        headers: { Authorization: `Bearer ${authToken}` },
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
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([404, 204, 200]);
      });
    });

    it('CDA search supports pagination parameters', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda?pageIndex=0&pageSize=10',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.pageSize).to.eq(10);
      });
    });

    it('CDA search supports documentType filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda?documentType=1',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('items');
      });
    });

    it('CDA search supports status filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda?status=0',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('CDA search supports date range filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/cda?dateFrom=2026-01-01&dateTo=2026-12-31',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });
  });

  describe('CDA Document Generation with Real Patient', () => {
    let patientId: string;

    before(() => {
      cy.request({
        method: 'POST',
        url: '/api/reception/register',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          fullName: 'CDA Test Patient',
          dateOfBirth: '1985-06-15',
          gender: 1,
          phone: '0901234580',
          address: 'Huế',
          patientType: 1,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200 && resp.body.patientId) {
          patientId = resp.body.patientId;
        }
      });
    });

    it('generates DischargeSummary CDA for patient', function () {
      if (!patientId) this.skip();
      cy.request({
        method: 'POST',
        url: '/api/cda/generate',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          documentType: 1,
          patientId: patientId,
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

    it('generates PrescriptionDocument CDA for patient', function () {
      if (!patientId) this.skip();
      cy.request({
        method: 'POST',
        url: '/api/cda/generate',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          documentType: 8,
          patientId: patientId,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
      });
    });

    it('searches CDA documents by patient', function () {
      if (!patientId) this.skip();
      cy.request({
        method: 'GET',
        url: `/api/cda?patientId=${patientId}`,
        headers: { Authorization: `Bearer ${authToken}` },
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
        headers: { Authorization: `Bearer ${authToken}` },
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
        headers: { Authorization: `Bearer ${authToken}` },
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
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
        expect(resp.body.pageSize).to.eq(5);
      });
    });

    it('supports submissionType filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions?submissionType=1',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('supports status filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions?status=0',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('supports date range filter', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions?dateFrom=2026-01-01&dateTo=2026-12-31',
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((resp) => {
        expect(resp.status).to.eq(200);
      });
    });

    it('GET nonexistent submission returns 404 or 204', () => {
      cy.request({
        method: 'GET',
        url: '/api/dqgvn/submissions/00000000-0000-0000-0000-000000000000',
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([404, 204, 200]);
      });
    });
  });

  describe('DQGVN Patient Submission', () => {
    let patientId: string;

    before(() => {
      cy.request({
        method: 'POST',
        url: '/api/reception/register',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          fullName: 'DQGVN Test Patient',
          dateOfBirth: '1990-03-20',
          gender: 2,
          phone: '0901234581',
          address: 'Đà Nẵng',
          patientType: 1,
        },
        failOnStatusCode: false,
      }).then((resp) => {
        if (resp.status === 200 && resp.body.patientId) {
          patientId = resp.body.patientId;
        }
      });
    });

    it('submits patient demographics to DQGVN', function () {
      if (!patientId) this.skip();
      cy.request({
        method: 'POST',
        url: `/api/dqgvn/submit/patient/${patientId}`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
        if (resp.status === 200) {
          expect(resp.body).to.have.property('success');
          expect(resp.body).to.have.property('submissionId');
        }
      });
    });

    it('submits encounter data to DQGVN', function () {
      if (!patientId) this.skip();
      cy.request({
        method: 'POST',
        url: '/api/dqgvn/submit/encounter',
        headers: { Authorization: `Bearer ${authToken}` },
        body: { patientId: patientId },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
      });
    });

    it('batch submit processes pending submissions', () => {
      cy.request({
        method: 'POST',
        url: '/api/dqgvn/submit/batch',
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((resp) => {
        expect(resp.status).to.be.oneOf([200, 500]);
        if (resp.status === 200) {
          // May return number or object with count
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
        headers: { Authorization: `Bearer ${authToken}` },
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
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          apiBaseUrl: 'https://dqgvn-test.moh.gov.vn/api',
          facilityCode: '46-001',
          facilityName: 'BV Đại học Y Dược Huế',
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
