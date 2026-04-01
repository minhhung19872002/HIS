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
    it('should expose USB Token status without crashing', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/RISComplete/usb-token/status',
        headers: { 'Authorization': `Bearer ${authToken}` },
        failOnStatusCode: false,
        timeout: 10000
      }).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body).to.have.property('available')
        expect(res.body).to.have.property('hasValidCertificate')
        expect(res.body).to.have.property('certificateCount')
        expect(res.body).to.have.property('message')
        expect(res.body).to.have.property('certificates')
        expect(res.body.certificates).to.be.an('array')
      })
    })

    it('should list USB Token certificates without server error', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/RISComplete/usb-token/certificates',
        headers: { 'Authorization': `Bearer ${authToken}` },
        failOnStatusCode: false,
        timeout: 10000
      }).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body).to.be.an('array')
      })
    })

    it('should reject USB Token signing when certificate thumbprint is missing', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/RISComplete/usb-token/sign',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          reportId: 'test-report-123',
          dataToSign: 'Test RIS Report Data for signing'
        },
        failOnStatusCode: false,
        timeout: 10000
      }).then((signResponse) => {
        expect(signResponse.status).to.eq(400)
        expect(signResponse.body).to.have.property('success', false)
        expect(String(signResponse.body.message || '')).to.include('chứng thư số')
      })
    })
  })
})
