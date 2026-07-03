# Skill-routes · Deep reference (read when needed)

> The heavy lookup section, split out of the slim SKILL-MAP to save tokens. Read it only when you need the
> end-to-end playbook or the full dependency map. Everyday routing uses SKILL-MAP + the per-tier sub-map.

## (3) Step-by-step "route" diagram (template — apply to similar tasks)

**Task: add a module (backend + v2 page + test)**
1. **Before coding** — inspect: a similar module/`*CompleteService` (`core-reusable-code`); the existing layer + DI
   (`core-architecture-follow`); a sample v2 page in `pages-v2/` + `_v2kit`.
2. **Backend** — `his-be-module-scaffold`: Entity → DTO (`core-types-contract`) → `IXxxService`/`XxxService`
   (validate per `core-validation-pattern`) → **register DI** → Controller. New table → `his-db-migration`
   (idempotent `NN_*.sql` script). Build: `dotnet build`.
3. **Frontend** — `his-fe-api-client` (`api/x.ts` + DTO) → `his-fe-page-v2` (page using `_v2kit`, state per
   `core-error-loading-state`, text per `core-localization-pattern`) → route `App.tsx` + menu `TerminalLayout`.
   Build: `npm run build`.
4. **Test** — `core-testing-architecture` to pick the level → `his-test-e2e` (page-load smoke + flow) /
   `his-test-api-powershell` (API). Reuse fixtures per `core-testing-reuse`.
5. **Cross-cutting guardrail** — `his-qa-anti-pattern` (don't forget DI, don't hardcode, keep audit/patient-safety).
6. **Deploy** — `his-ops-deploy` (manual Cloud Run + verify schema-drift; remember Vercel auto-deploys FE).

## (4) Dependency map (his → core)

```
his-fe-convention            → core-reusable-code, core-architecture-follow, core-architecture-consistency, core-refactor, his-qa-anti-pattern (★ with EVERY FE code-gen/refactor)
his-fe-page-v2               → core-reusable-code, core-error-loading-state, core-architecture-follow, his-fe-convention
his-fe-api-client            → core-types-contract
his-fe-antd-v6               → core-error-loading-state, core-localization-pattern
his-fe-webauthn-biometric    → core-types-contract, core-error-loading-state, his-fe-api-client
his-fe-standalone-portal     → core-error-loading-state, core-validation-pattern, his-fe-api-client
his-fe-dicom-viewer          → core-reusable-code, core-error-loading-state
his-be-payment-gateway       → core-types-contract, core-validation-pattern, his-be-module-scaffold, his-qa-anti-pattern
his-be-external-gateway      → core-types-contract, his-be-module-scaffold, his-be-background-worker, his-qa-anti-pattern
his-be-background-worker     → core-architecture-follow, his-qa-anti-pattern
his-fs-realtime-signalr      → core-reusable-code, core-error-loading-state, his-fe-api-client, his-qa-anti-pattern
his-fe-emr-print-form        → core-reusable-code, his-qa-anti-pattern
his-flow-nangcap-package     → (orchestration) chains: his-be-module-scaffold, his-db-migration, his-fe-api-client, his-fe-page-v2, his-be-external-gateway, his-be-background-worker, his-fs-realtime-signalr, his-fe-emr-print-form, his-doc-feature, his-test-e2e, his-ops-deploy
his-be-module-scaffold       → core-architecture-follow, core-types-contract, core-validation-pattern, core-reusable-code
his-db-migration             → core-types-contract
his-test-e2e                 → core-testing-architecture, core-testing-reuse
his-test-api-powershell      → core-testing-architecture, core-testing-reuse
his-qa-anti-pattern          → core-refactor, core-architecture-consistency, core-reusable-code
his-doc-feature              → (standalone)
his-ops-deploy               → (standalone)
core-skill-authoring         → (governance, standalone) — governs how EVERY skill is written (core + his)
core-requirement-clarify     → (discipline pre-flight #1, standalone) — uses the AskUserQuestion tool
core-verify-before-assert    → (discipline pre-flight #2, standalone)
core-impact-analysis         → core-verify-before-assert, core-architecture-follow (pre-flight #3)
core-minimal-change          → core-reusable-code, core-refactor (at implement time)
core-clean-code              → core-reusable-code, core-minimal-change, core-refactor, core-types-contract (★ with EVERY FE+BE code-gen — function/statement-level clean code)
core-execution-output        → core-verify-before-assert, his-qa-anti-pattern (always on when reporting results)
```
Principle: `his-*` **inherits** the principles from `core-*` then **implements** them for the HIS stack.

**PRE-FLIGHT pipeline (every code task, run before writing):**
`core-requirement-clarify` → `core-verify-before-assert` → `core-impact-analysis` → write per `core-minimal-change`
(always with `core-reusable-code` + `core-clean-code` + `his-qa-anti-pattern`).

## Location notes
- Skill: `.claude/skills/<core-* | his-*>/SKILL.md` (+ `references/`, `scripts/`).
- Per-tier routing sub-map: `.claude/skill-routes/{fe,be,test,ops-doc}.md` + `_reference.md` (this file).
- Feature docs: `docs/features/<feature>/` (NOT a skill).
- A skill ONLY lives in `.claude/skills/` — never in `docs/` or `.ai/`.
