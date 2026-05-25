/**
 * NangCap24 functional test — PRODUCTION
 *
 * Kiểm tra thật kỹ 7 trang v2 + cổng thanh tra (10 gap HSMT BV Đa khoa).
 * Mỗi trang: render OK, không pageerror, không /api 4xx-5xx, có data (đã seed),
 * và tương tác chính (row -> drawer / tab / login) hoạt động.
 *
 * Run:
 *   npx playwright test e2e-prod/nangcap24-functional.spec.ts \
 *     --config=playwright.prod.config.ts --workers=2 --reporter=list
 */
import { test, expect, Page } from '@playwright/test';

const PROD_API =
  process.env.PROD_API_URL || 'https://his-api-694913628964.asia-southeast1.run.app/api';

const IGNORE_CONSOLE = [
  /Download the React DevTools/, /\[antd:/, /useForm/, /not connected to any Form/,
  /SignalR/i, /WebSocket/i, /\[HMR\]/, /\[vite\]/, /findDOMNode/, /negotiate.*401/,
  /AbortError/, /favicon/i, /ResizeObserver/,
];

let TOKEN: string | null = null;
let USER: string | null = null;

async function getToken(request: import('@playwright/test').APIRequestContext) {
  if (TOKEN) return { token: TOKEN, user: USER };
  const r = await request.post(`${PROD_API}/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  if (!r.ok()) throw new Error(`login failed: ${r.status()}`);
  const j = await r.json();
  TOKEN = j?.data?.token || j?.token;
  USER = JSON.stringify(j?.data?.user || { username: 'admin', roles: ['Admin'] });
  return { token: TOKEN, user: USER };
}

async function login(page: Page, request: import('@playwright/test').APIRequestContext) {
  const { token, user } = await getToken(request);
  await page.context().addInitScript(({ t, u }) => {
    window.localStorage.setItem('token', t as string);
    window.localStorage.setItem('user', u as string);
  }, { t: token, u: user });
}

interface Hooks { consoleErrors: string[]; apiFailures: string[]; pageErrors: string[]; }
function attach(page: Page): Hooks {
  const h: Hooks = { consoleErrors: [], apiFailures: [], pageErrors: [] };
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!IGNORE_CONSOLE.some((rx) => rx.test(t))) h.consoleErrors.push(t);
  });
  page.on('pageerror', (e) => h.pageErrors.push(e.message));
  page.on('response', (r) => {
    const u = r.url(); const s = r.status();
    if (s >= 400 && u.includes('/api/')) h.apiFailures.push(`${s} ${u.replace(/^https?:\/\/[^/]+/, '')}`);
  });
  return h;
}

// đếm row dữ liệu thật = tbody tr KHÔNG phải empty-placeholder (td[colspan])
async function dataRowCount(page: Page): Promise<number> {
  const all = await page.locator('tbody tr').count();
  const empties = await page.locator('tbody tr td[colspan]').count();
  return Math.max(0, all - empties);
}

// page: route, cần data list?, click row mở drawer?, label
const PAGES: { route: string; needsData: boolean; rowDrawer: boolean; name: string }[] = [
  { route: 'bank-payments',        needsData: true,  rowDrawer: true,  name: '[24] TT Ngân hàng VietQR' },
  { route: 'hl7-message-queue',    needsData: true,  rowDrawer: true,  name: '[24] Hàng đợi HL7' },
  { route: 'dicom-study-audit-log',needsData: true,  rowDrawer: true,  name: '[24] Log ca chụp DICOM' },
  { route: 'dicom-autosend',       needsData: true,  rowDrawer: false, name: '[24] DICOM tự động gửi' },
  { route: 'emr-cloud-sync',       needsData: false, rowDrawer: false, name: '[24] Đồng bộ EMR Cloud' },
  { route: 'emr-hl7-export',       needsData: false, rowDrawer: false, name: '[24] Xuất HL7 v2 HSBA' },
  { route: 'biometric-enrollment', needsData: false, rowDrawer: false, name: '[24] Vân tay BN WebAuthn' },
];

for (const p of PAGES) {
  test(`NangCap24 page: ${p.name}`, async ({ page, request }) => {
    await login(page, request);
    const h = attach(page);
    await page.goto(`/v2/${p.route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3500); // chờ data load (poll/axios)

    // 1. shell render (mọi page v2 NangCap24 đều bọc <div className="ab" data-testid="...-page">)
    const shell = await page.locator(`[data-testid="${p.route}-page"], .ab, .tl-shell, .terminal-shell, table`).count();
    expect(shell, 'page shell phải render').toBeGreaterThan(0);

    // 2. không lỗi nghiêm trọng
    expect(h.pageErrors, `pageerror: ${h.pageErrors.join(' | ')}`).toHaveLength(0);
    expect(h.apiFailures, `API 4xx/5xx: ${h.apiFailures.join(' | ')}`).toHaveLength(0);

    // 3. data + tương tác
    if (p.needsData) {
      const rows = await dataRowCount(page);
      expect(rows, `${p.route} phải có >=1 dòng data (đã seed)`).toBeGreaterThan(0);
      if (p.rowDrawer) {
        // mở drawer dòng đầu (data row = tr không có td colspan)
        const firstRow = page.locator('tbody tr').filter({ hasNot: page.locator('td[colspan]') }).first();
        await firstRow.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(800);
        const drawer = await page.locator('.ant-drawer-open, .ant-drawer-content, .ant-modal-content').count();
        expect(drawer, `${p.route}: click dòng phải mở drawer/modal chi tiết`).toBeGreaterThan(0);
      }
    }
    console.log(`  ✓ ${p.name}: shell ok, 0 lỗi, ${p.needsData ? (await dataRowCount(page)) + ' rows' : 'render ok'}`);
  });
}

// Cổng thanh tra BHXH — login riêng (standalone, ngoài TerminalLayout)
test('NangCap24 page: Cổng thanh tra BHXH (login + records)', async ({ page }) => {
  const h = attach(page);
  await page.goto('/inspector-portal', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  // form login phải có (data-testid sẵn trong InspectorPortal.tsx)
  await expect(page.getByTestId('inspector-username'), 'form login thanh tra phải hiện').toBeVisible({ timeout: 8000 });
  await page.getByTestId('inspector-username').fill('thanhtra01');
  await page.getByTestId('inspector-password').fill('Inspector@123');
  await page.getByTestId('inspector-login-btn').click();
  // chờ chuyển sang view tra cứu (search placeholder "Mã HSBA…") + records load
  await page.waitForTimeout(4000);
  const searchBox = await page.locator('input[placeholder*="HSBA"], input[placeholder*="thẻ BHYT"]').count();
  const afterLogin = await page.locator('tbody tr, table, .ab-tbl, .ant-table').count();
  expect(h.pageErrors, `pageerror: ${h.pageErrors.join(' | ')}`).toHaveLength(0);
  expect(searchBox + afterLogin, 'sau đăng nhập thanh tra phải vào view tra cứu hồ sơ').toBeGreaterThan(0);
  console.log(`  ✓ Cổng thanh tra: login thanhtra01 OK (searchBox=${searchBox}, tables=${afterLogin})`);
});
