/**
 * [T4 #219] Bấm LƯU mà máy chủ trả lỗi thì màn hình nói gì.
 *
 * `t4-api-error-handling.spec.ts` đã đo đường ĐỌC (mở trang, API hỏng). Đây là nửa còn thiếu:
 * người dùng đã gõ xong một biểu mẫu, bấm nút, và máy chủ từ chối. Đây là lúc nguy hiểm nhất — nếu
 * lỗi bị nuốt thì người dùng tưởng đã lưu xong và bỏ đi.
 *
 * Đợt sửa 2026-09-04 làm cho mọi lỗi đường ghi có cùng một hình dạng `{error, message}` (xem
 * docs/workspace-docs/10-assessment/t2-t4-flow-and-errors-2026-09-04.md). Bài này hỏi vế còn lại:
 * giao diện có thực sự ĐỌC `message` đó và đưa ra trước mắt người dùng không.
 *
 * Bốn điều kiểm cho mỗi mã lỗi:
 *   1. câu của máy chủ hiện ra trên màn hình — không nuốt lặng;
 *   2. biểu mẫu VẪN MỞ — không đóng như thể đã lưu thành công;
 *   3. nút bấm không kẹt ở trạng thái đang xử lý — bấm lại được;
 *   4. không có lỗi JavaScript chưa bắt.
 *
 * Chặn ở tầng mạng nên KHÔNG tạo dữ liệu thật: request bị chặn trước khi tới máy chủ.
 *
 * Cần: API :5106, Vite :3001, tài khoản admin.
 *   npx playwright test e2e/t4-write-error-feedback.spec.ts
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.resolve(HERE, '../../docs/architecture/evidence/cross');
const API = 'http://localhost:5106';

/** Mỗi ca một câu RIÊNG BIỆT, để biết chắc màn hình hiện câu của máy chủ chứ không phải câu chung. */
const FAILURES = [
  {
    tc: 'TC-WERR-001', code: 400, state: 'validation',
    body: { error: 'VALIDATION_FAILED', message: 'Bệnh nhân này đã có lượt khám đang mở tại phòng khác.' },
  },
  {
    tc: 'TC-WERR-002', code: 409, state: 'error',
    body: { error: 'CONCURRENT_UPDATE', message: 'Quầy khác vừa tiếp đón bệnh nhân này, vui lòng tải lại.' },
  },
  {
    tc: 'TC-WERR-003', code: 500, state: 'error',
    body: { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ khi ghi phiếu tiếp đón.' },
  },
];

/**
 * Mỗi ca ghi ra MỘT tệp riêng. Playwright chạy các test song song ở nhiều tiến trình, nên một mảng
 * dùng chung + `afterAll` chỉ giữ lại phần của tiến trình cuối — lượt chạy đầu mất 2 trong 3 ca đo
 * đúng theo kiểu đó. Tệp riêng thì không có tranh chấp và không mất gì.
 */
function writeCase(row: Record<string, unknown>) {
  const dir = path.join(EVID, 't4', 'write-errors');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${row.tc}.json`),
    JSON.stringify({ ranAt: new Date().toISOString(), ...row }, null, 1), 'utf8');
}

async function loginAsAdmin(page: Page, request: APIRequestContext) {
  const resp = await request.post(`${API}/api/auth/login`, {
    data: { username: 'admin', password: 'Admin@123' },
  });
  const token = (await resp.json())?.data?.token;
  if (!token) throw new Error('không lấy được token admin');
  await page.context().addInitScript((t: string) => {
    window.localStorage.setItem('token', t);
    window.localStorage.setItem('user', JSON.stringify({
      id: '9e5309dc-ecf9-4d48-9a09-224cd15347b1',
      username: 'admin',
      fullName: 'Administrator',
      roles: ['Admin'],
      permissions: ['*'],
    }));
  }, token);
}

/** Lái wizard tiếp đón tới bước cuối. Chuỗi thao tác mượn của validation-feedback.spec.ts. */
async function fillWizardToLastStep(page: Page) {
  await page.goto('/v2/reception');
  await page.getByRole('button', { name: /Đăng ký mới/ }).click();
  await expect(page.getByText('Đăng ký tiếp đón mới')).toBeVisible();

  await page.getByPlaceholder('Nguyễn Văn A').fill('T4WERR Nguyen Van Loi');
  await page.getByPlaceholder('0912 345 678').fill('0912345678');
  await page.getByRole('spinbutton').fill('30');
  await page.getByPlaceholder('012345678901').fill('012345678901');
  await page.getByRole('button', { name: /Tiếp tục/ }).click();
  await expect(page.getByText('Bước 2/4')).toBeVisible();

  await page.getByText('Khám thường', { exact: true }).click();
  await page.getByRole('button', { name: /Tiếp tục/ }).click();
  await expect(page.getByText('Bước 3/4')).toBeVisible();

  const firstRoom = page.locator('.rec-deptgrid label').first();
  if (await firstRoom.count()) await firstRoom.click();
  await page.getByPlaceholder(/Triệu chứng chính/).fill('T4WERR đo phản hồi lỗi');
  await page.getByRole('button', { name: /Tiếp tục/ }).click();
  await expect(page.getByText('Bước 4/4')).toBeVisible();
}

test.describe('[T4 #219] Lỗi trên đường GHI có tới được mắt người dùng không', () => {
  test.setTimeout(120_000);

  for (const f of FAILURES) {
    test(`${f.tc} — HTTP ${f.code} khi bấm Đăng ký`, async ({ page, request }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', (e) => jsErrors.push(String(e)));

      await loginAsAdmin(page, request);

      // Chặn MỌI lượt ghi ra API: request không bao giờ tới máy chủ nên không sinh dữ liệu thật.
      let hitUrl = '';
      await page.route((url) => url.href.startsWith(`${API}/api/`), async (route) => {
        const m = route.request().method();
        if (m === 'GET' || m === 'OPTIONS') return route.continue();
        hitUrl = route.request().url();
        await route.fulfill({
          status: f.code,
          contentType: 'application/json',
          body: JSON.stringify(f.body),
        });
      });

      await fillWizardToLastStep(page);

      const submit = page.getByRole('button', { name: /^Đăng ký$|Hoàn tất|Xác nhận/ }).last();
      await submit.click();

      // 1. Câu của máy chủ phải hiện ra ở ĐÂU ĐÓ trên màn hình.
      const serverText = f.body.message;
      let messageShown = false;
      try {
        await expect(page.getByText(serverText, { exact: false }).first()).toBeVisible({ timeout: 8000 });
        messageShown = true;
      } catch {
        messageShown = false;
      }

      // 2. Biểu mẫu phải còn mở — đóng đi nghĩa là người dùng tưởng đã lưu xong.
      const stillOpen = await page.getByText('Đăng ký tiếp đón mới').isVisible().catch(() => false);

      // 3. Nút không được kẹt ở trạng thái đang xử lý.
      const stuckLoading = await submit.locator('.ant-btn-loading-icon').count()
        .then((n) => n > 0).catch(() => false);

      // §2 evidence/README: ảnh nằm THẲNG trong cross/, tên `TC-<CODE>-<NNN>__s<NN>__<state>`,
      // và <state> phải thuộc bộ trạng thái hợp lệ — nếu không viewer sẽ không khớp được ảnh với task.
      const shot = path.join(EVID, `${f.tc}__s01__${f.state}.png`);
      fs.mkdirSync(path.dirname(shot), { recursive: true });
      await page.screenshot({ path: shot, fullPage: false });

      writeCase({
        tc: f.tc, code: f.code, surface: 'wizard tiếp đón (trong khung ứng dụng)',
        interceptedUrl: hitUrl, messageShown,
        formStillOpen: stillOpen, stuckLoading, jsErrors: jsErrors.length, shot: path.basename(shot),
      });

      expect(hitUrl, 'phải có một lượt ghi bị chặn — nếu rỗng thì wizard chưa gọi API, bài đo mù').not.toBe('');
      expect(messageShown, `màn hình phải hiện câu của máy chủ: "${serverText}"`).toBe(true);
      expect(stillOpen, 'biểu mẫu phải còn mở sau khi lưu hỏng').toBe(true);
      expect(stuckLoading, 'nút không được kẹt ở trạng thái đang xử lý').toBe(false);
      expect(jsErrors, `lỗi JavaScript chưa bắt: ${jsErrors.join(' | ')}`).toHaveLength(0);
    });
  }

  // ── Mặt ghi thứ hai, khác hẳn về cấu trúc ──────────────────────────────
  // Wizard tiếp đón nằm TRONG khung ứng dụng và dùng chung `apiClient` + toast của khung. Màn hình
  // đăng nhập thì không: nó ở ngoài khung và `AuthContext.login` tự bắt lỗi lấy. Đo cả hai để câu
  // kết luận không bị hiểu rộng hơn thứ đã đo.
  //
  // Ở đây KHÔNG đòi màn hình lặp lại câu của máy chủ. Với thông tin đăng nhập sai, máy chủ CỐ Ý chỉ
  // trả một câu chung (kể cả khi tài khoản đang bị khóa — xem AuthService.LoginAsync trả null),
  // để không lộ tài khoản nào có thật. Cái phải đo là màn hình có nói ĐÚNG NGUYÊN NHÂN không:
  // trước đợt sửa này, bị chặn tần suất và máy chủ hỏng đều bị báo thành "sai mật khẩu".
  const LOGIN_CASES = [
    {
      tc: 'TC-WERR-004', code: 429, state: 'toast', label: 'bị chặn vì thử quá nhiều lần',
      body: {},
      expect: /quá nhiều lần/i, mustNotSay: /mật khẩu không đúng/i,
    },
    {
      tc: 'TC-WERR-005', code: 503, state: 'error', label: 'máy chủ không trả lời',
      body: { error: 'UNAVAILABLE', message: 'Hệ thống đang bảo trì.' },
      expect: /Không kết nối được máy chủ/i, mustNotSay: /mật khẩu không đúng/i,
    },
  ];

  for (const c of LOGIN_CASES) {
    test(`${c.tc} — đăng nhập ${c.label} phải nói đúng nguyên nhân`, async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', (e) => jsErrors.push(String(e)));

      let hitUrl = '';
      await page.route((url) => url.href.startsWith(`${API}/api/auth/login`), async (route) => {
        hitUrl = route.request().url();
        await route.fulfill({
          status: c.code, contentType: 'application/json', body: JSON.stringify(c.body),
        });
      });

      await page.goto('/login');
      await page.locator('input').first().fill('admin');
      await page.locator('input[type="password"]').first().fill('mat-khau-bat-ky');
      await page.getByRole('button', { name: /Đăng nhập/i }).first().click();

      let saidRightCause = false;
      try {
        await expect(page.getByText(c.expect).first()).toBeVisible({ timeout: 8000 });
        saidRightCause = true;
      } catch { saidRightCause = false; }

      // Điều quan trọng nhất: KHÔNG được đổ lỗi cho mật khẩu. Nói sai nguyên nhân khiến người dùng
      // gõ lại, hỏng tiếp, rồi bị khóa tài khoản (ngưỡng 5 lần) vì một sự cố không liên quan.
      const blamedPassword = await page.getByText(c.mustNotSay).first()
        .isVisible({ timeout: 1500 }).catch(() => false);

      const stayedOnLogin = page.url().includes('/login');

      const shot = path.join(EVID, `${c.tc}__s01__${c.state}.png`);
      fs.mkdirSync(path.dirname(shot), { recursive: true });
      await page.screenshot({ path: shot, fullPage: false });

      writeCase({
        tc: c.tc, code: c.code, surface: 'màn hình đăng nhập (ngoài khung ứng dụng)',
        interceptedUrl: hitUrl, saidRightCause, blamedPassword, stayedOnLogin,
        jsErrors: jsErrors.length, shot: path.basename(shot),
      });

      expect(hitUrl, 'phải có lượt đăng nhập bị chặn').not.toBe('');
      expect(blamedPassword, 'không được báo sai mật khẩu khi nguyên nhân là khác').toBe(false);
      expect(saidRightCause, `màn hình phải nói đúng nguyên nhân (${c.label})`).toBe(true);
      expect(stayedOnLogin, 'đăng nhập hỏng thì phải ở lại /login').toBe(true);
      expect(jsErrors, `lỗi JavaScript chưa bắt: ${jsErrors.join(' | ')}`).toHaveLength(0);
    });
  }
});
