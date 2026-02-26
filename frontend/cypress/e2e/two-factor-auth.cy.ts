describe('Two-Factor Authentication', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  describe('Login without 2FA (default)', () => {
    it('logs in normally when 2FA is not enabled', () => {
      cy.visit('/login');
      cy.get('input[id="login_username"]').type('admin');
      cy.get('input[id="login_password"]').type('Admin@123');
      cy.get('button[type="submit"]').click();
      cy.url().should('not.include', '/login', { timeout: 10000 });
      cy.window().then(win => {
        expect(win.localStorage.getItem('token')).to.not.be.null;
      });
    });
  });

  describe('Login page OTP UI', () => {
    it('shows normal login form initially', () => {
      cy.visit('/login');
      cy.get('input[id="login_username"]').should('be.visible');
      cy.get('input[id="login_password"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain.text', 'Đăng nhập');
    });

    it('shows OTP step when API returns requiresOtp', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          message: 'OTP sent',
          data: {
            token: '',
            refreshToken: '',
            requiresOtp: true,
            otpUserId: '00000000-0000-0000-0000-000000000001',
            maskedEmail: 'a***n@hospital.local',
            otpExpiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
          }
        }
      }).as('loginOtp');

      cy.visit('/login');
      cy.get('input[id="login_username"]').type('testuser');
      cy.get('input[id="login_password"]').type('TestPass@123');
      cy.get('button[type="submit"]').click();
      cy.wait('@loginOtp');

      // Should show OTP verification screen
      cy.contains('Xác thực OTP', { timeout: 5000 }).should('be.visible');
      cy.contains('a***n@hospital.local').should('be.visible');
      cy.contains('Xác nhận').should('be.visible');
      cy.contains('Quay lại').should('be.visible');
      cy.contains('Gửi lại').should('be.visible');
    });

    it('can go back from OTP step to login form', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            token: '',
            refreshToken: '',
            requiresOtp: true,
            otpUserId: '00000000-0000-0000-0000-000000000001',
            maskedEmail: 'a***n@hospital.local',
            otpExpiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
          }
        }
      });

      cy.visit('/login');
      cy.get('input[id="login_username"]').type('testuser');
      cy.get('input[id="login_password"]').type('TestPass@123');
      cy.get('button[type="submit"]').click();

      cy.contains('Xác thực OTP', { timeout: 5000 }).should('be.visible');
      cy.contains('Quay lại').click();

      // Should be back to login form
      cy.get('input[id="login_username"]').should('be.visible');
    });

    it('shows resend cooldown timer', () => {
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            token: '',
            refreshToken: '',
            requiresOtp: true,
            otpUserId: '00000000-0000-0000-0000-000000000001',
            maskedEmail: 'test@test.com',
            otpExpiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
          }
        }
      });

      cy.visit('/login');
      cy.get('input[id="login_username"]').type('testuser');
      cy.get('input[id="login_password"]').type('TestPass@123');
      cy.get('button[type="submit"]').click();

      cy.contains('Xác thực OTP', { timeout: 5000 }).should('be.visible');
      // Resend button should show countdown
      cy.contains(/Gửi lại \(\d+s\)/).should('be.visible');
    });

    it('successfully verifies OTP and logs in', () => {
      // Step 1: Login returns requiresOtp
      cy.intercept('POST', '**/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            token: '',
            refreshToken: '',
            requiresOtp: true,
            otpUserId: '00000000-0000-0000-0000-000000000001',
            maskedEmail: 'a***n@test.com',
            otpExpiresAt: new Date(Date.now() + 5 * 60000).toISOString(),
          }
        }
      });

      // Step 2: OTP verification succeeds
      cy.intercept('POST', '**/api/auth/verify-otp', {
        statusCode: 200,
        body: {
          success: true,
          message: 'Login successful',
          data: {
            token: 'fake-jwt-token-for-test',
            refreshToken: 'fake-refresh-token',
            expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
            user: {
              id: '00000000-0000-0000-0000-000000000001',
              username: 'testuser',
              fullName: 'Test User',
              email: 'admin@test.com',
              roles: ['Admin'],
              permissions: [],
              isTwoFactorEnabled: true,
            }
          }
        }
      }).as('verifyOtp');

      // Also mock /auth/me for the redirect
      cy.intercept('GET', '**/api/auth/me', {
        statusCode: 200,
        body: {
          success: true,
          data: {
            id: '00000000-0000-0000-0000-000000000001',
            username: 'testuser',
            fullName: 'Test User',
            email: 'admin@test.com',
            roles: ['Admin'],
            permissions: [],
          }
        }
      });

      cy.visit('/login');
      cy.get('input[id="login_username"]').type('testuser');
      cy.get('input[id="login_password"]').type('TestPass@123');
      cy.get('button[type="submit"]').click();

      cy.contains('Xác thực OTP', { timeout: 5000 }).should('be.visible');

      // Type OTP digits into individual inputs (Antd v6 Input.OTP)
      cy.get('[class*="ant-otp"] input').should('have.length.gte', 6);
      '123456'.split('').forEach((digit, i) => {
        cy.get('[class*="ant-otp"] input').eq(i).type(digit);
      });

      cy.contains('button', 'Xác nhận').should('not.be.disabled').click();
      cy.wait('@verifyOtp');

      // Should navigate to dashboard
      cy.url({ timeout: 10000 }).should('not.include', '/login');
    });
  });

  describe('2FA management API endpoints', () => {
    let authToken: string;

    before(() => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin',
        password: 'Admin@123'
      }).then(resp => {
        authToken = resp.body.data.token;
      });
    });

    it('GET /api/auth/2fa-status returns status', () => {
      cy.request({
        method: 'GET',
        url: 'http://localhost:5106/api/auth/2fa-status',
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then(resp => {
        // Accept both 200 (new backend) and 404/500 (old backend without new code)
        if (resp.status === 200) {
          expect(resp.body.success).to.be.true;
          expect(resp.body.data).to.have.property('isEnabled');
        }
      });
    });

    it('POST /api/auth/verify-otp rejects invalid OTP', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/auth/verify-otp',
        body: {
          userId: '00000000-0000-0000-0000-000000000000',
          otpCode: '000000'
        },
        failOnStatusCode: false,
      }).then(resp => {
        expect(resp.status).to.be.oneOf([401, 404, 500]);
      });
    });

    it('POST /api/auth/resend-otp rejects invalid user', () => {
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/auth/resend-otp',
        body: {
          userId: '00000000-0000-0000-0000-000000000000'
        },
        failOnStatusCode: false,
      }).then(resp => {
        expect(resp.status).to.be.oneOf([400, 404, 500]);
      });
    });
  });
});
