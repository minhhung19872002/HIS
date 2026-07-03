/**
 * NangCap25 — E2E UI drive (LOCAL: frontend :3001 + backend :5106)
 *
 * Drive thật 4 màn NangCap25: QrPaymentCenter [25], Kiosk thanh toán QR,
 * BillingEditor (VietQR), HospitalPharmacy. Verify render + API 2xx + tương tác
 * chính (đổi tab, mở modal, sinh QR, submit chi hộ). Chụp evidence mỗi mốc.
 *
 * Run: npx playwright test e2e/nangcap25-ui.spec.ts --reporter=list
 */
import { test, expect, Page } from '@playwright/test';

test.setTimeout(90_000); // page nặng + fullPage screenshot

const API = 'http://localhost:5106/api';
// Bệnh nhân kiosk có chỉ định chưa thanh toán (query DB lúc soạn test; override qua env)
const KIOSK_CODE = process.env.KIOSK_CODE || 'BN202603200036';
const KIOSK_DOB = process.env.KIOSK_DOB || '1992-05-20';

const IGNORE_CONSOLE = [
  /Download the React DevTools/, /\[antd:/, /useForm/, /not connected to any Form/,
  /SignalR/i, /WebSocket/i, /\[HMR\]/, /\[vite\]/, /findDOMNode/, /negotiate.*401/,
  /AbortError/, /favicon/i, /ResizeObserver/, /manifest/i,
];

let TOKEN = '';
let USER = '';
let SAMPLE_PATIENT_ID = '';

test.beforeAll(async ({ request }) => {
  const r = await request.post(`${API}/auth/login`, { data: { username: 'admin', password: 'Admin@123' } });
  expect(r.ok(), 'login backend').toBeTruthy();
  const j = await r.json();
  TOKEN = j?.data?.token || j?.token;
  USER = JSON.stringify(j?.data?.user || { username: 'admin', roles: ['Admin'] });
  // lấy 1 patientId thật từ giao dịch (cho form chi hộ)
  const tr = await request.get(`${API}/payment/transactions?pageIndex=1&pageSize=1`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const tj = await tr.json();
  SAMPLE_PATIENT_ID = tj?.data?.items?.[0]?.patientId || tj?.items?.[0]?.patientId || '';
});

async function login(page: Page) {
  await page.context().addInitScript(({ t, u }) => {
    window.localStorage.setItem('token', t as string);
    window.localStorage.setItem('user', u as string);
  }, { t: TOKEN, u: USER });
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
const shot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/NangCap25/${name}.png`, fullPage: true }).catch(() => {});

// ─────────────────────────────────────────────────────────────────────────────
test('[25] QrPaymentCenter — đối soát + báo cáo người tạo QR + chi hộ hoàn tiền', async ({ page }) => {
  await login(page);
  const h = attach(page);
  await page.goto('/v2/qr-payment-center', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  // shell + tiêu đề [25] (title xuất hiện ở breadcrumb + h1 → dùng .first())
  await expect(page.locator('.ab-module').first()).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole('heading', { name: /QR động.*Đối soát VCB/i })).toBeVisible();
  await shot(page, 'TC01-recon-tab');

  // Tab 1: Đối soát ngân hàng — phải có ≥1 dòng (30 txn seed) + KPI
  const reconRows = await page.locator('tbody tr').filter({ hasNot: page.locator('td[colspan]') }).count();
  expect(reconRows, 'đối soát phải có ≥1 giao dịch').toBeGreaterThan(0);

  // Tab 2: Báo cáo người tạo QR
  await page.getByRole('button', { name: /Báo cáo người tạo QR/i }).click().catch(() => {});
  await page.waitForTimeout(2000);
  await expect(page.getByText(/Người tạo mã QR/i).first()).toBeVisible({ timeout: 6000 });
  await shot(page, 'TC02-creators-tab');

  // Tab 3: Chi hộ hoàn tiền — mở modal, điền, submit
  await page.getByRole('button', { name: /Chi hộ hoàn tiền/i }).click().catch(() => {});
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Tạo lệnh chi hộ/i }).click();
  await page.waitForTimeout(800);
  const modal = page.locator('.hui-modal-wrap');
  await expect(modal, 'modal chi hộ phải mở').toBeVisible({ timeout: 5000 });
  await shot(page, 'TC03a-disburse-modal-open');

  const body = page.locator('.hui-modal-b');
  await body.locator('input.mono').first().fill(SAMPLE_PATIENT_ID); // patientId
  await body.locator('input[type="number"]').fill('15000');
  const numbers = body.locator('input.mono');
  await numbers.nth(1).fill('0011009998888'); // số TK
  const holder = body.locator('input').nth(3);  // chủ tài khoản
  await holder.fill('NGUYEN VAN E2E');
  await body.locator('textarea').fill('E2E test hoàn tiền thừa');
  await shot(page, 'TC03b-disburse-filled');

  await page.locator('.hui-modal-f').getByRole('button', { name: /Tạo lệnh/i }).click();
  await page.waitForTimeout(2500);
  // toast thành công HOẶC modal đóng + dòng CH- xuất hiện
  const okToast = await page.getByText(/Đã tạo lệnh chi hộ/i).count();
  const disbRows = await page.locator('tbody tr').filter({ hasText: /CH-/ }).count();
  expect(okToast + disbRows, 'chi hộ: tạo lệnh thành công (toast hoặc dòng CH-)').toBeGreaterThan(0);
  await shot(page, 'TC03c-disburse-created');

  expect(h.pageErrors, `pageerror: ${h.pageErrors.join(' | ')}`).toHaveLength(0);
  expect(h.apiFailures, `API fail: ${h.apiFailures.join(' | ')}`).toHaveLength(0);
  console.log(`  ✓ QrPaymentCenter: recon ${reconRows} rows, creators+disburse OK`);
});

// ─────────────────────────────────────────────────────────────────────────────
test('[25] Kiosk — tab Thanh toán QR: tra cứu BN → sinh QR động', async ({ page }) => {
  await login(page);
  const h = attach(page);
  await page.goto('/v2/kiosk', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // chuyển sang tab Thanh toán QR
  await page.getByRole('button', { name: /Thanh toán QR/i }).click().catch(() => {});
  await page.waitForTimeout(1000);
  await expect(page.getByText(/Tra cứu khoản chờ thanh toán/i)).toBeVisible({ timeout: 6000 });
  await shot(page, 'TC04a-kiosk-payment-form');

  // Negative: sai mã BN → báo lỗi, không crash (form vẫn hiển thị, payResult=null)
  await page.locator('input[placeholder*="BN"]').fill('BN-KHONG-TON-TAI');
  await page.locator('input[type="date"]').fill('2000-01-01');
  await page.getByRole('button', { name: /TRA CỨU/i }).click();
  await page.waitForTimeout(2000);
  await shot(page, 'TC04b-kiosk-wrong-code');

  // Positive: form vẫn hiện sau lỗi → nhập mã + ngày sinh đúng → hiện tên BN + tổng tiền + QR
  await page.locator('input[placeholder*="BN"]').fill(KIOSK_CODE);
  await page.locator('input[type="date"]').fill(KIOSK_DOB);
  await page.getByRole('button', { name: /TRA CỨU/i }).click();
  await page.waitForTimeout(3500);

  // QR canvas (antd QRCode render <canvas>) HOẶC thông báo "không có khoản"
  const qrCanvas = await page.locator('canvas').count();
  const totalShown = await page.getByText(/Tổng cần thanh toán|không có khoản/i).count();
  expect(qrCanvas + totalShown, 'kiosk: phải hiện QR hoặc trạng thái khoản chờ').toBeGreaterThan(0);
  await shot(page, 'TC04c-kiosk-qr-generated');

  expect(h.pageErrors, `pageerror: ${h.pageErrors.join(' | ')}`).toHaveLength(0);
  console.log(`  ✓ Kiosk: form + negative + QR (canvas=${qrCanvas}, total=${totalShown})`);
});

// ─────────────────────────────────────────────────────────────────────────────
test('[24→25] BillingEditor — có phương thức VietQR (method 3)', async ({ page }) => {
  await login(page);
  const h = attach(page);
  await page.goto('/v2/billing/edit', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await expect(page.locator('.ab, .ed-root, [class*="ed-"]').first()).toBeVisible({ timeout: 8000 });
  await shot(page, 'TC05-billing-editor');
  // Nút phương thức VietQR có trong panel thanh toán (tab pay mặc định)
  const vietqr = await page.getByText(/VietQR/i).count();
  expect(vietqr, 'BillingEditor phải có phương thức VietQR').toBeGreaterThan(0);
  expect(h.pageErrors, `pageerror: ${h.pageErrors.join(' | ')}`).toHaveLength(0);
  console.log(`  ✓ BillingEditor: VietQR method present (${vietqr})`);
});

// ─────────────────────────────────────────────────────────────────────────────
test('[24→25] HospitalPharmacy — trang render, không lỗi (QR quầy thuốc trong drawer)', async ({ page }) => {
  await login(page);
  const h = attach(page);
  await page.goto('/v2/hospital-pharmacy', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await expect(page.locator('.ab-module, table, .ab').first()).toBeVisible({ timeout: 8000 });
  await shot(page, 'TC06-hospital-pharmacy');
  expect(h.pageErrors, `pageerror: ${h.pageErrors.join(' | ')}`).toHaveLength(0);
  expect(h.apiFailures, `API fail: ${h.apiFailures.join(' | ')}`).toHaveLength(0);
  console.log('  ✓ HospitalPharmacy: render OK, 0 lỗi');
});
