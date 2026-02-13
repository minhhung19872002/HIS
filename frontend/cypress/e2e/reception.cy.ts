describe('Reception Module', () => {
  beforeEach(() => {
    cy.login('admin', '123456')
    cy.visit('/reception')
  })

  it('should display reception page', () => {
    cy.url().should('include', '/reception')
    cy.get('h1, h2, .ant-page-header-heading-title').should('be.visible')
  })

  it('should open patient registration form', () => {
    cy.contains('button', /them|tao|create|new/i).click()
    cy.get('.ant-modal, .ant-drawer').should('be.visible')
  })

  it('should search for patients', () => {
    cy.get('input[placeholder*="search" i], input[placeholder*="tim" i]').type('Nguyen')
    cy.get('.ant-table-tbody').should('exist')
  })
})
