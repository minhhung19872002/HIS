---
name: his-fe-convention
description: Use this skill as the mandatory FE coding-convention and architecture guardrail whenever generating or refactoring any HIS frontend code (React + TypeScript + Antd v6 + Vite, pages-v2/_v2kit). Triggers include creating/editing a page or component, adding an api client, refactoring FE code, or reviewing an FE diff before commit. Enforces naming (PascalCase/camelCase/kebab-case/UPPER_CASE), layer separation (UI vs business vs api/service vs state vs validation vs mapper vs constants), folder structure (pages/pages-v2/api/components/hooks/contexts/types/constants/utils), config-driven shared components on Antd base, maintainability/scalability rules, API/data transform layer (no raw-response binding, paged-vs-array, pagination/filter/sort), state placement (local vs context, single source of truth, no Redux/normalized-store over-engineering), security & permission (route guard, permission-based rendering, no hardcoded role, no PII logging), error/loading conventions, backward-compatible incremental refactor, and a self code-review checklist (duplicate logic, dead code, hardcode, god component, long function, import cycle, naming, state, security, error). Do NOT use for backend/SQL (see his-be-*, his-db-migration); pair with his-qa-anti-pattern (cross-tier footguns) and core-* discipline skills.
metadata:
  type: project
---

# HIS Frontend Convention & Architecture Rules

A MANDATORY guardrail for **every** HIS FE code gen/refactor (React 19 + TS + Antd v6 + Vite).
Goal: code always matches the existing convention + architecture, no drift between later AI sessions.
Read TOGETHER WITH the specialty skill (`his-fe-page-v2`, `his-fe-api-client`, `his-fe-antd-v6`…) + `his-fe-library-policy` (consider + explain the **library choice** for each form/data/state/test group — avoid "mass-produced code") + `core-clean-code` (function/statement-level clean code, FE+BE) + `his-qa-anti-pattern`.

## When to use
- Before/while creating or editing any FE file (page, component, hook, api service, type, util).
- When refactoring FE or reviewing an FE diff before commit.

## When NOT to use
- BE/SQL code → `his-be-*` / `his-db-migration`.

> ⚠️ **This is a RULE skill — it does NOT stand alone, it does NOT create files.** It MUST be applied **right while writing/editing
> each piece of FE code** (naming, layer splitting, folder choice, using a shared component, reviewing the diff) — not
> "read it once and ignore". Always go TOGETHER WITH the code-gen skill (`his-fe-page-v2`/`his-fe-api-client`/…).

---

## 1. Naming Convention

| Object | Rule | HIS example |
|---|---|---|
| Component / page file | **PascalCase.tsx** | `HealthCheckup.tsx`, `pages-v2/Reception.tsx` |
| React component | **PascalCase**; a v2 page has the `V2` suffix | `const ReceptionV2: React.FC` |
| api client / hook / util / type file | **camelCase.ts** | `api/healthCheckup.ts`, `hooks/useKeyboardShortcuts.ts`, `utils/cccd.ts` |
| Folder | **camelCase** or kebab (matching existing folders) | `pages-v2/`, `layouts/terminal/` |
| Hook | **camelCase**, `use` prefix | `usePatientSearch`, `useSigningContext` |
| Service/API function | **camelCase**, verb + business noun | `searchAppointments`, `createIssueRequest`, `approveSurgery` |
| Variable / state | **camelCase**, a clear noun | `selectedPatient`, `crudOpen`, `isReminderSent` |
| Props / interface field | **camelCase** | `patientName`, `onRowClick` |
| Event handler | **camelCase**, `on`/`handle` prefix | `onClick`, `handleSubmit`, `openEdit` |
| Boolean | `is/has/should/can` prefix | `isLoading`, `hasPendingOrders`, `canEdit` |
| Type / interface / enum | **PascalCase**; a DTO has the `Dto` suffix matching the BE | `interface SurgeryDto`, `type StatusKey` |
| Constant / config | **UPPER_CASE** (module-level immutable) | `HOSPITAL_NAME`, `STATUS_TABS`, `PAGE_SIZE` |

- **Names reflect the DOMAIN/business**, not generic tech: `prescriptionItems` ✅ not `dataList`/`arr`/`tmp`.
- **No cryptic abbreviations**: `medicalRecord` ✅ not `mr/medRec`. Project-common abbreviations are allowed: BN (patient), CLS (paraclinical), KSK (health checkup), CCHN (practice certificate), BHYT (health insurance).
- DTO fields MUST match the BE names (camelCase JSON) — don't rename them on the FE.
- **A props interface is named `<ComponentName>Props`** (PascalCase + `Props` suffix), fields camelCase: `interface ReceptionPaymentProps { ... }`. A component with props → always declare an interface, don't use inline `{ x }: { x: T }` for complex props.
- **Export — NOT uniform, by LAYER (don't force named export everywhere):**
  - **Page-v2** (`pages-v2/*.tsx`) → **`export default`** (mandatory, for `React.lazy(() => import(...))` in `App.tsx`). E.g. `export default ReceptionV2;`.
  - **Reusable component / print form / util / hook / `_v2kit`** → **named export** (`export const PatientTimeline`, `export function toSignatureStamp`) for a barrel `export *` + selective import.
  - A file split from a god-file → keep **named export** per part + an `index.ts` barrel re-export (keep the old import path).

## 2. FE Architecture Rules (layer separation)

Separate 7 layers, do NOT mix:
1. **UI component** (`pages-v2/*.tsx`, `components/*.tsx`) — render + events; NO complex business logic/fetch.
2. **API/service** (`api/<domain>.ts`) — all axios calls + DTO interfaces. The UI does NOT call axios directly.
3. **Business logic / state** — `hooks/`, `contexts/` (e.g. `AuthContext`, `NotificationContext`, `useSigningContext`).
4. **Validation** — client rules (Antd Form rules) **only support UX**; the **BE is the authoritative validation source** (map BE errors→field via `applyServerErrors`). See `core-validation-pattern`.
5. **Mapper/transform** — a separate `mapXToY` function (e.g. `mapVictimToCase`), don't cram transform logic into JSX.
6. **Constants/config** — `constants/` (e.g. `HOSPITAL_NAME`), option lists declared `const X_TABS = [...]` at module level, NOT hardcoded scattered in JSX.
7. **Types** — `interface`/`type` for DTO + props.

Rules:
- Do **NOT** put business logic in a render function. Complex computation → `useMemo`/a pure helper.
- Do **NOT** call the API directly in a large component if it can be split → use `api/*.ts` + (if repeated) a custom hook.
- **Shared component config-driven + reusable** (see section 5). Avoid duplicate logic/CSS/hardcoded data.
- Prefer **composition** over copy/paste components.

## 3. Maintainability & Scalability (HIS enterprise)

- A large component → split by **responsibility** (e.g. `<XDrawerBody>`, `<XForm>`, sub-panels) — no god-component.
- **A too-long function (> ~60 lines / does many things)** → extract a separate helper/usecase.
- Limit deep **prop drilling** → use context when state crosses many levels (already have `Auth/Notification/Signing` context).
- **Clearly typed models** — no stray `any` (only `// eslint-disable` when truly needed + state the reason).
- Standardize **error/loading/empty state** (see `core-error-loading-state`): a `loading` flag, empty placeholder, `message.error`/`te()` on fetch fail — do NOT swallow errors silently.
- Prefer **config/schema-driven** where it fits (e.g. `CrudFieldCfg[]` for forms, `ColumnDef[]` for tables, `STATUS_TABS` for tabs).
- Limit **side effects in render** — put them in `useEffect`.
- **Centralized constants/enums** — status codes, labels, tone maps declared in one place/module.

## 4. Folder Structure Rules

`frontend/src/`:
| Folder | Contains | When |
|---|---|---|
| `pages-v2/` | v2 pages (TerminalLayout, route `/v2/*`) — **the current main layer** | a new feature defaults here |
| `pages/` | v1 pages (Antd MainLayout, root routes) — legacy | only edit when touching v1 |
| `pages-v2/_v2kit.tsx` | **the standard V2 shared kit** (Btn, DataTable, CrudModal, OptionsSelect…) | reuse before creating new |
| `api/<domain>.ts` | axios client + DTO by domain | every BE call |
| `components/<category>/` | **shared UI-kit dùng chung** — generic, domain-agnostic primitives, grouped by category (see §4a) | reusable by ANY module, no business knowledge |
| `modules/<module>/` | **domain feature dùng riêng** — a module's own pages/components/api/hooks | anything tied to ONE business domain (built out gradually) |
| `hooks/` | a reusable custom hook | repeated stateful logic |
| `contexts/` | React context (auth, notification, signing) | global/cross-level state |
| `layouts/` | layout shell (`terminal/`, `MainLayout`) + design CSS (`ab-module.css`) | — |
| `types/` | shared type/interface | a shared contract |
| `constants/` | business constants (`hospital.ts`) | fixed data |
| `utils/` | pure functions not depending on React | a general helper |

- **Shared when**: used in ≥2 places OR it's a design-primitive → put it in `_v2kit`/`components/`.
- **Keep local to the module when**: only 1 page uses it (sub-component, field config, dedicated mapper) → declare it right in that page file.
- **★ Do NOT put a new file at the repo root** or outside the folder tree — always into the right-type folder above. No suitable folder → **propose the user creates the folder** before placing the file (see `his-qa-anti-pattern` #28-29).

## 4a. ★ Component placement — dùng chung vs dùng riêng (MANDATORY)

`src/components/` is being reorganized (folder-restructure, 2026-07) so **every** component lands in exactly one of three homes. Classify BEFORE creating/moving a component:

**A. Dùng chung (shared) → `src/components/<category>/<Component>/`**
- Criterion: a **generic UI primitive with ZERO business-domain knowledge**, reusable by any module (button, input wrapper, table kit, modal/drawer shell, empty/error/loading state, permission gate…).
- The **only** sub-folders allowed under `components/` are the semantic **categories** (each holds `<Component>/` folders, re-exported via a category `index.ts` barrel, then via `components/index.ts`):
  `actions` · `common` · `dataDisplay` · `feedback` · `form` (App* wrappers over Antd) · `layout` · `navigation` · `overlay` · `permission` · `table` · `upload` · `digitalSignature`.
- ⚠️ The `components/` **ROOT must end up containing ONLY these category folders** — no loose domain `.tsx` at root.

**B. Dùng riêng (private) → `src/modules/<module>/components/`**
- Criterion: tied to **ONE business domain** — even if reused by ≥2 pages of that domain (prints, DICOM/RIS viewers, AI widgets, payment/refund modals, signature pads, lab/pharmacy/patient banners…).
- Lives with its module; it is **NOT** a shared category.

**C. Local to one page** (§4, unchanged): only 1 page uses it → declare inside that page file.

**Decision order:** domain-specific? → **B (module)**. Else a generic primitive reused ≥2 places? → **A (category)**. Else 1 page only? → **C (local)**.

**Move discipline — GRADUAL + behavior-preserving ("chuyển dần", one component at a time):**
1. Move the file → new path; keep its **named export**; add a **back-compat re-export at the OLD path** when importers are many (no mass import-churn in one diff).
2. Update importers (or rely on the re-export) — **smallest correct diff, NO logic/style change**.
3. `npm run build` EXIT 0 (§7 build-gate) after each move; spot-check per `core-minimal-change`.
4. **DEFER** money · external-integration (DICOM/RIS/LIS/AI/SignalR) · patient-safety components to a session **with smoke-test** (`core-prod-change-discipline`). Do **NOT** big-bang all domain files at once.

## 5. Component Rules

- **★ REUSE-FIRST (MANDATORY, FE too):** before writing a new component/hook/util/api → **check whether it exists**
  (grep `_v2kit`, `components/<category>/` (§4a), `hooks/`, `utils/`, `api|services/`, `constants/`). Already there → **reuse / extend / compose**,
  do NOT duplicate. See `core-reusable-code`. A new shared primitive → put it in the right §4a category, not at `components/` root.
- **★ ANTD-FIRST (MANDATORY):** always prefer an **Ant Design v6** component (or a `_v2kit` primitive that already wraps Antd)
  as the base. Do **NOT write plain HTML/CSS** (hand-built `<div>`/`<input>`/`<select>`/`<table>`/`<button>`) to mimic
  something Antd/`_v2kit` already has (Input/Select/Radio/Checkbox/Table/Modal/Tabs/DatePicker/`Btn`/`DataTable`/`CrudModal`…).
  Only hand-build/self-style when (a) it's an agreed `ab-*` terminal design-primitive, or (b) Antd genuinely can't do it — and then **wrap it in a shared component**, don't scatter raw HTML across the page.
- **Input/Select/Radio/Checkbox/Table/Modal take a JSON config** instead of inline hardcoded options:
  use `OptionsSelect` / `RadioField` / `CheckboxField` / `AbSelect` / `CrudModal` (`CrudFieldCfg[]`) + `normalizeOptions`/`fieldNames` (map label/value/disabled/group/children/custom-field/async). Kit definition + usage: `frontend/src/pages-v2/_v2kit.tsx`.
- **Fully typed props** for every component.
- **No meaningless wrapper** just to wrap an Antd layer that adds no value.
- Antd v6: use the new props (`orientation`/`title`/`size`/`destroyOnHidden`…), avoid deprecated — see `his-fe-antd-v6`.

## 6. Refactor Rules

Priorities (read alongside `core-refactor`):
1. **Backward compatibility** — don't break the existing HIS API/props/flow.
2. **Don't change out-of-scope behavior** + **don't change style** unless requested.
3. **Migrate incrementally** instead of a full rewrite ("re-call the shared component when needed", no mechanical mass-replace).
4. Do NOT mechanically replace when the logic/style is specially different (e.g. the standalone portal's light-theme, a radio with its own descriptions).

When you find **technical debt** → note clearly:
- **Impact level** (which pages / how many places).
- **Suitable refactor direction**.
- **Related dependencies** (component/api/contract touched).

## 7. Code Review Rules (AI self-checks before reporting done)

A self-check checklist per FE diff — **= the canonical 9-point self-review (`his-qa-anti-pattern` #30) from the FE view + 2 extra FE slices (API/Data-transform, Security/Permission-render)**. NOT an independent checklist; the "9 points" quoted in the hook/checklist still hold, FE just adds detail:
- [ ] **Duplicate logic / CSS** — reused `_v2kit`/`components`/helper?
- [ ] **Dead code** — unused imports/vars/functions (note `noUnusedLocals=false` in `tsconfig.app` → clean up yourself, don't leave junk).
- [ ] **Hardcoded data** — hospital name/URL/credential/option must come from `constants`/config/`api` (NO hard mock).
- [ ] **Anti-pattern** — see `his-qa-anti-pattern` (cy.intercept('**/*'), swallowing errors…).
- [ ] **God component / too-long function** — split by responsibility.
- [ ] **Import cycle** — no import loop.
- [ ] **Naming** — per section 1; clear domain names.
- [ ] **State management** — state at the right level (local vs context), no deep prop-drill, no side effect in render (§8).
- [ ] **API/Data** — call via `api/*.ts`, no binding raw response into UI, paged-vs-array normalized (§8).
- [ ] **Security/Permission** — route inside a guard, hide actions by permission, NO hardcoded role, no PII logging (§9).
- [ ] **Error/Loading** — complete loading/empty/error, standardized API error, `console.warn` for an expected error (§10).
- [ ] **Clean build** — `npm run build` (tsc -b strict + vite) EXIT 0 before reporting done; `tsc --noEmit` isn't enough.

## 8. API & Data / State (transform + data source)

- **Every BE call via `api/<domain>.ts`** (the shared axios `apiClient`) — UI/component does NOT `axios`/`fetch` directly.
- **Do NOT bind the raw API response straight into the UI** when the shape differs from the display need → have a **DTO interface** + (when needed) a **mapper** `mapXToVm`. Derived display fields go in the mapper/`useMemo`, not computed in JSX.
- **Paged vs array**: the BE returns a bare array in some places, `{items,totalCount}` in others → always normalize `Array.isArray(b)?b:(b.items??[])` (see `his-fe-api-client`).
- **Pagination/filter/sort**: client-side for a list ≤ a few hundred rows (currently using `Pager`+`useMemo` filter); a large list → server-side via `pageIndex/pageSize/keyword` params. Keep the param names CONSISTENT with the BE.
- **State**: place it at the **right level** — local (`useState`) for local UI; **Context** (`Auth/Notification/Signing`) for state across many levels; **single source of truth**, derived via `useMemo` (do NOT copy into drifting state). After a mutation → **refetch** (`load()`), don't hand-edit the cache.
  - ⚠️ **Don't over-engineer**: the project does **not** use Redux/normalized store/state-machine — don't propose them. Context + local + refetch is the current standard.

## 9. Security & Permission (HIS — sensitive patient data)

- **Route guard**: an internal page must be behind `ProtectedRoute` (JWT) inside the layout; an external portal → `his-fe-standalone-portal` (separate login/role). Do NOT leave a route outside the guard.
- **Permission-based rendering**: hide/show button/menu/tab by the user's role/permission (read from `AuthContext`), do NOT render an action the user lacks permission for. **The BE must still authorize** (FE hiding is just UX, not security).
- **Do NOT hardcode role/permission** scattered around → match via a centralized constant/enum; add a new role in one place.
- **Sensitive data**: do NOT log token/PII to the console; do NOT bake a secret into the bundle (only public `VITE_*`); mask/minimize patient info by permission.

## 10. Error Handling & Logging

- **Every fetch/submit** has `loading` + `empty` + `error` (see `core-error-loading-state`). Don't leave it blank/forever-spinner/silently-failing.
- **Standardize the API error**: read `e?.response?.data?.message` to show the message; a BE validation error → map to the field (`applyServerErrors`).
- **Notifications**: use Antd `message`/the `tk/ti/tw/te` helper (kit) — consistent, NO `alert()`.
- **Logging**: an "expected/allowed" API error → `console.warn` (project convention), NOT `console.error` (noise); remove debug `console.log` before reporting.
- **ErrorBoundary** already in the layout — don't swallow a runtime error; for a business error notify the user, don't crash to a blank page.

> Goal: a later AI session reading this skill knows how to name / split layers / build folders / use the shared component /
> handle data-state-security-error per the existing HIS architecture — no off-convention generation, no forgetting the existing kit,
> NO over-engineering (see the boundary in §8 + `core-minimal-change`).
