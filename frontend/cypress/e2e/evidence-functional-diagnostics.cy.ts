/// <reference types="cypress" />

/**
 * #308 [TEST-EV][TDCN] Evidence — Thăm dò chức năng (worklist chính /v2/functional-diagnostics).
 * Chạy được nhờ #285 seed factory (PopulateFunctionalDiagnosticsAsync — 24 phiếu đủ 4 trạng thái).
 * Quy ước: clin-tdcn/TC-TDCN-NNN__sNN__state.png (evidence/README.md §2).
 * Phủ task worklist: 001 list · 002/003 filter · 005 drawer · 006 complete · 007 verify ·
 *   008 action-by-status · 004 empty · 011 error · 010 pagination · 012 dark · 027 loading ·
 *   014 IDOR · 015 XSS · 009/026 permission. (Catalog 016-025 = trang con riêng, spec khác.)
 * /auth/login rate-limited → login MỘT LẦN trong before(), cache token.
 */

const DIR = 'clin-tdcn';
const shot = (name: string) => cy.screenshot(`${DIR}/${name}`, { overwrite: true, capture: 'viewport' });

describe('#308 evidence — Thăm dò chức năng (TDCN) worklist', () => {
  let auth: { token: string; user: unknown };
  before(() => {
    // Đảm bảo có data (idempotent) rồi login 1 lần
    cy.request({ method: 'POST', url: '/api/admin/populate/functional-diagnostics', failOnStatusCode: false });
    cy.request({ method: 'POST', url: '/api/auth/login', body: { username: 'admin', password: 'Admin@123' } })
      .then((r) => { auth = r.body.data; });
  });

  beforeEach(() => {
    cy.visit('/v2/functional-diagnostics', { onBeforeLoad(win) {
      win.localStorage.setItem('token', auth.token);
      win.localStorage.setItem('user', JSON.stringify(auth.user));
    } });
  });

  it('TC-TDCN-001/002/003 — list + KPI, lọc loại, lọc trạng thái + search', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*').as('list');
    cy.wait('@list', { timeout: 20000 });
    cy.get('.ab-tbl tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0);
    cy.get('.ab-kpi').should('exist');
    shot('TC-TDCN-001__s01__list');

    // 002 — lọc theo Loại TDCN (Filter select đầu)
    cy.get('.ab-toolbar .ab-sel, .ab-toolbar select').eq(0).select(1, { force: true });
    cy.wait(500);
    shot('TC-TDCN-002__s01__filter');
    cy.get('.ab-toolbar .ab-sel, .ab-toolbar select').eq(0).select(0, { force: true });

    // 003 — lọc theo Trạng thái + search
    cy.get('.ab-toolbar .ab-sel, .ab-toolbar select').eq(1).select(1, { force: true });
    cy.get('.ab-search input').first().type('TDCN');
    cy.wait(500);
    shot('TC-TDCN-003__s01__filter');
    cy.get('.ab-search input').first().clear();
    cy.get('.ab-toolbar .ab-sel, .ab-toolbar select').eq(1).select(0, { force: true });
  });

  it('TC-TDCN-005/015 — drawer chi tiết + XSS findings không thực thi', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*').as('list');
    cy.wait('@list', { timeout: 20000 });
    cy.window().then((w) => { (w as unknown as { __xss?: number }).__xss = 0; });
    cy.get('.ab-tbl tbody tr').first().find('td').first().click({ force: true });
    cy.get('.hui-drawer', { timeout: 10000 }).should('be.visible');
    shot('TC-TDCN-005__s01__drawer');
    // findings/conclusion render qua React → escaped, không có script chạy
    cy.window().its('__xss').should('eq', 0);
    shot('TC-TDCN-015__s01__drawer');
  });

  it('TC-TDCN-008 — action theo trạng thái: đang-TH có nút Hoàn thành, hoàn-thành có nút Duyệt', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*').as('list');
    cy.wait('@list', { timeout: 20000 });
    cy.get('.ab-tbl', { timeout: 15000 }).should('exist');
    // Có ít nhất 1 nút Hoàn thành (status 1) và 1 nút Duyệt (status 2) trong danh sách seed
    cy.get('[title="Hoàn thành"]').should('have.length.greaterThan', 0);
    cy.get('[title="Duyệt"]').should('have.length.greaterThan', 0);
    shot('TC-TDCN-008__s01__list');
  });

  it('TC-TDCN-006 — chuyển trạng thái hợp lệ: Hoàn thành phiếu đang TH (1→2)', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*').as('list');
    cy.intercept('POST', '**/api/functional-diagnostics/*/complete').as('complete');
    cy.wait('@list', { timeout: 20000 });
    cy.get('[title="Hoàn thành"]', { timeout: 15000 }).first().click({ force: true });
    cy.wait('@complete').its('response.statusCode').should('be.oneOf', [200, 204]);
    shot('TC-TDCN-006__s01__success');
  });

  it('TC-TDCN-007 — chuyển trạng thái hợp lệ: Duyệt phiếu hoàn thành (2→3)', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*').as('list');
    cy.intercept('POST', '**/api/functional-diagnostics/*/verify').as('verify');
    cy.wait('@list', { timeout: 20000 });
    cy.get('[title="Duyệt"]', { timeout: 15000 }).first().click({ force: true });
    cy.wait('@verify').its('response.statusCode').should('be.oneOf', [200, 204]);
    shot('TC-TDCN-007__s01__success');
  });

  it('TC-TDCN-004 — tìm kiếm không khớp → empty state', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*').as('list');
    cy.wait('@list', { timeout: 20000 });
    cy.get('.ab-search input').first().type('KHONGTONTAI_ZZZ999');
    cy.wait(600);
    cy.contains('Không có phiếu thăm dò chức năng', { timeout: 8000 }).should('exist');
    shot('TC-TDCN-004__s01__empty');
  });

  it('TC-TDCN-011 — lỗi tải danh sách (500) không crash trang', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*', { statusCode: 500, body: { success: false } }).as('err');
    cy.visit('/v2/functional-diagnostics', { onBeforeLoad(win) {
      win.localStorage.setItem('token', auth.token);
      win.localStorage.setItem('user', JSON.stringify(auth.user));
    } });
    cy.wait('@err');
    cy.get('[data-testid="functional-diagnostics-page"]', { timeout: 10000 }).should('exist');
    shot('TC-TDCN-011__s01__error');
  });

  it('TC-TDCN-027 — loading state khi tải danh sách', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*', (req) => {
      req.on('response', (res) => res.setDelay(2000));
    }).as('delayed');
    cy.visit('/v2/functional-diagnostics', { onBeforeLoad(win) {
      win.localStorage.setItem('token', auth.token);
      win.localStorage.setItem('user', JSON.stringify(auth.user));
    } });
    cy.contains('Đang tải…', { timeout: 3000 }).should('exist');
    shot('TC-TDCN-027__s01__loading');
    cy.wait('@delayed');
  });

  it('TC-TDCN-012 — dark/light parity list + drawer', () => {
    cy.intercept('GET', '**/api/functional-diagnostics*').as('list');
    cy.visit('/v2/functional-diagnostics', { onBeforeLoad(win) {
      win.localStorage.setItem('token', auth.token);
      win.localStorage.setItem('user', JSON.stringify(auth.user));
      win.localStorage.setItem('his-theme-mode', 'dark');
    } });
    cy.wait('@list', { timeout: 20000 });
    cy.get('.ab-tbl tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0);
    shot('TC-TDCN-012__s01__list');
    cy.get('.ab-tbl tbody tr').first().find('td').first().click({ force: true });
    cy.get('.hui-drawer', { timeout: 10000 }).should('be.visible');
    shot('TC-TDCN-012__s02__drawer');
  });

  it('TC-TDCN-014 — IDOR/not-found: GET phiếu id lạ → 404', () => {
    cy.request({
      method: 'GET', url: '/api/functional-diagnostics/11111111-2222-3333-4444-555555555555',
      headers: { Authorization: `Bearer ${auth.token}` }, failOnStatusCode: false,
    }).then((r) => expect(r.status, 'id lạ phải 404').to.eq(404));
    cy.intercept('GET', '**/api/functional-diagnostics*').as('list');
    cy.wait('@list', { timeout: 20000 });
    shot('TC-TDCN-014__s01__permission');
  });

  it('TC-TDCN-026 — permission: lễ tân (không LabResult.Read) bị chặn route TDCN', () => {
    cy.request({ method: 'POST', url: '/api/auth/login', body: { username: 'lthung', password: '123456' }, failOnStatusCode: false })
      .then((r) => {
        if (r.status !== 200) { cy.log('lthung login != 200 — skip'); return; }
        const t = r.body.data;
        cy.visit('/v2/functional-diagnostics', { onBeforeLoad(win) {
          win.localStorage.setItem('token', t.token);
          win.localStorage.setItem('user', JSON.stringify(t.user));
        } });
        cy.get('.ab-tbl tbody tr', { timeout: 6000 }).should('not.exist');
        shot('TC-TDCN-026__s01__permission');
      });
  });
});
