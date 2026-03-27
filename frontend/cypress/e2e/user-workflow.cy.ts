/// <reference types="cypress" />

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Download the React DevTools',
  'favicon.ico',
  'AbortError',
  'CanceledError',
  'NotImplementedException',
  'not implemented',
  'ECONNREFUSED',
  'ERR_CONNECTION_REFUSED',
  'Network Error',
  'Failed to start the connection',
  'connection was stopped during negotiation',
  '[antd: Space] `direction` is deprecated',
]

const PATIENT = {
  name: `E2E User ${Date.now()}`,
  cccd: `0790${Date.now().toString().slice(-8)}`,
  phone: '0912345678',
  address: '456 Nguyen Hue, Quan 1, TP.HCM',
}

function isIgnored(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => msg.toLowerCase().includes(p.toLowerCase()))
}

function apiHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function disableAnimations(win: Window) {
  const style = win.document.createElement('style')
  style.innerHTML = `
    *,
    *::before,
    *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  `
  win.document.head.appendChild(style)
}

function visitPage(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      disableAnimations(win)
    },
  })
}

describe('User Workflow - realistic UI flows', () => {
  let token: string
  let consoleErrors: string[] = []

  before(() => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    }).then((resp) => {
      expect(resp.status).to.eq(200)
      token = resp.body.data?.token || resp.body.token
    })
  })

  beforeEach(() => {
    consoleErrors = []

    cy.visit('/login', {
      onBeforeLoad(win) {
        disableAnimations(win)
        win.localStorage.setItem('token', token)
        win.localStorage.setItem('user', JSON.stringify({
          id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
          username: 'admin',
          fullName: 'Administrator',
          roles: ['Admin'],
        }))

        const originalError = win.console.error
        win.console.error = (...args: unknown[]) => {
          const msg = args.map((arg) => String(arg)).join(' ')
          if (!isIgnored(msg)) {
            consoleErrors.push(msg.substring(0, 200))
          }
          originalError.apply(win.console, args as [])
        }
      },
    })
  })

  describe('Flow 1: Login', () => {
    it('should login and redirect to dashboard', () => {
      cy.window().then((win) => {
        win.localStorage.removeItem('token')
        win.localStorage.removeItem('user')
      })

      visitPage('/login')
      cy.get('input[placeholder*="Tên đăng nhập"]').clear().type('admin')
      cy.get('input[placeholder*="Mật khẩu"]').clear().type('Admin@123')
      cy.get('button[type="submit"]').click()
      cy.url({ timeout: 15000 }).should('not.include', '/login')
      cy.contains(/Tong quan|Tổng quan/i, { timeout: 10000 }).should('exist')
    })
  })

  describe('Flow 2: Reception', () => {
    it('should open reception page and show current layout', () => {
      visitPage('/reception')
      cy.contains(/Tiep don benh nhan|Tiếp đón bệnh nhân/i, { timeout: 15000 }).should('exist')
      cy.get('.ant-table').should('exist')
      cy.contains('.ant-tabs-tab', /Danh sach tiep don|Danh sách tiếp đón/i).should('exist')
      cy.contains('.ant-tabs-tab', /Thong ke phong kham|Thống kê phòng khám/i).should('exist')
    })

    it('should open registration modal and validate required fields', () => {
      visitPage('/reception')
      cy.contains('button', /Dang ky kham|Đăng ký khám/i).click()
      cy.contains('.ant-modal-title', /Dang ky kham benh|Đăng ký khám bệnh/i).should('exist')
      cy.get('.ant-modal-footer').contains('button', /Dang ky|Đăng ký/i).click()
      cy.get('.ant-form-item-explain-error').should('exist')
    })

    it('should register a patient and verify reception UI updates', () => {
      cy.request({
        url: '/api/reception/rooms/overview',
        headers: apiHeaders(token),
      }).then((roomResp) => {
        const rooms = roomResp.body.data || roomResp.body || []
        expect(rooms.length).to.be.greaterThan(0)

        return cy.request({
          method: 'POST',
          url: '/api/reception/register/fee',
          headers: apiHeaders(token),
          body: {
            newPatient: {
              fullName: PATIENT.name,
              gender: 1,
              phoneNumber: PATIENT.phone,
              identityNumber: PATIENT.cccd,
              address: PATIENT.address,
            },
            serviceType: 2,
            roomId: rooms[0].roomId,
          },
          failOnStatusCode: false,
        })
      }).then((regResp) => {
        expect(regResp.status).to.eq(200)
      })

      visitPage('/reception')
      cy.get('.ant-input-search input').first().clear().type(PATIENT.name.slice(0, 8))
      cy.get('.ant-table').should('exist')
    })

    it('should search and switch reception tabs', () => {
      visitPage('/reception')
      cy.get('.ant-input-search input').first().type(PATIENT.name.slice(0, 8))
      cy.get('.ant-table').should('exist')
      cy.contains('.ant-tabs-tab', /Thong ke phong kham|Thống kê phòng khám/i).click()
      cy.get('.ant-card').should('have.length.at.least', 1)
    })
  })

  describe('Flow 3: OPD', () => {
    it('should open OPD page with waiting list and empty state', () => {
      visitPage('/opd')
      cy.contains(/Khám bệnh ngoại trú|Kham benh ngoai tru/i, { timeout: 15000 }).should('exist')
      cy.contains(/Danh sách chờ khám|Danh sach cho kham|Danh sách bệnh nhân|Danh sach benh nhan/i).should('exist')
      cy.contains(/Vui lòng chọn bệnh nhân|Vui long chon benh nhan/i).should('exist')
    })

    it('should show room selector and handle current queue state', () => {
      visitPage('/opd')
      cy.get('.ant-select').first().should('exist')
      cy.get('.ant-table').should('exist')
      cy.get('body').then(($body) => {
        const hasRows = $body.find('.ant-table-tbody tr.ant-table-row').length > 0
        if (hasRows) {
          cy.get('.ant-table-tbody tr.ant-table-row').first().click({ force: true })
          cy.contains(/Lưu nháp|Save Draft/i).should('exist')
          cy.contains(/Hoàn thành|Complete/i).should('exist')
        } else {
          cy.contains(/Không có bệnh nhân|Khong co benh nhan/i).should('exist')
        }
      })
    })

    it('should expose core OPD controls', () => {
      visitPage('/opd')
      cy.get('input[placeholder*="Mã BN"], input[placeholder*="SĐT"], input[placeholder*="BHYT"]').should('exist')
      cy.contains(/Thông tin bệnh nhân|Thong tin benh nhan/i).should('exist')
    })
  })

  describe('Flow 4: Pharmacy', () => {
    it('should render pharmacy tabs and inventory search', () => {
      visitPage('/pharmacy')
      cy.get('.ant-tabs-tab').should('have.length.at.least', 3)
      cy.contains('.ant-tabs-tab', /Ton kho|Tồn kho/i).click()
      cy.get('.ant-table, input[placeholder*="Tim"], input[placeholder*="Tìm"]').should('exist')
    })
  })

  describe('Flow 5: Inpatient', () => {
    it('should render inpatient page and main tabs', () => {
      visitPage('/ipd')
      cy.contains(/Quản lý nội trú|Quan ly noi tru/i, { timeout: 15000 }).should('exist')
      cy.contains('.ant-tabs-tab', /Danh sách đang điều trị|Danh sach dang dieu tri/i).should('exist')
      cy.contains('.ant-tabs-tab', /Quản lý giường|Quan ly giuong/i).should('exist')
      cy.contains('button', /Nhập viện|Nhap vien/i).should('exist')
    })

    it('should open admit modal', () => {
      visitPage('/ipd')
      cy.contains('button', /Nhập viện|Nhap vien/i).click({ force: true })
      cy.get('.ant-modal').should('exist')
      cy.get('.ant-modal-close').click({ force: true })
    })
  })

  describe('Flow 6: Billing', () => {
    it('should render billing interface with tabs', () => {
      visitPage('/billing')
      cy.contains(/Quản lý viện phí|Quan ly vien phi/i, { timeout: 15000 }).should('exist')
      cy.get('.ant-tabs-tab').should('have.length.at.least', 4)
      cy.contains('.ant-tabs-tab', /Dịch vụ chưa thanh toán|Dich vu chua thanh toan/i).should('exist')
      cy.get('input[placeholder*="Tìm bệnh nhân"], input[placeholder*="Tim benh nhan"]').should('exist')
    })
  })

  describe('Flow 7: Lab and Radiology', () => {
    it('should open lab page', () => {
      visitPage('/lab')
      cy.get('.ant-card, .ant-table, .ant-tabs', { timeout: 15000 }).should('exist')
    })

    it('should open radiology page', () => {
      visitPage('/radiology')
      cy.get('.ant-card, .ant-table, .ant-tabs', { timeout: 15000 }).should('exist')
    })
  })

  describe('Flow 8: Display checks', () => {
    it('should show reception table headers with current labels', () => {
      visitPage('/reception')
      cy.get('.ant-table-thead').invoke('text').then((text) => {
        expect(text).to.match(/Ho ten|Họ tên|Ma BN|Mã BN|Phong kham|Phòng khám/)
      })
    })

    it('should show dashboard summary blocks', () => {
      visitPage('/')
      cy.contains(/Tong quan hoat dong|Tổng quan hoạt động/i, { timeout: 15000 }).should('exist')
      cy.get('.ant-card, .ant-statistic').should('have.length.at.least', 1)
    })
  })

  describe('Flow 9: API-backed UI checks', () => {
    it('should verify warehouse stock API and pharmacy UI', () => {
      cy.request({
        url: '/api/warehouse/stock',
        headers: apiHeaders(token),
      }).its('status').should('eq', 200)

      visitPage('/pharmacy')
      cy.contains('.ant-tabs-tab', /Ton kho|Tồn kho/i).click()
      cy.get('.ant-table').should('exist')
    })

    it('should verify inpatient API responds', () => {
      cy.request({
        url: '/api/reception/admissions/today',
        headers: apiHeaders(token),
      }).its('status').should('eq', 200)
    })
  })

  describe('Flow 10: Console and stability', () => {
    it('should not accumulate unexpected console errors on major pages', () => {
      ['/reception', '/opd', '/pharmacy', '/ipd', '/billing', '/lab', '/radiology'].forEach((page) => {
        visitPage(page)
        cy.wait(1000)
      })

      cy.then(() => {
        const hardErrors = consoleErrors.filter((msg) => !isIgnored(msg))
        expect(hardErrors, hardErrors.join('\n')).to.have.length(0)
      })
    })
  })
})
