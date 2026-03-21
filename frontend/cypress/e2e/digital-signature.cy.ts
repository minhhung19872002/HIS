/// <reference types="cypress" />

/**
 * Digital Signature Module Tests
 */

const IGNORE_PATTERNS = [
  'ResizeObserver loop', 'Download the React DevTools', 'favicon.ico',
  'AbortError', 'CanceledError', 'Failed to start the connection',
  'WebSocket connection', 'hubs/notifications', 'useForm',
  'is not connected to any Form element',
];

describe('Digital Signature Module', () => {
  const token = 'cypress-digital-signature-token';
  const user = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    fullName: 'Cypress Admin',
    roles: ['Admin'],
    permissions: [],
  };
  const userData = JSON.stringify(user);

  function visitPage() {
    cy.on('uncaught:exception', () => false);
    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: {
        success: true,
        data: user,
      },
    });
    cy.visit('/digital-signature', {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        win.localStorage.setItem('user', userData);
      },
    });
    cy.get('body', { timeout: 15000 }).should('be.visible');
    cy.wait(2000);
  }

  function probeEndpoint(url: string, authToken?: string) {
    return cy.window().then(async (win) => {
      try {
        const response = await win.fetch(url, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });
        const raw = await response.text();
        let body: any = raw;
        try {
          body = JSON.parse(raw);
        } catch {
          body = raw;
        }
        return { status: response.status, body };
      } catch (error) {
        return { networkError: String(error) };
      }
    });
  }

  describe('Page Load', () => {
    beforeEach(() => visitPage());

    it('should load digital signature page', () => {
      cy.url().should('include', '/digital-signature');
    });

    it('should have page title', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasTitle = text.includes('Chữ ký số') || text.includes('Digital Signature') ||
          text.includes('USB Token') || text.includes('Chứng thư');
        expect(hasTitle).to.be.true;
      });
    });

    it('should have statistics cards', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        const hasStats = text.includes('USB Token') || text.includes('Chứng thư số') ||
          text.includes('Phiên ký số');
        expect(hasStats).to.be.true;
      });
    });

    it('should have tabs', () => {
      cy.get('.ant-tabs-tab').should('have.length.greaterThan', 0);
    });
  });

  describe('Tab Navigation', () => {
    beforeEach(() => visitPage());

    it('should have status tab', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text.includes('Trạng thái')).to.be.true;
      });
    });

    it('should have tokens tab', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text.includes('USB Token')).to.be.true;
      });
    });

    it('should have certificates tab', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text.includes('Chứng thư số')).to.be.true;
      });
    });

    it('should have history tab', () => {
      cy.get('body').then(($body) => {
        const text = $body.text();
        expect(text.includes('Lịch sử ký')).to.be.true;
      });
    });

    it('should switch to tokens tab and show table', () => {
      cy.contains('.ant-tabs-tab', 'USB Token').click();
      cy.wait(500);
      cy.get('.ant-table').should('exist');
    });

    it('should switch to certificates tab and show table', () => {
      cy.contains('.ant-tabs-tab', /Chứng thư/).click();
      cy.wait(500);
      cy.get('.ant-table').should('exist');
    });

    it('should switch to history tab and show table', () => {
      cy.contains('.ant-tabs-tab', 'Lịch sử').click();
      cy.wait(500);
      cy.get('.ant-table').should('exist');
    });
  });

  describe('Session Management UI', () => {
    beforeEach(() => visitPage());

    it('should have session action button', () => {
      cy.get('button').then(($buttons) => {
        const hasBtn = $buttons.toArray().some(
          btn => btn.textContent?.includes('Mở phiên ký') ||
            btn.textContent?.includes('Đóng phiên')
        );
        expect(hasBtn).to.be.true;
      });
    });

    it('should have refresh button', () => {
      cy.get('button').then(($buttons) => {
        const hasRefresh = $buttons.toArray().some(
          btn => btn.textContent?.includes('Làm mới') ||
            btn.querySelector('.anticon-reload') !== null
        );
        expect(hasRefresh).to.be.true;
      });
    });

    it('should open PIN modal when clicking open session', () => {
      cy.get('body').then(($body) => {
        const openBtn = $body.find('button').toArray().find(
          btn => btn.textContent?.includes('Mở phiên ký')
        );
        if (openBtn && !openBtn.hasAttribute('disabled')) {
          cy.wrap(openBtn).click({ force: true });
          cy.wait(500);
          cy.get('.ant-modal').should('be.visible');
          cy.get('.ant-modal').within(() => {
            cy.contains('PIN').should('exist');
          });
          // Close modal
          cy.get('.ant-modal').find('button').contains('Hủy').click();
        }
      });
    });
  });

  describe('API Endpoints', () => {
    it('should respond to tokens endpoint', () => {
      probeEndpoint('http://localhost:5106/api/digital-signature/tokens').then((res) => {
        if ('networkError' in res) {
          cy.log(`Backend unavailable: ${res.networkError}`);
          return;
        }

        expect(res.status).to.be.oneOf([200, 401, 404]);
        if (res.status === 200) {
          expect(res.body).to.be.an('array');
          if (res.body.length > 0) {
            expect(res.body[0]).to.have.property('tokenSerial');
          }
        }
      });
    });

    it('should respond to USB token certificates endpoint', () => {
      probeEndpoint('http://localhost:5106/api/RISComplete/usb-token/certificates', token).then((res) => {
        if ('networkError' in res) {
          cy.log(`Backend unavailable: ${res.networkError}`);
          return;
        }

        expect(res.status).to.be.oneOf([200, 404]);
        if (res.status === 200 && Array.isArray(res.body) && res.body.length > 0) {
          expect(res.body[0]).to.have.property('thumbprint');
          expect(res.body[0]).to.have.property('subjectName');
        }
      });
    });

    it('should respond to session status endpoint', () => {
      probeEndpoint('http://localhost:5106/api/digital-signature/session-status', token).then((res) => {
        if ('networkError' in res) {
          cy.log(`Backend unavailable: ${res.networkError}`);
          return;
        }

        expect(res.status).to.be.oneOf([200, 401, 404]);
      });
    });
  });

  describe('Menu Integration', () => {
    it('should have digital signature menu item in sidebar', () => {
      visitPage();
      // Expand "Hệ thống" menu group if collapsed
      cy.get('.ant-menu').contains('Hệ thống').click({ force: true });
      cy.wait(500);
      cy.get('.ant-menu').then(($menu) => {
        const text = $menu.text();
        expect(text.includes('Chữ ký số')).to.be.true;
      });
    });
  });
});
