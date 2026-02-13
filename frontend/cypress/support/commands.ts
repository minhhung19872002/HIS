/// <reference types="cypress" />

// Custom commands for HIS application

// Login command - Ant Design form uses #formName_fieldName pattern
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/login')
  // Ant Design Form with name="login" creates inputs with id="login_username" and "login_password"
  cy.get('#login_username, input[placeholder*="Tên đăng nhập"]', { timeout: 15000 }).should('be.visible').type(username)
  cy.get('#login_password, input[placeholder*="Mật khẩu"]').type(password)
  cy.get('button[type="submit"]').click()
  // Wait for login to complete - either redirect or check localStorage
  cy.url().should('not.include', '/login', { timeout: 15000 })
})

// Programmatic login - bypasses UI for faster tests
Cypress.Commands.add('loginByApi', (username: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username, password },
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 200 && response.body.token) {
      window.localStorage.setItem('token', response.body.token)
      window.localStorage.setItem('user', JSON.stringify(response.body.user))
    }
  })
})

// API intercept helpers
Cypress.Commands.add('interceptApi', (method: string, url: string, alias: string) => {
  cy.intercept(method, `**/api/${url}`).as(alias)
})

// Wait for loading to complete
Cypress.Commands.add('waitForLoading', () => {
  cy.get('.ant-spin', { timeout: 1000 }).should('not.exist')
})

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<void>
      loginByApi(username: string, password: string): Chainable<void>
      interceptApi(method: string, url: string, alias: string): Chainable<void>
      waitForLoading(): Chainable<void>
    }
  }
}

export {}
