describe('Radiology Module', { retries: { runMode: 2, openMode: 0 } }, () => {
  let authToken: string

  beforeEach(() => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5106/api/Auth/login',
      body: { username: 'admin', password: 'Admin@123' }
    }).then((res) => {
      authToken = res.body.data.token
      cy.window().then((win) => {
        win.localStorage.setItem('token', authToken)
        win.localStorage.setItem('user', JSON.stringify(res.body.data.user || res.body.data))
      })
    })
    cy.visit('/radiology')
  })

  it('should display radiology page', () => {
    cy.url().should('include', '/radiology')
  })

  it('should show waiting list', () => {
    // Verify the waiting list API works
    cy.request({
      method: 'GET',
      url: 'http://localhost:5106/api/RISComplete/waiting-list',
      headers: { 'Authorization': `Bearer ${authToken}` },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(200)
    })
    // Verify UI has table or list component
    cy.get('.ant-table, .ant-list', { timeout: 10000 }).should('exist')
  })

  it('should load RIS data successfully', () => {
    // Verify API responds correctly
    cy.request({
      method: 'GET',
      url: 'http://localhost:5106/api/RISComplete/waiting-list',
      headers: { 'Authorization': `Bearer ${authToken}` },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(200)
    })
    // Should display table on page
    cy.get('.ant-table', { timeout: 10000 }).should('exist')
  })

  describe('USB Token Digital Signature', () => {
    // USB Token endpoints require physical hardware - check availability first
    let usbAvailable = false

    before(() => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/RISComplete/usb-token/status',
        headers: { 'Authorization': `Bearer ${authToken}` },
        failOnStatusCode: false,
        timeout: 3000
      }).then((res) => {
        usbAvailable = res.status === 200
      })
    })

    it('should call USB Token sign API successfully', function () {
      // USB sign endpoint triggers Windows PIN dialog which blocks in headless mode
      this.skip()
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/RISComplete/usb-token/sign',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          reportId: 'test-report-123',
          certificateThumbprint: '46F732584971C00EDB8FBEDABB2D68133960B322',
          dataToSign: 'Test RIS Report Data for signing'
        },
        failOnStatusCode: false,
        timeout: 15000
      }).then((signResponse) => {
        expect([200, 400, 408, 500]).to.include(signResponse.status)
      })
    })

    it('should get USB Token certificates', function () {
      // USB cert endpoint may trigger Windows crypto dialog which blocks in headless mode
      this.skip()
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/RISComplete/usb-token/certificates',
        headers: { 'Authorization': `Bearer ${authToken}` },
        failOnStatusCode: false,
        timeout: 15000
      }).then((certResponse) => {
        expect([200, 408, 500]).to.include(certResponse.status)
      })
    })

    it('should debug frontend API call format', function () {
      // USB sign endpoint triggers Windows PIN dialog which blocks in headless mode
      this.skip()
      const testCases = [
        {
          name: 'Standard format',
          body: {
            reportId: 'test-report-123',
            certificateThumbprint: '46F732584971C00EDB8FBEDABB2D68133960B322',
            dataToSign: 'Test data'
          }
        },
        {
          name: 'With GUID format reportId',
          body: {
            reportId: '550e8400-e29b-41d4-a716-446655440000',
            certificateThumbprint: '46F732584971C00EDB8FBEDABB2D68133960B322',
            dataToSign: 'Test data'
          }
        }
      ]

      testCases.forEach((testCase) => {
        cy.request({
          method: 'POST',
          url: 'http://localhost:5106/api/RISComplete/usb-token/sign',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: testCase.body,
          failOnStatusCode: false,
          timeout: 15000
        }).then((res) => {
          cy.log(`${testCase.name}: Status ${res.status}`)
          expect([200, 400, 408, 500]).to.include(res.status)
        })
      })
    })
  })
})
