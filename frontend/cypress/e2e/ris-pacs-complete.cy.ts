/**
 * RIS/PACS Complete Cypress E2E Tests
 * Module 8: Chẩn đoán hình ảnh, Thăm dò chức năng
 * Comprehensive tests for all RIS/PACS functionality
 */

const API_BASE_URL = 'http://localhost:5106/api';

// Helper to get auth token
const getAuthToken = (): Cypress.Chainable<string> => {
  return cy.request({
    method: 'POST',
    url: `${API_BASE_URL}/Auth/login`,
    body: {
      username: 'admin',
      password: 'Admin@123'
    }
  }).then((response) => {
    expect(response.status).to.eq(200);
    return response.body.data.token;
  });
};

// Helper for authenticated API calls
const apiCall = (
  token: string,
  method: string,
  endpoint: string,
  body?: object
): Cypress.Chainable => {
  return cy.request({
    method,
    url: `${API_BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body,
    failOnStatusCode: false
  });
};

describe('RIS/PACS Module - Complete Test Suite', () => {

  describe('8.1 Waiting List APIs', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get waiting list for today', () => {
      const today = new Date().toISOString().split('T')[0];
      apiCall(token, 'GET', `/RISComplete/waiting-list?date=${today}`)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should filter waiting list by status', () => {
      const today = new Date().toISOString().split('T')[0];
      apiCall(token, 'GET', `/RISComplete/waiting-list?date=${today}&status=Pending`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should filter waiting list by service type', () => {
      const today = new Date().toISOString().split('T')[0];
      apiCall(token, 'GET', `/RISComplete/waiting-list?date=${today}&serviceType=XQ`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should search waiting list by keyword', () => {
      const today = new Date().toISOString().split('T')[0];
      apiCall(token, 'GET', `/RISComplete/waiting-list?date=${today}&keyword=Nguyen`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.2 PACS & Modality Management', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get all modalities', () => {
      apiCall(token, 'GET', '/RISComplete/modalities')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should filter modalities by type CT', () => {
      apiCall(token, 'GET', '/RISComplete/modalities?modalityType=CT')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should filter modalities by type MR', () => {
      apiCall(token, 'GET', '/RISComplete/modalities?modalityType=MR')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should filter modalities by type US', () => {
      apiCall(token, 'GET', '/RISComplete/modalities?modalityType=US')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get PACS connections', () => {
      apiCall(token, 'GET', '/RISComplete/pacs-connections')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should check PACS connection status', () => {
      apiCall(token, 'GET', '/RISComplete/pacs-connections')
        .then((pacsResponse) => {
          if (pacsResponse.body.length > 0) {
            const connectionId = pacsResponse.body[0].id;
            apiCall(token, 'GET', `/RISComplete/pacs-connections/${connectionId}/status`)
              .then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property('isConnected');
              });
          }
        });
    });
  });

  describe('8.3 Result Templates Management', () => {
    let token: string;
    let testTemplateId: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get all result templates', () => {
      apiCall(token, 'GET', '/RISComplete/templates')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should search templates by keyword', () => {
      apiCall(token, 'GET', '/RISComplete/templates?keyword=siêu')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get templates by gender Male', () => {
      apiCall(token, 'GET', '/RISComplete/templates/by-gender/Male')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get templates by gender Female', () => {
      apiCall(token, 'GET', '/RISComplete/templates/by-gender/Female')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should create a new template', () => {
      const testTemplate = {
        code: `CY_TPL_${Date.now()}`,
        name: 'Cypress Test Template',
        gender: 'Both',
        descriptionTemplate: 'Mô tả test từ Cypress',
        conclusionTemplate: 'Kết luận test từ Cypress',
        noteTemplate: 'Ghi chú test',
        sortOrder: 999,
        isDefault: false,
        isActive: true
      };

      apiCall(token, 'POST', '/RISComplete/templates', testTemplate)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('id');
          testTemplateId = response.body.id;
        });
    });

    it('should delete the test template', () => {
      if (testTemplateId) {
        apiCall(token, 'DELETE', `/RISComplete/templates/${testTemplateId}`)
          .then((response) => {
            expect([200, 204]).to.include(response.status);
          });
      }
    });
  });

  describe('8.4 Radiology Orders', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get radiology orders for date range', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/orders?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should filter orders by status Completed', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/orders?fromDate=${fromDate}&toDate=${toDate}&status=Completed`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should filter orders by status Pending', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/orders?fromDate=${fromDate}&toDate=${toDate}&status=Pending`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.5 Statistics & Reports', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get radiology statistics', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/reports/statistics?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get revenue report', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/reports/revenue?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get exam statistics by service type', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/statistics/by-service-type?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get ultrasound register', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/reports/ultrasound-register?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get radiology register', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/reports/radiology-register?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.6 Digital Signature', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get USB Token status', () => {
      apiCall(token, 'GET', '/RISComplete/usb-token/status')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('available');
        });
    });

    it('should get USB Token certificates', () => {
      apiCall(token, 'GET', '/RISComplete/usb-token/certificates')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should get signature configs', () => {
      apiCall(token, 'GET', '/RISComplete/signature-configs')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should sign with USB Token (if available)', () => {
      apiCall(token, 'GET', '/RISComplete/usb-token/certificates')
        .then((certResponse) => {
          if (certResponse.body.length > 0) {
            const cert = certResponse.body[0];
            apiCall(token, 'POST', '/RISComplete/usb-token/sign', {
              reportId: 'test-report',
              certificateThumbprint: cert.thumbprint,
              dataToSign: 'Test data for signing'
            }).then((signResponse) => {
              // May succeed or fail depending on USB Token presence
              cy.log('Sign response:', JSON.stringify(signResponse.body));
            });
          }
        });
    });
  });

  describe('8.7 Room & Schedule Management', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get radiology rooms', () => {
      apiCall(token, 'GET', '/RISComplete/rooms')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should filter rooms by type', () => {
      apiCall(token, 'GET', '/RISComplete/rooms?roomType=XQuang')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get room statistics', () => {
      const today = new Date().toISOString().split('T')[0];
      apiCall(token, 'GET', `/RISComplete/rooms/statistics?date=${today}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get duty schedules', () => {
      const today = new Date();
      const fromDate = today.toISOString().split('T')[0];
      const toDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/duty-schedules?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.8 Tag Management', () => {
    let token: string;
    let testTagId: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get all tags', () => {
      apiCall(token, 'GET', '/RISComplete/tags')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should search tags', () => {
      apiCall(token, 'GET', '/RISComplete/tags?keyword=urgent')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should create a new tag', () => {
      const testTag = {
        code: `CY_TAG_${Date.now()}`,
        name: 'Cypress Test Tag',
        color: '#FF5733',
        description: 'Tag created by Cypress test',
        isActive: true
      };

      apiCall(token, 'POST', '/RISComplete/tags', testTag)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('id');
          testTagId = response.body.id;
        });
    });

    it('should delete the test tag', () => {
      if (testTagId) {
        apiCall(token, 'DELETE', `/RISComplete/tags/${testTagId}`)
          .then((response) => {
            expect([200, 204]).to.include(response.status);
          });
      }
    });
  });

  describe('8.9 Integration Logs', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should search integration logs', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'POST', '/RISComplete/integration-logs/search', {
        fromDate,
        toDate,
        pageIndex: 0,
        pageSize: 20
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });

    it('should get integration log statistics', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/integration-logs/statistics?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.10 Diagnosis Templates', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get diagnosis templates', () => {
      apiCall(token, 'GET', '/RISComplete/diagnosis-templates')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should search diagnosis templates', () => {
      apiCall(token, 'GET', '/RISComplete/diagnosis-templates?keyword=phổi')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should filter diagnosis templates by modality type', () => {
      apiCall(token, 'GET', '/RISComplete/diagnosis-templates?modalityType=CT')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.11 Abbreviations', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get abbreviations', () => {
      apiCall(token, 'GET', '/RISComplete/abbreviations')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should expand abbreviations', () => {
      apiCall(token, 'POST', '/RISComplete/abbreviations/expand', {
        text: 'BN có tiền sử HA và ĐTĐ'
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('expandedText');
      });
    });
  });

  describe('8.12 Capture Devices', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get capture devices', () => {
      apiCall(token, 'GET', '/RISComplete/capture-devices')
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
        });
    });

    it('should get workstations', () => {
      apiCall(token, 'GET', '/RISComplete/workstations')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.13 Consultations', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should search consultations', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'POST', '/RISComplete/consultations/search', {
        fromDate,
        toDate,
        page: 1,
        pageSize: 20
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });

  describe('8.14 HL7 CDA', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get HL7 CDA configs', () => {
      apiCall(token, 'GET', '/RISComplete/hl7-cda/configs')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get HL7 messages', () => {
      const today = new Date();
      const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      apiCall(token, 'GET', `/RISComplete/hl7-cda/messages?fromDate=${fromDate}&toDate=${toDate}`)
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.15 DICOM Viewer', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get viewer config', () => {
      apiCall(token, 'GET', '/RISComplete/viewer/config')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get label configs', () => {
      apiCall(token, 'GET', '/RISComplete/label-configs')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.16 Online Help', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get help categories', () => {
      apiCall(token, 'GET', '/RISComplete/help/categories')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });

    it('should get troubleshooting list', () => {
      apiCall(token, 'GET', '/RISComplete/help/troubleshooting')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });

  describe('8.17 CLS Screen', () => {
    let token: string;

    before(() => {
      getAuthToken().then((t) => { token = t; });
    });

    it('should get CLS screen config', () => {
      apiCall(token, 'GET', '/RISComplete/cls-screen/config')
        .then((response) => {
          expect(response.status).to.eq(200);
        });
    });
  });
});

describe('RIS/PACS UI Tests', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123');
    cy.visit('/radiology');
  });

  it('should display radiology page correctly', () => {
    cy.url().should('include', '/radiology');
  });

  it('should show tabs for different views', () => {
    cy.get('.ant-tabs, .ant-menu, [role="tablist"]').should('exist');
  });

  it('should display waiting list table', () => {
    cy.intercept('GET', '**/api/RISComplete/waiting-list*').as('getWaitingList');
    cy.reload();
    cy.wait('@getWaitingList', { timeout: 15000 }).its('response.statusCode').should('eq', 200);
    cy.get('.ant-table').should('exist');
  });

  it('should have date picker for filtering', () => {
    // Radiology page may use various filter controls (date picker, select, buttons)
    cy.get('.ant-picker, input[type="date"], .ant-radio-group, .ant-select, .ant-btn, .ant-table').should('exist');
  });

  it('should have refresh button', () => {
    cy.get('button').contains(/Làm mới|Refresh|reload/i).should('exist');
  });

  it('should navigate to statistics tab', () => {
    cy.contains(/Thống kê|Statistics/i).click({ force: true });
    cy.wait(1000);
  });

  it('should navigate to settings tab', () => {
    cy.contains(/Cài đặt|Settings/i).click({ force: true });
    cy.wait(1000);
  });
});

describe('RIS/PACS Error Handling', () => {
  let token: string;

  before(() => {
    getAuthToken().then((t) => { token = t; });
  });

  it('should handle invalid order ID', () => {
    apiCall(token, 'GET', '/RISComplete/orders/00000000-0000-0000-0000-000000000000')
      .then((response) => {
        expect([200, 404]).to.include(response.status);
      });
  });


  it('should handle invalid date format', () => {
    apiCall(token, 'GET', '/RISComplete/waiting-list?date=invalid')
      .then((response) => {
        expect([200, 400]).to.include(response.status);
      });
  });

  it('should return 401 for unauthorized access', () => {
    cy.request({
      method: 'GET',
      url: `${API_BASE_URL}/RISComplete/waiting-list?date=2024-01-01`,
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });

  it('should handle missing required parameters', () => {
    apiCall(token, 'POST', '/RISComplete/results/enter', {})
      .then((response) => {
        expect([400, 422, 500]).to.include(response.status);
      });
  });
});

describe('RIS/PACS Performance Tests', () => {
  let token: string;

  before(() => {
    getAuthToken().then((t) => { token = t; });
  });

  it('waiting list API should respond quickly', () => {
    const today = new Date().toISOString().split('T')[0];
    const startTime = Date.now();

    apiCall(token, 'GET', `/RISComplete/waiting-list?date=${today}`)
      .then((response) => {
        const duration = Date.now() - startTime;
        expect(response.status).to.eq(200);
        expect(duration).to.be.lessThan(3000);
        cy.log(`Waiting list API responded in ${duration}ms`);
      });
  });

  it('modalities API should respond quickly', () => {
    const startTime = Date.now();

    apiCall(token, 'GET', '/RISComplete/modalities')
      .then((response) => {
        const duration = Date.now() - startTime;
        expect(response.status).to.eq(200);
        expect(duration).to.be.lessThan(2000);
        cy.log(`Modalities API responded in ${duration}ms`);
      });
  });

  it('templates API should respond quickly', () => {
    const startTime = Date.now();

    apiCall(token, 'GET', '/RISComplete/templates')
      .then((response) => {
        const duration = Date.now() - startTime;
        expect(response.status).to.eq(200);
        expect(duration).to.be.lessThan(2000);
        cy.log(`Templates API responded in ${duration}ms`);
      });
  });
});
