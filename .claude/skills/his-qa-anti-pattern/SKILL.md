---
name: his-qa-anti-pattern
description: Use this skill as a guardrail whenever generating or refactoring HIS code (backend, frontend, SQL, tests) to avoid the project's known footguns and to respect patient-safety / audit / compliance rules. Triggers include any code-gen or refactor task in HIS, reviewing a diff, or before committing. Reminds: never forget DI registration, never use cy.intercept('**/*'), never hardcode hospital name/URL/credentials, never skip audit log or drug-safety checks, never introduce CQRS/MediatR/Next.js.
metadata:
  type: project
---

# HIS Anti-Patterns & Safety Guardrails

A "defensive" skill — the list of things you **must NOT do** in HIS + patient-safety / audit / legal constraints. Applies to EVERY code gen/edit task (BE/FE/SQL/test) and when reviewing a diff before commit. Read alongside the related specialty skill.

## 🔴🔴 SUPREME P0 — NO HALLUCINATION / NO FABRICATION (the foundation of every other rule)

> **ABSOLUTELY DO NOT** hallucinate · infer · assume · fabricate · make something up and add it.
> **Do NOT invent** a file / function / class / component / endpoint / field / DB column / prop / config key /
> logic structure / data flow that **does not exist** in the current codebase.
>
> - Before referencing/editing/asserting anything → you **MUST verify** via Read/Grep/Glob in the real code
>   (`core-verify-before-assert`). Only say "X exists/does" when you've **seen it firsthand**.
> - Separate **"verified"** vs **"assumed"**: if you can't check it → clearly write "assumed/not verified",
>   do NOT present a guess as fact.
> - Unsure / missing facts → **STOP and ask the user** (`core-requirement-clarify`), do NOT guess and code.
> - Recalling from memory/work-log/old docs → you still must **re-verify** the file/symbol still exists before using it.
> - Violating this rule breaks every other rule (code based on something unreal) → the **highest P0**.

## When to use

- Before/while generating or refactoring any HIS code.
- When reviewing a diff / preparing to commit.
- When unsure whether an approach violates a convention/safety rule.

## When NOT to use

- Not a code-gen skill — it doesn't create files. Use it alongside another skill.

## ❌ NEVER — Architecture / Backend

1. **Forgetting to register DI** for a new service/controller in `DependencyInjection.cs` → a **500 runtime** with no clear stack trace. Always check DI first on a 500. (see `his-be-module-scaffold`)
2. **Proposing / using CQRS, MediatR, FastEndpoints, Minimal API, Next.js, shadcn, Tailwind-first** — the project does NOT use them. Keep Controller+Service / React+Vite+Antd / _v2kit.
3. **`dotnet ef migrations`** relying on auto-apply — the project IGNOREs pending model changes. You must write a hand-written numbered SQL script `NN_*.sql` (see `his-db-migration`).
4. **Changing the architecture / a large refactor not requested**. Keep the 4-layer, keep behavior.
5. **`try/catch` swallowing an exception in a service** then returning empty (hiding the error). Let the middleware/controller handle it.
6. **Injecting a scoped (DbContext) into a singleton** → a scope error. Use `IServiceScopeFactory` if needed.

## ❌ NEVER — Frontend / Test

7. **`cy.intercept('**/*')`** → catches Vite HMR/WebSocket/Google Fonts → ECONNRESET/ENOTFOUND flaky. Always `**/api/**`.
8. **Logging in via the UI form in a test** → slow/flaky. Use an API token + set localStorage (see `his-test-e2e`).
9. **`console.error` for an expected API error** → fails the `console-errors.cy.ts` smoke. Use `console.warn`.
10. **Antd deprecated props** (`Space direction`, `Alert message`, `Drawer width`, `destroyOnClose`...) → use the v6 API (see `his-fe-antd-v6`).
11. **Mixing v1/v2 UI** (importing `_v2kit`/`ab-*` into an Antd v1 page or vice versa).
12. **Running only `tsc --noEmit`** then committing — `tsc -b` (the Vercel build) is stricter. Always `npm run build` before commit/deploy.

## ❌ NEVER — Deploy / Data

13. **Pushing BE code and thinking it's deployed** — Cloud Run does NOT auto-deploy. You must `gcloud builds submit` + `run services update` (see `his-ops-deploy`).
14. **Seeding mock/fake data to prod** when the user asked for real data — data must come from the real DB.
15. **Dropping `IF NOT EXISTS` / `COL_LENGTH IS NULL`** in a SQL script → not idempotent → breaks on re-run.

## ❌ NEVER — Hardcode

16. **Hardcoding the hospital name** → use `frontend/src/constants/hospital.ts` (HOSPITAL_NAME/ADDRESS/PHONE).
17. **Hardcoding a URL/host** (Orthanc, API) → use env (`VITE_API_URL`, `VITE_ORTHANC_URL`) / config.
18. **Hardcoding credentials / token / connection string** in code or a skill.
19. **Putting a skill file outside `.claude/skills/`** (e.g. in `docs/`). docs = documentation, skill = `.claude/skills/`.

## ⚠️ ALWAYS — Patient safety (clinical)

20. **Do NOT skip drug-safety checks**: drug interactions (high severity), allergy, contraindication — there's already a `DrugInteractionService`/`DrugAllergyService`. When touching prescribing/dispensing, keep these checks.
21. **Do NOT loosen eligibility conditions on your own** (e.g. driving-license eligibility — auto-computed per TT 24/2023). Keep defense-in-depth.
22. **Patient / dose / order mapping**: extremely careful — a mistake = life-threatening. Verify Patient↔MedicalRecord↔Order is correct.

## ⚠️ ALWAYS — Audit & Compliance (legal)

23. **Keep the audit log** for every mutation (AuditLogMiddleware logs POST/PUT/DELETE; inspection access log; signature log; study activity). Do NOT drop it.
24. **CreatedBy/UpdatedBy** = the right user (NOT `Guid.Empty` — once caused a 500 FK at payment confirm). Resolve the real user, with a valid fallback.
25. **Digital signature / medical records / interop** (BHYT XML, HL7/FHIR, De An 06): if it's an MVP/placeholder (e.g. biometric not yet verifying a real signature, signed-XML placeholder) → **clearly note it as a known-risk**, do NOT treat it as a fully legal signature.
26. **Medical-record privacy**: tight role guards (e.g. `BhxhInspector` separate from a normal user). Do NOT loosen record access.

## ⚠️ ALWAYS — Build-gate BEFORE reporting done (MANDATORY)

27. **After EVERY add / edit / DELETE of code → you MUST build the touched tier clean BEFORE reporting done.** Applies to all 3 operations (deleting a file/function can break an import/reference too). Do NOT report "done" before building (violates `core-execution-output`: no claiming success unverified).
    - **Touched FE** (`frontend/src/**`): `cd frontend && npm run build` (= `tsc -b` strict + `vite build`) → **EXIT 0**. NOT just `tsc --noEmit` (looser than Vercel — has let errors slip through).
    - **Touched BE** (`backend/src/**`): `cd backend && dotnet build HIS.sln` → **0 Errors** (pre-existing warnings OK). If the DLL is locked because the app is running → kill the process on port 5106 before building.
    - **Touched both tiers** → build BOTH FE and BE. **Only changed `.claude/`/docs/script** (no source) → no build needed, say "no build needed".
    - Build **fails** → auto-expand the root-cause + fix it all, **do NOT report done** while errors remain. The report must state the build status (e.g. "npm run build EXIT 0", "dotnet build 0 errors").

## ⚠️ ALWAYS — File/folder structure (put files in the right place)

28. **ABSOLUTELY DO NOT create a new file at the repo root.** Every new file MUST be in the right-type folder:
    - FE: `frontend/src/{pages-v2,pages,api,components,hooks,contexts,types,constants,utils,layouts}/` · design CSS `layouts/terminal/`.
    - BE: `backend/src/HIS.{Core/Entities,Application/{DTOs,Services},Infrastructure/Services,API/Controllers}/` · SQL `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql` or `scripts/`.
    - Test: `frontend/cypress/e2e/`, `frontend/e2e/`, `frontend/e2e-prod/`, `test-*.ps1` → the matching test folder. Docs → `docs/`. Skill → `.claude/skills/<name>/`.
29. **No folder matches that file type** → **STOP, propose the user creates the folder** (state name + location + reason) → only after approval, create the folder then place the file. Do NOT dump it at the root temporarily.

## ⚠️ ALWAYS — 9-point self code-review (AI SELF-reviews, BOTH BE + FE, before reporting done)

30. **After generating/editing BE or FE code, the AI MUST self-review the 9 points below before reporting "done"** (without waiting for the user). On finding a violation → fix it before reporting. (FE detail: `his-fe-convention` §7; function-level: `core-clean-code` §9.)

| # | Point | FE check | BE check |
|---|---|---|---|
| 1 | **Duplicate logic** | reuse `_v2kit`/`components`/`hooks`/`utils` first | reuse an existing Service/helper/extension, no copying logic between services |
| 2 | **Dead code** | unused imports/vars/functions, commented-out code, `console.log` | unused using/method/field, commented-out code, unused vars |
| 3 | **Hard-coded data** | hospital name/URL/credential/option → `constants`/env/`api` | connection string/secret/magic status → config/const/enum (Core) |
| 4 | **Anti-pattern** | `cy.intercept('**/*')`, swallowing errors, raw HTML instead of Antd | **forgotten DI**, `try/catch` swallowing an exception, CQRS/EF-migrate (❌ section above) |
| 5 | **Component/unit too large** | a god-component → split into sub-component/panel | a god-service/controller → split by responsibility |
| 6 | **Function too long** | > ~50–60 lines → extract a helper (guard clause) | a long method → extract a private method/usecase |
| 7 | **Import cycle** | no TS import loop | no circular namespace/project-ref; keep the direction Core→App→Infra→API |
| 8 | **Wrong-convention naming** | `his-fe-convention` §1 (Pascal/camel/UPPER) | PascalCase type/method, camelCase local/param, clear domain names |
| 9 | **Unreasonable state management** | single source of truth, local vs context, no prop-drill/side-effect-in-render | **stateless service** (no mutable shared state), correct DI lifetime (Scoped/Singleton), no holding request state in a singleton |

> The completion report should confirm the 9-point self-review + a clean build (#27). This is a **self-check** gate, not optional.

## General rules

- **Reuse over create**: find an existing pattern/component/service first (see the Code Reuse Rules in the gen prompt).
- **Ask when unsure, don't guess** — especially clinical business.
- **Explicit**: state clearly what you're doing + why.

## When to update

- When a new footgun is found (add it to the list).
- When the safety/legal/audit convention changes.
- When a known-risk is fixed (update the status MVP → done).
