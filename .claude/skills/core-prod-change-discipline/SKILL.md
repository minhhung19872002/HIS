---
name: core-prod-change-discipline
description: Use this portable, tech-agnostic skill as the end-to-end Tech-Lead discipline for any change to a running/production system, wrapping the whole task lifecycle. Triggers include any feature, bug fix, refactor, migration, config/infra change, or "fix this in production" — especially risky/hard-to-reverse changes touching auth, money, schema, or contracts. It orchestrates the existing discipline skills (core-requirement-clarify, core-impact-analysis, core-minimal-change, core-code-change-workflow, core-architecture-follow, core-execution-output) and ADDS what they don't fully cover: find the root cause with evidence before fixing (no symptom-patch, no temp workaround unless asked); when several solutions exist present at least 3 options, each with pros/cons/complexity/risk/cost, then recommend one; self-critique the chosen solution (simpler? lower risk? breaks architecture? adds tech-debt? hurts performance?); a full pre-done verification gate (lint + typecheck + build + unit + integration + e2e as available — never claim done unverified); a 7-part completion report (work done, files changed, blast radius, residual risks, deferred work, tech-debt found, rollback plan); and the quality priority order correctness > stability > maintainability > security > performance > code-aesthetics. Do NOT use as a substitute for the specific skills it links (route to them for the mechanics), nor to gate trivial Q&A.
metadata:
  type: core
---

# Core — Production Change Discipline (portable)

> TIER: **A · CORE** (portable, tech-agnostic). The **Tech-Lead-responsible-for-Production** playbook for
> EVERY change. Does **NOT copy** other skills — **LINKS** them + closes **5 gaps** (G3/G6/G9/G10/G11).
> Behave like the person ultimately responsible: correct > stable > the rest.

## When to use
- Any feature / bug fix / refactor / migration / config·infra change / "fix a production bug".
- Prioritize when the change is **high-risk / hard-to-rollback / touches auth·money·schema·contract**.

## When NOT to use
- Pure Q&A / explanation / lookup (no change). Specific mechanics → the linked skill.

## A change's lifecycle (each step → the responsible skill)
1. **Clarify** the requirement, list what's missing, mark **UNKNOWN**, no inference → `core-requirement-clarify`.
2. **Analyze → plan BEFORE code** (requirement/scope/dependency/risk/architecture) → `core-impact-analysis` + `core-code-change-workflow` + `core-architecture-follow`. No code yet.
3. **(Bug) Root cause + evidence** → **G3** below.
4. **Blast radius** (file·module·API·DTO·DB·auth·authz·UI·test) → `core-impact-analysis`.
5. **Smallest-safest change**, no out-of-scope (refactor/architecture/contract/DB/mass-rename) → `core-minimal-change` + SKILL-MAP §5b.
6. **≥3 options when there are several ways** → **G6**.
7. **Scope control**: new work outside the plan → do NOT self-do it, report it, **split a separate task** → `core-minimal-change` + `his-tech-debt-workflow`.
8. **Tech debt found**: describe it/cause/severity/handling direction/priority, **no auto-fix** without approval → `his-tech-debt-workflow`.
9. **Self-critique** before deciding → **G9**.
10. **Full verify gate** before reporting done → **G10**.
11. **7-part report** → **G11**.
12. **Quality priority order** → **G12**.

## 5 supplementary rules (closing the GAPs)

### G3 · Root cause before fixing
A system bug: identify the **ROOT cause** + **evidence** (log / repro / diff / trace) + explain **WHY**.
Do **NOT** patch the symptom. Do **NOT** workaround temporarily — unless the user explicitly asks (note it's temporary + a debt to handle).

### G6 · ≥3 options when there are several ways
When >1 reasonable way → present **at least 3 options**, each with: **Pros · Cons · Complexity · Risk · Implementation cost** → then **recommend 1**. (A trivial task / only one obvious way → skip, do NOT fabricate options to hit a number.)

### G9 · Self-critique before deciding
Ask yourself: is there a **simpler** way? **lower risk**? does it **break** the current architecture? does it **add tech debt**? does it **hurt performance**? — a "yes" to any → reconsider before doing it.

### G10 · Full verify gate (MANDATORY before reporting "done")
Run at the level **available** in the project: **lint · typecheck · build · unit · integration · e2e**. Still red = **NOT done**; don't claim success without verifying (`core-execution-output`).
> HIS: build-gate `his-qa-anti-pattern` #27 (FE `npm run build` EXIT 0 / BE `dotnet build` 0 err) · lint `npm run lint` · Cypress/Playwright tests (`npm test`). `.claude/`·docs only → no build needed.

### G11 · 7-part completion report
(1) Work done · (2) Files changed · (3) Blast radius · (4) Residual risks · (5) Deferred work · (6) Tech debt found · (7) **Rollback plan**.

## G12 · Quality priority order
**Correctness > Stability > Maintainability > Security > Performance > Code aesthetics.** Do NOT sacrifice stability just for shorter/prettier code.
> ⚠️ Matches SKILL-MAP §5c + P0: for a **medical/HIS** system, **patient-safety + correctness + security** are **absolute P0** — NOT ranked below maintainability. The order above applies to trade-offs **outside P0**; on conflict, **P0 wins first**.

## Related (LINK — no copy)
`core-requirement-clarify` · `core-verify-before-assert` · `core-impact-analysis` · `core-minimal-change` · `core-code-change-workflow` · `core-architecture-follow` · `core-execution-output` · `his-tech-debt-workflow` · `his-qa-anti-pattern` (#27 build-gate, #30 self-review) · SKILL-MAP §5b/§5c (tiebreaker + priority order).
