describe('Laboratory Module', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
    cy.visit('/lab')
  })

  it('should display laboratory page', () => {
    cy.url().should('include', '/lab')
  })

  it('should show pending lab orders', () => {
    cy.intercept('GET', '**/api/LISComplete/orders/pending*').as('getPendingOrders')
    cy.reload()
    cy.wait('@getPendingOrders')
    cy.get('.ant-table, .ant-list').should('exist')
  })

  it('should have search functionality', () => {
    // Laboratory page has search input for filtering
    cy.get('input[placeholder*="Tìm theo mã phiếu"], .ant-input-search, input.ant-input').first().should('exist')
  })
})
