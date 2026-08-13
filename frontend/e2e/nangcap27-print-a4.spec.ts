import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * NangCap27 — soi layout A4 của 8 biểu mẫu in mới (HSMT BV Tâm thần Quảng Ngãi).
 * Không chỉ "mở được": kiểm hẳn bề rộng nội dung có tràn khổ A4 không, và chụp ảnh để soi mắt thường.
 *
 * A4 portrait @96dpi = 794 x 1123 px; lề lấy theo `@page` khai trong printStyles (`_shared.tsx`).
 */

// @page { size: A4; margin: 15mm 20mm } trong printStyles ⇒ vùng in thật theo chiều ngang
// = 210mm - 20mm*2 = 170mm. 1mm = 96/25.4 px ⇒ 170mm ≈ 642,5px. Nội dung rộng hơn mức này
// sẽ bị máy in CẮT ở mép phải (mất cột cuối của bảng).
const A4_WIDTH_PX = 794;
const PRINTABLE_WIDTH_PX = Math.round(170 * 96 / 25.4);

const FORMS: { label: string; slug: string }[] = [
  { label: 'Theo dõi ôxy liệu pháp', slug: 'oxygen-monitor' },
  { label: 'BB thanh lý thuốc/HC/VTYT', slug: 'pharmacy-disposal' },
  { label: 'BB xác nhận mất/hỏng/vỡ', slug: 'pharmacy-damage' },
  { label: 'XN · Huyết - tủy đồ', slug: 'xn-myelogram' },
  { label: 'XN · Sinh thiết tủy xương', slug: 'xn-bonemarrow' },
  { label: 'XN · Nước dịch', slug: 'xn-bodyfluid' },
  { label: 'BA Phá thai', slug: 'sp-phathai' },
  { label: 'BA Bệnh tay chân miệng', slug: 'sp-taychanmieng' },
];

const OUT_DIR = path.resolve('../docs/architecture/evidence/nc27-nangcap27');

test.describe.configure({ mode: 'serial' });

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input#username, input[name="username"], input[placeholder*="ên đăng nhập"]', 'admin');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
}

test('8 biểu mẫu in NangCap27 render đúng khổ A4, không tràn ngang', async ({ page }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await login(page);

  // Thao tác UI ở desktop + media 'screen':
  //  · print CSS của app ẩn mọi thứ ngoài .emr-print-container (đúng thiết kế) → media 'print' không bấm được gì;
  //  · ép sẵn khổ A4 (794px) thì layout v2 chuyển responsive, đẩy sidebar HSBA ra ngoài viewport.
  // Chỉ ép khổ A4 + media 'print' đúng lúc ĐO và CHỤP.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ media: 'screen' });

  await page.goto('/v2/emr/edit');

  // Chọn HSBA đầu tiên trong danh sách (biểu mẫu cần `full` mới bật được nút In).
  const firstRecord = page.locator('aside .mono').first();
  await expect(firstRecord).toBeVisible({ timeout: 30000 });
  await firstRecord.click();
  await expect(page.getByRole('button', { name: /In biểu mẫu/i })).toBeVisible({ timeout: 20000 });

  const overflowing: string[] = [];
  const empty: string[] = [];
  const measured: string[] = [];

  for (const form of FORMS) {
    await page.getByRole('button', { name: /In biểu mẫu/i }).click();

    // Mỗi dòng biểu mẫu = <div><span>nhãn</span><Btn>In</Btn></div> → bắt span rồi lên cha lấy nút.
    const labelSpan = page.getByText(form.label, { exact: true });
    await expect(labelSpan).toBeVisible({ timeout: 15000 });
    await labelSpan.locator('xpath=..').getByRole('button', { name: /In/ }).click();

    const container = page.locator('.emr-print-container');
    await expect(container).toBeVisible({ timeout: 15000 });

    // Đo + chụp đúng như lúc ra máy in.
    await page.setViewportSize({ width: A4_WIDTH_PX, height: 1123 });
    await page.emulateMedia({ media: 'print' });
    const box = await container.evaluate((el, printableWidth) => {
      const declared = Math.round(el.getBoundingClientRect().width);
      // Ép đúng bề rộng vùng in rồi hỏi lại: nội dung có cần rộng hơn thế không?
      const prev = (el as HTMLElement).style.width;
      (el as HTMLElement).style.width = `${printableWidth}px`;
      const contentWidth = el.scrollWidth;
      const clientWidth = el.clientWidth;
      (el as HTMLElement).style.width = prev;
      return {
        declared,
        contentWidth,
        clientWidth,
        scrollHeight: el.scrollHeight,
        text: (el.textContent || '').trim().length,
        hasTitle: !!el.querySelector('h2'),
      };
    }, PRINTABLE_WIDTH_PX);

    measured.push(`${form.slug}: khai báo ${box.declared}px · nội dung cần ${box.contentWidth}px / vùng in ${PRINTABLE_WIDTH_PX}px · cao ${box.scrollHeight}px`);
    if (box.contentWidth > box.clientWidth + 1) {
      overflowing.push(`${form.slug}: nội dung cần ${box.contentWidth}px > vùng in ${PRINTABLE_WIDTH_PX}px`);
    }
    // Mẫu rỗng ruột (chỉ có tiêu đề) = template hỏng, không phải "đã in được".
    if (!box.hasTitle || box.text < 200) {
      empty.push(`${form.slug}: hasTitle=${box.hasTitle}, ký tự=${box.text}`);
    }

    await container.screenshot({
      path: path.join(OUT_DIR, `TC-NC27-PRINT__${form.slug}.png`),
    });

    // Đóng drawer xem trước để vòng sau mở lại từ đầu.
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('button', { name: /^Đóng$/ }).last().click();
    await expect(container).toBeHidden({ timeout: 10000 });
  }

  console.log(['', '[NangCap27 A4]', ...measured].join('\n'));
  expect(empty, `Mẫu in rỗng ruột: ${empty.join(' | ')}`).toEqual([]);
  expect(overflowing, `Mẫu in TRÀN khổ A4: ${overflowing.join(' | ')}`).toEqual([]);
});
