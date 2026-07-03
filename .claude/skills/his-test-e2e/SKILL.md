---
name: his-test-e2e
description: Use this skill when writing or fixing E2E/UI tests for HIS frontend using Cypress (`frontend/cypress/e2e/*.cy.ts`) or Playwright (`frontend/e2e/*.spec.ts`, `frontend/e2e-prod/*.spec.ts`). Triggers include "write a cypress/playwright test for [page]", page-load console-error smoke, login via API token + localStorage, intercept `**/api/**`, IGNORE_PATTERNS for SignalR/HMR, or fixing flaky tests. Do NOT use for backend PowerShell API tests (use his-test-api-powershell).
metadata:
  type: project
---

# HIS E2E Testing (Cypress + Playwright)

A skill standardizing how to write E2E/UI tests for the HIS frontend. Two runners: **Cypress** (page-load smoke + CRUD/flow) and **Playwright** (functional + prod smoke). Follow the conventions stabilized over 800+ tests (login API token, IGNORE_PATTERNS, intercept `**/api/**`).

## When to use

- Writing a page-load smoke test (check the route renders + no console.error).
- Writing a flow/CRUD test (login → UI actions → verify).
- Writing a Playwright functional / prod smoke (`e2e-prod/` runs with `playwright.prod.config.ts`).
- Fixing a flaky test (timing, wrong intercept, loose status assertion).

## When NOT to use

- Backend API tests in PowerShell → use `his-test-api-powershell`.
- Creating a page/UI → use `his-fe-page-v2`.

## MANDATORY conventions (stabilized)

### 1. Login via API token (NOT login via the UI form)
```ts
cy.request({ method:'POST', url:'http://localhost:5106/api/auth/login',
  body:{ username:'admin', password:'Admin@123' } }).then((r) => {
  const token = r.body?.data?.token;                 // token is at data.data.token
  cy.window().then((w) => {
    w.localStorage.setItem('token', token);
    w.localStorage.setItem('user', JSON.stringify({ username:'admin', roles:['Admin'], permissions:['*'] }));
  });
});
```
Playwright: get the token then `page.addInitScript(...)` to set localStorage before `goto`.

### 1b. Test accounts BY ENVIRONMENT (⚠️ do NOT hardcode blindly)
| Account | Local (`localhost:5106`) | Prod (Cloud Run) |
|---|---|---|
| Admin | `admin` / `Admin@123` | `admin` / `Admin@123` (same) |
| **Inspector Portal** | `inspector` / `Inspector@123` (seed migration 44) | **`thanhtra01` / `Inspector@123`** (the `inspector` account has the wrong password on prod) |

→ Testing the inspector portal, **don't hardcode `inspector/Inspector@123`** for every env (it once failed on prod). Parametrize by env, e.g.:
```ts
const INSPECTOR = Cypress.env('PROD')
  ? { u: 'thanhtra01', p: 'Inspector@123' }
  : { u: 'inspector',  p: 'Inspector@123' };
```
Playwright: read from `process.env` / a prod vs local config. Verify login returns `success:true` before continuing.
(Discovered while testing prod: `inspector/Inspector@123` → "wrong password"; `thanhtra01/Inspector@123` → OK.)

### 2. Intercept ONLY `**/api/**` (NOT `**/*`)
```ts
cy.intercept('**/api/**').as('api');   // CORRECT
// cy.intercept('**/*')  ← WRONG: catches Vite HMR/WebSocket/Google Fonts → ECONNRESET, flaky
```

### 3. IGNORE_PATTERNS for the console-error smoke
```ts
const IGNORE_PATTERNS = [
  /useForm/, /\[antd:/, /not connected to any Form/, /SignalR/i,
  /\[HMR\]/, /\[vite\]/, /WebSocket/, /findDOMNode/,
];
```
Catch `console.error` via `cy.stub(win.console,'error')`, filter by IGNORE_PATTERNS, assert `errors` is empty.

### 4. Status assertion — strict but realistic
- Standard endpoint: `expect(r.status).to.eq(200)`.
- ⚠️ A module with NO exception filter (NangCap24): a validation error returns **500** (not 400). Assert exactly 500 + message, don't expect 400.
- USB Token / WebAuthn / device: `this.skip()` or accept `[200,408,500]` (a Windows dialog blocks headless).

### 5. Timeout + retry for blocks that are flaky
- `cy.visit(path, { timeout: 30000 })` + `cy.wait(2500)` for a heavy page.
- The radiology/ris-pacs block: `{ retries: { runMode: 2 } }`.

### 6. Evidence & Traceability — MANDATORY for EVERY UI test
Every UI test case MUST: (a) **capture an evidence screenshot**, (b) **clearly state the SCREEN + BUSINESS** for tracking/traceability.
- **Test name = screen + business + case**: `describe('[Reception] Patient check-in', …)` + `it('TC01 - register a BHYT patient → create a visit', …)`. The name must clearly say which screen · which business/case (no vague names like "test 1").
- **Screenshot per case** (capture even on PASS at a key milestone: after submit / when the result shows):
  - Cypress: `cy.screenshot('Reception/TC01-dang-ky-bhyt', { capture:'viewport' })` → saved to `cypress/screenshots/`. (Cypress auto-captures on fail; add a manual capture at the key milestone.)
  - Playwright: `await page.screenshot({ path:'test-results/Reception/TC01-dang-ky-bhyt.png', fullPage:true })`; enable in config `screenshot:'on'` + `trace:'on'` + `video:'retain-on-failure'`.
- **Evidence file name**: `<Module>/<TCxx>-<business-kebab>[-<state>].png` (e.g. `Billing/TC03-refund-amount-negative-reject.png`). Responsive/theme add a suffix `-mobile375` / `-dark`.
- **Responsive (T6)/Dark (T7):** capture evidence at EACH breakpoint (320/375/414/768/1366/1920) and EACH theme (light+dark).
- **Report** (in the Issue/PR when closing the task): a table `Screen · Business · Case · Evidence(image/link) · Pass/Fail`.
- Store evidence centrally: `frontend/cypress/screenshots/` · `frontend/test-results/`. Consider **visual-regression** `toHaveScreenshot()` to auto-diff pixels (baseline) — less manual inspection.

## Process to write one smoke spec (Cypress)

1. Create `frontend/cypress/e2e/<feature>-pages.cy.ts`.
2. Declare `PAGES = [{ path:'/v2/...', name:'...' }, ...]` + `IGNORE_PATTERNS`.
3. `beforeEach`: intercept `**/api/**` + login API token + set localStorage.
4. `PAGES.forEach` → `it('... loads without console errors')`: stub console.error, visit, wait, assert errors empty.
5. Add a few `it` API checks (e.g. `GET /payment/bank/list` returns 5 banks).
6. Run: `npx cypress run --spec "cypress/e2e/<feature>-pages.cy.ts" --browser chrome`.

Reference: `references/cypress-pageload-template.cy.ts`, `references/playwright-template.spec.ts`.

## Commands

```powershell
cd frontend
# Cypress 1 spec
npx cypress run --spec "cypress/e2e/<feature>-pages.cy.ts" --browser chrome
# Playwright local
npx playwright test e2e/<feature>-pages.spec.ts
# Playwright prod (e2e-prod) — use the prod config
npx playwright test e2e-prod/<feature>.spec.ts --config=playwright.prod.config.ts
```
Needs the backend `localhost:5106` + frontend `localhost:3001` running (see CLAUDE.md "Running").

## Pitfalls (fixed many times)

- **`cy.intercept('**/*')`** → catches HMR/font → ECONNRESET/ENOTFOUND flaky. Always `**/api/**`.
- **Token in the wrong place**: `r.body.data.token` (NOT `r.body.token`).
- **The DataTable empty-state is one `<tr>`** (1 td colspan) → counting `tbody tr` = 1 even when empty. Count `tbody tr td.act` (only real rows with an action column) or check the text "No data".
- **Antd v6 tab active class is slow**: use a fallback selector + check the body exists, don't assert `.ant-tabs-tabpane-active` immediately.
- **Date-dependent test** (today's admissions > 0) → fails after midnight. Use `at.least(0)` / check the table structure instead of the count.
- **Running Cypress + Playwright simultaneously** → API overload, flaky. Run separately when you need to confirm a pass.
- **Vietnamese diacritic regex**: match exact text instead of a loose diacritic regex.

## Reference

- `references/cypress-pageload-template.cy.ts` — page-load smoke spec + API check
- `references/playwright-template.spec.ts` — Playwright page-load + functional

## When to update

- When the dev port / login structure / localStorage keys change.
- When adding a new console-error pattern to ignore.
- When the v2 DataTable row-counting approach changes.
