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

    it('signs a single pending document from the signature tab', () => {
      const signRequests: any[] = [];
      let pendingDocs = [
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
      ];

      cy.intercept('GET', '**/api/digital-signature/pending', (req) => {
        req.reply({
          statusCode: 200,
          body: pendingDocs,
        });
      }).as('doctorPortalPendingDocs');

      cy.intercept('POST', '**/api/digital-signature/sign', (req) => {
        signRequests.push(req.body);
        pendingDocs = [];
        req.reply({
          statusCode: 200,
          body: {
            success: true,
          },
        });
      }).as('doctorPortalSign');

      visitProtected('/doctor-portal');

      cy.contains('.ant-segmented-item-label', 'Chữ ký số').click();
      cy.contains('button', 'Ký').click();
      cy.get('.ant-modal').should('contain.text', 'Xác nhận ký số');
      cy.contains('.ant-modal button', 'Ký số').click();

      cy.wait('@doctorPortalSign').then(() => {
        expect(signRequests).to.deep.equal([
          {
            documentId: 'doc-1',
            documentType: 'EMR',
            reason: 'Ký xác nhận',
            location: 'Bệnh viện',
          },
        ]);
      });

      cy.get('.ant-message').should('contain.text', 'Ký số thành công');
      cy.contains('Không có tài liệu chờ ký').should('be.visible');
    });

    it('batch signs same-type documents with the expected payload', () => {
      const batchRequests: any[] = [];
      let pendingDocs = [
        {
          id: 'doc-1',
          documentId: 'doc-1',
          documentType: 'EMR',
          documentCode: 'EMR-001',
          patientName: 'Nguyen Van A',
          title: 'Benh an A',
          createdAt: '2026-03-21T08:00:00Z',
          status: 'Pending',
        },
        {
          id: 'doc-2',
          documentId: 'doc-2',
          documentType: 'EMR',
          documentCode: 'EMR-002',
          patientName: 'Le Thi B',
          title: 'Benh an B',
          createdAt: '2026-03-21T09:00:00Z',
          status: 'Pending',
        },
      ];

      cy.intercept('GET', '**/api/digital-signature/pending', (req) => {
        req.reply({
          statusCode: 200,
          body: pendingDocs,
        });
      }).as('doctorPortalBatchPendingDocs');

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
      }).as('doctorPortalBatchSign');

      visitProtected('/doctor-portal');

      cy.contains('.ant-segmented-item-label', 'Chữ ký số').click();
      cy.get('tbody .ant-checkbox-input').eq(0).check({ force: true });
      cy.get('tbody .ant-checkbox-input').eq(1).check({ force: true });
      cy.contains('button', 'Ký hàng loạt').click();

      cy.wait('@doctorPortalBatchSign').then(() => {
        expect(batchRequests).to.deep.equal([
          {
            documentIds: ['doc-1', 'doc-2'],
            documentType: 'EMR',
            reason: 'Ký hàng loạt',
          },
        ]);
      });

      cy.get('.ant-message').should('contain.text', 'Đã ký 2 tài liệu');
      cy.contains('Không có tài liệu chờ ký').should('be.visible');
    });

    it('keeps the inpatient quick-action modal in read-only fallback mode', () => {
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
          mutationCalls += 1;
          req.reply({ statusCode: 200, body: {} });
        },
      );

      visitProtected('/doctor-portal');

      cy.contains('.ant-segmented-item-label', 'Nội trú').click();
      cy.contains('Le Thi B').click();
      cy.get('.ant-modal').should('contain.text', 'Le Thi B');
      cy.then(() => {
        mutationCalls = 0;
      });

      cy.contains('.ant-modal button', 'Y lệnh').click();
      cy.get('.ant-modal').should('contain.text', 'Le Thi B');

      cy.contains('.ant-modal button', 'Phiếu điều trị').click();
      cy.get('.ant-modal').should('contain.text', 'Le Thi B');

      cy.contains('.ant-modal button', 'Xuất viện').click();
      cy.get('.ant-modal').should('contain.text', 'Le Thi B');

      cy.then(() => {
        expect(mutationCalls).to.equal(0);
      });
    });

    it('renders duty schedule data in the schedule tab', () => {
      cy.intercept('GET', '**/api/digital-signature/pending', {
        statusCode: 200,
        body: [],
      });

      cy.intercept('GET', '**/api/medical-hr/**/roster**', {
        statusCode: 200,
        body: [
          {
            date: '2026-03-21',
            shiftName: 'Sáng',
            shiftStart: '07:00',
            shiftEnd: '11:30',
            location: 'Khoa Noi',
            isOnCall: false,
          },
          {
            date: '2026-03-22',
            shiftName: 'Đêm',
            shiftStart: '19:00',
            shiftEnd: '07:00',
            location: 'Khoa Cap cuu',
            isOnCall: true,
          },
        ],
      });

      visitProtected('/doctor-portal');

      cy.contains('.ant-segmented-item-label', 'Lịch trực').click();
      cy.contains('Tổng ca trực').should('be.visible');
      cy.contains('body', '2').should('be.visible');
      cy.contains('Sáng').should('be.visible');
      cy.contains('Đêm').should('be.visible');
      cy.contains('Trực').should('be.visible');
    });

    it('requests the next month roster when navigating the schedule calendar', () => {
      const rosterQueries: Array<{ year?: string | number; month?: string | number }> = [];

      cy.intercept('GET', '**/api/digital-signature/pending', {
        statusCode: 200,
        body: [],
      });

      cy.intercept('GET', '**/api/**/staff/**/roster**', (req) => {
        rosterQueries.push({
          year: req.query.year,
          month: req.query.month,
        });
        req.reply({
          statusCode: 200,
          body: [],
        });
      }).as('staffRoster');

      visitProtected('/doctor-portal');

      cy.contains('.ant-segmented-item-label', 'Lịch trực').click();
      cy.wait('@staffRoster');
      cy.get('.ant-picker-calendar-header .ant-select').eq(1).click({ force: true });
      cy.contains('.ant-select-item-option', 'Th 04').click({ force: true });
      cy.wait('@staffRoster');

      cy.then(() => {
        expect(rosterQueries.length).to.be.greaterThan(1);
        expect(String(rosterQueries[0].year)).to.equal('2026');
        expect(String(rosterQueries[0].month)).to.equal('3');
        expect(String(rosterQueries[1].year)).to.equal('2026');
        expect(String(rosterQueries[1].month)).to.equal('4');
      });
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

    it('cancels a waiting appointment with the expected reason payload', () => {
      const cancelPayloads: any[] = [];

      cy.intercept('GET', '**/api/telemedicine/appointments**', {
        statusCode: 200,
        body: {
          items: [
            {
              id: 'appt-2',
              appointmentCode: 'TM-002',
              patientId: 'patient-2',
              patientCode: 'BN002',
              patientName: 'Le Thi B',
              phone: '0901000002',
              doctorId: 'doctor-2',
              doctorCode: 'DOC002',
              doctorName: 'BS Tran C',
              doctorSpecialty: 'Tim mach',
              departmentId: 'dep-2',
              departmentName: 'Tim mach',
              appointmentType: 2,
              appointmentTypeName: 'Tai kham',
              scheduledDate: '2026-03-21T00:00:00Z',
              scheduledTime: '10:30',
              durationMinutes: 30,
              chiefComplaint: 'Tai kham huyet ap',
              status: 2,
              statusName: 'Cho kham',
              fee: 200000,
              paymentStatus: 1,
              paymentStatusName: 'Da thanh toan',
              createdAt: '2026-03-21T08:00:00Z',
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
          averageWaitTimeMinutes: 0,
          averageConsultationDurationMinutes: 0,
          totalRevenue: 200000,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        },
      });

      cy.intercept('POST', '**/api/telemedicine/appointments/appt-2/cancel', (req) => {
        cancelPayloads.push(req.body);
        req.reply({
          statusCode: 200,
          body: true,
        });
      }).as('cancelAppointment');

      visitProtected('/telemedicine');

      cy.contains('button', 'Hủy').click();
      cy.contains('.ant-modal-confirm button', 'Hủy lịch').click();

      cy.wait('@cancelAppointment').then(() => {
        expect(cancelPayloads).to.deep.equal([
          { reason: 'Hủy bởi bác sĩ' },
        ]);
      });

      cy.get('.ant-message').should('contain.text', 'Đã hủy lịch hẹn');
    });

    it('blocks prescription submission when required data is missing', () => {
      let createPrescriptionCalls = 0;

      cy.intercept('GET', '**/api/telemedicine/appointments**', {
        statusCode: 200,
        body: {
          items: [
            {
              id: 'appt-3',
              appointmentCode: 'TM-003',
              patientId: 'patient-3',
              patientCode: 'BN003',
              patientName: 'Pham Van C',
              phone: '0901000003',
              doctorId: 'doctor-3',
              doctorCode: 'DOC003',
              doctorName: 'BS Tran D',
              doctorSpecialty: 'Ho hap',
              departmentId: 'dep-3',
              departmentName: 'Ho hap',
              appointmentType: 2,
              appointmentTypeName: 'Tai kham',
              scheduledDate: '2026-03-21T00:00:00Z',
              scheduledTime: '11:00',
              durationMinutes: 30,
              chiefComplaint: 'Ho keo dai',
              status: 2,
              statusName: 'Cho kham',
              fee: 180000,
              paymentStatus: 1,
              paymentStatusName: 'Da thanh toan',
              createdAt: '2026-03-21T08:30:00Z',
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
          averageWaitTimeMinutes: 0,
          averageConsultationDurationMinutes: 0,
          totalRevenue: 180000,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        },
      });

      cy.intercept('POST', '**/api/telemedicine/sessions', {
        statusCode: 200,
        body: {
          id: 'session-3',
          sessionCode: 'S003',
          appointmentId: 'appt-3',
          patientId: 'patient-3',
          patientName: 'Pham Van C',
          doctorId: 'doctor-3',
          doctorName: 'BS Tran D',
          roomUrl: 'room://tm-003',
          roomToken: 'token',
          status: 0,
          statusName: 'Pending',
          quality: 1,
          qualityName: 'Good',
          hasRecording: false,
          createdAt: '2026-03-21T11:00:00Z',
        },
      });

      cy.intercept('POST', '**/api/telemedicine/consultations', {
        statusCode: 200,
        body: {
          id: 'consult-3',
          consultationCode: 'CONS-3',
          sessionId: 'session-3',
          appointmentId: 'appt-3',
          patientId: 'patient-3',
          patientName: 'Pham Van C',
          doctorId: 'doctor-3',
          doctorName: 'BS Tran D',
          status: 0,
          statusName: 'Draft',
          createdAt: '2026-03-21T11:00:00Z',
        },
      });

      cy.intercept('POST', '**/api/telemedicine/prescriptions', (req) => {
        createPrescriptionCalls += 1;
        req.reply({
          statusCode: 200,
          body: {
            id: 'rx-1',
          },
        });
      }).as('createPrescription');

      visitProtected('/telemedicine');

      cy.contains('button', 'Bắt đầu').click();
      cy.contains('.ant-modal button', 'Kê đơn thuốc').click();
      cy.get('.ant-modal').should('contain.text', 'Kê đơn thuốc điện tử');

      cy.contains('.ant-modal button', 'Lưu & Gửi').click();

      cy.get('.ant-form-item-explain-error').should('have.length.at.least', 1);
      cy.then(() => {
        expect(createPrescriptionCalls).to.equal(0);
      });
    });

    it('reopens an in-progress appointment from the continue action', () => {
      cy.intercept('GET', '**/api/telemedicine/appointments**', {
        statusCode: 200,
        body: {
          items: [
            {
              id: 'appt-4',
              appointmentCode: 'TM-004',
              patientId: 'patient-4',
              patientCode: 'BN004',
              patientName: 'Do Thi D',
              phone: '0901000004',
              doctorId: 'doctor-4',
              doctorCode: 'DOC004',
              doctorName: 'BS Tran E',
              doctorSpecialty: 'Nhi',
              departmentId: 'dep-4',
              departmentName: 'Nhi',
              appointmentType: 2,
              appointmentTypeName: 'Tai kham',
              scheduledDate: '2026-03-21T00:00:00Z',
              scheduledTime: '14:00',
              durationMinutes: 30,
              chiefComplaint: 'Theo doi sot',
              status: 3,
              statusName: 'Dang kham',
              videoRoomUrl: 'room://tm-004',
              fee: 120000,
              paymentStatus: 1,
              paymentStatusName: 'Da thanh toan',
              createdAt: '2026-03-21T10:00:00Z',
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
          averageWaitTimeMinutes: 0,
          averageConsultationDurationMinutes: 0,
          totalRevenue: 120000,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        },
      });

      visitProtected('/telemedicine');

      cy.contains('button', 'Tiếp tục').click();
      cy.get('.ant-modal').should('contain.text', 'Phòng khám từ xa');
      cy.get('.ant-modal').should('contain.text', 'Do Thi D');
      cy.get('.ant-modal').should('contain.text', 'Theo doi sot');
    });

    it('opens the history detail modal on row double click', () => {
      cy.intercept('GET', '**/api/telemedicine/appointments**', {
        statusCode: 200,
        body: {
          items: [
            {
              id: 'appt-5',
              appointmentCode: 'TM-005',
              patientId: 'patient-5',
              patientCode: 'BN005',
              patientName: 'Vo Thi E',
              phone: '0901000005',
              doctorId: 'doctor-5',
              doctorCode: 'DOC005',
              doctorName: 'BS Tran F',
              doctorSpecialty: 'Than kinh',
              departmentId: 'dep-5',
              departmentName: 'Than kinh',
              appointmentType: 2,
              appointmentTypeName: 'Tai kham',
              scheduledDate: '2026-03-20T00:00:00Z',
              scheduledTime: '15:30',
              durationMinutes: 30,
              chiefComplaint: 'Mat ngu',
              status: 4,
              statusName: 'Hoan thanh',
              fee: 220000,
              paymentStatus: 1,
              paymentStatusName: 'Da thanh toan',
              createdAt: '2026-03-20T12:00:00Z',
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
          completedAppointments: 1,
          cancelledAppointments: 0,
          noShowAppointments: 0,
          averageWaitTimeMinutes: 0,
          averageConsultationDurationMinutes: 0,
          totalRevenue: 220000,
          prescriptionsSent: 0,
          upcomingAppointments: [],
          byDoctor: [],
          byDepartment: [],
        },
      });

      visitProtected('/telemedicine');

      cy.contains('[role="tab"]', 'Lịch sử').click();
      cy.contains('.ant-table-row', 'Vo Thi E').dblclick();
      cy.get('.ant-modal').should('contain.text', 'Chi tiết lịch khám từ xa');
      cy.get('.ant-modal').should('contain.text', 'TM-005');
      cy.get('.ant-modal').should('contain.text', 'Vo Thi E');
      cy.get('.ant-modal').should('contain.text', 'Mat ngu');
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

    it('opens a signing session with the entered PIN', () => {
      const openSessionPayloads: any[] = [];

      cy.intercept('GET', '**/api/digital-signature/session-status', {
        statusCode: 200,
        body: { active: false },
      });

      cy.intercept('GET', '**/api/digital-signature/pending', {
        statusCode: 200,
        body: [],
      });

      cy.intercept('POST', '**/api/digital-signature/open-session', (req) => {
        openSessionPayloads.push(req.body);
        req.reply({
          statusCode: 200,
          body: {
            success: true,
            tokenSerial: 'TOKEN-001',
            caProvider: 'VNPT',
            certificateSubject: 'Admin',
          },
        });
      }).as('openSession');

      visitProtected('/digital-signature');

      cy.contains('button', 'Mở phiên ký').click();
      cy.get('.ant-modal').within(() => {
        cy.get('input[type="password"]').type('123456');
        cy.contains('button', 'Mở phiên').click();
      });

      cy.wait('@openSession').then(() => {
        expect(openSessionPayloads).to.deep.equal([
          { pin: '123456' },
        ]);
      });

      cy.get('.ant-message').should('contain.text', 'Mở phiên ký số thành công');
    });

    it('closes an active signing session from the primary action', () => {
      const closeSessionCalls: any[] = [];

      cy.intercept('GET', '**/api/digital-signature/session-status', {
        statusCode: 200,
        body: {
          active: true,
          tokenSerial: 'TOKEN-001',
          caProvider: 'VNPT',
          certificateSubject: 'Admin',
        },
      });

      cy.intercept('GET', '**/api/digital-signature/pending', {
        statusCode: 200,
        body: [],
      });

      cy.intercept('POST', '**/api/digital-signature/close-session', (req) => {
        closeSessionCalls.push(req.body);
        req.reply({
          statusCode: 200,
          body: {},
        });
      }).as('closeSession');

      visitProtected('/digital-signature');

      cy.contains('button', 'Đóng phiên').first().click();
      cy.wait('@closeSession').then(() => {
        expect(closeSessionCalls).to.have.length(1);
      });

      cy.get('.ant-message').should('contain.text', 'Đã đóng phiên ký số');
    });

    it('completes open-session -> single-sign -> close-session end to end', () => {
      const openSessionPayloads: any[] = [];
      const signPayloads: any[] = [];
      let sessionActive = false;
      let pendingDocs = [
        {
          id: 'doc-e2e-1',
          documentCode: 'EMR-E2E-001',
          documentType: 'EMR',
          patientName: 'Nguyen Van End',
          patientCode: 'BN900',
          department: 'Noi tong hop',
          createdAt: '2026-03-21T08:00:00Z',
          createdBy: 'admin',
          status: 'Pending',
        },
      ];

      cy.intercept('GET', '**/api/digital-signature/session-status', (req) => {
        req.reply({
          statusCode: 200,
          body: sessionActive
            ? {
                active: true,
                tokenSerial: 'TOKEN-001',
                caProvider: 'VNPT',
                certificateSubject: 'Admin',
              }
            : { active: false },
        });
      }).as('sessionStatusDynamic');

      cy.intercept('GET', '**/api/digital-signature/pending', (req) => {
        req.reply({
          statusCode: 200,
          body: pendingDocs,
        });
      }).as('pendingDocsDynamic');

      cy.intercept('POST', '**/api/digital-signature/open-session', (req) => {
        openSessionPayloads.push(req.body);
        sessionActive = true;
        req.reply({
          statusCode: 200,
          body: {
            success: true,
            tokenSerial: 'TOKEN-001',
            caProvider: 'VNPT',
            certificateSubject: 'Admin',
          },
        });
      }).as('openSessionE2E');

      cy.intercept('POST', '**/api/digital-signature/sign', (req) => {
        signPayloads.push(req.body);
        pendingDocs = [];
        req.reply({
          statusCode: 200,
          body: {
            success: true,
          },
        });
      }).as('signE2E');

      cy.intercept('POST', '**/api/digital-signature/close-session', {
        statusCode: 200,
        body: {},
      }).as('closeSessionE2E');

      visitProtected('/digital-signature');

      cy.contains('button', 'Mở phiên ký').click();
      cy.get('.ant-modal').within(() => {
        cy.get('input[type="password"]').type('654321');
        cy.contains('button', 'Mở phiên').click();
      });
      cy.wait('@openSessionE2E').then(() => {
        expect(openSessionPayloads).to.deep.equal([
          { pin: '654321' },
        ]);
      });

      cy.contains('.ant-table-row button', 'Ký').click();
      cy.wait('@signE2E').then(() => {
        expect(signPayloads).to.deep.equal([
          {
            documentId: 'doc-e2e-1',
            documentType: 'EMR',
            reason: 'Ký duyệt tài liệu',
            location: 'HIS System',
          },
        ]);
      });

      sessionActive = false;
      cy.contains('button', 'Đóng phiên').first().click();
      cy.wait('@closeSessionE2E');

      cy.get('.ant-message').should('contain.text', 'Mở phiên ký số thành công');
      cy.get('.ant-message').should('contain.text', 'Đã ký EMR-E2E-001');
      cy.get('.ant-message').should('contain.text', 'Đã đóng phiên ký số');
      cy.contains('EMR-E2E-001').should('not.exist');
    });

    it('registers a USB token from the token tab', () => {
      const registerPayloads: any[] = [];

      cy.intercept('GET', '**/api/digital-signature/session-status', {
        statusCode: 200,
        body: { active: false },
      });

      cy.intercept('GET', '**/api/digital-signature/pending', {
        statusCode: 200,
        body: [],
      });

      cy.intercept('POST', '**/api/digital-signature/register-token', (req) => {
        registerPayloads.push(req.body);
        req.reply({
          statusCode: 200,
          body: {},
        });
      }).as('registerToken');

      visitProtected('/digital-signature');

      cy.contains('[role="tab"]', 'USB Token').click();
      cy.contains('button', 'Đăng ký').click();

      cy.wait('@registerToken').then(() => {
        expect(registerPayloads).to.deep.equal([
          { tokenSerial: 'TOKEN-001' },
        ]);
      });

      cy.get('.ant-message').should('contain.text', 'Đăng ký token thành công');
    });
  });
});
