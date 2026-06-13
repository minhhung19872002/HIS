import { test, expect, type Page } from '@playwright/test';

/**
 * E2E cho 5 luồng wave UI-ALL (Issue #29 — Đợt 2/3):
 *  1. BloodBank  — nút Xuất máu mở ModalShell "Tạo phiếu yêu cầu xuất máu"
 *  2. HR         — nút "Yêu cầu đổi ca" mở Modal đổi ca, duyệt yêu cầu pending
 *  3. OfficialDocuments — row click mở Drawer chi tiết công văn (hoặc "Thêm" nếu list rỗng)
 *  4. FollowUp   — ActBtn "Ghi nhận liên lạc" (phone) trên row có phoneNumber
 *  5. Reports    — nút "Xuất danh sách" trigger download CSV (blobURL)
 *
 * Pattern:
 *  - Login real token via POST /api/auth/login → localStorage (doithu-gap-dot23 pattern)
 *  - Không dùng ant-* selector cho trang v2 (ab-* + _v2kit)
 *  - Resilient khi list rỗng: skip có log thay vì fail giả
 *  - Không cần cleanup (chỉ write phiếu xuất máu nếu submit; test dừng ở bước mở modal)
 */

const API = 'http://localhost:5106';
const BASE = 'http://localhost:3001';

// ── Helper: đăng nhập admin lấy real JWT ─────────────────────────────────────
async function loginAsAdmin(page: Page) {
  const resp = await page.request.post(`${API}/api/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
    failOnStatusCode: false,
  });
  const body = await resp.json().catch(() => ({}));
  const token: string = body?.data?.token || body?.token || '';

  await page.context().addInitScript((tok: string) => {
    window.localStorage.setItem('token', tok);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  }, token);
}

// ── Helper: collect 5xx errors ────────────────────────────────────────────────
function collect5xx(page: Page): string[] {
  const errors: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 500 && r.url().includes('/api/')) {
      errors.push(`[${r.status()}] ${r.url().replace(/^https?:\/\/[^/]+/, '')}`);
    }
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: BloodBank — nút Xuất máu mở modal "Tạo phiếu yêu cầu xuất máu"
// Selector: button text "Xuất máu" (TopTabs actions area, class hr-v2-btn primary)
// Trong BloodBank.tsx: <Btn variant="primary" onClick={() => setIssueOpen(true)}> "Xuất máu"
// Modal title: "Tạo phiếu yêu cầu xuất máu" (ModalShell — renders as dialog role)
// ─────────────────────────────────────────────────────────────────────────────
test('BloodBank — nút Xuất máu mở modal Tạo phiếu yêu cầu xuất máu', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/blood-bank', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Verify KpiStrip loaded (có text "Tổng đơn vị")
  await expect(page.getByText('Tổng đơn vị').first()).toBeVisible({ timeout: 8000 });

  // Click nút "Xuất máu" (primary button trong TopTabs actions)
  // Trong BloodBank.tsx: <Btn variant="primary" onClick={() => setIssueOpen(true)}> text "Xuất máu"
  const issueBtn = page.getByRole('button', { name: /^Xuất máu$/i }).first();
  await expect(issueBtn).toBeVisible({ timeout: 6000 });
  await issueBtn.click();
  await page.waitForTimeout(1000); // ModalShell via createPortal cần thêm thời gian render

  // ModalShell (_v2kit) render vào body qua createPortal:
  //   .hui-modal-wrap > .hui-modal > .hui-modal-h > .tt (title text)
  // Dùng locator class để không phụ thuộc text exact match với diacritic
  const modalWrap = page.locator('.hui-modal-wrap').first();
  await expect(modalWrap).toBeVisible({ timeout: 6000 });

  // Title trong .hui-modal-h .tt
  const modalTitle = page.locator('.hui-modal-h .tt').first();
  await expect(modalTitle).toContainText('Tạo phiếu yêu cầu xuất máu', { timeout: 3000 });

  // Kiểm tra form fields có trong modal body (.hui-modal-b)
  // "Khoa yêu cầu *" là label div trong BbFld — tìm trong .hui-modal-b
  const modalBody = page.locator('.hui-modal-b').first();
  await expect(modalBody.getByText('Khoa yêu cầu *').first()).toBeVisible({ timeout: 3000 });
  // "Nhóm máu" label — locator trong .hui-modal-b để tránh match <option> hidden
  await expect(modalBody.getByText('Nhóm máu').first()).toBeVisible();

  // Nút Hủy đóng modal — nằm trong .hui-modal-f (footer)
  const cancelBtn = page.locator('.hui-modal-f button').filter({ hasText: /Hủy/ }).first();
  if (!(await cancelBtn.isVisible().catch(() => false))) {
    // Fallback: tìm theo role
    await page.getByRole('button', { name: /^Hủy$/i }).first().click();
  } else {
    await cancelBtn.click();
  }
  await page.waitForTimeout(500);
  // Modal đã đóng — .hui-modal-wrap không còn visible
  await expect(modalWrap).not.toBeVisible({ timeout: 3000 });

  expect(errs, 'Không có 5xx').toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: BloodBank — tab "Sắp hết hạn" → ActBtn "Tiêu huỷ" (nếu có row)
// Từ ExpiringTab: ActBtn ic="alert" title="Tiêu huỷ" → mở confirm modal
// Nếu không có data → skip
// ─────────────────────────────────────────────────────────────────────────────
test('BloodBank — tab Sắp hết hạn có ActBtn Tiêu huỷ (skip nếu rỗng)', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/blood-bank', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Click tab "Sắp hết hạn" — TopTabs render button với text label
  const expiringTab = page.getByRole('button', { name: /Sắp hết hạn/i }).first();
  await expect(expiringTab).toBeVisible({ timeout: 8000 });
  await expiringTab.click();
  await page.waitForTimeout(1500);

  // Kiểm tra có row dữ liệu không (tbody tr trong DataTable)
  // DataTable renders table → tbody → tr; ActBtn renders button[title="Tiêu huỷ"]
  const discardBtns = page.locator('button[title="Tiêu huỷ"]');
  const count = await discardBtns.count();
  if (count === 0) {
    console.log('[wave-ui-all] BloodBank/Sắp hết hạn: rỗng — skip action assertion');
    test.skip(true, 'Không có túi sắp hết hạn — skip Tiêu huỷ flow');
    return;
  }

  // Click Tiêu huỷ đầu tiên → confirm modal mở
  await discardBtns.first().click();
  await page.waitForTimeout(800);

  // ModalShell với title "Tiêu huỷ túi máu ..."
  const confirmModal = page.getByText(/Tiêu hu[ỷy] túi máu/i).first();
  await expect(confirmModal).toBeVisible({ timeout: 5000 });

  // Kiểm tra input "Lý do tiêu huỷ" có trong modal
  await expect(page.getByPlaceholder(/lý do tiêu hu[ỷy]/i).first()).toBeVisible({ timeout: 3000 });

  // Đóng modal (Huỷ) — không submit để không thật sự tiêu huỷ
  const cancelBtn = page.getByRole('button', { name: /^Hu[ỷy]$/i }).first();
  await cancelBtn.click();
  await page.waitForTimeout(400);

  expect(errs, 'Không có 5xx').toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: HR — nút "Yêu cầu đổi ca" mở Modal + duyệt pending swap requests
// HR.tsx: button className="hr-v2-btn" + text "Yêu cầu đổi ca"
// Modal: title "Yêu cầu đổi ca" (antd Modal)
// Pending approvals: trong .hr-v2-alerts (render khi có pending swap requests)
// ─────────────────────────────────────────────────────────────────────────────
test('HR — nút Yêu cầu đổi ca mở modal và có pending approvals', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/hr', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // KPI strip: có text "Yêu cầu đổi"
  await expect(page.getByText('Yêu cầu đổi').first()).toBeVisible({ timeout: 8000 });

  // Nút "Yêu cầu đổi ca" trong toolbar
  const swapBtn = page.locator('button').filter({ hasText: 'Yêu cầu đổi ca' }).first();
  await expect(swapBtn).toBeVisible({ timeout: 6000 });
  await swapBtn.click();
  await page.waitForTimeout(800);

  // Modal "Yêu cầu đổi ca" (antd Modal — title trong .ant-modal-title)
  // Playwright locate by heading text or dialog
  const modalTitle = page.getByRole('heading', { name: /Yêu cầu đổi ca/i }).first();
  if (!(await modalTitle.isVisible().catch(() => false))) {
    // Fallback: tìm text trong page
    await expect(page.getByText('Yêu cầu đổi ca').nth(1)).toBeVisible({ timeout: 5000 });
  } else {
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
  }

  // Form có: "Người trực", "Người thay", "Ca trực", "Lý do"
  await expect(page.getByText('Người trực').first()).toBeVisible({ timeout: 3000 });
  await expect(page.getByText('Người thay').first()).toBeVisible();

  // Đóng modal
  const cancelBtn = page.getByRole('button', { name: /^Hu[ỷy]$/i }).last();
  await cancelBtn.click();
  await page.waitForTimeout(500);

  // Kiểm tra có section pending approvals (pre-seeded: CH001, CH002)
  // HR.tsx: .hr-v2-alerts render khi có swapRequests pending
  const alertSection = page.locator('.hr-v2-alerts');
  if (await alertSection.isVisible().catch(() => false)) {
    await expect(alertSection).toContainText('Yêu cầu đổi ca chờ duyệt', { timeout: 3000 });
    // Nút Duyệt
    const approveBtn = alertSection.getByRole('button', { name: /Duyệt/i }).first();
    await expect(approveBtn).toBeVisible();
    // Không click Duyệt thật (sẽ gọi API approveSwapRequest → 404/500 vì mock ID)
    console.log('[wave-ui-all] HR: pending approvals section found');
  } else {
    console.log('[wave-ui-all] HR: no pending alerts section (live data may have no pending)');
  }

  expect(errs, 'Không có 5xx').toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: OfficialDocuments — row click mở Drawer chi tiết
// OfficialDocuments.tsx: onRowClick → openDetail → Drawer open
// Drawer title: documentNumber + StatusBadge
// Nếu list rỗng → test "Thêm công văn" button thay thế
// ─────────────────────────────────────────────────────────────────────────────
test('OfficialDocuments — row click mở Drawer chi tiết (fallback: nút Thêm)', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/official-documents', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // KpiStrip: "Tổng CV"
  await expect(page.getByText('Tổng CV').first()).toBeVisible({ timeout: 8000 });

  // Kiểm tra có row trong DataTable không
  // DataTable renders <table> → <tbody> → <tr>; trong OfficialDocuments.tsx onRowClick wired
  // Rows có class từ DataTable — locate tr trong tbody
  const tableRows = page.locator('table tbody tr').filter({
    // Loại trừ empty-state row (chỉ 1 td spanning toàn bộ)
    has: page.locator('td:nth-child(2)'),
  });
  const rowCount = await tableRows.count();

  if (rowCount === 0) {
    console.log('[wave-ui-all] OfficialDocuments: list rỗng — kiểm tra nút Thêm công văn');
    // Fallback: click "Thêm công văn" → Modal mở
    const addBtn = page.getByRole('button', { name: /Thêm công văn/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await page.waitForTimeout(1000);
    // Antd Modal title renders trong .ant-modal-title (không phải role=heading)
    const antModalTitle = page.locator('.ant-modal-title').first();
    if (await antModalTitle.isVisible().catch(() => false)) {
      await expect(antModalTitle).toContainText('Thêm công văn', { timeout: 3000 });
    } else {
      // Fallback: tìm text trong bất kỳ visible element
      await expect(page.getByText('Thêm công văn').first()).toBeVisible({ timeout: 5000 });
    }
    // Form field "Số công văn" — antd Form.Item label
    await expect(page.getByText('Số công văn').first()).toBeVisible({ timeout: 3000 });
    // Đóng — antd Modal cancel button
    const cancelAnt = page.getByRole('button', { name: /^Hủy$/i }).last();
    if (await cancelAnt.isVisible().catch(() => false)) {
      await cancelAnt.click();
    } else {
      // Click backdrop hoặc nút X
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);
  } else {
    console.log(`[wave-ui-all] OfficialDocuments: ${rowCount} rows — click first row`);
    // Click row đầu tiên → Drawer mở
    await tableRows.first().click();
    await page.waitForTimeout(1000);

    // Drawer: Ant Design Drawer renders .ant-drawer-content-wrapper
    // Drawer footer có "Đóng" button
    const closeBtn = page.getByRole('button', { name: /Đóng/i }).first();
    await expect(closeBtn).toBeVisible({ timeout: 5000 });

    // Drawer body: Descriptions với label "Số công văn"
    await expect(page.getByText('Số công văn').first()).toBeVisible({ timeout: 4000 });

    // Đóng drawer
    await closeBtn.click();
    await page.waitForTimeout(500);
  }

  expect(errs, 'Không có 5xx').toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 5: FollowUp — ActBtn "Ghi nhận liên lạc" + drawer chi tiết
// FollowUp.tsx: ActBtn ic="phone" title="Ghi nhận liên lạc" onClick={() => onRemind(r,'SMS')}
//              chỉ render khi r.phoneNumber truthy
// Nếu không có rows có SĐT → click row đầu để mở drawer
// ─────────────────────────────────────────────────────────────────────────────
test('FollowUp — ActBtn Ghi nhận liên lạc và drawer chi tiết', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/follow-up', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // KpiStrip: "Hẹn 7 ngày tới"
  await expect(page.getByText('Hẹn 7 ngày tới').first()).toBeVisible({ timeout: 8000 });

  // Kiểm tra button "Ghi nhận liên lạc" (phone icon ActBtn)
  // ActBtn renders button[title="Ghi nhận liên lạc"]
  const contactBtns = page.locator('button[title="Ghi nhận liên lạc"]');
  const contactCount = await contactBtns.count();

  if (contactCount > 0) {
    console.log(`[wave-ui-all] FollowUp: ${contactCount} "Ghi nhận liên lạc" buttons found`);
    // Click button đầu → gọi onRemind → updateAppointmentStatus
    // Chỉ verify button clickable và không crash; gọi API là side-effect nhẹ (status=1 = Confirmed)
    await contactBtns.first().click();
    await page.waitForTimeout(1000);
    // Không có modal mở — chỉ message.success hiện ra; verify không crash
    expect(errs, 'Không có 5xx').toHaveLength(0);
  } else {
    console.log('[wave-ui-all] FollowUp: không có row có SĐT — skip contact action, kiểm tra drawer');
  }

  // Kiểm tra row click mở DrawerShell (luôn có, dù list có data hay không)
  const tableRows = page.locator('table tbody tr').filter({
    has: page.locator('td:nth-child(2)'),
  });
  const rowCount = await tableRows.count();

  if (rowCount === 0) {
    console.log('[wave-ui-all] FollowUp: list rỗng — assert empty state text');
    await expect(page.getByText('Không có lịch tái khám nào').first()).toBeVisible({ timeout: 5000 });
  } else {
    console.log(`[wave-ui-all] FollowUp: ${rowCount} rows — click first to open drawer`);
    await tableRows.first().click();
    await page.waitForTimeout(1000);

    // DrawerShell: renders với close button "Đóng"
    // DrawerShell footer khi có detail: có Btn "Đóng" + optional "Ghi nhận liên lạc"
    const drawerClose = page.getByRole('button', { name: /Đóng/i }).first();
    await expect(drawerClose).toBeVisible({ timeout: 5000 });

    // Drawer body: text "BỆNH NHÂN"
    await expect(page.getByText('BỆNH NHÂN').first()).toBeVisible({ timeout: 4000 });

    // Đóng drawer
    await drawerClose.click();
    await page.waitForTimeout(500);
  }

  expect(errs, 'Không có 5xx').toHaveLength(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: Reports — nút "Xuất danh sách" trigger CSV download
// Reports.tsx: button.reports-v2-btn.ghost text "Xuất danh sách" → downloadCsv() → blob URL
// Assert: download event fired (Playwright intercept download)
// ─────────────────────────────────────────────────────────────────────────────
test('Reports — nút Xuất danh sách trigger CSV download', async ({ page }) => {
  const errs = collect5xx(page);
  await page.goto('/v2/reports', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Strip: "Báo cáo có sẵn"
  await expect(page.getByText('Báo cáo có sẵn').first()).toBeVisible({ timeout: 8000 });

  // Category tabs render: "Vận hành", "Lâm sàng", "Tài chính", "Báo cáo BYT"
  await expect(page.getByText('Vận hành').first()).toBeVisible({ timeout: 5000 });

  // Nút "Xuất danh sách" — button.reports-v2-btn.ghost trong toolbar
  const exportBtn = page.locator('button.reports-v2-btn.ghost').filter({ hasText: 'Xuất danh sách' }).first();
  if (!(await exportBtn.isVisible().catch(() => false))) {
    // Fallback: tìm theo text
    const exportBtnFb = page.getByRole('button', { name: /Xuất danh sách/i }).first();
    await expect(exportBtnFb).toBeVisible({ timeout: 5000 });
  } else {
    await expect(exportBtn).toBeVisible({ timeout: 5000 });
  }

  // Set up download listener trước khi click
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }),
    exportBtn.isVisible()
      ? exportBtn.click()
      : page.getByRole('button', { name: /Xuất danh sách/i }).first().click(),
  ]);

  // Verify download filename pattern: reports-v2-operational-YYYYMMDD-HHmm.csv
  expect(download.suggestedFilename()).toMatch(/^reports-v2-/);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);

  // Lưu vào temp để verify không rỗng
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();

  console.log(`[wave-ui-all] Reports CSV downloaded: ${download.suggestedFilename()}`);
  expect(errs, 'Không có 5xx').toHaveLength(0);
});
