/**
 * [T4 #219] Giao diện phản ứng thế nào với lỗi API.
 *
 * Câu hỏi của #219: mỗi mã lỗi có được xử lý tử tế không, hay màn hình trắng / quay mãi.
 * apiClient chỉ tự xử 401 (refresh rồi mới đá về /login) và 503 (banner bảo trì); 400/403/404/500
 * và timeout được ném lại cho từng trang tự lo — nên phải đo ở từng trang.
 *
 * Spec KHÔNG đoán endpoint. Với mỗi trang nó mở bình thường một lần, ghi lại đúng request GET
 * `/api/*` đầu tiên mà trang gọi, rồi mở lại và chặn CHÍNH URL đó (yêu cầu "intercept theo endpoint,
 * không phải `**\/api\/**`" của #219). Ba điều kiểm cho mỗi mã lỗi:
 *   1. còn khung ứng dụng — không phải trang trắng;
 *   2. không còn skeleton/spinner sau khi lỗi đã trả về — không quay mãi;
 *   3. không có lỗi JavaScript chưa bắt.
 * Ảnh evidence đặt theo quy ước docs/architecture/evidence/README.md §2.
 *
 * Cần: API :5106, Vite :3001, tài khoản admin.
 *   npx playwright test e2e/t4-api-error-handling.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.resolve(HERE, '../../docs/architecture/evidence/cross');
const API_ORIGIN = 'http://localhost:5106';

type PageCase = { tc: string; route: string; label: string };
const PAGES: PageCase[] = [
  { tc: 'TC-ERR-001', route: '/v2/reception', label: 'Tiếp đón' },
  { tc: 'TC-ERR-002', route: '/v2/opd', label: 'Khám bệnh' },
  { tc: 'TC-ERR-003', route: '/v2/pharmacy', label: 'Dược' },
  { tc: 'TC-ERR-004', route: '/v2/finance', label: 'Viện phí' },
];

/** 401 cố tình KHÔNG có ở đây: apiClient đá về /login, đó là hành vi đúng và đã đo ở TC-PERM-014. */
const FAILURES = [
  { code: 400, state: 'validation', body: { success: false, message: 'Tham số không hợp lệ', errors: [{ field: 'fromDate', message: 'Bắt buộc' }] } },
  { code: 403, state: 'permission', body: { success: false, message: 'Bạn không có quyền truy cập chức năng này.' } },
  { code: 404, state: 'empty', body: { success: false, message: 'Không tìm thấy' } },
  { code: 500, state: 'error', body: { success: false, message: 'Lỗi máy chủ' } },
];

const results: Record<string, unknown>[] = [];
// KHÔNG dùng mode 'serial': một trang hỏng sẽ nuốt kết quả của 19 phép đo còn lại.
// Bước chuẩn bị chạy trong beforeAll để mọi test có sẵn phiên + bản đồ endpoint.
test.describe.configure({ mode: 'default' });

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('#login_username', 'admin');
  await page.fill('#login_password', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.waitForTimeout(2000);
}

/**
 * Endpoint DỮ LIỆU của riêng trang.
 *
 * Lấy "lời gọi API đầu tiên" là sai: khung ứng dụng bắn vài request nền ngay khi dựng
 * (trạng thái phiên ký số, thông báo, gói module…) và chúng đến trước dữ liệu của trang, nên
 * cả bốn trang sẽ cùng chặn một endpoint chung — đo được sức chịu của khung chứ không phải
 * của trang. Vì vậy: ghi TẤT CẢ request API lúc tải, loại danh sách nền, lấy cái đầu còn lại.
 */
const SHELL_CALLS = [
  '/api/me/', '/api/auth/', '/api/digital-signature/', '/api/notification',
  '/api/module-packaging', '/api/health', '/api/system/', '/api/abbreviation',
  '/api/user-settings/', '/api/ai-labeling/',
];

async function firstApiCall(page: Page, route: string): Promise<{ target: string | null; all: string[] }> {
  const seen: string[] = [];
  const onReq = (r: { url: () => string; method: () => string }) => {
    const u = r.url();
    if (r.method() === 'GET' && u.startsWith(API_ORIGIN + '/api/')) seen.push(u);
  };
  page.on('request', onReq);
  await page.goto(route);
  await page.waitForTimeout(7000);
  page.off('request', onReq);
  const own = seen.filter((u) => !SHELL_CALLS.some((sh) => u.includes(sh)));
  // Lấy cái CUỐI: khung bắn trước, dữ liệu của trang về sau — nên request cuối cùng còn lại
  // chính là nguồn nuôi bảng dữ liệu chính của màn hình.
  return { target: own.length ? own[own.length - 1] : null, all: [...new Set(seen)] };
}

/** Còn spinner/skeleton nào đang chạy sau khi lỗi đã trả về không. */
async function stillLoading(page: Page) {
  return page.locator('.ant-spin-spinning, .ant-skeleton-active, [aria-busy="true"]').count();
}

test.beforeAll(async ({ browser }) => {
  // Hook dùng chung ngưỡng thời gian với test (mặc định 30s), mà bước chuẩn bị phải đăng nhập
  // rồi mở lần lượt 4 trang, mỗi trang chờ 7s để gom hết request — nên phải nới ra.
  test.setTimeout(240_000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page);
  await ctx.storageState({ path: path.join(HERE, '.t4-auth.json') });
  const map: Record<string, string | null> = {};
  const observed: Record<string, string[]> = {};
  for (const p of PAGES) {
    const r = await firstApiCall(page, p.route);
    map[p.route] = r.target;
    observed[p.route] = r.all;
  }
  fs.writeFileSync(path.join(EVID, 't4-endpoints-observed.json'), JSON.stringify(observed, null, 2));
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 't4-endpoints.json'), JSON.stringify(map, null, 2));
  results.push({ tc: 'TC-ERR-000', endpoints: map });
  await ctx.close();
  for (const p of PAGES) {
    if (!map[p.route]) throw new Error(`${p.label} không gọi API backend nào để chặn`);
  }
});

for (const pc of PAGES) {
  for (const f of FAILURES) {
    test(`${pc.tc} - [${pc.label}] API trả ${f.code} thì màn hình vẫn dùng được`, async ({ browser }) => {
      const ctx = await browser.newContext({ storageState: path.join(HERE, '.t4-auth.json') });
      const page = await ctx.newPage();
      const jsErrors: string[] = [];
      page.on('pageerror', (e) => jsErrors.push(e.message));

      const map = JSON.parse(fs.readFileSync(path.join(EVID, 't4-endpoints.json'), 'utf8')) as Record<string, string>;
      const target = map[pc.route];
      // Chặn ĐÚNG một endpoint, không phải mọi lời gọi /api/** — chặn tất thì không biết
      // màn hình hỏng vì lỗi nào, và cả những call nền không liên quan cũng bị kéo theo.
      await page.route(target, (r) => r.fulfill({
        status: f.code, contentType: 'application/json', body: JSON.stringify(f.body),
      }));

      await page.goto(pc.route);
      await page.waitForTimeout(7000);

      const bodyText = (await page.locator('body').innerText()).trim();
      const spinners = await stillLoading(page);
      const shell = await page.locator('aside.his-rail').count();

      fs.mkdirSync(EVID, { recursive: true });
      await page.screenshot({ path: path.join(EVID, `${pc.tc}__s0${FAILURES.indexOf(f) + 1}__${f.state}.png`), fullPage: true });
      results.push({ tc: pc.tc, route: pc.route, status: f.code, shell, spinners,
                     textLength: bodyText.length, jsErrors: jsErrors.length });

      expect(bodyText.length, `${pc.label} + ${f.code}: trang trắng`).toBeGreaterThan(40);
      expect(shell, `${pc.label} + ${f.code}: mất khung ứng dụng`).toBeGreaterThan(0);
      expect(spinners, `${pc.label} + ${f.code}: còn spinner quay sau khi lỗi đã trả về`).toBe(0);
      expect(jsErrors, `${pc.label} + ${f.code}: lỗi JS chưa bắt — ${jsErrors[0] ?? ''}`).toHaveLength(0);
      await ctx.close();
    });
  }

  test(`${pc.tc} - [${pc.label}] request treo thì không quay mãi`, async ({ browser }) => {
    test.setTimeout(180_000);  // chờ vượt mốc timeout 60s của apiClient rồi mới đọc trạng thái
    const ctx = await browser.newContext({ storageState: path.join(HERE, '.t4-auth.json') });
    const page = await ctx.newPage();
    const jsErrors: string[] = [];
    page.on('pageerror', (e) => jsErrors.push(e.message));

    const map = JSON.parse(fs.readFileSync(path.join(EVID, 't4-endpoints.json'), 'utf8')) as Record<string, string>;
    // Bỏ lửng request: mô phỏng mạng chậm/đứt, thứ mà mock 500 không tái hiện được.
    await page.route(map[pc.route], () => { /* không fulfill, không abort */ });

    await page.goto(pc.route);
    // apiClient đặt timeout 60s (#219/T4) — chờ qua mốc đó thì request treo phải reject
    // và trang mới chạy được nhánh lỗi của nó.
    await page.waitForTimeout(70_000);
    const spinners = await stillLoading(page);
    const bodyText = (await page.locator('body').innerText()).trim();
    await page.screenshot({ path: path.join(EVID, `${pc.tc}__s05__loading.png`), fullPage: true });
    results.push({ tc: pc.tc, route: pc.route, status: 'timeout', spinners, textLength: bodyText.length, jsErrors: jsErrors.length });

    expect(spinners, `${pc.label}: vẫn quay sau 70s — request treo không bị cắt`).toBe(0);
    expect(jsErrors, `${pc.label} + timeout: lỗi JS chưa bắt`).toHaveLength(0);
    await ctx.close();
  });
}

test.afterAll(async () => {
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 't4-api-error-results.json'), JSON.stringify(results, null, 2));
});
