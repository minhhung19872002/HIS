const disableAnimations = (win: Window) => {
  const style = win.document.createElement('style')
  style.innerHTML = `
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
      caret-color: transparent !important;
    }
  `
  win.document.head.appendChild(style)
}

const visitEmr = () => {
  cy.visit('/emr', {
    onBeforeLoad(win) {
      disableAnimations(win)
    },
  })
}

const openMockedRecord = () => {
  visitEmr()
  cy.wait('@searchExam')
  cy.get('.ant-table-tbody .ant-table-row', { timeout: 5000 }).first().click({ force: true })
  cy.wait('@getMedicalRecord')
}

const openDropdownAndSelectForm = (formLabel: string) => {
  openMockedRecord()
  cy.contains('button', /Bieu mau khac|Biểu mẫu khác/i).click({ force: true })
  cy.get('.ant-dropdown').should('exist')
  cy.contains('.ant-dropdown-menu-item', formLabel).click({ force: true })
  cy.get('.ant-drawer').should('exist')
}

describe('EMR - Ho so benh an dien tu', () => {
  beforeEach(() => {
    cy.request('POST', 'http://localhost:5106/api/auth/login', {
      username: 'admin',
      password: 'Admin@123',
    }).then((resp) => {
      window.localStorage.setItem('token', resp.body.data.token)
      window.localStorage.setItem('user', JSON.stringify(resp.body.data.user))
    })
  })

  describe('Page load and structure', () => {
    it('loads EMR page at /emr', () => {
      visitEmr()
      cy.contains(/H[oồ] s[oơ] b[eệ]nh [aá]n [dđ]i[eệ]n t[uử] \(EMR\)/i, { timeout: 10000 }).should('be.visible')
    })

    it('has left panel with search and list', () => {
      visitEmr()
      cy.get('.ant-input-search input', { timeout: 10000 }).should('be.visible')
      cy.get('.ant-picker-range').should('be.visible')
    })

    it('has right panel with empty state', () => {
      visitEmr()
      cy.contains(/Chon mot ho so benh an|Chọn một hồ sơ bệnh án/i, { timeout: 10000 }).should('be.visible')
    })

    it('has status filter dropdown', () => {
      visitEmr()
      cy.get('.ant-select', { timeout: 10000 }).should('exist')
    })
  })

  describe('Search functionality', () => {
    it('can search by keyword', () => {
      visitEmr()
      cy.get('.ant-input-search input', { timeout: 10000 }).type('test{enter}')
      cy.get('.ant-table', { timeout: 5000 }).should('be.visible')
    })

    it('table shows examination columns', () => {
      visitEmr()
      cy.get('.ant-table', { timeout: 10000 }).should('be.visible')
      cy.contains('th', /Ngay|Ngày/i).should('exist')
      cy.contains('th', /Ma BN|Mã BN/i).should('exist')
      cy.contains('th', /Ho ten|Họ tên/i).should('exist')
    })

    it('reload button triggers search', () => {
      visitEmr()
      cy.get('button .anticon-reload', { timeout: 10000 }).click()
      cy.get('.ant-table').should('be.visible')
    })
  })

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
              patientName: 'Nguyen Van A',
              roomId: '00000000-0000-0000-0000-000000000003',
              roomName: 'Phong kham 1',
              status: 4,
              statusName: 'Hoan thanh',
              queueNumber: 1,
              examinationDate: new Date().toISOString(),
              diagnosisCode: 'J06',
              diagnosisName: 'Nhiem khuan duong ho hap tren',
            }],
            totalCount: 1,
            pageNumber: 1,
            pageSize: 20,
            totalPages: 1,
          },
        },
      }).as('searchExam')

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
              fullName: 'Nguyen Van A',
              gender: 1,
              age: 35,
              phoneNumber: '0901234567',
              address: '123 Le Loi, Q1, TP.HCM',
            },
            vitalSigns: {
              weight: 65, height: 170, bmi: 22.5,
              pulse: 78, temperature: 36.8,
              systolicBp: 120, diastolicBp: 80,
              respiratoryRate: 18, spo2: 98,
            },
            interview: {
              chiefComplaint: 'Ho, sot nhe 2 ngay',
              historyOfPresentIllness: 'Benh nhan ho khan, sot nhe 37.5, dau hong',
              pastMedicalHistory: 'Khong co tien su benh ly dac biet',
            },
            diagnoses: [{
              id: 'd1',
              icdCode: 'J06',
              icdName: 'Nhiem khuan duong ho hap tren',
              diagnosisType: 1,
            }],
            allergies: [],
            contraindications: [],
            serviceOrders: [],
            prescriptions: [],
            history: [],
          },
        },
      }).as('getMedicalRecord')

      cy.intercept('GET', '**/api/examination/patient/*/medical-history*', {
        statusCode: 200,
        body: { success: true, data: [] },
      })
      cy.intercept('GET', '**/api/examination/*/treatment-sheets', {
        statusCode: 200,
        body: { success: true, data: [] },
      })
      cy.intercept('GET', '**/api/examination/*/consultation-records', {
        statusCode: 200,
        body: { success: true, data: [] },
      })
      cy.intercept('GET', '**/api/examination/*/nursing-care-sheets', {
        statusCode: 200,
        body: { success: true, data: [] },
      })
    })

    it('clicking a row loads medical record detail', () => {
      openMockedRecord()
      cy.contains(/Thong tin benh nhan|Thông tin bệnh nhân/i, { timeout: 5000 }).should('exist')
      cy.contains('BN001').should('be.visible')
    })

    it('shows vital signs in detail', () => {
      openMockedRecord()
      cy.contains(/Sinh hieu|Sinh hiệu/i, { timeout: 5000 }).should('exist')
    })

    it('shows interview/history data', () => {
      openMockedRecord()
      cy.contains(/Benh su|Bệnh sử/i, { timeout: 5000 }).should('exist')
    })

    it('shows diagnosis with ICD code', () => {
      openMockedRecord()
      cy.contains('J06', { timeout: 5000 }).should('exist')
    })

    it('has tabs for different form types', () => {
      openMockedRecord()
      cy.get('.ant-tabs-tab', { timeout: 5000 }).should('have.length.gte', 4)
      cy.contains('.ant-tabs-tab', /Ho so BA|Hồ sơ BA/i).should('exist')
      cy.contains('.ant-tabs-tab', /Lich su kham|Lịch sử khám/i).should('exist')
      cy.contains('.ant-tabs-tab', /Phieu dieu tri|Phiếu điều trị/i).should('exist')
      cy.contains('.ant-tabs-tab', /Hoi chan|Hội chẩn/i).should('exist')
    })

    it('treatment tab has Add button', () => {
      openMockedRecord()
      cy.contains('.ant-tabs-tab', /Phieu dieu tri|Phiếu điều trị/i).click({ force: true })
      cy.contains('button', /Them phieu|Thêm phiếu/i).should('exist')
    })

    it('can open treatment sheet modal', () => {
      openMockedRecord()
      cy.contains('.ant-tabs-tab', /Phieu dieu tri|Phiếu điều trị/i).click({ force: true })
      cy.contains('button', /Them phieu|Thêm phiếu/i).click({ force: true })
      cy.contains('.ant-modal-title', /Them phieu dieu tri|Thêm phiếu điều trị/i).should('exist')
      cy.contains(/Ngay dieu tri|Ngày điều trị/i).should('exist')
      cy.contains(/Y lenh dieu tri|Y lệnh điều trị/i).should('exist')
      cy.contains(/Dien bien benh|Diễn biến bệnh/i).should('exist')
    })

    it('can open consultation modal', () => {
      openMockedRecord()
      cy.contains('.ant-tabs-tab', /Hoi chan|Hội chẩn/i).click({ force: true })
      cy.contains('.ant-tabs-tabpane-active button', /Them bien ban|Thêm biên bản/i).click({ force: true })
      cy.contains('.ant-modal-title', /Them bien ban hoi chan|Thêm biên bản hội chẩn/i).should('exist')
      cy.contains(/Ly do hoi chan|Lý do hội chẩn/i).should('exist')
      cy.contains(/Tom tat benh an|Tóm tắt bệnh án/i).should('exist')
    })

    it('can open nursing care modal', () => {
      openMockedRecord()
      cy.contains('.ant-tabs-tab', /Cham soc|Chăm sóc/i).click({ force: true })
      cy.contains('.ant-tabs-tabpane-active button', /Them phieu|Thêm phiếu/i).click({ force: true })
      cy.contains('.ant-modal-title', /Them phieu cham soc|Thêm phiếu chăm sóc/i).should('exist')
      cy.contains(/Tinh trang benh nhan|Tình trạng bệnh nhân/i).should('exist')
      cy.contains(/Can thiep dieu duong|Can thiệp điều dưỡng/i).should('exist')
    })

    it('print buttons visible when record selected', () => {
      openMockedRecord()
      cy.get('.anticon-printer', { timeout: 5000 }).should('have.length.gte', 2)
    })

    it('can open print preview drawer for medical record summary', () => {
      openMockedRecord()
      cy.get('.anticon-printer', { timeout: 5000 }).first().closest('button').click({ force: true })
      cy.get('.ant-drawer', { timeout: 5000 }).should('exist')
      cy.contains(/Tom tat benh an|Tóm tắt bệnh án/i).should('exist')
    })

    it('print preview shows patient info from medical record', () => {
      openMockedRecord()
      cy.get('.anticon-printer', { timeout: 5000 }).first().closest('button').click({ force: true })
      cy.get('.ant-drawer', { timeout: 5000 }).within(() => {
        cy.contains(/Nguyen Van A|Nguyễn Văn A/i).should('exist')
        cy.contains('BN001').should('exist')
      })
    })

    it('print preview has In button', () => {
      openMockedRecord()
      cy.get('.anticon-printer', { timeout: 5000 }).first().closest('button').click({ force: true })
      cy.get('.ant-drawer', { timeout: 5000 }).within(() => {
        cy.contains('button', /^In$/).should('exist')
      })
    })

    it('can open treatment sheet print preview', () => {
      openMockedRecord()
      cy.get('.anticon-printer', { timeout: 5000 }).eq(1).closest('button').click({ force: true })
      cy.get('.ant-drawer', { timeout: 5000 }).should('exist')
      cy.contains(/To dieu tri|Tờ điều trị/i).should('exist')
    })
  })

  describe('Additional print forms via dropdown', () => {
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
              patientName: 'Nguyen Van A',
              roomId: '00000000-0000-0000-0000-000000000003',
              roomName: 'Phong kham 1',
              status: 4,
              statusName: 'Hoan thanh',
              queueNumber: 1,
              examinationDate: new Date().toISOString(),
              diagnosisCode: 'J06',
              diagnosisName: 'Nhiem khuan duong ho hap tren',
            }],
            totalCount: 1,
            pageNumber: 1,
            pageSize: 20,
            totalPages: 1,
          },
        },
      }).as('searchExam')

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
              fullName: 'Nguyen Van A',
              gender: 1,
              age: 35,
              phoneNumber: '0901234567',
              address: '123 Le Loi, Q1, TP.HCM',
            },
            vitalSigns: { weight: 65, height: 170, bmi: 22.5, pulse: 78, temperature: 36.8, systolicBp: 120, diastolicBp: 80, respiratoryRate: 18, spo2: 98 },
            interview: { chiefComplaint: 'Ho, sot nhe', historyOfPresentIllness: 'Sot 2 ngay', pastMedicalHistory: 'Khong' },
            diagnoses: [{ id: 'd1', icdCode: 'J06', icdName: 'Nhiem khuan ho hap tren', diagnosisType: 1 }],
            allergies: [],
            contraindications: [],
            serviceOrders: [],
            prescriptions: [],
            history: [],
          },
        },
      }).as('getMedicalRecord')

      cy.intercept('GET', '**/api/examination/patient/*/medical-history*', { statusCode: 200, body: { success: true, data: [] } })
      cy.intercept('GET', '**/api/examination/*/treatment-sheets', { statusCode: 200, body: { success: true, data: [] } })
      cy.intercept('GET', '**/api/examination/*/consultation-records', { statusCode: 200, body: { success: true, data: [] } })
      cy.intercept('GET', '**/api/examination/*/nursing-care-sheets', { statusCode: 200, body: { success: true, data: [] } })
    })

    it('opens pre-anesthetic exam form', () => {
      openDropdownAndSelectForm('MS.06 - Khám tiền mê')
      cy.contains(/PHIEU KHAM TIEN ME|PHIẾU KHÁM TIỀN MÊ/i).should('exist')
    })

    it('opens surgery consent form', () => {
      openDropdownAndSelectForm('MS.07 - Cam kết PT')
      cy.contains(/GIAY CAM KET PHAU THUAT|GIẤY CAM KẾT PHẪU THUẬT/i).should('exist')
    })

    it('opens treatment progress note', () => {
      openDropdownAndSelectForm('MS.08 - Sơ kết 15 ngày')
      cy.contains(/PHIEU SO KET 15 NGAY DIEU TRI|PHIẾU SƠ KẾT 15 NGÀY ĐIỀU TRỊ/i).should('exist')
    })

    it('opens counseling form', () => {
      openDropdownAndSelectForm('MS.09 - Phiếu tư vấn')
      cy.contains(/PHIEU TU VAN NGUOI BENH|PHIẾU TƯ VẤN NGƯỜI BỆNH/i).should('exist')
    })

    it('opens death review form', () => {
      openDropdownAndSelectForm('MS.10 - Kiểm điểm tử vong')
      cy.contains(/BIEN BAN KIEM DIEM TU VONG|BIÊN BẢN KIỂM ĐIỂM TỬ VONG/i).should('exist')
    })

    it('opens medical record final summary', () => {
      openDropdownAndSelectForm('MS.11 - Tổng kết HSBA')
      cy.contains(/TONG KET HO SO BENH AN|TỔNG KẾT HỒ SƠ BỆNH ÁN/i).should('exist')
    })

    it('opens nutrition exam form', () => {
      openDropdownAndSelectForm('MS.12 - Khám dinh dưỡng')
      cy.contains(/PHIEU KHAM DINH DUONG|PHIẾU KHÁM DINH DƯỠNG/i).should('exist')
    })

    it('opens surgery record form', () => {
      openDropdownAndSelectForm('MS.13 - Phiếu phẫu thuật')
      cy.contains(/PHIEU PHAU THUAT|PHIẾU PHẪU THUẬT/i).should('exist')
    })

    it('opens admission exam form', () => {
      openDropdownAndSelectForm('MS.17 - Khám vào viện')
      cy.contains(/PHIEU KHAM VAO VIEN|PHIẾU KHÁM VÀO VIỆN/i).should('exist')
    })

    it('opens nursing care plan form', () => {
      openDropdownAndSelectForm('DD.01 - KH chăm sóc')
      cy.contains(/KE HOACH CHAM SOC DIEU DUONG|KẾ HOẠCH CHĂM SÓC ĐIỀU DƯỠNG/i).should('exist')
    })

    it('opens surgical safety checklist', () => {
      openDropdownAndSelectForm('DD.16 - An toàn PT')
      cy.contains(/BANG KIEM AN TOAN PHAU THUAT|BẢNG KIỂM AN TOÀN PHẪU THUẬT/i).should('exist')
    })

    it('opens VAP monitoring form', () => {
      openDropdownAndSelectForm('DD.21 - VP thở máy')
      cy.contains(/PHIEU THEO DOI PHONG NGUA VIEM PHOI THO MAY|PHIẾU THEO DÕI PHÒNG NGỪA VIÊM PHỔI THỞ MÁY/i).should('exist')
    })
  })

  describe('Menu integration', () => {
    it('EMR menu item exists in sidebar', () => {
      visitEmr()
      cy.get('.ant-menu', { timeout: 10000 }).should('be.visible')
      cy.contains(/Ho so BA|Hồ sơ BA/i).should('exist')
    })
  })
})
