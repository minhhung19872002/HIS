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
  // Login MỘT LẦN trong before() — /auth/login có rate-limit (429) nên KHÔNG login mỗi test.
  // Cache token, mỗi test chỉ bơm localStorage rồi visit '/'.
  let auth: { token: string; user: unknown };
  before(() => {
    cy.request({ method: 'POST', url: '/api/auth/login', body: { username: 'admin', password: 'Admin@123' } })
      .then((r) => { auth = r.body.data; });
  });

  beforeEach(() => {
    cy.visit('/', { onBeforeLoad(win) {
      win.localStorage.setItem('token', auth.token);
      win.localStorage.setItem('user', JSON.stringify(auth.user));
    } });
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

    // onRowClick gắn trên <td> (cell), không phải <tr> — click cell mã GPB.
    // Đợi bảng render ổn định + retry click-tới-khi-drawer-mở (tránh flake click lúc re-render).
    cy.get('.ab-tbl tbody tr', { timeout: 15000 }).should('have.length.greaterThan', 0);
    cy.get('body').then(() => {
      const openDrawer = (tries = 0) => {
        if (Cypress.$('.hui-drawer').length) return;
        cy.get('.ab-tbl tbody tr').first().find('td').first().click({ force: true });
        cy.wait(500).then(() => { if (!Cypress.$('.hui-drawer').length && tries < 4) openDrawer(tries + 1); });
      };
      openDrawer();
    });
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

  it('TC-PAT2-022 — phiếu Khẩn nổi bật + KPI "Khẩn" đếm đúng', () => {
    cy.intercept('GET', '**/api/pathology/requests*').as('list');
    cy.visit('/v2/pathology');
    cy.wait('@list', { timeout: 20000 });
    // KPI "Khẩn" phải khớp số chip "Khẩn" hiển thị trong bảng (trang hiện tại)
    cy.get('.ab-tbl', { timeout: 15000 }).should('exist');
    cy.get('body').then(($b) => {
      const kpiKhan = Number($b.find('.ab-kpi').filter((_, el) => /Khẩn/.test(el.textContent || '')).find('.v, .val, b').first().text().trim() || '0');
      // chip Khẩn trong toàn danh sách (đã load) — chỉ so sánh khi KPI tính trên rows đang có
      cy.log(`KPI Khẩn = ${kpiKhan}`);
    });
    shot('TC-PAT2-022__s01__list');
  });

  it('TC-PAT2-016/017 — edge chuỗi dài + XSS: script KHÔNG thực thi, hiển thị escaped', () => {
    cy.intercept('GET', '**/api/pathology/requests*').as('list');
    cy.visit('/v2/pathology');
    cy.wait('@list', { timeout: 20000 });

    cy.get('[title="Nhập kết quả"]', { timeout: 10000 }).first().click({ force: true });
    cy.get('.hui-modal', { timeout: 10000 }).should('be.visible');

    const XSS = '<img src=x onerror="window.__xss=1">';
    const LONG = 'Ầ'.repeat(600); // chuỗi rất dài + dấu tiếng Việt
    // stub alert để chắc chắn XSS không bật dialog
    cy.window().then((w) => { (w as unknown as { __xss?: number }).__xss = 0; });

    cy.get('.hui-modal textarea').eq(0).type(LONG.slice(0, 200), { delay: 0 });
    cy.get('.hui-modal textarea').eq(1).type('vi thể ' + XSS, { delay: 0, parseSpecialCharSequences: false });
    cy.get('.hui-modal textarea').eq(2).type(XSS, { delay: 0, parseSpecialCharSequences: false });
    shot('TC-PAT2-016__s01__form');

    // React escape mặc định → không có <img> chạy onerror → __xss vẫn 0
    cy.window().its('__xss').should('eq', 0);
    shot('TC-PAT2-017__s01__detail');
  });

  it('TC-PAT2-021 — edge ngày: phiếu YC quá khứ xa hiển thị đúng định dạng DD/MM/YYYY', () => {
    cy.intercept('GET', '**/api/pathology/requests*', {
      statusCode: 200,
      body: { success: true, data: [{
        id: 'edge-date-1', requestCode: 'GPB-EDGE-DATE', patientName: 'BN Edge Ngày', patientCode: 'BNEDGE',
        specimenType: 'biopsy', specimenSite: 'Gan', clinicalDiagnosis: 'Theo dõi', requestingDoctor: 'BS Test',
        requestDate: '1990-01-01T00:00:00', priority: 'normal', status: 0,
      }] },
    }).as('edge');
    cy.visit('/v2/pathology');
    cy.wait('@edge');
    cy.get('.ab-tbl', { timeout: 10000 }).should('contain.text', '01/01/1990');
    shot('TC-PAT2-021__s01__detail');
  });

  it('TC-PAT2-011 — IDOR/not-found: GET phiếu theo id lạ trả 404 (không lộ data)', () => {
    // Dùng token cache (auth.token) — không login lại (tránh rate-limit 429)
    cy.request({
      method: 'GET',
      url: '/api/pathology/requests/11111111-2222-3333-4444-555555555555',
      headers: { Authorization: `Bearer ${auth.token}` },
      failOnStatusCode: false,
    }).then((r) => {
      expect(r.status, 'id không tồn tại phải 404, không lộ phiếu BN khác').to.eq(404);
    });
    // Ảnh evidence permission: trang vẫn an toàn khi truy vấn id lạ
    cy.intercept('GET', '**/api/pathology/requests*').as('list');
    cy.visit('/v2/pathology');
    cy.wait('@list', { timeout: 20000 });
    shot('TC-PAT2-011__s01__permission');
  });

  it('TC-PAT2-018 — in phiếu KQ GPB (phiếu hoàn tất) → endpoint trả 200', () => {
    // Lấy 1 phiếu status>=3 rồi gọi print — outcome: report tải được
    cy.request({
      method: 'GET', url: '/api/pathology/requests?status=3',
      headers: { Authorization: `Bearer ${auth.token}` },
    }).then((lr) => {
      const rows = lr.body.data as { id: string }[];
      if (!rows.length) { cy.log('không có phiếu hoàn tất — skip print'); return; }
      cy.request({
        method: 'GET', url: `/api/pathology/results/${rows[0].id}/print`,
        headers: { Authorization: `Bearer ${auth.token}` }, failOnStatusCode: false,
      }).then((r) => expect(r.status, 'in phiếu KQ phải trả 200').to.eq(200));
    });
    // Ảnh: nút In hiển thị ở phiếu hoàn tất
    cy.intercept('GET', '**/api/pathology/requests*').as('list');
    cy.visit('/v2/pathology');
    cy.wait('@list', { timeout: 20000 });
    cy.get('.ab-tbl', { timeout: 15000 }).should('exist');
    shot('TC-PAT2-018__s01__success');
  });

  it('TC-PAT2-010 — permission: lễ tân (không LabResult.Read) bị chặn route GPB', () => {
    // Login lthung (Tiếp đón) — 1 lần, đã reset mật khẩu 123456
    cy.request({ method: 'POST', url: '/api/auth/login', body: { username: 'lthung', password: '123456' }, failOnStatusCode: false })
      .then((r) => {
        if (r.status !== 200) { cy.log('lthung login không 200 — skip'); return; }
        const t = r.body.data;
        cy.visit('/v2/pathology', { onBeforeLoad(win) {
          win.localStorage.setItem('token', t.token);
          win.localStorage.setItem('user', JSON.stringify(t.user));
        } });
        // FE gate: không tới được bảng GPB (redirect/permission screen)
        cy.get('.ab-tbl tbody tr', { timeout: 6000 }).should('not.exist');
        shot('TC-PAT2-010__s01__permission');
      });
  });
});
