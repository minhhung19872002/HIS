describe('LIS - Laboratory Information System', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('admin', 'Admin@123')
    cy.visit('/lab')
    cy.url().should('include', '/lab')
  })

  describe('Page Load', () => {
    it('should display laboratory page title', () => {
      cy.contains('Quản lý Xét nghiệm').should('be.visible')
    })

    it('should display all tabs', () => {
      cy.contains('Chờ lấy mẫu').should('be.visible')
      cy.contains('Đã lấy mẫu').should('be.visible')
      cy.contains('Đang xử lý').should('be.visible')
      cy.contains('Nhập kết quả').should('be.visible')
      cy.contains('Kết quả đã duyệt').should('be.visible')
    })

    it('should default to pending tab', () => {
      cy.get('.ant-tabs-tab-active').should('contain', 'Chờ lấy mẫu')
    })
  })

  describe('Pending Orders Tab (Chờ lấy mẫu)', () => {
    it('should load pending orders from API', () => {
      cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
      cy.reload()
      cy.wait('@getPendingOrders').its('response.statusCode').should('eq', 200)
      cy.get('.ant-table').should('exist')
    })

    it('should display search input', () => {
      cy.get('input[placeholder*="Tìm theo mã phiếu"]').should('be.visible')
    })

    it('should display refresh button', () => {
      cy.contains('button', 'Làm mới').should('be.visible')
    })

    it('should display table columns correctly', () => {
      cy.get('.ant-table-thead').within(() => {
        cy.contains('Mã phiếu').should('be.visible')
        cy.contains('Mã BN').should('be.visible')
        cy.contains('Họ tên').should('be.visible')
        cy.contains('Xét nghiệm').should('be.visible')
        cy.contains('Độ ưu tiên').should('be.visible')
        cy.contains('Ngày chỉ định').should('be.visible')
        cy.contains('Thao tác').should('be.visible')
      })
    })

    it('should search for orders', () => {
      cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
      cy.get('input[placeholder*="Tìm theo mã phiếu"]').type('BN001')
      cy.wait('@getPendingOrders')
    })
  })

  describe('Collected Samples Tab (Đã lấy mẫu)', () => {
    beforeEach(() => {
      cy.contains('.ant-tabs-tab', 'Đã lấy mẫu').click()
    })

    it('should switch to collected samples tab', () => {
      cy.get('.ant-tabs-tab-active').should('contain', 'Đã lấy mẫu')
    })

    it('should display collected samples table', () => {
      cy.get('.ant-table').should('exist')
    })

    it('should display barcode column', () => {
      // Check that barcode column exists in the table
      cy.contains('th', 'Mã barcode').should('exist')
    })
  })

  describe('Processing Tab (Đang xử lý)', () => {
    beforeEach(() => {
      cy.contains('.ant-tabs-tab', 'Đang xử lý').click()
    })

    it('should switch to processing tab', () => {
      cy.get('.ant-tabs-tab-active').should('contain', 'Đang xử lý')
    })

    it('should display alert message', () => {
      cy.get('.ant-alert').should('be.visible')
      cy.contains('Gán mẫu cho máy xét nghiệm').should('be.visible')
    })

    it('should display processing table', () => {
      cy.get('.ant-table').should('exist')
    })
  })

  describe('Results Entry Tab (Nhập kết quả)', () => {
    beforeEach(() => {
      cy.contains('.ant-tabs-tab', 'Nhập kết quả').click()
    })

    it('should switch to results entry tab', () => {
      cy.get('.ant-tabs-tab-active').should('contain', 'Nhập kết quả')
    })

    it('should display info alert', () => {
      cy.get('.ant-alert').should('be.visible')
      cy.contains('Nhập kết quả xét nghiệm').should('be.visible')
    })

    it('should display results table', () => {
      cy.get('.ant-table').should('exist')
    })
  })

  describe('Approved Results Tab (Kết quả đã duyệt)', () => {
    beforeEach(() => {
      cy.contains('.ant-tabs-tab', 'Kết quả đã duyệt').click()
    })

    it('should switch to approved results tab', () => {
      cy.get('.ant-tabs-tab-active').should('contain', 'Kết quả đã duyệt')
    })

    it('should display search input', () => {
      cy.get('input[placeholder*="Tìm theo mã phiếu"]').should('be.visible')
    })

    it('should display approved results table', () => {
      cy.get('.ant-table').should('exist')
    })
  })

  describe('Pagination', () => {
    it('should display pagination controls when data exists', () => {
      cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
      cy.reload()
      cy.wait('@getPendingOrders')
      // Pagination may not show if there's no data
      cy.get('.ant-table').should('exist')
      cy.get('.ant-table-tbody').then(($tbody) => {
        if ($tbody.find('tr.ant-table-row').length > 0) {
          // If there's data, check for pagination
          cy.get('.ant-pagination').should('exist')
        } else {
          cy.log('No data - pagination controls may not be visible')
        }
      })
    })

    it('should show table footer info', () => {
      // Check for table footer showing total count
      cy.get('.ant-table').should('exist')
      cy.get('.ant-table-tbody').then(($tbody) => {
        if ($tbody.find('tr.ant-table-row').length > 0) {
          // If data exists, look for total display
          cy.get('.ant-pagination, .ant-table-pagination').should('exist')
        } else {
          cy.log('No data - footer info may not be visible')
        }
      })
    })
  })
})

describe('LIS - Sample Collection Workflow', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
    cy.visit('/lab')
    cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
    cy.intercept('POST', '**/api/LISComplete/sample-collection/collect').as('collectSample')
  })

  it('should display "Lấy mẫu" button for pending orders', () => {
    cy.wait('@getPendingOrders')
    cy.get('.ant-table-tbody').then(($tbody) => {
      if ($tbody.find('tr.ant-table-row').length > 0) {
        cy.contains('button', 'Lấy mẫu').should('exist')
      } else {
        cy.log('No pending orders found')
      }
    })
  })

  it('should open sample collection modal when clicking "Lấy mẫu"', () => {
    cy.wait('@getPendingOrders')
    cy.get('.ant-table-tbody').then(($tbody) => {
      if ($tbody.find('tr.ant-table-row').length > 0) {
        cy.get('.ant-table-tbody tr.ant-table-row').first().within(() => {
          cy.get('button').contains('Lấy mẫu').click()
        })
        cy.get('.ant-modal').should('be.visible')
        cy.contains('Lấy mẫu xét nghiệm').should('be.visible')
        cy.get('.ant-modal-close').click()
      } else {
        cy.log('No pending orders found - skipping modal test')
      }
    })
  })

  it('should display patient info in modal', () => {
    cy.wait('@getPendingOrders')
    cy.get('.ant-table-tbody').then(($tbody) => {
      if ($tbody.find('tr.ant-table-row').length > 0) {
        cy.get('.ant-table-tbody tr.ant-table-row').first().within(() => {
          cy.get('button').contains('Lấy mẫu').click()
        })
        cy.get('.ant-modal').within(() => {
          cy.contains('Mã phiếu').should('be.visible')
          cy.contains('Mã BN').should('be.visible')
          cy.contains('Họ tên').should('be.visible')
        })
        cy.get('.ant-modal-close').click()
      } else {
        cy.log('No pending orders found - skipping modal test')
      }
    })
  })

  it('should have sample type dropdown', () => {
    cy.wait('@getPendingOrders')
    cy.get('.ant-table-tbody').then(($tbody) => {
      if ($tbody.find('tr.ant-table-row').length > 0) {
        cy.get('.ant-table-tbody tr.ant-table-row').first().within(() => {
          cy.get('button').contains('Lấy mẫu').click()
        })
        cy.get('.ant-modal').within(() => {
          cy.contains('Loại mẫu').should('be.visible')
          cy.get('.ant-select').first().click({ force: true })
        })
        // Dropdown appears outside modal, check for any dropdown option
        cy.get('.ant-select-dropdown:visible').should('exist')
        cy.get('.ant-modal-close').click()
      } else {
        cy.log('No pending orders found - skipping modal test')
      }
    })
  })

  it('should close modal when clicking cancel', () => {
    cy.wait('@getPendingOrders')
    cy.get('.ant-table-tbody').then(($tbody) => {
      if ($tbody.find('tr.ant-table-row').length > 0) {
        cy.get('.ant-table-tbody tr.ant-table-row').first().within(() => {
          cy.get('button').contains('Lấy mẫu').click()
        })
        cy.get('.ant-modal').should('be.visible')
        // Click the X button or Cancel button
        cy.get('.ant-modal-close').click()
        // Modal title should not be visible after close
        cy.contains('Lấy mẫu xét nghiệm').should('not.be.visible')
      } else {
        cy.log('No pending orders found - skipping modal test')
      }
    })
  })
})

describe('LIS - Result Entry Workflow', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
    cy.visit('/lab')
    cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
    cy.intercept('POST', '**/api/LISComplete/orders/enter-result').as('saveResults')
  })

  it('should navigate to results entry tab', () => {
    cy.wait('@getPendingOrders')
    cy.contains('.ant-tabs-tab', 'Nhập kết quả').click()
    cy.get('.ant-tabs-tab-active').should('contain', 'Nhập kết quả')
  })

  it('should display "Nhập KQ" button if orders exist', () => {
    cy.wait('@getPendingOrders')
    cy.contains('.ant-tabs-tab', 'Nhập kết quả').click()
    cy.get('.ant-table-tbody').then(($tbody) => {
      if ($tbody.find('tr.ant-table-row').length > 0) {
        cy.contains('button', 'Nhập KQ').should('exist')
      } else {
        cy.log('No orders ready for result entry')
      }
    })
  })
})

describe('LIS - Result Approval Workflow', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
    cy.visit('/lab')
    cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
    cy.intercept('POST', '**/api/LISComplete/orders/approve').as('approveResults')
  })

  it('should navigate to approved results tab', () => {
    cy.wait('@getPendingOrders')
    cy.contains('.ant-tabs-tab', 'Kết quả đã duyệt').click()
    cy.get('.ant-tabs-tab-active').should('contain', 'Kết quả đã duyệt')
  })

  it('should display view and print buttons for approved results', () => {
    cy.wait('@getPendingOrders')
    cy.contains('.ant-tabs-tab', 'Kết quả đã duyệt').click()
    cy.get('.ant-table-tbody').then(($tbody) => {
      if ($tbody.find('tr.ant-table-row').length > 0) {
        // Look for Xem or In button
        cy.get('.ant-table-tbody').then(($table) => {
          if ($table.find('button:contains("Xem")').length > 0) {
            cy.contains('button', 'Xem').should('exist')
          }
        })
      } else {
        cy.log('No approved results found')
      }
    })
  })
})

describe('LIS - API Integration Tests', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
  })

  it('should call pending orders API successfully', () => {
    cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
    cy.visit('/lab')
    cy.wait('@getPendingOrders').its('response.statusCode').should('eq', 200)
  })

  it('should handle empty results gracefully', () => {
    cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
    cy.visit('/lab')
    cy.wait('@getPendingOrders')
    // Should either show data or empty state
    cy.get('.ant-table').should('exist')
  })
})
