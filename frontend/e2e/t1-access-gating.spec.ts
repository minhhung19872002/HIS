/**
 * [T1 #216 / F1] Ẩn menu theo quyền — bằng chứng UI khi VITE_ACCESS_GATING=true.
 *
 * Đợt 1 chạy với gating TẮT nên TC-PERM-001..006 chỉ chứng minh được backend trả 403;
 * phần "mỗi vai trò chỉ thấy phần việc của mình" chưa có bằng chứng. Spec này chạy lại
 * đúng các vai trò đó trên một Vite ĐÃ BẬT gating, đếm mục menu thật trong sidebar và
 * chụp ảnh, rồi kiểm hai điều kiện đối nghịch nhau:
 *   - không vai trò nào rơi vào menu RỖNG (bật gating mà khoá người dùng ra ngoài là hỏng);
 *   - không vai trò thường nào thấy mục Quản trị hệ thống (bật mà không giấu gì là vô nghĩa).
 *
 * Cần: API :5106, Vite :3001 chạy với VITE_ACCESS_GATING=true, user seed mật khẩu 123456.
 *   cd frontend && VITE_ACCESS_GATING=true npm run dev
 *   npx playwright test e2e/t1-access-gating.spec.ts
 * Chạy trên Vite gating TẮT thì mọi vai trò thấy đủ menu → test tự FAIL và nói rõ lý do.
 */
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVID = path.resolve(HERE, '../../docs/architecture/evidence/cross');

type RoleCase = { tc: string; user: string; pass: string; label: string; admin?: boolean };
const ROLES: RoleCase[] = [
  { tc: 'TC-PERM-001', user: 'bsannn', pass: '123456', label: 'Bác sĩ' },
  { tc: 'TC-PERM-002', user: 'ddgiang', pass: '123456', label: 'Điều dưỡng' },
  { tc: 'TC-PERM-003', user: 'ktvkhanh', pass: '123456', label: 'KTV XN' },
  { tc: 'TC-PERM-004', user: 'dsoanh', pass: '123456', label: 'Dược sĩ' },
  { tc: 'TC-PERM-005', user: 'lthung', pass: '123456', label: 'Tiếp đón' },
  { tc: 'TC-PERM-006', user: 'tnmai', pass: '123456', label: 'Thu ngân' },
  { tc: 'TC-PERM-010', user: 'admin', pass: 'Admin@123', label: 'Quản trị hệ thống', admin: true },
];

const results: Record<string, unknown>[] = [];
test.describe.configure({ mode: 'serial' });

async function uiLogin(page: Page, user: string, pass: string) {
  await page.goto('/login');
  await page.fill('#login_username', user);
  await page.fill('#login_password', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.waitForTimeout(3000);
}

/** Số permission BE thực sự cấp cho phiên hiện tại — mốc để đối chiếu với số mục menu. */
async function permissionCount(page: Page) {
  return page.evaluate(async () => {
    const t = localStorage.getItem('token');
    const r = await fetch('http://localhost:5106/api/me/permissions', {
      headers: { Authorization: `Bearer ${t}` },
    });
    const j = await r.json();
    const list = Array.isArray(j) ? j : j?.data;
    return Array.isArray(list) ? list.length : -1;
  });
}

for (const r of ROLES) {
  test(`${r.tc} - [${r.label}] gating ON: sidebar chỉ còn phần việc của vai trò`, async ({ page }) => {
    await uiLogin(page, r.user, r.pass);

    const perms = await permissionCount(page);
    // Sidebar = rail các NHÓM (button.his-rail-item); mục con nằm trong flyout, chỉ dựng khi
    // mở nhóm — nên phải mở lần lượt từng nhóm mới đếm được đủ mục.
    const groups = page.locator('aside.his-rail button.his-rail-item');
    const groupCount = await groups.count();
    const hrefs = new Set<string>();
    for (let i = 0; i < groupCount; i++) {
      await groups.nth(i).click();
      await page.waitForTimeout(350);
      const items = await page
        .locator('.his-flyout-body a.his-flyout-item')
        .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).getAttribute('href') || ''));
      items.filter(Boolean).forEach((h) => hrefs.add(h));
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    fs.mkdirSync(EVID, { recursive: true });
    await page.screenshot({ path: path.join(EVID, `${r.tc}__s03__permission.png`), fullPage: true });

    const seesAdmin = [...hrefs].some((h) => h.startsWith('/v2/admin'));
    results.push({ tc: r.tc, user: r.user, role: r.label, permissions: perms, menuGroups: groupCount, menuItems: hrefs.size, seesAdmin });

    // Bật gating mà vai trò không còn gì để bấm thì thà tắt còn hơn.
    expect(hrefs.size, `${r.label} không thấy mục menu nào — gating đang khoá nhầm`).toBeGreaterThan(0);
    // Và nếu ai cũng thấy trang quản trị thì việc bật gating chẳng che được gì.
    if (r.admin) expect(seesAdmin, 'admin phải thấy Quản trị hệ thống').toBe(true);
    else expect(seesAdmin, `${r.label} KHÔNG được thấy Quản trị hệ thống khi gating bật`).toBe(false);

    await page.waitForTimeout(6000); // giữ dưới ngưỡng 10 lần đăng nhập/phút
  });
}

test.afterAll(async () => {
  fs.mkdirSync(EVID, { recursive: true });
  fs.writeFileSync(path.join(EVID, 't1-access-gating-results.json'), JSON.stringify(results, null, 2));
});
