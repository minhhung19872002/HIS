/// <reference types="cypress" />

// Custom commands for HIS application

const extractLoginData = (responseBody: any) => {
  const loginData = responseBody?.data ?? responseBody
  const token = loginData?.token
  const user = loginData?.user

  expect(token, 'login token').to.be.a('string').and.not.be.empty
  expect(user, 'login user').to.exist

  return { token, user }
}

// Login command - use API login for stability, then bootstrap localStorage before app loads
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username, password },
    failOnStatusCode: false
  }).then((response) => {
    expect(response.status, 'login status').to.eq(200)
    const { token, user } = extractLoginData(response.body)

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token)
        win.localStorage.setItem('user', JSON.stringify(user))
      }
    })

    cy.window().then((win) => {
      win.localStorage.setItem('token', token)
      win.localStorage.setItem('user', JSON.stringify(user))
    })

    cy.url({ timeout: 20000 }).should('not.include', '/login')
  })
})

// Programmatic login - bypasses UI for faster tests
Cypress.Commands.add('loginByApi', (username: string, password: string) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { username, password },
    failOnStatusCode: false
  }).then((response) => {
    expect(response.status, 'login status').to.eq(200)
    const { token, user } = extractLoginData(response.body)

    cy.window().then((win) => {
      win.localStorage.setItem('token', token)
      win.localStorage.setItem('user', JSON.stringify(user))
    })
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
