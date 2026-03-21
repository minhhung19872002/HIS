/// <reference types="cypress" />

const token = 'cypress-deep-workflows-token';
const user = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  fullName: 'Cypress Admin',
  roles: ['Admin'],
  permissions: [],
};
const userData = JSON.stringify(user);

function stubCommonAuth() {
  cy.on('uncaught:exception', () => false);

  cy.intercept('GET', '**/api/auth/me', {
    statusCode: 200,
    body: {
      success: true,
      data: user,
    },
  });

  cy.intercept('GET', '**/api/notification/unread-count', {
    statusCode: 200,
    body: { count: 0 },
  });

  cy.intercept('GET', '**/api/notification/my*', {
    statusCode: 200,
    body: [],
  });
}

function visitProtected(route: string) {
  cy.visit(route, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', token);
      win.localStorage.setItem('user', userData);
    },
  });
  cy.get('body', { timeout: 15000 }).should('be.visible');
}

describe('Deep Workflows', () => {
  describe('Doctor Portal', () => {
    beforeEach(() => {
      stubCommonAuth();

      cy.intercept('POST', '**/api/examination/search', {
        statusCode: 200,
        body: {
          items: [
            {
              id: 'exam-1',
              patientCode: 'BN001',
              patientName: 'Nguyen Van A',
              queueNumber: 1,
              roomName: 'Phong 101',
              diagnosisName: 'Cảm cúm',
              diagnosisCode: 'J11',
              status: 1,
              doctorName: 'BS Tran B',
              examinationDate: '2026-03-21T08:00:00Z',
            },
          ],
          totalCount: 1,
        },
      });

      cy.intercept('GET', '**/api/inpatient/**', {
        statusCode: 200,
        body: {
          items: [
            {
              admissionId: 'adm-1',
              patientCode: 'BN002',
              patientName: 'Le Thi B',
              gender: 2,
              age: 45,
              departmentName: 'Noi tong hop',
              roomName: 'P201',
              bedName: 'B12',
              daysOfStay: 5,
              admissionDate: '2026-03-19T10:00:00Z',
              mainDiagnosis: 'Viem phoi',
              status: 1,
              attendingDoctorName: 'BS Tran C',
              isInsurance: true,
              insuranceNumber: 'HN123',
              hasPendingOrders: true,
              hasPendingLabResults: false,
              hasUnclaimedMedicine: false,
              isDebtWarning: false,
              totalDebt: 0,
            },
          ],
          totalCount: 1,
        },
      });
    });

    it('shows fallback messages for outpatient quick actions', () => {
      let mutationCalls = 0;

      cy.intercept('GET', '**/api/digital-signature/pending', {
        statusCode: 200,
        body: [],
      });

      cy.intercept(
        {
          method: /POST|PUT|PATCH|DELETE/,
          url: '**/api/**',
        },
        (req) => {
          if (req.url.includes('/api/examination/search')) {
            req.reply({
              statusCode: 200,
              body: {
                items: [
                  {
                    id: 'exam-1',
                    patientCode: 'BN001',
                    patientName: 'Nguyen Van A',
                    queueNumber: 1,
                    roomName: 'Phong 101',
                    diagnosisName: 'Cảm cúm',
                    diagnosisCode: 'J11',
                    status: 1,
                    doctorName: 'BS Tran B',
                    examinationDate: '2026-03-21T08:00:00Z',
                  },
                ],
                totalCount: 1,
              },
            });
            return;
          }

          mutationCalls += 1;
          req.reply({ statusCode: 200, body: {} });
        },
      );

      visitProtected('/doctor-portal');

      cy.contains('Nguyen Van A').click();
      cy.get('.ant-modal').should('contain.text', 'Nguyen Van A');

      cy.contains('.ant-modal button', /Kê đ/i).click();
      cy.get('.ant-modal').should('contain.text', 'Nguyen Van A');

      cy.contains('.ant-modal button', /Chỉ định CLS/i).click();
      cy.get('.ant-modal').should('contain.text', 'Nguyen Van A');

      cy.contains('.ant-modal button', 'Lưu').click();
      cy.get('.ant-modal').should('contain.text', 'Nguyen Van A');

      cy.then(() => {
        expect(mutationCalls).to.equal(0);
      });
    });

    it('blocks batch sign for mixed document types', () => {
      cy.intercept('GET', '**/api/digital-signature/pending', {
        statusCode: 200,
        body: [
          {
            id: 'doc-1',
            documentId: 'doc-1',
            documentType: 'EMR',
            documentCode: 'EMR-001',
            patientName: 'Nguyen Van A',
            title: 'Benh an',
            createdAt: '2026-03-21T08:00:00Z',
            status: 'Pending',
          },
          {
            id: 'doc-2',
            documentId: 'doc-2',
            documentType: 'LAB',
            documentCode: 'LAB-001',
            patientName: 'Le Thi B',
            title: 'Ket qua xet nghiem',
            createdAt: '2026-03-21T09:00:00Z',
            status: 'Pending',
          },
        ],
      });

      visitProtected('/doctor-portal');

      cy.contains('.ant-segmented-item-label', 'Chữ ký số').click();
      cy.get('tbody .ant-checkbox-input').eq(0).check({ force: true });
      cy.get('tbody .ant-checkbox-input').eq(1).check({ force: true });

      cy.contains('button', 'Ký hàng loạt').should('be.disabled');
      cy.contains('Đang chọn 2 loại tài liệu').should('be.visible');
    });
  });

  describe('Telemedicine', () => {
    beforeEach(() => {
      stubCommonAuth();
    });

    it('submits booking payload from the new appointment modal', () => {
      const createdPayloads: any[] = [];

      cy.intercept('GET', '**/api/telemedicine/appointments**', {
        statusCode: 200,
        body: {
          items: [],
          totalCount: 0,
          pageNumber: 1,
          pageSize: 200,
          totalPages: 0,
        },
      });

      cy.intercept('GET', '**/api/telemedicine/dashboard**', {
        statusCode: 200,
        body: {
          date: '2026-03-21',
          totalAppointments: 0,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          averageWaitTimeMinutes: 0,
          averageConsultationDurationMinutes: 0,
          totalRevenue: 0,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        },
      });

      cy.intercept('POST', '**/api/telemedicine/appointments', (req) => {
        createdPayloads.push(req.body);
        req.reply({
          statusCode: 200,
          body: {
            id: 'appt-created',
          },
        });
      }).as('createAppointment');

      visitProtected('/telemedicine');

      cy.contains('button', 'Đặt lịch mới').click();
      cy.get('.ant-modal').within(() => {
        cy.get('input[placeholder="VD: P001"]').type('PAT-001');
        cy.get('input[placeholder="VD: D001"]').type('DOC-001');
        cy.get('input[placeholder="VD: DEP001"]').type('DEP-001');
        cy.get('.ant-select').click();
      });

      cy.contains('.ant-select-item-option', 'Tái khám').click();
      cy.get('.ant-picker-input input').eq(0).type('2026-03-25{enter}');
      cy.get('.ant-picker-input input').eq(1).type('09:30{enter}');
      cy.get('textarea').eq(0).type('Tai kham tang huyet ap');
      cy.get('textarea').eq(1).type('Can ket noi video trong gio hanh chinh');
      cy.get('.ant-modal .ant-btn-primary').last().click();

      cy.wait('@createAppointment').then(() => {
        expect(createdPayloads).to.have.length(1);
        expect(createdPayloads[0]).to.include({
          patientId: 'PAT-001',
          doctorId: 'DOC-001',
          departmentId: 'DEP-001',
          appointmentType: 2,
          scheduledDate: '2026-03-25',
          scheduledTime: '09:30',
          durationMinutes: 30,
          chiefComplaint: 'Tai kham tang huyet ap',
          notes: 'Can ket noi video trong gio hanh chinh',
        });
      });

      cy.get('.ant-message').should('contain.text', 'Đã đặt lịch hẹn thành công');
    });

    it('starts and ends a consultation with the expected API payloads', () => {
      const endedSessions: any[] = [];
      const completedConsultations: any[] = [];

      cy.intercept('GET', '**/api/telemedicine/appointments**', {
        statusCode: 200,
        body: {
          items: [
            {
              id: 'appt-1',
              appointmentCode: 'TM-001',
              patientId: 'patient-1',
              patientCode: 'BN001',
              patientName: 'Nguyen Van A',
              phone: '0901000001',
              doctorId: 'doctor-1',
              doctorCode: 'DOC001',
              doctorName: 'BS Tran B',
              doctorSpecialty: 'Noi tong hop',
              departmentId: 'dep-1',
              departmentName: 'Noi tong hop',
              appointmentType: 2,
              appointmentTypeName: 'Tai kham',
              scheduledDate: '2026-03-21T00:00:00Z',
              scheduledTime: '09:00',
              durationMinutes: 30,
              chiefComplaint: 'Dau hong',
              status: 2,
              statusName: 'Cho kham',
              videoRoomUrl: 'room://tm-001',
              fee: 150000,
              paymentStatus: 1,
              paymentStatusName: 'Da thanh toan',
              createdAt: '2026-03-21T07:00:00Z',
            },
          ],
          totalCount: 1,
          pageNumber: 1,
          pageSize: 200,
          totalPages: 1,
        },
      });

      cy.intercept('GET', '**/api/telemedicine/dashboard**', {
        statusCode: 200,
        body: {
          date: '2026-03-21',
          totalAppointments: 1,
          completedAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          averageWaitTimeMinutes: 5,
          averageConsultationDurationMinutes: 15,
          totalRevenue: 150000,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        },
      });

      cy.intercept('POST', '**/api/telemedicine/sessions', {
        statusCode: 200,
        body: {
          id: 'session-1',
          sessionCode: 'S001',
          appointmentId: 'appt-1',
          patientId: 'patient-1',
          patientName: 'Nguyen Van A',
          doctorId: 'doctor-1',
          doctorName: 'BS Tran B',
          roomUrl: 'room://tm-001',
          roomToken: 'token',
          status: 0,
          statusName: 'Pending',
          quality: 1,
          qualityName: 'Good',
          hasRecording: false,
          createdAt: '2026-03-21T09:00:00Z',
        },
      }).as('createSession');

      cy.intercept('POST', '**/api/telemedicine/consultations', {
        statusCode: 200,
        body: {
          id: 'consult-1',
          consultationCode: 'CONS-1',
          sessionId: 'session-1',
          appointmentId: 'appt-1',
          patientId: 'patient-1',
          patientName: 'Nguyen Van A',
          doctorId: 'doctor-1',
          doctorName: 'BS Tran B',
          diagnosisMain: 'Viem hong',
          diagnosisMainIcd: 'J02',
          treatmentPlan: 'Nghi ngo tai nha',
          status: 0,
          statusName: 'Draft',
          createdAt: '2026-03-21T09:00:00Z',
        },
      }).as('createConsultation');

      cy.intercept('POST', '**/api/telemedicine/sessions/session-1/end', (req) => {
        endedSessions.push(req.body);
        req.reply({
          statusCode: 200,
          body: {
            id: 'session-1',
          },
        });
      }).as('endSession');

      cy.intercept('POST', '**/api/telemedicine/consultations/complete', (req) => {
        completedConsultations.push(req.body);
        req.reply({
          statusCode: 200,
          body: {
            id: 'consult-1',
          },
        });
      }).as('completeConsultation');

      visitProtected('/telemedicine');

      cy.contains('button', 'Bắt đầu').click();
      cy.wait('@createSession');
      cy.wait('@createConsultation');

      cy.get('.ant-modal').should('contain.text', 'Phòng khám từ xa');
      cy.contains('.ant-modal button', 'Tắt camera').click();
      cy.contains('.ant-modal button', 'Bật camera').should('exist');
      cy.contains('.ant-modal button', 'Tắt mic').click();
      cy.contains('.ant-modal button', 'Bật mic').should('exist');
      cy.contains('.ant-modal button', 'Kết thúc').click();

      cy.wait('@endSession');
      cy.wait('@completeConsultation').then(() => {
        expect(endedSessions[0]).to.deep.equal({ reason: 'Kết thúc khám' });
        expect(completedConsultations[0]).to.include({
          consultationId: 'consult-1',
          assessment: 'Completed via telemedicine',
          diagnosisMain: 'Viem hong',
          diagnosisMainIcd: 'J02',
          treatmentPlan: 'Nghi ngo tai nha',
        });
      });

      cy.get('.ant-message').should('contain.text', 'Đã kết thúc buổi khám');
    });
  });

  describe('Digital Signature', () => {
    beforeEach(() => {
      stubCommonAuth();

      cy.intercept('GET', '**/api/digital-signature/tokens', {
        statusCode: 200,
        body: [
          {
            tokenSerial: 'TOKEN-001',
            tokenLabel: 'VNPT-CA',
            caProvider: 'VNPT',
            mappedUserName: 'admin',
            isActive: true,
          },
        ],
      });

      cy.intercept('GET', '**/api/RISComplete/usb-token/certificates', {
        statusCode: 200,
        body: [
          {
            thumbprint: 'thumb-1',
            subject: 'CN=Admin',
            subjectName: 'Admin',
            issuer: 'CN=VNPT',
            issuerName: 'VNPT',
            serialNumber: 'SERIAL-1',
            validFrom: '2026-01-01T00:00:00Z',
            validTo: '2027-01-01T00:00:00Z',
            isValid: true,
            hasPrivateKey: true,
            keyUsage: 'Digital Signature',
            signatureAlgorithm: 'RSA',
            providerName: 'VNPT',
          },
        ],
      });
    });

    it('opens the PIN modal from the inactive-session CTA', () => {
      cy.intercept('GET', '**/api/digital-signature/session-status', {
        statusCode: 200,
        body: { active: false },
      });

      cy.intercept('GET', '**/api/digital-signature/pending', {
        statusCode: 200,
        body: [
          {
            id: 'doc-1',
            documentCode: 'EMR-001',
            documentType: 'EMR',
            patientName: 'Nguyen Van A',
            patientCode: 'BN001',
            department: 'Noi tong hop',
            createdAt: '2026-03-21T08:00:00Z',
            createdBy: 'admin',
            status: 'Pending',
          },
        ],
      });

      visitProtected('/digital-signature');

      cy.contains('button', 'Mở phiên').click();
      cy.get('.ant-modal').should('contain.text', 'Nhập PIN USB Token');
    });

    it('batch signs selected documents and removes successful rows', () => {
      let pendingDocs = [
        {
          id: 'doc-1',
          documentCode: 'EMR-001',
          documentType: 'EMR',
          patientName: 'Nguyen Van A',
          patientCode: 'BN001',
          department: 'Noi tong hop',
          createdAt: '2026-03-21T08:00:00Z',
          createdBy: 'admin',
          status: 'Pending',
        },
        {
          id: 'doc-2',
          documentCode: 'EMR-002',
          documentType: 'EMR',
          patientName: 'Le Thi B',
          patientCode: 'BN002',
          department: 'Noi tong hop',
          createdAt: '2026-03-21T09:00:00Z',
          createdBy: 'admin',
          status: 'Pending',
        },
      ];
      const batchRequests: any[] = [];

      cy.intercept('GET', '**/api/digital-signature/session-status', {
        statusCode: 200,
        body: {
          active: true,
          tokenSerial: 'TOKEN-001',
          caProvider: 'VNPT',
          certificateSubject: 'Admin',
        },
      });

      cy.intercept('GET', '**/api/digital-signature/pending', (req) => {
        req.reply({
          statusCode: 200,
          body: pendingDocs,
        });
      }).as('pendingDocs');

      cy.intercept('POST', '**/api/digital-signature/batch-sign', (req) => {
        batchRequests.push(req.body);
        pendingDocs = [];
        req.reply({
          statusCode: 200,
          body: {
            total: 2,
            succeeded: 2,
            failed: 0,
            results: [
              { documentId: 'doc-1', success: true },
              { documentId: 'doc-2', success: true },
            ],
          },
        });
      }).as('batchSign');

      visitProtected('/digital-signature');

      cy.get('tbody .ant-checkbox-input').eq(0).check({ force: true });
      cy.get('tbody .ant-checkbox-input').eq(1).check({ force: true });
      cy.contains('button', 'Ký hàng loạt').click();

      cy.wait('@batchSign').then(() => {
        expect(batchRequests).to.have.length(1);
        expect(batchRequests[0]).to.deep.equal({
          documentIds: ['doc-1', 'doc-2'],
          documentType: 'mixed',
          reason: 'Ký duyệt hàng loạt',
        });
      });

      cy.get('.ant-message').should('contain.text', 'Đã ký thành công 2/2 tài liệu');
      cy.contains('Tất cả (0)').should('be.visible');
      cy.contains('EMR-001').should('not.exist');
      cy.contains('EMR-002').should('not.exist');
    });
  });
});
