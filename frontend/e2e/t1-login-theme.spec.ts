/**
 * [T1 #216] TC-PERM-020 — màn đăng nhập trước tuỳ chọn giao diện và ngôn ngữ.
 *
 * Hai câu hỏi tách bạch:
 *
 * 1. **Theme.** `ThemeContext` lưu lựa chọn ở `localStorage['his-theme-mode']` và đặt
 *    `data-theme` lên `body`. `ThemeProvider` bọc toàn bộ App nên màn đăng nhập — thứ người dùng
 *    thấy TRƯỚC khi có phiên — cũng phải tôn trọng lựa chọn đó, và phải đọc được ở cả hai chế độ.
 *    Kiểm: `data-theme` đúng giá trị đã lưu, và ô nhập vẫn nhìn thấy được (không chữ trắng nền trắng).
 *
 * 2. **i18n.** Repo KHÔNG có thư viện đa ngữ nào (không i18next, không thư mục locales) — sản phẩm
 *    chỉ tiếng Việt, chuỗi viết thẳng trong mã. Test khẳng định đúng hiện trạng đó thay vì giả vờ
 *    có bộ chuyển ngôn ngữ: màn đăng nhập hiện tiếng Việt. Muốn đa ngữ thì đó là việc làm tính năng,
 *    không phải lỗi.
 *
 * Cần: Vite :3001. Không cần đăng nhập.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.resolve(HERE, '../../docs/architecture/evidence/cross');
const THEME_KEY = 'his-theme-mode';

const results: Record<string, unknown>[] = [];
// Chạy tuần tự: mỗi worker có bản `results` riêng, chạy song song thì afterAll chỉ ghi
// được phần của một worker và file bằng chứng thiếu mất hai lượt kia.
test.describe.configure({ mode: 'serial' });

async function openLoginWithTheme(page: Page, mode: 'light' | 'dark') {
  // Đặt lựa chọn TRƯỚC khi app dựng, rồi mới tải lại để ThemeProvider đọc được.
  await page.goto('/login');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [THEME_KEY, mode]);
  await page.reload();
  await page.waitForSelector('#login_username', { timeout: 20_000 });
  await page.waitForTimeout(800);
}

/** Màu chữ và màu nền thực tế của ô nhập — để bắt trường hợp chữ chìm vào nền. */
async function inputColours(page: Page) {
  return page.locator('#login_username').evaluate((el) => {
    const cs = getComputedStyle(el as HTMLElement);
    // Nền của ô nhập thường trong suốt, nên so màu chữ với nó là vô nghĩa — phải leo lên cha
    // để lấy nền THỰC SỰ nhìn thấy. Bản kiểm cũ vì thế bỏ lọt cảnh chữ gần-đen trên nền tối.
    let node: HTMLElement | null = el as HTMLElement;
    let bg = 'rgba(0, 0, 0, 0)';
    while (node) {
      const c = getComputedStyle(node).backgroundColor;
      if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break; }
      node = node.parentElement;
    }
    const lum = (rgb: string) => {
      const m = rgb.match(/\d+/g);
      if (!m) return 0;
      const [r, g, b] = m.slice(0, 3).map(Number).map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const l1 = lum(cs.color), l2 = lum(bg);
    const contrast = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    return { color: cs.color, background: bg, contrast: Math.round(contrast * 100) / 100 };
  });
}

for (const mode of ['light', 'dark'] as const) {
  test(`TC-PERM-020 - [Đăng nhập] tôn trọng chế độ ${mode === 'dark' ? 'tối' : 'sáng'}`, async ({ page }) => {
    await openLoginWithTheme(page, mode);

    const applied = await page.evaluate(() => document.body.getAttribute('data-theme'));
    const colours = await inputColours(page);
    const stored = await page.evaluate((k) => localStorage.getItem(k), THEME_KEY);

    fs.mkdirSync(EVID, { recursive: true });
    await page.screenshot({
      path: path.join(EVID, `TC-PERM-020__s0${mode === 'light' ? 1 : 2}__list.png`),
      fullPage: true,
    });
    results.push({ tc: 'TC-PERM-020', mode, stored, applied, ...colours });

    expect(stored, 'lựa chọn giao diện phải được giữ lại').toBe(mode);
    expect(applied, `body[data-theme] phải theo lựa chọn đã lưu`).toBe(mode);
    // Đo TƯƠNG PHẢN thật thay vì chỉ "khác màu". 4.5:1 là ngưỡng WCAG AA cho chữ thường.
    expect(colours.contrast, `chữ trong ô nhập chìm vào nền ở chế độ ${mode} (tương phản ${colours.contrast}:1)`)
      .toBeGreaterThanOrEqual(4.5);
  });
}

test('TC-PERM-020 - [Đăng nhập] sản phẩm chỉ tiếng Việt, không có bộ chuyển ngôn ngữ', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector('#login_username', { timeout: 20_000 });
  const body = await page.locator('body').innerText();
  const langSwitcher = await page.locator('[data-testid*="lang"], [aria-label*="language" i], select[name*="lang" i]').count();
  results.push({ tc: 'TC-PERM-020', check: 'i18n', langSwitcher, hasVietnamese: /Đăng nhập|Tên đăng nhập/.test(body) });

  expect(body, 'màn đăng nhập phải hiện tiếng Việt').toMatch(/Đăng nhập|Tên đăng nhập/);
  // Không có bộ chuyển ngôn ngữ là ĐÚNG hiện trạng: repo chưa dùng thư viện đa ngữ nào.
  expect(langSwitcher, 'nếu bỗng có bộ chuyển ngôn ngữ thì ghi chú i18n ở đây đã lỗi thời').toBe(0);
});

test.afterAll(async () => {
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 't1-login-theme-results.json'), JSON.stringify(results, null, 2));
});
