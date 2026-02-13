describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('should display login form', () => {
    cy.get('input[type="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('should login successfully with valid credentials', () => {
    cy.fixture('example').then((data) => {
      cy.get('input[name="username"], input#username, input[placeholder*="username" i]').type(data.testUser.username)
      cy.get('input[type="password"]').type(data.testUser.password)
      cy.get('button[type="submit"]').click()

      // Should redirect to dashboard after login
      cy.url().should('not.include', '/login')
    })
  })

  it('should show error with invalid credentials', () => {
    cy.get('input[name="username"], input#username, input[placeholder*="username" i]').type('wronguser')
    cy.get('input[type="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()

    // Should show error message
    cy.get('.ant-message-error, .ant-notification-error, .error-message').should('be.visible')
  })
})
