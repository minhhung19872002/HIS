describe('Radiology Module', () => {
  beforeEach(() => {
    cy.login('admin', '123456')
    cy.visit('/radiology')
  })

  it('should display radiology page', () => {
    cy.url().should('include', '/radiology')
  })

  it('should show waiting list', () => {
    cy.interceptApi('GET', 'RISComplete/waiting-list*', 'getWaitingList')
    cy.reload()
    cy.wait('@getWaitingList')
    cy.get('.ant-table, .ant-list').should('exist')
  })

  it('should show modalities', () => {
    cy.interceptApi('GET', 'RISComplete/modalities', 'getModalities')
    cy.reload()
    cy.wait('@getModalities')
  })
})
