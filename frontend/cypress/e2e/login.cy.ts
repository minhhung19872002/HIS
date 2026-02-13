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
      // Try multiple possible selectors for username field
      cy.get('#login_username, input[name="username"], input[placeholder*="Tên đăng nhập"]', { timeout: 10000 })
        .should('be.visible')
        .type(data.testUser.username)
      cy.get('input[type="password"]').type(data.testUser.password)
      cy.get('button[type="submit"]').click()

      // Should redirect to dashboard after login
      cy.url({ timeout: 15000 }).should('not.include', '/login')
    })
  })

  it('should show error with invalid credentials', () => {
    cy.get('#login_username, input[name="username"], input[placeholder*="Tên đăng nhập"]', { timeout: 10000 })
      .should('be.visible')
      .type('wronguser')
    cy.get('input[type="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()

    // Should show error message or stay on login page
    cy.url().should('include', '/login')
  })
})
