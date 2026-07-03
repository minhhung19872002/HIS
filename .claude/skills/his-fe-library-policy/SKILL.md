---
name: his-fe-library-policy
description: Use this skill before generating or refactoring any HIS frontend code to make a deliberate, justified library choice per category (forms, validation, API/data-fetching, client state, dates, charts, testing, error handling) instead of reflexively reusing one pattern ("mass-produced code"). Triggers include creating/editing a page/component/form/api-client/hook in frontend/src, deciding how to fetch data or manage state, adding a form with validation, picking a chart or test approach, or any "which library should I use" decision. Encodes the HIS DEFAULT per category (Antd v6 Form + _v2kit CrudModal/applyServerErrors for forms, axios apiClient + useEffect/refetch for data, local useState + Context for state, dayjs for dates, recharts for charts, Cypress + Playwright for tests) AND a controlled adoption path for libraries NOT yet installed (react-hook-form + zod + @hookform/resolvers, @tanstack/react-query, Zustand, Vitest + Testing Library): permitted only when measurably better for that case, with explicit user approval + npm install + incremental coexistence, never a blanket rewrite of existing Antd-Form/axios pages. Do NOT use for backend/SQL library choices, and never as a license to introduce a new dependency silently. Pair with his-fe-convention, his-fe-page-v2, his-fe-api-client, his-fe-performance, core-architecture-consistency, core-minimal-change.
metadata:
  type: project
---

# HIS Frontend — Library Decision Policy

> TIER: **B · HIS (FE)**. The discipline of **considering + explaining the library choice** BEFORE generating/refactoring FE code —
> so code is **fit-for-purpose**, NOT "mass-produced" (reflexively repeating one pattern for every problem).
> Goes TOGETHER WITH `his-fe-convention` (guardrail) + the code-gen skill (`his-fe-page-v2`/`his-fe-api-client`).

## Golden principles
1. **Consider before writing:** each time you gen FE, for each group (form / validate / data-fetch / state / date / chart / test / error) → state a clear 1-line "use X because Y". Don't default-copy the old pattern without thinking.
2. **Default = the lib HIS already uses** (table below) → stay consistent, don't break 200+ pages, don't add surplus deps.
3. **Adopt a NEW lib when there's a clear win** (measurable/specific reason) — NOT absolutely forbidden, but through a **gate**: (a) explain why the default isn't enough → (b) **ask the user to approve** → (c) `npm install` → (d) **coexist** (apply only to NEW code, do NOT mass-rewrite old code) → (e) build/typecheck/eslint pass.
4. **Don't over-engineer:** a new lib adds a dependency + learning-curve + bundle → only when the value > the cost (`core-minimal-change`, `his-fe-performance` measure before optimizing).

## When to use
- Before creating/editing a page, component, form, api client, hook; when choosing how to fetch data / manage state / validate / draw a chart / write a test.

## When NOT to use
- Choosing a BE/SQL lib → `his-be-*`. Do NOT use this skill to sneak in a dep (always needs user approval).

## Decision table (HIS DEFAULT · CONSIDER a new lib when…)

| Group | DEFAULT (in use, preferred) | CONSIDER a new lib when… (via the gate in §3) |
|---|---|---|
| **Form** | **Antd v6 `Form`** + `_v2kit` `CrudModal`/`applyServerErrors` (`form.validateFields`) | `react-hook-form` (+`@hookform/resolvers`): a **very complex** form (large dynamic arrays, deep nesting, cross-field, measurable heavy re-render) that Antd Form struggles with |
| **Validate** | Antd `Form` rules (client) + **BE is authoritative** (P0 — don't trust the client) | `zod`: a schema shared/reused in many places, parsing external data, complex reusable validation |
| **Data fetch** | **axios** (`api/*` via `apiClient`) + `useEffect`+`useState`+`.then`/`reload()` (or a small hook) | `@tanstack/react-query`: need **cache/refetch/invalidate/optimistic/pagination** shared across many components (heavy server-state) |
| **HTTP** | **axios** (`apiClient` — interceptor token built in) | plain `fetch` only with a reason (stream, no interceptor needed) — must justify |
| **State** | **local `useState` first** → **Context** for cross-tree | `Zustand`: widely-shared global client-state, frequent updates, Context causing painful re-renders (measurable). **AVOID Redux** |
| **Date** | **`dayjs`** (always) | — |
| **Chart** | **`recharts`** (in use: Dashboard, LabQC Levey-Jennings) | another chart lib only when recharts can't draw the needed chart type |
| **Test** | **Cypress** (E2E + component) + **Playwright** (E2E) | `Vitest` + `@testing-library`: fast unit/logic/hook tests (needs install + setup) |
| **Error** | `ErrorBoundary` at the route/page boundary · **NO silent fail** (`message` + `console.warn` expected-error / `console.error` unexpected) · complete error/loading/empty (`core-error-loading-state`) | — |

> Libs currently **IN** `package.json`: antd, axios, dayjs, recharts, react-router-dom, @microsoft/signalr, cornerstone, qrcode.react, xlsx, cypress, @playwright/test.
> Libs **NOT yet installed** (need the §3 gate to add): react-hook-form, zod, @hookform/resolvers, @tanstack/react-query, zustand, vitest, @testing-library/*.

## Rules when ADDING a new lib (all 5 mandatory)
1. State the problem the default doesn't solve well (specific, measurable if perf).
2. **Ask the user to approve** (the lib + reason + bundle/dep cost) — do NOT install on your own.
3. `npm install` the right package (+ devDependency if it's test/tooling).
4. **Coexist:** use it only for the NEW part; do NOT mass-migrate old Antd-Form/axios/Context (`core-minimal-change`, backward-compat).
5. Build-gate: `npm run build` (tsc -b + vite) EXIT 0 + eslint pass before reporting done.

## Quality (P0 — always apply)
- Pass **eslint** + **typecheck** + **build** before reporting done (already the build-gate `his-qa-anti-pattern` #27).
- Don't add a "just-in-case" dep; don't introduce a new lib then leave old + new code on divergent patterns for no reason.

## Related
`his-fe-convention` (ANTD-FIRST + layer) · `his-fe-page-v2` (v2 page `_v2kit`) · `his-fe-api-client` (axios pattern) · `his-fe-performance` (measure before optimizing) · `core-architecture-consistency` (follow precedent) · `core-minimal-change` (YAGNI).
