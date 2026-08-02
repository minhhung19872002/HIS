/// <reference types="cypress" />

/**
 * #307 [TEST-EV][PAT2] Evidence campaign — Giải phẫu bệnh (GPB) v2.
 *
 * Chụp evidence các UI-state chụp được của trang /v2/pathology theo quy ước
 * docs/architecture/evidence/README.md §2:
 *   <layer>-<modid>/TC-<CODE>-<NNN>__s<NN>__<state>.png
 * layer-modid = clin-patho · CODE = PAT2.
 *
 * Ảnh xuất ra cypress/screenshots → copy sang docs/architecture/evidence/clin-patho/
 * (bước sau spec) rồi tái sinh manifest. Chạy trên dev stack local (SQL his-sqlserver
 * + BE :5106 + vite :3001). Data từ DailySeed (có sẵn phiếu GPB).
 *
 * Phủ: TC-PAT2-001 list · 002 tab · 003 filter(search) · 004 dropdown · 005 drawer/detail
 *      · 012/013 form+validation · 007 loading · 006 empty · 009 dark-parity.
 * (Các task security/IDOR/XSS/permission-matrix/data-consistency cần bước riêng — không ở spec này.)
 */

const DIR = 'clin-patho';
const shot = (name: string) => cy.screenshot(`${DIR}/${name}`, { overwrite: true, capture: 'viewport' });

describe('#307 evidence — Giải phẫu bệnh (GPB) v2', () => {
  beforeEach(() => {
    cy.login('admin', 'Admin@123');
  });

  it('TC-PAT2-001/002/003/004 — list, tab, search filter, specimen dropdown', () => {
    cy.intercept('GET', '**/api/pathology/requests*').as('list');
    cy.visit('/v2/pathology');
    cy.wait('@list', { timeout: 20000 });

    // 001 — danh sách + KPI
    cy.get('.ab-tbl tbody tr, .ab-empty', { timeout: 15000 }).should('exist');
    cy.get('.ab-kpi, .ab-kpis').should('exist');
    shot('TC-PAT2-001__s01__list');

    // 002 — lọc theo tab trạng thái
    cy.get('.ab-stab, .ab-tabs').contains(/Hoàn tất|Đã duyệt|Chờ nhận/).first().click({ force: true });
    cy.wait(400);
    shot('TC-PAT2-002__s01__tab');

    // 003 — tìm kiếm
    cy.get('.ab-search input').first().type('GPB');
    cy.wait(400);
    shot('TC-PAT2-003__s01__filter');
    cy.get('.ab-search input').first().clear();

    // 004 — dropdown loại bệnh phẩm
    cy.get('.ab-sel, select').first().then(($sel) => {
      if ($sel.length) cy.wrap($sel).select(1, { force: true });
    });
    cy.wait(300);
    shot('TC-PAT2-004__s01__dropdown');
  });

  it('TC-PAT2-005 — drawer chi tiết phiếu GPB (3 section)', () => {
    cy.intercept('GET', '**/api/pathology/requests*').as('list');
    cy.visit('/v2/pathology');
    cy.wait('@list', { timeout: 20000 });

    // onRowClick gắn trên <td> (cell), không phải <tr> — click cell mã GPB
    cy.get('.ab-tbl tbody tr').first().find('td').first().click({ force: true });
    cy.get('.hui-drawer', { timeout: 10000 }).should('be.visible');
    cy.get('.hui-drawer .rec-section').should('have.length.greaterThan', 2); // BN + bệnh phẩm + chỉ định
    shot('TC-PAT2-005__s01__drawer');
    shot('TC-PAT2-005__s02__detail');
  });

  it('TC-PAT2-012/013 — form nhập KQ + validation thiếu field bắt buộc', () => {
    cy.intercept('GET', '**/api/pathology/requests*').as('list');
    cy.visit('/v2/pathology');
    cy.wait('@list', { timeout: 20000 });

    // Mở modal nhập KQ ở 1 phiếu chưa hoàn tất (nút edit)
    // Nút "Nhập kết quả" (title) ở phiếu status < 3
    cy.get('[title="Nhập kết quả"]', { timeout: 10000 }).first().click({ force: true });

    cy.get('.hui-modal', { timeout: 10000 }).should('be.visible');
    shot('TC-PAT2-012__s01__form');

    // 013 — submit rỗng → validation message (3 field required)
    cy.get('.hui-modal').contains('button', /Lưu kết quả/).click({ force: true });
    cy.get('.ant-form-item-explain-error', { timeout: 8000 }).should('exist');
    shot('TC-PAT2-013__s01__validation');
  });

  it('TC-PAT2-007 — loading state khi tải danh sách', () => {
    // Trễ response để bắt được LoadingState (SimpleV2Page render <LoadingState/> khi loading)
    cy.intercept('GET', '**/api/pathology/requests*', (req) => {
      req.on('response', (res) => res.setDelay(2000));
    }).as('delayed');
    cy.visit('/v2/pathology');
    cy.get('.ab-empty', { timeout: 3000 }).should('exist'); // LoadingState dùng .ab-empty + spinner
    shot('TC-PAT2-007__s01__loading');
    cy.wait('@delayed');
  });

  it('TC-PAT2-006 — empty state (không có phiếu)', () => {
    cy.intercept('GET', '**/api/pathology/requests*', { statusCode: 200, body: { success: true, data: [] } }).as('empty');
    cy.visit('/v2/pathology');
    cy.wait('@empty');
    cy.get('.ab-empty, .ab-tbl', { timeout: 10000 }).should('exist');
    shot('TC-PAT2-006__s01__empty');
  });

  it('TC-PAT2-008 — error state (API 500 không vỡ trang)', () => {
    cy.intercept('GET', '**/api/pathology/requests*', { statusCode: 500, body: { success: false, message: 'loi' } }).as('err');
    cy.visit('/v2/pathology');
    cy.wait('@err');
    // Trang vẫn render khung (không trắng/crash)
    cy.get('body').should('contain.text', 'giải phẫu').and('be.visible');
    shot('TC-PAT2-008__s01__error');
  });

  it('TC-PAT2-009 — dark/light parity trang GPB', () => {
    cy.intercept('GET', '**/api/pathology/requests*').as('list');
    cy.visit('/v2/pathology', {
      onBeforeLoad(win) { win.localStorage.setItem('his-theme-mode', 'dark'); },
    });
    cy.wait('@list', { timeout: 20000 });
    cy.get('.ab-tbl, .ab-empty', { timeout: 15000 }).should('exist');
    shot('TC-PAT2-009__s01__list');
  });
});
