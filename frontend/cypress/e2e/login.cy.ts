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
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            token: 'fake-jwt-token-login-spec',
            refreshToken: 'fake-refresh-token',
            expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
            user: {
              id: '00000000-0000-0000-0000-000000000001',
              username: data.testUser.username,
              fullName: 'Admin User',
              roles: ['Admin'],
              permissions: [],
            }
          }
        }
      }).as('loginSuccess')
      cy.intercept('GET', '**/api/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            username: data.testUser.username,
            fullName: 'Admin User',
            roles: ['Admin'],
            permissions: [],
          }
        }
      })

      cy.get('#login_username, input[name="username"], input[placeholder*="TÃªn Ä‘Äƒng nháº­p"]', { timeout: 10000 })
        .should('be.visible')
        .type(data.testUser.username)
      cy.get('input[type="password"]').type(data.testUser.password)
      cy.get('button[type="submit"]').click()
      cy.wait('@loginSuccess')
      cy.url({ timeout: 20000 }).should('not.include', '/login')
    })
  })

  it('should show error with invalid credentials', () => {
    cy.get('#login_username, input[name="username"], input[placeholder*="TÃªn Ä‘Äƒng nháº­p"]', { timeout: 10000 })
      .should('be.visible')
      .type('wronguser')
    cy.get('input[type="password"]').type('wrongpassword')
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/login')
  })
})
