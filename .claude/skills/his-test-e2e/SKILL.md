---
name: his-test-e2e
description: Use this skill when writing or fixing E2E/UI tests for HIS frontend using Cypress (`frontend/cypress/e2e/*.cy.ts`) or Playwright (`frontend/e2e/*.spec.ts`, `frontend/e2e-prod/*.spec.ts`). Triggers include "viết test cypress/playwright cho [page]", page-load console-error smoke, login via API token + localStorage, intercept `**/api/**`, IGNORE_PATTERNS for SignalR/HMR, or fixing flaky tests. Do NOT use for backend PowerShell API tests (use his-test-api-powershell).
metadata:
  type: project
---

# HIS E2E Testing (Cypress + Playwright)

Skill chuẩn hoá cách viết test E2E/UI cho frontend HIS. Hai runner: **Cypress** (smoke page-load + CRUD/flow) và **Playwright** (functional + prod smoke). Bám đúng các convention đã ổn định qua 800+ test (login API token, IGNORE_PATTERNS, intercept `**/api/**`).

## Khi nào dùng

- Viết smoke test page-load (kiểm tra route render + không console.error).
- Viết flow/CRUD test (login → thao tác UI → verify).
- Viết Playwright functional / prod smoke (`e2e-prod/` chạy với `playwright.prod.config.ts`).
- Fix flaky test (timing, intercept sai, status assertion lỏng).

## Khi nào KHÔNG dùng

- Test API backend bằng PowerShell → dùng `his-test-api-powershell`.
- Tạo page/UI → dùng `his-fe-page-v2`.

## Convention BẮT BUỘC (đã ổn định)

### 1. Login qua API token (KHÔNG login qua form UI)
```ts
cy.request({ method:'POST', url:'http://localhost:5106/api/auth/login',
  body:{ username:'admin', password:'Admin@123' } }).then((r) => {
  const token = r.body?.data?.token;                 // token ở data.data.token
  cy.window().then((w) => {
    w.localStorage.setItem('token', token);
    w.localStorage.setItem('user', JSON.stringify({ username:'admin', roles:['Admin'], permissions:['*'] }));
  });
});
```
Playwright: lấy token rồi `page.addInitScript(...)` set localStorage trước `goto`.

### 1b. Tài khoản test THEO MÔI TRƯỜNG (⚠️ KHÔNG hardcode mù)
| Tài khoản | Local (`localhost:5106`) | Prod (Cloud Run) |
|---|---|---|
| Admin | `admin` / `Admin@123` | `admin` / `Admin@123` (giống) |
| **Inspector Portal** | `inspector` / `Inspector@123` (seed migration 44) | **`thanhtra01` / `Inspector@123`** (account `inspector` KHÔNG đúng pass trên prod) |

→ Test cổng thanh tra **đừng hardcode `inspector/Inspector@123`** cho mọi env (đã từng fail trên prod).
Parametrize theo env, ví dụ:
```ts
const INSPECTOR = Cypress.env('PROD')
  ? { u: 'thanhtra01', p: 'Inspector@123' }
  : { u: 'inspector',  p: 'Inspector@123' };
```
Playwright: đọc từ `process.env` / config prod vs local. Verify login trả `success:true` trước khi tiếp.
(Phát hiện khi test prod: `inspector/Inspector@123` → "Mật khẩu không đúng"; `thanhtra01/Inspector@123` → OK.)

### 2. Intercept CHỈ `**/api/**` (KHÔNG `**/*`)
```ts
cy.intercept('**/api/**').as('api');   // ĐÚNG
// cy.intercept('**/*')  ← SAI: bắt cả Vite HMR/WebSocket/Google Fonts → ECONNRESET, flaky
```

### 3. IGNORE_PATTERNS cho console-error smoke
```ts
const IGNORE_PATTERNS = [
  /useForm/, /\[antd:/, /not connected to any Form/, /SignalR/i,
  /\[HMR\]/, /\[vite\]/, /WebSocket/, /findDOMNode/,
];
```
Bắt `console.error` qua `cy.stub(win.console,'error')`, lọc IGNORE_PATTERNS, assert `errors` rỗng.

### 4. Assertion status — chặt nhưng đúng thực tế
- Endpoint chuẩn: `expect(r.status).to.eq(200)`.
- ⚠️ Phân hệ KHÔNG có exception filter (NangCap24): lỗi validation trả **500** (không 400). Assert đúng 500 + message, đừng kỳ vọng 400.
- USB Token / WebAuthn / thiết bị: `this.skip()` hoặc accept `[200,408,500]` (Windows dialog block headless).

### 5. Timeout + retry cho block hay flaky
- `cy.visit(path, { timeout: 30000 })` + `cy.wait(2500)` cho page nặng.
- Block radiology/ris-pacs: `{ retries: { runMode: 2 } }`.

## Quy trình viết 1 smoke spec (Cypress)

1. Tạo `frontend/cypress/e2e/<feature>-pages.cy.ts`.
2. Khai `PAGES = [{ path:'/v2/...', name:'...' }, ...]` + `IGNORE_PATTERNS`.
3. `beforeEach`: intercept `**/api/**` + login API token + set localStorage.
4. `PAGES.forEach` → `it('... loads without console errors')`: stub console.error, visit, wait, assert errors rỗng.
5. Thêm vài `it` API check (vd: `GET /payment/bank/list` trả 5 NH).
6. Chạy: `npx cypress run --spec "cypress/e2e/<feature>-pages.cy.ts" --browser chrome`.

Tham khảo: `references/cypress-pageload-template.cy.ts`, `references/playwright-template.spec.ts`.

## Commands

```powershell
cd frontend
# Cypress 1 spec
npx cypress run --spec "cypress/e2e/<feature>-pages.cy.ts" --browser chrome
# Playwright local
npx playwright test e2e/<feature>-pages.spec.ts
# Playwright prod (e2e-prod) — dùng config prod
npx playwright test e2e-prod/<feature>.spec.ts --config=playwright.prod.config.ts
```
Cần backend `localhost:5106` + frontend `localhost:3001` đang chạy (xem CLAUDE.md "Running").

## Pitfalls (đã fix nhiều lần)

- **`cy.intercept('**/*')`** → bắt HMR/font → ECONNRESET/ENOTFOUND flaky. Luôn `**/api/**`.
- **Token sai chỗ**: `r.body.data.token` (KHÔNG `r.body.token`).
- **DataTable empty-state là 1 `<tr>`** (1 td colspan) → đếm `tbody tr` = 1 dù rỗng. Đếm `tbody tr td.act` (chỉ row thật có cột hành động) hoặc check text "Không có dữ liệu".
- **Antd v6 tab active class chậm**: dùng fallback selector + check body tồn tại, không assert `.ant-tabs-tabpane-active` ngay.
- **Test phụ thuộc ngày** (admissions hôm nay > 0) → fail sau nửa đêm. Dùng `at.least(0)` / check cấu trúc bảng thay vì số lượng.
- **Chạy Cypress + Playwright đồng thời** → API overload, flaky. Chạy riêng khi cần xác nhận pass.
- **Vietnamese diacritic regex**: match exact text thay vì regex có dấu lỏng.

## Reference

- `references/cypress-pageload-template.cy.ts` — smoke spec page-load + API check
- `references/playwright-template.spec.ts` — Playwright page-load + functional

## When to update

- Khi đổi port dev / cấu trúc login / localStorage keys.
- Khi thêm pattern console-error mới cần ignore.
- Khi đổi cách đếm row của DataTable v2.
