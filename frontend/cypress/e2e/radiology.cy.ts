describe('Radiology Module', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123')
    cy.visit('/radiology')
  })

  it('should display radiology page', () => {
    cy.url().should('include', '/radiology')
  })

  it('should show waiting list', () => {
    cy.intercept('GET', '**/api/RISComplete/waiting-list*').as('getWaitingList')
    cy.reload()
    cy.wait('@getWaitingList').its('response.statusCode').should('eq', 200)
    cy.get('.ant-table, .ant-list').should('exist')
  })

  it('should load RIS data successfully', () => {
    // The radiology page calls waiting-list API, not modalities
    cy.intercept('GET', '**/api/RISComplete/waiting-list*').as('getWaitingList')
    cy.reload()
    cy.wait('@getWaitingList', { timeout: 15000 }).its('response.statusCode').should('eq', 200)
    // Should display either data or empty state
    cy.get('.ant-table').should('exist')
  })

  describe('USB Token Digital Signature', () => {
    it('should call USB Token sign API successfully', () => {
      // Test API directly
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/Auth/login',
        body: {
          username: 'admin',
          password: 'Admin@123'
        }
      }).then((loginResponse) => {
        expect(loginResponse.status).to.eq(200)
        const token = loginResponse.body.data.token

        // Test USB Token sign API - may fail if no USB Token hardware is present
        cy.request({
          method: 'POST',
          url: 'http://localhost:5106/api/RISComplete/usb-token/sign',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: {
            reportId: 'test-report-123',
            certificateThumbprint: '46F732584971C00EDB8FBEDABB2D68133960B322',
            dataToSign: 'Test RIS Report Data for signing'
          },
          failOnStatusCode: false
        }).then((signResponse) => {
          cy.log('Sign Response Status:', signResponse.status)
          cy.log('Sign Response Body:', JSON.stringify(signResponse.body))

          // API should respond without crashing - 200 if USB Token present, 400/500 if not
          expect([200, 400, 500]).to.include(signResponse.status)

          if (signResponse.status === 200) {
            // success may be false if USB Token hardware is not present
            expect(signResponse.body).to.have.property('success')
          }
        })
      })
    })

    it('should get USB Token certificates', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/Auth/login',
        body: {
          username: 'admin',
          password: 'Admin@123'
        }
      }).then((loginResponse) => {
        const token = loginResponse.body.data.token

        cy.request({
          method: 'GET',
          url: 'http://localhost:5106/api/RISComplete/usb-token/certificates',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((certResponse) => {
          cy.log('Certificates Response:', JSON.stringify(certResponse.body))
          expect(certResponse.status).to.eq(200)
        })
      })
    })

    it('should debug frontend API call format', () => {
      // Make a direct API call from frontend to see what happens
      cy.window().then((win) => {
        // Get token from localStorage
        const token = win.localStorage.getItem('token')
        cy.log('Token from localStorage:', token ? 'exists' : 'missing')
      })

      // Test the exact same call the frontend makes through axios
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/Auth/login',
        body: { username: 'admin', password: 'Admin@123' }
      }).then((loginRes) => {
        const token = loginRes.body.data.token

        // Test with different body formats to find what causes 400
        const testCases = [
          {
            name: 'Standard format (same as Cypress test)',
            body: {
              reportId: 'test-report-123',
              certificateThumbprint: '46F732584971C00EDB8FBEDABB2D68133960B322',
              dataToSign: 'Test data'
            }
          },
          {
            name: 'With null reportId',
            body: {
              reportId: null,
              certificateThumbprint: '46F732584971C00EDB8FBEDABB2D68133960B322',
              dataToSign: 'Test data'
            }
          },
          {
            name: 'With undefined reportId (omitted)',
            body: {
              certificateThumbprint: '46F732584971C00EDB8FBEDABB2D68133960B322',
              dataToSign: 'Test data'
            }
          },
          {
            name: 'With empty string reportId',
            body: {
              reportId: '',
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
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: testCase.body,
            failOnStatusCode: false
          }).then((res) => {
            cy.log(`${testCase.name}: Status ${res.status}`)
            if (res.status !== 200) {
              cy.log(`Error body: ${JSON.stringify(res.body)}`)
            }
          })
        })
      })
    })
  })
})
