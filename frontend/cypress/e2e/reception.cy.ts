describe('Reception Module', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
    cy.visit('/reception')
  })

  it('should display reception page', () => {
    cy.url().should('include', '/reception')
    cy.get('body').should('be.visible')
    cy.contains(/Ti[eế]p [dđ][oô]n|Reception|B[eệ]nh nh[aâ]n/i).should('exist')
  })

  it('should open patient registration form', () => {
    cy.contains('button', /[DĐ][aă]ng k[yý] kh[aá]m|[DĐ][aă]ng k[yý] m[oớ]i/i).click()
    cy.get('.ant-modal').should('be.visible')
  })

  it('should search for patients', () => {
    cy.get('.ant-input-search input').should('exist')
    cy.get('.ant-table').should('exist')
  })
})
