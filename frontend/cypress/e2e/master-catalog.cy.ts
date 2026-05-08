/**
 * NangCap22 — verify 5 module catalog pages load + sample CRUD flows
 * Pages by module:
 *   /pharmacy-catalogs    — Hãng SX, Đường dùng, Hội đồng KN
 *   /finance-catalogs     — Phụ thu, Thu khác, Vận chuyển, Giá xăng
 *   /paraclinical-catalogs — Mã máy, Mapping, Phòng CLS
 *   /clinical-catalogs    — Chế độ CS, Loại BA
 *   /report-catalogs      — Loại nhóm BC, Nhóm BC
 */

describe('NangCap22 module catalogs', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin', password: 'Admin@123',
      }).then((res) => {
        win.localStorage.setItem('token', res.body.data.token);
        win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Quản trị', roles: ['Admin'] }));
      });
    });
  });

  it('Pharmacy Catalogs page loads with 3 tabs', () => {
    cy.visit('/pharmacy-catalogs');
    cy.contains('Danh mục Dược').should('exist');
    cy.contains('Hãng sản xuất').should('be.visible');
    cy.contains('Đường dùng').should('be.visible');
    cy.contains('Hội đồng kiểm nhập').should('be.visible');
    cy.wait(800);
    cy.contains('Pfizer').should('exist'); // seed data
  });

  it('Finance Catalogs page loads with 4 tabs', () => {
    cy.visit('/finance-catalogs');
    cy.contains('Danh mục Tài chính').should('exist');
    cy.contains('Phụ thu').should('be.visible');
    cy.contains('Thu khác').should('be.visible');
    cy.contains('Vận chuyển').should('be.visible');
    cy.contains('Giá xăng').should('be.visible');
  });

  it('Paraclinical Catalogs page loads with 3 tabs', () => {
    cy.visit('/paraclinical-catalogs');
    cy.contains('Danh mục Cận lâm sàng').should('exist');
    cy.contains('Mã máy').should('be.visible');
    cy.contains('Thứ tự phòng CLS').should('be.visible');
  });

  it('Clinical Catalogs page loads with 2 tabs', () => {
    cy.visit('/clinical-catalogs');
    cy.contains('Danh mục Lâm sàng').should('exist');
    cy.contains('Chế độ chăm sóc').should('be.visible');
    cy.contains('Loại bệnh án').should('be.visible');
    cy.wait(800);
    cy.contains('CS1').should('exist'); // seed data
  });

  it('Report Catalogs page loads with 2 tabs', () => {
    cy.visit('/report-catalogs');
    cy.contains('Danh mục Báo cáo').should('exist');
    cy.contains('Loại nhóm BC').should('be.visible');
    cy.contains('Nhóm BC').should('be.visible');
  });

  it('All 13 catalog endpoints return 200', () => {
    const endpoints = [
      'manufacturers', 'medication-routes', 'additional-charges', 'other-incomes',
      'transport-services', 'gasoline-prices', 'machine-codes', 'machine-services',
      'inspection-committees', 'nursing-care-levels', 'medical-record-types',
      'paraclinical-room-priorities', 'report-group-types', 'report-groups',
    ];
    cy.window().then((win) => {
      const token = win.localStorage.getItem('token');
      endpoints.forEach((ep) => {
        cy.request({
          url: `http://localhost:5106/api/master-catalog/${ep}`,
          headers: { Authorization: `Bearer ${token}` },
        }).its('status').should('eq', 200);
      });
    });
  });

  it('Manufacturer add + delete end-to-end', () => {
    cy.visit('/pharmacy-catalogs');
    cy.wait(500);
    cy.contains('button', 'Thêm mới').first().click();
    const code = `CYTEST_${Date.now().toString().slice(-6)}`;
    cy.get('.ant-modal-body input#code, .ant-modal-body input[id$="_code"]').first().type(code);
    cy.get('.ant-modal-body input#name, .ant-modal-body input[id$="_name"]').first().type('Cypress Test Mfr');
    cy.contains('.ant-modal-footer button', 'Lưu').click();
    cy.wait(800);
    cy.contains('Đã lưu').should('exist');
    cy.contains('td', code).parent('tr').find('button.ant-btn-dangerous').click();
    cy.get('.ant-popover-buttons .ant-btn-primary, .ant-popconfirm .ant-btn-primary')
      .last()
      .click({ force: true });
    cy.wait(500);
    cy.contains('Đã xóa').should('exist');
  });

  it('Inspection committee API accepts nested members', () => {
    const code = `IC_${Date.now().toString().slice(-6)}`;
    cy.window().then((win) => {
      const token = win.localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      cy.request({
        method: 'POST',
        url: 'http://localhost:5106/api/master-catalog/inspection-committees',
        headers,
        body: {
          code, name: 'HĐ Cypress Test', isActive: true,
          members: [
            { fullName: 'Cypress Member 1', title: 'BS', role: 'Chủ tịch', sortOrder: 1 },
            { fullName: 'Cypress Member 2', title: 'DS', role: 'Ủy viên', sortOrder: 2 },
          ],
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const id = res.body.id;
        cy.request({
          url: 'http://localhost:5106/api/master-catalog/inspection-committees',
          headers,
        }).then((listRes) => {
          const found = (listRes.body as Array<{ id: string; members: Array<unknown> }>)
            .find((r) => r.id === id);
          expect(found?.members.length).to.eq(2);
          cy.request({
            method: 'DELETE',
            url: `http://localhost:5106/api/master-catalog/inspection-committees/${id}`,
            headers,
          });
        });
      });
    });
  });
});
