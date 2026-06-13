/**
 * CRUD UI audit — 25 nhom nghiep vu (PROD).
 * Kiem cho moi route v2 dai dien: List(R) + Detail drawer(R) + nut Them(C) -> modal/drawer mo
 * + nut hanh dong dong/sua/xoa(U/D). Bat console/page error + API 4xx/5xx.
 * Output: playwright-prod-crud25.json
 */
import { test, expect, Page, Response, APIRequestContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// nhom -> route v2 dai dien (mot so nhom dung chung route)
const GROUPS: { g: string; route: string }[] = [
  { g: 'A1 Kham ngoai tru', route: 'opd' },
  { g: 'A2 Tai kham', route: 'follow-up' },
  { g: 'A3 Cap cuu', route: 'emergency-disaster' },
  { g: 'A4 Noi tru', route: 'ipd' },
  { g: 'A5 Phau thuat', route: 'surgery' },
  { g: 'A6 Xet nghiem', route: 'lab' },
  { g: 'A7 CDHA', route: 'radiology' },
  { g: 'A8 TDCN', route: 'functional-diagnostics' },
  { g: 'A9 PHCN', route: 'rehabilitation' },
  { g: 'A10 Thai san/CK', route: 'specialty-emr' },
  { g: 'A11 Tiem chung', route: 'immunization' },
  { g: 'A12 Kham SK', route: 'health-checkup' },
  { g: 'A13 Truyen mau', route: 'blood-bank' },
  { g: 'A14 Hoi chan', route: 'consultation' },
  { g: 'B1 Tiep nhan', route: 'reception' },
  { g: 'B3 EMR', route: 'emr' },
  { g: 'B4 Duoc', route: 'pharmacy' },
  { g: 'C1 Vien phi', route: 'billing' },
  { g: 'C2 BHYT', route: 'insurance' },
  { g: 'C3 Tam ung/cong no', route: 'finance' },
  { g: 'C4 Huy/hoan CLS', route: 'service-requeue' },
  { g: 'C6 Bao cao', route: 'reports' },
  { g: 'DM Danh muc', route: 'master-data' },
];

const PROD_API = process.env.PROD_API_URL || 'https://his-api-694913628964.asia-southeast1.run.app/api';
let TOKEN: string | null = null;
let USER: string | null = null;

async function getToken(request: APIRequestContext) {
  if (TOKEN) return { token: TOKEN, user: USER };
  const r = await request.post(`${PROD_API}/auth/login`, { data: { username: 'admin', password: 'Admin@123' } });
  if (!r.ok()) throw new Error(`login failed: ${r.status()}`);
  const j = await r.json();
  TOKEN = j?.data?.token || j?.token;
  USER = JSON.stringify(j?.data?.user || { username: 'admin', roles: ['Admin'] });
  return { token: TOKEN, user: USER };
}

interface CrudResult {
  group: string; route: string; loadOk: boolean;
  rows: number;             // R-list
  readDrawer: 'pass' | 'fail' | 'n/a';   // R-detail
  createBtn: boolean;       // C - nut Them co mat
  createOpens: 'pass' | 'fail' | 'n/a';  // C - click mo modal/drawer
  actionBtns: number;       // U/D - nut hanh dong tren row
  apiFails: number; pageErrors: number; notes: string[];
}
const REPORT: CrudResult[] = [];
test.describe.configure({ mode: 'serial' });

for (const { g, route } of GROUPS) {
  test(`CRUD ${g} (/v2/${route})`, async ({ page, request }) => {
    const apiFails: string[] = []; const pageErrors: string[] = []; const notes: string[] = [];
    page.on('response', (r: Response) => {
      if (r.status() < 400 || !r.url().includes('/api/')) return;
      // expected-404 theo contract: khong co mapping PTTT cho dich vu -> FE bat loi va an nut (ris.ts)
      if (r.status() === 404 && r.url().includes('pttt-service-mappings/by-service')) return;
      apiFails.push(`${r.status()} ${r.url().split('/api/')[1]?.slice(0, 40)}`);
    });
    page.on('pageerror', (e) => pageErrors.push(e.message));

    const { token, user } = await getToken(request);
    await page.context().addInitScript(({ t, u }) => { localStorage.setItem('token', t!); localStorage.setItem('user', u!); }, { t: token, u: user });

    let loadOk = true;
    try {
      await page.goto(`/v2/${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(1000);
    } catch { loadOk = false; }

    // overlay custom cua _v2kit: hui-drawer / hui-modal (KHONG phai ant-drawer)
    const overlaySel = '.hui-drawer-wrap, .hui-drawer, .hui-modal-wrap, .hui-modal, .ant-drawer-open, .ant-modal:visible';
    const closeOverlay = async () => {
      // 2026-06-13: cho overlay BIEN MAT that su (retry 3 lan) — backdrop con treo lam click
      // "Them" ke tiep bi nuot -> false fail (flaky o master-data)
      for (let i = 0; i < 3; i++) {
        const x = page.locator('.hui-x:visible, .hui-drawer-backdrop:visible, .hui-backdrop:visible').first();
        if (await x.count() > 0) { await x.click({ force: true }).catch(() => {}); }
        await page.waitForTimeout(300);
        if (await page.locator(overlaySel).count() === 0) return;
        // X khong an (vd modal master-data) -> Esc trong CUNG vong; con sot overlay khi sang
        // buoc "Them" se lam click trung backdrop -> dong modal thay vi mo -> false fail
        await page.keyboard.press('Escape').catch(() => {});
        await page.waitForTimeout(300);
        if (await page.locator(overlaySel).count() === 0) return;
      }
    };

    // R - list rows (loai dong empty-state co td[colspan])
    const rows = page.locator('table.ab-tbl tbody tr:not(:has(td[colspan])), table tbody tr.ant-table-row');
    const rowCount = await rows.count().catch(() => 0);

    // R - detail drawer (click 1 cell data)
    let readDrawer: CrudResult['readDrawer'] = 'n/a';
    if (rowCount > 0) {
      try {
        await rows.first().locator('td:not(.ck):not(.act)').first().click({ timeout: 5000, force: true });
        await page.waitForTimeout(700);
        const open = await page.locator(overlaySel).count();
        readDrawer = open > 0 ? 'pass' : 'fail';
        if (open > 0) await closeOverlay(); else notes.push('row click khong mo detail');
      } catch (e) { readDrawer = 'fail'; notes.push(`read err: ${(e as Error).message.slice(0, 40)}`); }
    }

    // C - nut Them (ab-btn primary text Them/Tao/Moi/Dang ky).
    // 2026-06-13: loai "Lam moi" (refresh mac dinh cua SimpleV2Page) — regex cu match "moi"
    // lam spec click nham nut refresh roi bao fail (false-negative o ipd/surgery/blood-bank...).
    const createBtn = page.locator('button.ab-btn, button.ab-iconbtn, .ab-tools button, .ab-toptabs button')
      .filter({ hasText: /Th[eê]m|T[aạ]o|M[oớ]i|Đăng k[yý]|New/i })
      .filter({ hasNotText: /L[aà]m m[oớ]i/i });
    const hasCreate = await createBtn.count().catch(() => 0) > 0;
    let createOpens: CrudResult['createOpens'] = 'n/a';
    if (hasCreate) {
      try {
        const urlBefore = page.url();
        await createBtn.first().click({ timeout: 5000, force: true });
        await page.waitForTimeout(1300);
        const open = await page.locator(overlaySel).count();
        const navigated = page.url() !== urlBefore; // mot so trang (vd ipd "Y lenh moi") mo TRANG tao — van la create-flow hop le
        createOpens = (open > 0 || navigated) ? 'pass' : 'fail';
        if (open > 0) await closeOverlay();
        else if (navigated) { notes.push(`create = navigate ${page.url().split('/v2/')[1] ?? ''}`); await page.goBack().catch(() => {}); }
        else notes.push('nut Them khong mo modal/form');
      } catch (e) { createOpens = 'fail'; notes.push(`create err: ${(e as Error).message.slice(0, 40)}`); }
    }

    // U/D - nut hanh dong tren row
    const actionBtns = await page.locator('table.ab-tbl tbody tr td.act button, table tbody tr .ab-actions button').count().catch(() => 0);

    if (apiFails.length > 0) notes.push(...apiFails.slice(0, 5)); // luu URL api loi de chan doan
    REPORT.push({ group: g, route, loadOk, rows: rowCount, readDrawer, createBtn: hasCreate, createOpens, actionBtns, apiFails: apiFails.length, pageErrors: pageErrors.length, notes });
    const line = `${g.padEnd(20)} rows=${rowCount} read=${readDrawer} create=${hasCreate?createOpens:'no-btn'} actions=${actionBtns} apiFail=${apiFails.length} jsErr=${pageErrors.length}`;
    console.log(`  ${line}`);
    expect(pageErrors.length, `pageerror /v2/${route}`).toBeLessThan(5);
  });
}

test.afterAll(async () => {
  const out = path.join(process.cwd(), 'playwright-prod-crud25.json');
  fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), total: REPORT.length, routes: REPORT }, null, 2));
  console.log(`\n[crud25] report -> ${out}`);
  console.log('GROUP                | rows read   create   actions apiFail jsErr');
  for (const r of REPORT) console.log(`${r.group.padEnd(20)} | ${String(r.rows).padStart(4)} ${r.readDrawer.padEnd(5)} ${(r.createBtn?r.createOpens:'no-btn').padEnd(7)} ${String(r.actionBtns).padStart(6)} ${String(r.apiFails).padStart(6)} ${String(r.pageErrors).padStart(5)}`);
});
