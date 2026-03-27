describe('Reception Module', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
    cy.visit('/reception')
  })

  it('should display reception page', () => {
    cy.url().should('include', '/reception')
    cy.get('body').should('be.visible')
    cy.contains(/Tiep don|Reception|Benh nhan/i).should('exist')
  })

  it('should open patient registration form', () => {
    cy.contains('button', /Dang ky kham|Dang ky moi/i).click()
    cy.contains('.ant-modal-title', /Dang ky kham benh/i).should('be.visible')
  })

  it('should search for patients', () => {
    cy.get('.ant-input-search input').should('exist')
    cy.get('.ant-table').should('exist')
  })
})
