/// <reference types="cypress" />

const IGNORE_PATTERNS = [
  'ResizeObserver loop',
  'Failed to fetch',
  'Network Error',
  'ERR_CONNECTION',
  'SignalR',
  'HubConnection',
  'useForm',
  'is not connected to any Form element',
];

function shouldIgnore(msg: string): boolean {
  return IGNORE_PATTERNS.some(p => msg.includes(p));
}

describe('Central Signing - Ky so tap trung (NangCap6)', () => {
  let token: string;
  let userData: string;

  before(() => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200 && response.body.data) {
        token = response.body.data.token;
        userData = JSON.stringify(response.body.data.user);
      } else if (response.status === 200 && response.body.token) {
        token = response.body.token;
        userData = JSON.stringify(response.body.user || { id: 1, username: 'admin', roles: ['Admin'] });
      } else {
        throw new Error(`Login failed: ${response.status}`);
      }
    });
  });

  function visitPage(path = '/central-signing') {
    cy.on('uncaught:exception', () => false);
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
        win.localStorage.setItem('user', userData);
      },
    });
  }

  describe('Page Load & Structure', () => {
    it('should load the central signing page', () => {
      visitPage();
      cy.contains('Ký số Tập trung', { timeout: 15000 }).should('exist');
    });

    it('should have tabs', () => {
      visitPage();
      cy.get('.ant-tabs-tab', { timeout: 15000 }).should('have.length.at.least', 5);
    });

    it('should display Chung thu so tab', () => {
      visitPage();
      cy.contains('Chứng thư số', { timeout: 15000 }).should('exist');
    });

    it('should display Giao dich tab', () => {
      visitPage();
      cy.contains('Giao dịch', { timeout: 15000 }).should('exist');
    });

    it('should display Thong ke tab', () => {
      visitPage();
      cy.contains('Thống kê', { timeout: 15000 }).should('exist');
    });

    it('should display Cau hinh hien thi tab', () => {
      visitPage();
      cy.contains('Cấu hình hiển thị', { timeout: 15000 }).should('exist');
    });

    it('should display HSM tab', () => {
      visitPage();
      cy.contains('HSM', { timeout: 15000 }).should('exist');
    });

    it('should display OTP Ky so tab', () => {
      visitPage();
      cy.contains('OTP Ký số', { timeout: 15000 }).should('exist');
    });
  });

  describe('Certificate Management Tab', () => {
    beforeEach(() => {
      visitPage();
      cy.contains('Chứng thư số', { timeout: 15000 }).should('exist');
    });

    it('should have Add certificate button', () => {
      cy.contains('Thêm chứng thư').should('exist');
    });

    it('should have Export serial button', () => {
      cy.contains('Xuất Serial').should('exist');
    });

    it('should open add certificate modal', () => {
      cy.contains('Thêm chứng thư').click();
      cy.get('.ant-modal', { timeout: 5000 }).should('be.visible');
    });

    it('should have required form fields in modal', () => {
      cy.contains('Thêm chứng thư').click();
      cy.get('.ant-modal').within(() => {
        cy.contains('Serial Number').should('exist');
        cy.contains('Nhà cung cấp CA').should('exist');
        cy.contains('Chủ thể').should('exist');
        cy.contains('Đơn vị cấp').should('exist');
        cy.contains('Loại lưu trữ').should('exist');
        cy.contains('CCCD').should('exist');
      });
    });

    it('should close modal on cancel', () => {
      cy.contains('Thêm chứng thư').click();
      cy.get('.ant-modal').should('be.visible');
      cy.get('.ant-modal .ant-modal-close').click();
      cy.get('.ant-modal').should('not.exist');
    });
  });

  describe('Transaction Tab', () => {
    it('should switch to transaction tab', () => {
      visitPage();
      cy.contains('Giao dịch', { timeout: 15000 }).click();
      cy.get('.ant-select', { timeout: 5000 }).should('exist');
    });

    it('should have action filter dropdown', () => {
      visitPage();
      cy.contains('Giao dịch', { timeout: 15000 }).click();
      cy.contains('Hành động').should('exist');
    });

    it('should have result filter dropdown', () => {
      visitPage();
      cy.contains('Giao dịch', { timeout: 15000 }).click();
      cy.contains('Kết quả').should('exist');
    });
  });

  describe('Statistics Tab', () => {
    it('should switch to statistics tab', () => {
      visitPage();
      cy.contains('Thống kê', { timeout: 15000 }).click();
      cy.contains('Tổng giao dịch', { timeout: 10000 }).should('exist');
    });

    it('should show KPI cards', () => {
      visitPage();
      cy.contains('Thống kê', { timeout: 15000 }).click();
      cy.contains('Thành công', { timeout: 10000 }).should('exist');
      cy.contains('Thất bại').should('exist');
      cy.contains('Hôm nay').should('exist');
    });

    it('should show certificate statistics', () => {
      visitPage();
      cy.contains('Thống kê', { timeout: 15000 }).click();
      cy.contains('CTS hoạt động', { timeout: 10000 }).should('exist');
      cy.contains('Sắp hết hạn').should('exist');
    });
  });

  describe('Appearance Configuration Tab', () => {
    it('should switch to appearance tab', () => {
      visitPage();
      cy.contains('Cấu hình hiển thị', { timeout: 15000 }).click();
      cy.contains('Cấu hình vị trí', { timeout: 10000 }).should('exist');
    });

    it('should have position config', () => {
      visitPage();
      cy.contains('Cấu hình hiển thị', { timeout: 15000 }).click();
      cy.contains('Vị trí', { timeout: 10000 }).should('exist');
      cy.contains('Trang hiển thị').should('exist');
    });

    it('should have dimension inputs', () => {
      visitPage();
      cy.contains('Cấu hình hiển thị', { timeout: 15000 }).click();
      cy.contains('Chiều rộng', { timeout: 10000 }).should('exist');
      cy.contains('Chiều cao').should('exist');
    });

    it('should have display toggles', () => {
      visitPage();
      cy.contains('Cấu hình hiển thị', { timeout: 15000 }).click();
      cy.contains('Hiện tên', { timeout: 10000 }).should('exist');
      cy.contains('Hiện ngày').should('exist');
      cy.contains('Hiện Serial').should('exist');
    });

    it('should have save button', () => {
      visitPage();
      cy.contains('Cấu hình hiển thị', { timeout: 15000 }).click();
      cy.contains('Lưu cấu hình', { timeout: 10000 }).should('exist');
    });
  });

  describe('HSM Tab', () => {
    it('should show HSM not connected info', () => {
      visitPage();
      cy.contains('HSM', { timeout: 15000 }).click();
      cy.contains('HSM chưa được kết nối', { timeout: 10000 }).should('exist');
    });

    it('should show HSM info card', () => {
      visitPage();
      cy.contains('HSM', { timeout: 15000 }).click();
      cy.contains('Thông tin HSM', { timeout: 10000 }).should('exist');
    });

    it('should show CSR creation form', () => {
      visitPage();
      cy.contains('HSM', { timeout: 15000 }).click();
      cy.contains('Tạo CSR', { timeout: 10000 }).should('exist');
    });
  });

  describe('TOTP Tab', () => {
    it('should show TOTP setup info', () => {
      visitPage();
      cy.contains('OTP Ký số', { timeout: 15000 }).click();
      cy.contains('Xác thực OTP cho ký số', { timeout: 10000 }).should('exist');
    });

    it('should have setup TOTP button', () => {
      visitPage();
      cy.contains('OTP Ký số', { timeout: 15000 }).click();
      cy.contains('Thiết lập TOTP', { timeout: 10000 }).should('exist');
    });

    it('should have disable TOTP button', () => {
      visitPage();
      cy.contains('OTP Ký số', { timeout: 15000 }).click();
      cy.contains('Tắt TOTP', { timeout: 10000 }).should('exist');
    });
  });

  describe('API Endpoints', () => {
    it('should have sign-hash endpoint', () => {
      cy.request({ method: 'POST', url: '/api/central-signing/sign-hash',
        headers: { Authorization: `Bearer ${token}` },
        body: { hashBase64: 'dGVzdA==', hashAlgorithm: 'SHA256' },
        failOnStatusCode: false
      }).then(res => {
        expect([200, 401, 500]).to.include(res.status);
      });
    });

    it('should have verify-pdf endpoint', () => {
      cy.request({ method: 'POST', url: '/api/central-signing/verify-pdf',
        headers: { Authorization: `Bearer ${token}` },
        body: { pdfBase64: 'dGVzdA==' },
        failOnStatusCode: false
      }).then(res => {
        expect([200, 401, 500]).to.include(res.status);
      });
    });

    it('should have statistics endpoint', () => {
      cy.request({ method: 'GET', url: '/api/central-signing/admin/statistics',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false
      }).then(res => {
        expect([200, 401]).to.include(res.status);
      });
    });

    it('should have certificates endpoint', () => {
      cy.request({ method: 'GET', url: '/api/central-signing/admin/certificates',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false
      }).then(res => {
        expect([200, 401]).to.include(res.status);
      });
    });

    it('should have appearance endpoint', () => {
      cy.request({ method: 'GET', url: '/api/central-signing/admin/appearance',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false
      }).then(res => {
        expect([200, 401]).to.include(res.status);
      });
    });

    it('should have HSM info endpoint', () => {
      cy.request({ method: 'GET', url: '/api/central-signing/hsm/info',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false
      }).then(res => {
        expect([200, 401]).to.include(res.status);
      });
    });

    it('should have TOTP setup endpoint', () => {
      cy.request({ method: 'POST', url: '/api/central-signing/totp/setup',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false
      }).then(res => {
        expect([200, 401, 500]).to.include(res.status);
      });
    });

    it('should have signature-image endpoint', () => {
      cy.request({ method: 'GET', url: '/api/central-signing/signature-image',
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false
      }).then(res => {
        expect([200, 401, 500]).to.include(res.status);
      });
    });
  });

  describe('Menu Integration', () => {
    it('should have Central Signing menu item', () => {
      visitPage('/');
      cy.get('.ant-menu', { timeout: 15000 }).should('exist');
      // Open "He thong" submenu group first
      cy.contains('Hệ thống', { timeout: 10000 }).click();
      cy.contains('Ký số tập trung', { timeout: 5000 }).should('exist');
    });
  });
});
