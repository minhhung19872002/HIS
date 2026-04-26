import { test } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE = 'http://localhost:3003';
const OUT = path.join(__dirname, '__snapshots__');

/**
 * Probe every clickable element on design's Dashboard.html. After each click,
 * wait 400ms and capture:
 *   - current URL
 *   - count of overlays (.hui-modal-wrap, .hui-drawer-wrap)
 *   - count of toasts (.hui-toast)
 *   - current visible flyout (.his-flyout)
 * Dumps a JSON report so we know what real behavior each element triggers.
 */
test('inventory design dashboard interactions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/__design/Dashboard.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.dash-top', { timeout: 10_000 });
  await page.waitForTimeout(600);

  // Target every kind of element we care about
  const selectors = [
    { name: 'rail-group-clinical',  sel: '.his-rail-item:nth-child(3)' },
    { name: 'rail-group-paraclinic', sel: '.his-rail-item:nth-child(4)' },
    { name: 'kpi-card-1',            sel: '.kpi:nth-child(1)' },
    { name: 'er-row-1',              sel: '.dash-col .panel:has(.er-chips) tbody tr:nth-child(1)' },
    { name: 'er-open-triage',        sel: '.panel:has(.er-chips) .btn.sm' },
    { name: 'opd-dept-row',          sel: '.opd-depts .dept-row:nth-child(1)' },
    { name: 'opd-open',              sel: '.panel:has(.flow) .btn.sm' },
    { name: 'bed-square',            sel: '.bed-grid .bed.occ' },
    { name: 'bed-open-ward',         sel: '.panel:has(.bed-grid) .btn.sm' },
    { name: 'or-slot',               sel: '.or-slot' },
    { name: 'or-open-lich',          sel: '.panel:has(.or-row) .btn.sm' },
    { name: 'stock-row',             sel: '.stock-row' },
    { name: 'pharmacy-open',         sel: '.panel:has(.stock-row) .btn.sm' },
    { name: 'staff-row',             sel: '.staff-row' },
    { name: 'shift-rota',            sel: '.panel:has(.staff-row) .btn.sm' },
    { name: 'alert-row',             sel: '.alert-row' },
    { name: 'alerts-xem-het',        sel: '.panel:has(.alert-row) .btn.ghost' },
    { name: 'topbar-cmd',            sel: '.his-cmd' },
    { name: 'topbar-bell',           sel: '.his-tb-btn[title*="Thông báo"]' },
    { name: 'topbar-refresh',        sel: '.his-tb-btn[title*="Giao ca"]' },
    { name: 'topbar-help',           sel: '.his-tb-btn[title*="Trợ giúp"]' },
    { name: 'topbar-user',           sel: '.his-user' },
    { name: 'clock',                 sel: '.his-clock' },
  ];

  const report: { name: string; exists: boolean; url: string; overlay: number; toast: number; flyoutVisible: boolean }[] = [];

  for (const { name, sel } of selectors) {
    const urlBefore = page.url();
    const el = page.locator(sel).first();
    const exists = await el.count() > 0;
    if (!exists) {
      report.push({ name, exists: false, url: urlBefore, overlay: 0, toast: 0, flyoutVisible: false });
      continue;
    }
    await el.click({ trial: false, force: true, timeout: 3000 }).catch(() => { /* ignore if nav away */ });
    await page.waitForTimeout(400);
    const urlAfter = page.url();
    const overlay = await page.locator('.hui-modal-wrap, .hui-drawer-wrap').count();
    const toast = await page.locator('.hui-toast').count();
    const flyoutVisible = await page.locator('.his-flyout').count() > 0;
    report.push({ name, exists: true, url: urlAfter, overlay, toast, flyoutVisible });

    // Reset: close overlays, navigate back if changed
    if (overlay > 0) await page.keyboard.press('Escape');
    if (urlAfter !== urlBefore && urlAfter.includes('/__design/') && !urlAfter.endsWith('Dashboard.html')) {
      await page.goto(`${BASE}/__design/Dashboard.html`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.dash-top', { timeout: 10_000 });
    }
    await page.waitForTimeout(250);
  }

  console.log('DASH_ACTIONS_REPORT:', JSON.stringify(report, null, 2));

  // Final screenshot as reference
  await page.screenshot({ path: path.join(OUT, 'design-dashboard-baseline.png'), fullPage: false });
});
