describe('Laboratory Module', () => {
  beforeEach(() => {
    cy.login('admin', '123456')
    cy.visit('/laboratory')
  })

  it('should display laboratory page', () => {
    cy.url().should('include', '/laboratory')
  })

  it('should show pending lab orders', () => {
    cy.interceptApi('GET', 'LISComplete/orders/pending*', 'getPendingOrders')
    cy.reload()
    cy.wait('@getPendingOrders')
    cy.get('.ant-table, .ant-list').should('exist')
  })

  it('should filter by date', () => {
    cy.get('.ant-picker, input[type="date"]').click()
    cy.get('.ant-picker-today-btn, .ant-picker-cell-today').click()
  })
})
