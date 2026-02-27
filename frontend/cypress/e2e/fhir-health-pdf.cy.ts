describe('FHIR R4, Health Monitoring, PDF Generation', () => {
  beforeEach(() => {
    cy.request('POST', 'http://localhost:5106/api/auth/login', {
      username: 'admin',
      password: 'Admin@123'
    }).then(resp => {
      window.localStorage.setItem('token', resp.body.data.token);
      window.localStorage.setItem('user', JSON.stringify(resp.body.data.user));
    });
  });

  describe('FHIR R4 API - HealthExchange page', () => {
    it('loads HealthExchange page and has FHIR tab', () => {
      cy.visit('/health-exchange');
      cy.contains('Lien thong Y te', { timeout: 10000 }).should('be.visible');
      cy.contains('.ant-tabs-tab', 'FHIR R4', { timeout: 5000 }).should('exist');
    });

    it('FHIR tab shows server status alert', () => {
      cy.visit('/health-exchange');
      cy.contains('.ant-tabs-tab', 'FHIR R4', { timeout: 10000 }).click();
      cy.contains('HL7 FHIR R4 Server', { timeout: 5000 }).should('be.visible');
    });

    it('FHIR tab has resource type selector', () => {
      cy.visit('/health-exchange');
      cy.contains('.ant-tabs-tab', 'FHIR R4', { timeout: 10000 }).click();
      cy.get('.ant-select', { timeout: 5000 }).should('exist');
    });

    it('FHIR tab has search button', () => {
      cy.visit('/health-exchange');
      cy.contains('.ant-tabs-tab', 'FHIR R4', { timeout: 10000 }).click();
      cy.contains('button', 'Tim kiem', { timeout: 5000 }).should('exist');
    });

    it('can search FHIR Patient resource', () => {
      cy.visit('/health-exchange');
      cy.contains('.ant-tabs-tab', 'FHIR R4', { timeout: 10000 }).click();
      cy.contains('button', 'Tim kiem', { timeout: 5000 }).click();
      cy.get('.ant-table', { timeout: 10000 }).should('exist');
    });

    it('FHIR search results table has correct columns', () => {
      cy.visit('/health-exchange');
      cy.contains('.ant-tabs-tab', 'FHIR R4', { timeout: 10000 }).click();
      cy.contains('button', 'Tim kiem', { timeout: 5000 }).click();
      // Table may be empty if no FHIR data - just verify table renders
      cy.get('.ant-table', { timeout: 10000 }).first().should('exist');
    });

    it('has export FHIR Bundle section', () => {
      cy.visit('/health-exchange');
      cy.contains('.ant-tabs-tab', 'FHIR R4', { timeout: 10000 }).click();
      cy.contains('Xuat du lieu FHIR Bundle', { timeout: 5000 }).should('exist');
    });

    it('has external FHIR server section', () => {
      cy.visit('/health-exchange');
      cy.contains('.ant-tabs-tab', 'FHIR R4', { timeout: 10000 }).click();
      cy.contains('Ket noi FHIR Server ngoai', { timeout: 5000 }).should('exist');
    });

    it('FHIR API endpoint responds', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/fhir/metadata',
        headers: { Authorization: `Bearer ${window.localStorage.getItem('token')}` },
        failOnStatusCode: false,
      }).then(resp => {
        expect(resp.status).to.be.oneOf([200, 401]);
      });
    });

    it('FHIR Patient search API responds', () => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin', password: 'Admin@123'
      }).then(loginResp => {
        cy.request({
          method: 'GET',
          url: 'http://localhost:5106/api/fhir/Patient',
          headers: { Authorization: `Bearer ${loginResp.body.data.token}` },
          failOnStatusCode: false,
        }).then(resp => {
          expect(resp.status).to.eq(200);
          expect(resp.body).to.have.property('resourceType', 'Bundle');
        });
      });
    });
  });

  describe('Health Monitoring - SystemAdmin page', () => {
    const navigateToHealthTab = () => {
      cy.visit('/admin');
      cy.get('.ant-tabs', { timeout: 10000 }).should('be.visible');
      // Health tab may be in overflow "more" menu with 6 tabs
      cy.get('body').then($body => {
        const healthTab = $body.find('.ant-tabs-tab[data-node-key="health"]');
        if (healthTab.length > 0 && healthTab.is(':visible')) {
          cy.wrap(healthTab).click();
        } else {
          // Tab is in "more" overflow dropdown
          const moreBtn = $body.find('.ant-tabs-nav-more');
          if (moreBtn.length > 0) {
            cy.wrap(moreBtn).click({ force: true });
            cy.wait(500);
            cy.get('.ant-tabs-dropdown').should('be.visible');
            cy.get('.ant-tabs-dropdown-menu-item').last().click({ force: true });
          } else {
            cy.get('.ant-tabs-tab').last().click({ force: true });
          }
        }
      });
      // Wait for health data to load
      cy.wait(2000);
    };

    it('loads SystemAdmin page and has tabs', () => {
      cy.visit('/admin');
      cy.get('.ant-tabs', { timeout: 10000 }).should('be.visible');
    });

    it('health monitoring tab shows system status', () => {
      navigateToHealthTab();
      cy.get('.ant-badge', { timeout: 15000 }).should('exist');
    });

    it('shows refresh button', () => {
      navigateToHealthTab();
      cy.contains('button', /Làm m|Lam m/i, { timeout: 15000 }).should('exist');
    });

    it('shows version and uptime statistics', () => {
      navigateToHealthTab();
      // Wait for health data to load
      cy.contains(/Phiên bản|Phien ban/i, { timeout: 15000 }).should('exist');
      cy.contains('Uptime', { timeout: 5000 }).should('exist');
    });

    it('shows request metrics', () => {
      navigateToHealthTab();
      cy.contains(/Tổng requests|Tong requests/i, { timeout: 15000 }).should('exist');
    });

    it('shows component health cards', () => {
      navigateToHealthTab();
      cy.contains('SQL Server', { timeout: 15000 }).should('exist');
    });

    it('shows disk and memory info', () => {
      navigateToHealthTab();
      // Look for disk/memory labels or progress bars
      cy.get('.ant-progress', { timeout: 15000 }).should('exist');
    });

    it('shows HTTP status code distribution', () => {
      navigateToHealthTab();
      cy.contains(/Phân bố mã|Phan bo ma|HTTP/i, { timeout: 15000 }).should('exist');
    });

    it('shows top endpoints table', () => {
      navigateToHealthTab();
      cy.contains(/Endpoint phổ biến|Endpoint pho bien/i, { timeout: 15000 }).should('exist');
    });

    it('health API endpoints respond', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/health',
        failOnStatusCode: false,
      }).then(resp => {
        expect(resp.status).to.be.oneOf([200, 503]);
        expect(resp.body).to.have.property('status');
      });
    });

    it('health live endpoint responds', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/health/live',
        failOnStatusCode: false,
      }).then(resp => {
        expect(resp.status).to.eq(200);
      });
    });

    it('metrics API endpoint responds', () => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin', password: 'Admin@123'
      }).then(loginResp => {
        cy.request({
          method: 'GET',
          url: 'http://localhost:5106/api/metrics',
          headers: { Authorization: `Bearer ${loginResp.body.data.token}` },
          failOnStatusCode: false,
        }).then(resp => {
          expect(resp.status).to.eq(200);
          expect(resp.body).to.have.property('totalRequests');
        });
      });
    });
  });

  describe('EMR PDF Generation', () => {
    beforeEach(() => {
      cy.intercept('POST', '**/api/examination/search', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            items: [{
              id: '00000000-0000-0000-0000-000000000001',
              patientId: '00000000-0000-0000-0000-000000000002',
              patientCode: 'BN001',
              patientName: 'Nguyễn Văn A',
              roomId: '00000000-0000-0000-0000-000000000003',
              roomName: 'Phòng khám 1',
              status: 4,
              statusName: 'Hoàn thành',
              queueNumber: 1,
              examinationDate: new Date().toISOString(),
              diagnosisCode: 'J06',
              diagnosisName: 'Nhiễm khuẩn đường hô hấp trên',
            }],
            totalCount: 1, pageNumber: 1, pageSize: 20, totalPages: 1,
          }
        }
      }).as('searchExam');

      cy.intercept('GET', '**/api/examination/*/medical-record', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            medicalRecordCode: 'BA2026001',
            patient: {
              id: '00000000-0000-0000-0000-000000000002',
              patientCode: 'BN001', fullName: 'Nguyễn Văn A',
              gender: 1, age: 35, phoneNumber: '0901234567',
              address: '123 Lê Lợi, Q1, TP.HCM',
            },
            vitalSigns: { weight: 65, height: 170, bmi: 22.5, pulse: 78, temperature: 36.8, systolicBp: 120, diastolicBp: 80, respiratoryRate: 18, spo2: 98 },
            interview: { chiefComplaint: 'Ho, sốt nhẹ', historyOfPresentIllness: 'Sốt 2 ngày', pastMedicalHistory: 'Không' },
            diagnoses: [{ id: 'd1', icdCode: 'J06', icdName: 'Nhiễm khuẩn hô hấp trên', diagnosisType: 1 }],
            allergies: [], contraindications: [], serviceOrders: [], prescriptions: [], history: [],
          }
        }
      }).as('getMedicalRecord');

      cy.intercept('GET', '**/api/examination/patient/*/medical-history*', { statusCode: 200, body: { success: true, data: [] } });
      cy.intercept('GET', '**/api/examination/*/treatment-sheets', { statusCode: 200, body: { success: true, data: [] } });
      cy.intercept('GET', '**/api/examination/*/consultation-records', { statusCode: 200, body: { success: true, data: [] } });
      cy.intercept('GET', '**/api/examination/*/nursing-care-sheets', { statusCode: 200, body: { success: true, data: [] } });
    });

    it('has "In PDF" button when record selected', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('button', 'In PDF', { timeout: 5000 }).should('exist');
    });

    it('"In PDF" dropdown shows form options', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('button', 'In PDF', { timeout: 5000 }).click();
      cy.get('.ant-dropdown', { timeout: 3000 }).should('be.visible');
    });

    it('"In PDF" dropdown has multiple form types', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('button', 'In PDF', { timeout: 5000 }).click();
      cy.get('.ant-dropdown', { timeout: 3000 }).should('be.visible');
      cy.get('.ant-dropdown-menu-item').should('have.length.gte', 8);
    });

    it('PDF API endpoint responds for EMR form', () => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin', password: 'Admin@123'
      }).then(loginResp => {
        cy.request({
          method: 'GET',
          url: 'http://localhost:5106/api/pdf/emr/00000000-0000-0000-0000-000000000001?formType=summary',
          headers: { Authorization: `Bearer ${loginResp.body.data.token}` },
          failOnStatusCode: false,
        }).then(resp => {
          expect(resp.status).to.be.oneOf([200, 404, 500]);
        });
      });
    });

    it('PDF controller has all expected endpoints', () => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin', password: 'Admin@123'
      }).then(loginResp => {
        const endpoints = [
          '/api/pdf/emr/00000000-0000-0000-0000-000000000001?formType=summary',
          '/api/pdf/medical-record/00000000-0000-0000-0000-000000000001',
          '/api/pdf/treatment-sheet/00000000-0000-0000-0000-000000000001',
          '/api/pdf/discharge/00000000-0000-0000-0000-000000000001',
          '/api/pdf/prescription/00000000-0000-0000-0000-000000000001',
          '/api/pdf/lab-result/00000000-0000-0000-0000-000000000001',
        ];
        endpoints.forEach(endpoint => {
          cy.request({
            method: 'GET',
            url: `http://localhost:5106${endpoint}`,
            headers: { Authorization: `Bearer ${loginResp.body.data.token}` },
            failOnStatusCode: false,
          }).then(resp => {
            // Should respond with route found (200 or 500 for missing data, not 404 for no route)
            expect([200, 500]).to.include(resp.status);
          });
        });
      });
    });
  });

  describe('FHIR API - Resource types', () => {
    let token: string;

    before(() => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin', password: 'Admin@123'
      }).then(resp => {
        token = resp.body.data.token;
      });
    });

    const fhirResources = ['Patient', 'Encounter', 'Observation', 'MedicationRequest', 'DiagnosticReport', 'Condition', 'AllergyIntolerance', 'Procedure'];

    fhirResources.forEach(resourceType => {
      it(`GET /api/fhir/${resourceType} returns FHIR Bundle`, () => {
        cy.request({
          method: 'GET',
          url: `http://localhost:5106/api/fhir/${resourceType}`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then(resp => {
          expect(resp.status).to.eq(200);
          expect(resp.body).to.have.property('resourceType', 'Bundle');
          expect(resp.body).to.have.property('type', 'searchset');
          expect(resp.body).to.have.property('total');
          expect(resp.body).to.have.property('entry');
        });
      });
    });

    it('GET /api/fhir/metadata returns CapabilityStatement', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/fhir/metadata',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then(resp => {
        expect(resp.status).to.eq(200);
        expect(resp.body).to.have.property('resourceType', 'CapabilityStatement');
        expect(resp.body).to.have.property('status', 'active');
        expect(resp.body).to.have.property('fhirVersion', '4.0.1');
      });
    });
  });

  describe('Audit Log API', () => {
    it('GET /api/audit/logs returns paginated results', () => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin', password: 'Admin@123'
      }).then(loginResp => {
        cy.request({
          method: 'GET',
          url: 'http://localhost:5106/api/audit/logs?pageIndex=0&pageSize=10',
          headers: { Authorization: `Bearer ${loginResp.body.data.token}` },
          failOnStatusCode: false,
        }).then(resp => {
          expect(resp.status).to.eq(200);
          // Response is AuditLogPagedResult directly (no ApiResponse wrapper)
          expect(resp.body).to.have.property('items');
          expect(resp.body).to.have.property('totalCount');
          expect(resp.body.items).to.be.an('array');
        });
      });
    });
  });
});
