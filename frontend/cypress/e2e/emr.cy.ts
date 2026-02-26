describe('EMR - Hồ sơ bệnh án điện tử', () => {
  beforeEach(() => {
    cy.request('POST', 'http://localhost:5106/api/auth/login', {
      username: 'admin',
      password: 'Admin@123'
    }).then(resp => {
      window.localStorage.setItem('token', resp.body.data.token);
      window.localStorage.setItem('user', JSON.stringify(resp.body.data.user));
    });
  });

  describe('Page load and structure', () => {
    it('loads EMR page at /emr', () => {
      cy.visit('/emr');
      cy.contains('Hồ sơ bệnh án điện tử (EMR)', { timeout: 10000 }).should('be.visible');
    });

    it('has left panel with search and list', () => {
      cy.visit('/emr');
      cy.get('input[placeholder*="Tìm theo mã BN"]', { timeout: 10000 }).should('be.visible');
      cy.get('.ant-picker-range').should('be.visible');
    });

    it('has right panel with empty state', () => {
      cy.visit('/emr');
      cy.contains('Chọn một hồ sơ bệnh án từ danh sách bên trái', { timeout: 10000 }).should('be.visible');
    });

    it('has status filter dropdown', () => {
      cy.visit('/emr');
      cy.get('.ant-select', { timeout: 10000 }).should('exist');
    });
  });

  describe('Search functionality', () => {
    it('can search by keyword', () => {
      cy.visit('/emr');
      cy.get('input[placeholder*="Tìm theo mã BN"]', { timeout: 10000 }).type('test');
      cy.get('button .anticon-search').click();
      cy.get('.ant-table', { timeout: 5000 }).should('be.visible');
    });

    it('table shows examination columns', () => {
      cy.visit('/emr');
      cy.get('.ant-table', { timeout: 10000 }).should('be.visible');
      cy.contains('th', 'Ngày').should('exist');
      cy.contains('th', 'Mã BN').should('exist');
      cy.contains('th', 'Họ tên').should('exist');
    });

    it('reload button triggers search', () => {
      cy.visit('/emr');
      cy.get('button .anticon-reload', { timeout: 10000 }).click();
      cy.get('.ant-table').should('be.visible');
    });
  });

  describe('Detail panel with mocked data', () => {
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
            totalCount: 1,
            pageNumber: 1,
            pageSize: 20,
            totalPages: 1,
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
              patientCode: 'BN001',
              fullName: 'Nguyễn Văn A',
              gender: 1,
              age: 35,
              phoneNumber: '0901234567',
              address: '123 Lê Lợi, Q1, TP.HCM',
            },
            vitalSigns: {
              weight: 65, height: 170, bmi: 22.5,
              pulse: 78, temperature: 36.8,
              systolicBp: 120, diastolicBp: 80,
              respiratoryRate: 18, spo2: 98,
            },
            interview: {
              chiefComplaint: 'Ho, sốt nhẹ 2 ngày',
              historyOfPresentIllness: 'Bệnh nhân ho khan, sốt nhẹ 37.5, đau họng',
              pastMedicalHistory: 'Không có tiền sử bệnh lý đặc biệt',
            },
            diagnoses: [{
              id: 'd1',
              icdCode: 'J06',
              icdName: 'Nhiễm khuẩn đường hô hấp trên',
              diagnosisType: 1,
            }],
            allergies: [],
            contraindications: [],
            serviceOrders: [],
            prescriptions: [],
            history: [],
          }
        }
      }).as('getMedicalRecord');

      cy.intercept('GET', '**/api/examination/patient/*/medical-history*', {
        statusCode: 200,
        body: { success: true, data: [] }
      });
      cy.intercept('GET', '**/api/examination/*/treatment-sheets', {
        statusCode: 200,
        body: { success: true, data: [] }
      });
      cy.intercept('GET', '**/api/examination/*/consultation-records', {
        statusCode: 200,
        body: { success: true, data: [] }
      });
      cy.intercept('GET', '**/api/examination/*/nursing-care-sheets', {
        statusCode: 200,
        body: { success: true, data: [] }
      });
    });

    it('clicking a row loads medical record detail', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('Thông tin bệnh nhân', { timeout: 5000 }).should('be.visible');
      cy.contains('BN001').should('be.visible');
    });

    it('shows vital signs in detail', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('Sinh hiệu', { timeout: 5000 }).should('be.visible');
    });

    it('shows interview/history data', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('Bệnh sử', { timeout: 5000 }).should('be.visible');
    });

    it('shows diagnosis with ICD code', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      // Look in the detail panel (right side), not the examinations table (left side)
      cy.get('.ant-col-14', { timeout: 5000 }).within(() => {
        cy.contains('J06').should('exist');
      });
    });

    it('has tabs for different form types', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.get('.ant-tabs-tab', { timeout: 5000 }).should('have.length.gte', 4);
      cy.contains('.ant-tabs-tab', 'Hồ sơ BA').should('exist');
      cy.contains('.ant-tabs-tab', 'Lịch sử khám').should('exist');
      cy.contains('.ant-tabs-tab', 'Phiếu điều trị').should('exist');
      cy.contains('.ant-tabs-tab', 'Hội chẩn').should('exist');
    });

    it('treatment tab has Add button', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('.ant-tabs-tab', 'Phiếu điều trị', { timeout: 5000 }).click();
      cy.contains('Thêm phiếu').should('be.visible');
    });

    it('can open treatment sheet modal', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('.ant-tabs-tab', 'Phiếu điều trị', { timeout: 5000 }).click();
      cy.contains('Thêm phiếu').click();
      cy.contains('Thêm phiếu điều trị', { timeout: 3000 }).should('be.visible');
      cy.contains('Ngày điều trị').should('be.visible');
      cy.contains('Y lệnh điều trị').should('be.visible');
      cy.contains('Diễn biến bệnh').should('be.visible');
    });

    it('can open consultation modal', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('.ant-tabs-tab', 'Hội chẩn', { timeout: 5000 }).click();
      cy.contains('Thêm biên bản').click();
      cy.contains('Thêm biên bản hội chẩn', { timeout: 3000 }).should('be.visible');
      cy.contains('Lý do hội chẩn').should('be.visible');
      cy.contains('Tóm tắt bệnh án').should('be.visible');
    });

    it('can open nursing care modal', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.contains('.ant-tabs-tab', 'Chăm sóc', { timeout: 5000 }).click({ force: true });
      cy.wait(300); // Wait for tab content to render
      cy.get('.ant-tabs-tabpane-active', { timeout: 3000 }).within(() => {
        cy.contains('Thêm phiếu').click();
      });
      cy.contains('Thêm phiếu chăm sóc', { timeout: 3000 }).should('be.visible');
      cy.contains('Tình trạng bệnh nhân').should('be.visible');
      cy.contains('Can thiệp điều dưỡng').should('be.visible');
    });

    it('print buttons visible when record selected', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.get('.anticon-printer', { timeout: 5000 }).should('have.length.gte', 2);
    });

    it('can open print preview drawer for medical record summary', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      // Click first print button (Tom tat BA)
      cy.get('.anticon-printer', { timeout: 5000 }).first().closest('button').click();
      cy.contains('Tóm tắt bệnh án', { timeout: 3000 }).should('be.visible');
      cy.get('.ant-drawer', { timeout: 3000 }).should('be.visible');
      cy.contains('TÓM TẮT BỆNH ÁN').should('be.visible');
      cy.contains('BỘ Y TẾ').should('be.visible');
      cy.contains('BỆNH VIỆN ĐA KHOA ABC').should('be.visible');
    });

    it('print preview shows patient info from medical record', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.get('.anticon-printer', { timeout: 5000 }).first().closest('button').click();
      cy.get('.ant-drawer', { timeout: 3000 }).within(() => {
        cy.contains('Nguyễn Văn A').should('exist');
        cy.contains('BN001').should('exist');
        cy.contains('QUÁ TRÌNH BỆNH LÝ').should('exist');
        cy.contains('CHẨN ĐOÁN').should('exist');
      });
    });

    it('print preview has In button', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      cy.get('.anticon-printer', { timeout: 5000 }).first().closest('button').click();
      cy.get('.ant-drawer', { timeout: 3000 }).within(() => {
        cy.contains('button', 'In').should('be.visible');
      });
    });

    it('can open treatment sheet print preview', () => {
      cy.visit('/emr');
      cy.wait('@searchExam');
      cy.get('.ant-table-row', { timeout: 5000 }).first().click({ force: true });
      cy.wait('@getMedicalRecord');
      // Click second print button (To dieu tri)
      cy.get('.anticon-printer', { timeout: 5000 }).eq(1).closest('button').click();
      cy.get('.ant-drawer', { timeout: 3000 }).should('be.visible');
      cy.contains('TỜ ĐIỀU TRỊ').should('be.visible');
    });
  });

  describe('Menu integration', () => {
    it('EMR menu item exists in sidebar', () => {
      cy.visit('/emr');
      // Open Lam sang group if collapsed
      cy.get('.ant-menu', { timeout: 10000 }).should('be.visible');
      cy.get('.ant-layout-sider').then($sider => {
        if ($sider.find('[title="Hồ sơ BA (EMR)"]').length > 0 || $sider.text().includes('Hồ sơ BA')) {
          cy.contains('Hồ sơ BA').should('exist');
        } else {
          // Menu item is under Lam sang group - click to expand
          cy.contains('.ant-menu-submenu-title', 'Lâm sàng').click({ force: true });
          cy.contains('Hồ sơ BA').should('exist');
        }
      });
    });
  });
});
