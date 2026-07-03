# SOFTWARE DELIVERY CHECKLIST — the delivery gate

> **This is a checklist view** grouped by category, each item **pointing back to the origin rule** (source of truth). NOT a new
> rule set. Sources: `SKILL-MAP.md` (P0/P1/P2), `skills/his-qa-anti-pattern` (#1-30), `skills/his-fe-convention`,
> `skills/core-*`. On conflict → follow the origin.
>
> Applied at steps **5·VERIFY** + **6·REVIEW** + **7·COMPLETE** of [`workflow.md`](workflow.md). Items marked **🔴 = absolute
> P0** (a violation blocks DONE).

---

## A. Requirement (step 1 UNDERSTAND)
- [ ] Understand the business requirement correctly → `core-requirement-clarify`
- [ ] Restate the requirement in plain words (record `requirement_restated` in [`task.md`](task.md))
- [ ] State missing info / open questions; ambiguous → **STOP and ask**, don't guess
- [ ] Record assumptions (`assumptions`) + risks (`risks`)

## B. Design / Impact (step 2 ANALYZE + 3 PLAN)
- [ ] Reviewed existing architecture & precedent → `core-architecture-consistency`, `core-architecture-follow`
- [ ] 🔴 **Verify-before-assert**: don't invent file/symbol/endpoint/field/DB column → `core-verify-before-assert` (SKILL-MAP P0 #2)
- [ ] Impact map (callers/contract/test/migration) before editing shared code → `core-impact-analysis`
- [ ] DB / API / auth / UI / integration impact listed (`impact` in the state-store)
- [ ] Has a `file_allow_list` + per-step done-criteria

## C. Implementation (step 4 IMPLEMENT)
- [ ] 🔴 **Reuse-first**: find existing code/folder → reuse/extend, don't duplicate → `core-reusable-code` (P1 #9)
- [ ] Edit only the necessary files, within `file_allow_list`; no over-refactor → `core-minimal-change`
- [ ] No dead code / no duplicate logic / function-level clean-code → `core-clean-code`
- [ ] Follow conventions (naming/layer/Antd-first) → [`project-rules.md`](project-rules.md), `his-fe-convention`
- [ ] 🔴 **Register DI** for a new service/controller → `DependencyInjection.cs` (P0 #4, his-qa #1)
- [ ] 🔴 File placed in the **right folder**, NOT at the root → his-qa #28-29 (P0 #8)
- [ ] Keep the stack — NO CQRS/MediatR/Next.js/Tailwind-first; hand-written idempotent SQL migration → his-qa #2-4 (P1 #15)

## D. Quality (step 6 REVIEW)
- [ ] **9-point self-review** (duplicate logic · dead code · hard-code · anti-pattern · too-large component/service · too-long function · import cycle · naming · state mgmt) BE+FE → his-qa #30 (P1 #10)
- [ ] No known logic / runtime bug
- [ ] Edge cases + error handling reviewed → `core-error-loading-state`
- [ ] Layer separation (UI · api/service · state · validation · mapper · constants) → `his-fe-convention` §2,§8 (P1 #11)

## E. Security & Patient-safety (🔴 P0)
- [ ] 🔴 Keep drug-interaction / allergy / contraindication checks; correct Patient↔MedicalRecord↔Order mapping → his-qa #20-22 (P0 #1)
- [ ] 🔴 **Validate on the BE** (don't trust the client) → `core-validation-pattern` (P0 #7)
- [ ] 🔴 Auth/authz + route guard, no hardcoded role → `his-fe-convention` §9 (P1 #16)
- [ ] 🔴 NO hardcoded credentials/secret/connection string/token; hospital name/URL → constants/env → his-qa #16-18 (P0 #5)
- [ ] 🔴 Keep the audit log on mutations; `CreatedBy` = real user (≠ `Guid.Empty`); role-guard medical records → his-qa #23-26 (P0 #6)

## F. Performance (P2 — only when measured)
- [ ] Expensive query / N+1 / large payload reviewed (when there's a load signal) → `his-be-scalability`
- [ ] Lazy/code-split/memo/virtualize **where appropriate, measure first** — NO premature optimization → `his-fe-performance` (P2 #19)

## G. Testing (step 5 VERIFY)
- [ ] 🔴 **BUILD-GATE**: build the touched tier clean BEFORE reporting done — FE `npm run build` EXIT 0 · BE `dotnet build` 0 errors → his-qa #27 (P0 #3)
- [ ] Lint / typecheck clean (build-gate = `npm run build`, NOT `tsc --noEmit`)
- [ ] Existing features not affected (regression) → `core-testing-architecture`, `his-quality-reviewer`
- [ ] 🔴 **New logic touching money / drugs / schema / contract / patient-safety → MANDATORY ≥1 test (unit/integration/e2e) PASS** (record `verification`). Other logic: extra tests recommended (`core-testing-reuse`).

## H. Completion (step 7 COMPLETE) — the DONE gate
- [ ] 🔴 Requirement satisfied (matches `goal` + `completion_criteria`)
- [ ] 🔴 VERIFY + REVIEW done, **no `must_fix` left**
- [ ] Final report (7-part) written → Finalizer
- [ ] State-store synced to the **GitHub Issue**
- [ ] 🔴 **Do NOT commit/push on your own** — stop at `READY_FOR_PUSH`, ask permission; `DONE` only after push OK (SKILL-MAP §0c)

> **A task may be marked `DONE` only when EVERY 🔴 item passes + group H is complete.** Any 🔴 fail → keep `IN_PROGRESS`/`REVIEW`.

## I. Requirement coverage (ONLY when the task = review / compare docs / gap analysis / "is it complete")
> Detail: [`requirement-coverage.md`](requirement-coverage.md). Applied when building a backlog from `docs/requirements/**`.
> ⚠️ **The 🔴 below = CONDITIONAL P0 (block DONE ONLY when the task is a review-type)** — DIFFERENT from the ALWAYS-APPLY 🔴 P0 in group E (patient-safety/secret). A normal code task does NOT apply group I.
- [ ] 🔴 **Source manifest 100%** — listed + read ALL sources (`requirements/00·10·20·30·90` + `luong_nghiep_vu`); no ⬜/⚠️ left
- [ ] 🔴 **Read the original PDF** if the `.md` extract is empty/incomplete (don't trust the extract)
- [ ] 🔴 **Enumerate fully** every item/feature/form (no "key items" summary); each item has evidence
- [ ] 🔴 **Parity principle**: competitor-has→P0/P1 mandatory · not-there-but-needed→P2 (state the reason) · not-there-not-needed→DO NOT create
- [ ] 🔴 **Dedup** vs `gh issue list` + "already DONE in code" before creating
- [ ] 🔴 **Completeness critic** run + VERIFIED/ASSUMED separated → do NOT say "complete" until the manifest is 100%
