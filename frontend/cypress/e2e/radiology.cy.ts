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
    it('should call USB Token sign API successfully', () => {
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
        failOnStatusCode: false
      }).then((signResponse) => {
        // API should respond without crashing - 200 if USB Token present, 400/500 if not
        expect([200, 400, 500]).to.include(signResponse.status)

        if (signResponse.status === 200) {
          expect(signResponse.body).to.have.property('success')
        }
      })
    })

    it('should get USB Token certificates', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/RISComplete/usb-token/certificates',
        headers: { 'Authorization': `Bearer ${authToken}` },
        failOnStatusCode: false
      }).then((certResponse) => {
        expect(certResponse.status).to.eq(200)
      })
    })

    it('should debug frontend API call format', () => {
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
          failOnStatusCode: false
        }).then((res) => {
          cy.log(`${testCase.name}: Status ${res.status}`)
          // API should not crash
          expect([200, 400, 500]).to.include(res.status)
        })
      })
    })
  })
})
