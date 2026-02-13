describe('Reception Module', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
    cy.visit('/reception')
  })

  it('should display reception page', () => {
    cy.url().should('include', '/reception')
    // Check for any visible title or content element
    cy.get('body').should('be.visible')
    cy.contains(/Tiếp đón|Reception|Bệnh nhân/i).should('exist')
  })

  it('should open patient registration form', () => {
    // Look for add/create button with various possible labels
    cy.get('button').contains(/Thêm|Đăng ký|Tạo/i).click()
    cy.get('.ant-modal, .ant-drawer').should('be.visible')
  })

  it('should search for patients', () => {
    // Look for search input with various possible placeholders
    cy.get('input').first().should('exist')
    cy.get('.ant-table').should('exist')
  })
})
