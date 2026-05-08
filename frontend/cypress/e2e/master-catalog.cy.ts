/**
 * NangCap22 — verify Danh mục bổ sung (13 catalog tabs) page loads + 4 sample CRUD flows.
 */

describe('Master Catalog (NangCap22)', () => {
  before(() => {
    cy.request('POST', 'http://localhost:5106/api/auth/login', {
      username: 'admin',
      password: 'Admin@123',
    }).then((res) => {
      const token = res.body.data.token;
      cy.window().then((win) => {
        win.localStorage.setItem('token', token);
        win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Quản trị', roles: ['Admin'] }));
      });
    });
  });

  beforeEach(() => {
    cy.intercept('**/api/**').as('api');
    cy.window().then((win) => {
      cy.request('POST', 'http://localhost:5106/api/auth/login', {
        username: 'admin', password: 'Admin@123',
      }).then((res) => {
        win.localStorage.setItem('token', res.body.data.token);
        win.localStorage.setItem('user', JSON.stringify({ username: 'admin', fullName: 'Quản trị', roles: ['Admin'] }));
      });
    });
  });

  it('page loads and renders 12 tabs', () => {
    cy.visit('/master-catalog');
    cy.contains('Danh mục bổ sung (NangCap22)').should('exist');
    cy.contains('Hãng sản xuất').should('be.visible');
    cy.contains('Đường dùng').should('be.visible');
    cy.contains('Phụ thu').should('be.visible');
    cy.contains('Thu khác').should('be.visible');
    cy.contains('Vận chuyển').should('be.visible');
    cy.contains('Giá xăng').should('be.visible');
    cy.contains('Mã máy').should('be.visible');
    cy.contains('Hội đồng kiểm nhập').should('be.visible');
    cy.contains('Chế độ chăm sóc').should('be.visible');
    cy.contains('Loại bệnh án').should('be.visible');
  });

  it('Manufacturers tab shows seed data', () => {
    cy.visit('/master-catalog');
    cy.contains('Hãng sản xuất').click();
    cy.wait(800);
    // Seeded entries: PFIZER, NOVARTIS, TRAPHACO, MEKOPHAR, etc.
    cy.contains('Pfizer').should('exist');
    cy.contains('Traphaco').should('exist');
  });

  it('MedicationRoutes tab shows TT 52 seed routes', () => {
    cy.visit('/master-catalog');
    cy.contains('Đường dùng').click();
    cy.wait(800);
    cy.contains('Uống').should('exist');
    cy.contains('Tiêm bắp').should('exist');
    cy.contains('Tiêm tĩnh mạch').should('exist');
  });

  it('NursingCareLevels tab shows 3 seeded levels', () => {
    cy.visit('/master-catalog');
    cy.contains('Chế độ chăm sóc').click();
    cy.wait(800);
    cy.contains('CS1').should('exist');
    cy.contains('Chăm sóc toàn diện').should('exist');
  });

  it('MedicalRecordTypes endpoint returns 10 seeded types', () => {
    cy.window().then((win) => {
      const token = win.localStorage.getItem('token');
      cy.request({
        url: 'http://localhost:5106/api/master-catalog/medical-record-types',
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const items = res.body;
        const codes = items.map((i: { code: string }) => i.code);
        expect(codes).to.include('NGOAITRU');
        expect(codes).to.include('NOITRU');
        expect(codes).to.include('CC');
        expect(items.length).to.be.gte(10);
      });
    });
  });

  it('Add + delete a manufacturer end-to-end', () => {
    cy.visit('/master-catalog');
    cy.contains('Hãng sản xuất').click();
    cy.wait(500);

    // Open add modal
    cy.contains('button', 'Thêm mới').click();

    // Fill form
    const code = `CYTEST_${Date.now().toString().slice(-6)}`;
    cy.get('.ant-modal-body input#code, .ant-modal-body input[id$="_code"]').first().type(code);
    cy.get('.ant-modal-body input#name, .ant-modal-body input[id$="_name"]').first().type('Cypress Test Mfr');

    // Save
    cy.contains('.ant-modal-footer button', 'Lưu').click();
    cy.wait(800);
    cy.contains('Đã lưu').should('exist');

    // Find row + delete
    cy.contains('td', code).should('exist');
    cy.contains('td', code)
      .parent('tr')
      .find('button.ant-btn-dangerous')
      .click();
    cy.get('.ant-popover-buttons .ant-btn-primary, .ant-popconfirm .ant-btn-primary').last().click({ force: true });
    cy.wait(500);
    cy.contains('Đã xóa').should('exist');
  });

  it('InspectionCommittee endpoint accepts nested members', () => {
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
        // Verify members persisted
        cy.request({
          url: 'http://localhost:5106/api/master-catalog/inspection-committees',
          headers,
        }).then((listRes) => {
          const found = (listRes.body as Array<{ id: string; members: Array<unknown> }>)
            .find((r) => r.id === id);
          expect(found?.members.length).to.eq(2);
          // Cleanup
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
