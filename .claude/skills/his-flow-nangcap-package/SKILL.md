---
name: his-flow-nangcap-package
description: Use this skill when implementing a whole HIS upgrade package / tender gap-closing (NangCapNN) end-to-end — read the requirement PDF, diff against the codebase, list gaps, implement full-stack, mark the [NN] menu, write the docs set, and deploy. Triggers include "do the NangCapNN package", "compare against NangCapNN.pdf", "close the tender gaps for [hospital X]", closing a tender's feature list. This is an ORCHESTRATION playbook that chains the other his-* skills. Do NOT use for a single isolated feature (route directly to the specific his-* skill).
metadata:
  type: project
---

# HIS NangCap Package (upgrade package / tender package)

An **orchestration** playbook for a NangCapNN package end-to-end. Repeated 6+ times (NangCap15/16/19/22/23/24) with the
same process. This skill does NOT write code itself — it **chains the other skills** in order + keeps the package convention.

## When to use
- "Do the NangCapNN package", compare against the tender PDF, close all gaps for a hospital/package.

## When NOT to use
- A single feature → route straight to the specific skill (`his-be-module-scaffold`, `his-fe-page-v2`…).

## The 7-step process (follow NangCap22/23/24)
1. **Read the PDF** `docs/requirements/tai-lieu-nang-cap/NangCapNN.pdf` → extract text (temp script, don't commit).
2. **Diff against the codebase** → list GAPs (what exists vs what's needed). Update `NangCap_PhanTich.md` (section PART NN).
3. **Implement each gap full-stack**, chaining skills by type:
   - Backend CRUD/business → `his-be-module-scaffold` + `his-db-migration`
   - External gateway → `his-be-external-gateway` (+ `his-be-background-worker` for retry)
   - Realtime → `his-fs-realtime-signalr`
   - Print form → `his-fe-emr-print-form`
   - A separate login portal → `his-fe-standalone-portal`; payment → `his-be-payment-gateway`; biometric signing → `his-fe-webauthn-biometric`
   - FE: `his-fe-api-client` (`api/nangcapNN.ts`) → `his-fe-page-v2` (pages-v2) → route `App.tsx` + menu `TerminalLayout`
4. **Mark the menu `[NN]`** in `TerminalLayout.tsx` (+ `MainLayout.tsx` if there's a v1) for every item in the package.
5. **The doc set** `docs/features/nangcapNN/` via `his-doc-feature` (README + analysis + test-plan + test-guide + workflow-test + summary).
6. **Test**: `frontend/cypress/e2e/nangcapNN-flow.cy.ts` + `frontend/e2e-prod/nangcapNN-functional.spec.ts` (see `his-test-e2e`).
7. **Deploy** `his-ops-deploy`: manual Cloud Run + Vercel auto; verify `/health/schema-drift` = 0.

## Package naming convention (consistent with old packages)
- Entity: `HIS.Core/Entities/NangCapNNEntities.cs` · DTO: `HIS.Application/DTOs/NangCapNN/` · Service:
  `INangCapNNServices.cs` + `NangCapNNServices.cs` · Controller: `NangCapNNControllers.cs`
- SQL: `HIS.Infrastructure/Data/Scripts/NN_nangcapNN_*.sql` (idempotent). ⚠️ **Check for a duplicate script number** —
  there was once a `44_nangcap23_*` clashing with `44_nangcap24` (see `his-db-migration`).
- FE: `frontend/src/api/nangcapNN.ts` + `frontend/src/pages-v2/*.tsx`
- ⚠️ **Avoid a route clash** with an old controller (e.g. use `national-prescription-gateway` instead of `national-prescription`).

## Pitfalls (hit before)
- **Vercel auto-deploys the FE, Cloud Run does NOT auto-deploy the BE** → after pushing, remember to deploy the BE manually, otherwise the new endpoint 404s
  (this is why there was once "FE live, work-log written, but API 404"). See `his-ops-deploy`.
- **EF shadow FK / Guid↔String** when adding a new entity → Fluent API + whitelist (see `his-db-migration`).
- **Gateway MockMode**: prod set to `false`, key/token via env, **don't commit a secret** (`his-qa-anti-pattern`).

## Package checklist
- [ ] PDF read + GAPs listed in `NangCap_PhanTich.md`
- [ ] Each gap full-stack done, `dotnet build` + `npm run build` 0 errors
- [ ] Menu `[NN]` fully marked
- [ ] Doc set `docs/features/nangcapNN/` + cypress/playwright tests pass
- [ ] Commit message states the gaps; deploy BE Cloud Run + verify schema-drift=0

## Dependency
Orchestrates: `his-be-module-scaffold`, `his-db-migration`, `his-fe-api-client`, `his-fe-page-v2`,
`his-be-external-gateway`, `his-be-background-worker`, `his-fs-realtime-signalr`, `his-fe-emr-print-form`, `his-doc-feature`,
`his-test-e2e`, `his-ops-deploy`, `his-qa-anti-pattern` (throughout).

## When to update
- When the 7-step process or the package naming convention changes.
