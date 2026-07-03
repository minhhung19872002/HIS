---
name: core-impact-analysis
description: Use this skill (portable, tech-agnostic) BEFORE editing shared or cross-boundary code to map the blast radius — find callers/dependents, the contract being changed, affected tests/migrations/configs — and pick the smallest safe change. Triggers include editing a shared component/hook/util/service/DTO/interface/DB schema/API contract, renaming/removing/changing a signature, or any change that could break other parts. Do NOT use for a brand-new isolated file with no dependents, or pure additive leaf code; for scope/over-engineering discipline use core-minimal-change.
metadata:
  type: project
---

# Core — Impact Analysis (portable)

> TIER: **A · CORE** (discipline, tech-agnostic). Guardrail **pre-flight #3** — before editing code that has dependents.

## (2) The problem this skill solves
Editing a shared place without knowing who depends on it → breaks elsewhere, runtime/build errors, an FE↔BE contract mismatch.
This skill forces **mapping the impact** before editing and **picking the smallest safe change**.

## (3) Why AI fails here
- Edits locally "for the spot I'm looking at", forgetting other callers/consumers.
- Changes a DTO/contract on one side (BE) and forgets the other (FE) or vice versa.
- Renames/changes-signature/removes-field → call sites break silently.
- Forgets the accompanying DI/migration/test → a 500 or a red test.

## (4) When to use (triggers)
- Editing a **shared component/hook/util/service/DTO/interface**.
- Changing an **API contract / DB schema / column / enum / config key**.
- **Rename / remove / change signature / change type** of a public symbol.
- A behavior change that could spread to another module.

## (5) When NOT to use
- Creating a new **isolated** file nobody imports yet.
- Adding **pure additive leaf** code (doesn't change existing behavior).
- Changing internal text/style of a non-exported component.
- A scope/over-engineering issue → `core-minimal-change`.

## (6) Workflow
1. **Identify the symbol/contract about to change** (verify it exists via `core-verify-before-assert`).
2. **Find dependents:** `Grep` the symbol name/route/field across the repo (both FE and BE if it's a cross-tier contract).
3. **List what hangs off it:** callers, consumers in another layer, **tests**, **migration/seed**, **DI registration**, config/env, docs.
4. **Assess blast radius:** wide/narrow; is there an incompatible (breaking) change.
5. **Choose a strategy:** prefer *additive / backward-compatible*; if a breaking change is forced → update ALL dependents SIMULTANEOUSLY in the same change.
6. **Write an impact summary** (the files/places to be touched) before editing; after editing, build/test that exact scope.

## (7) Safety rules & limits
- Do NOT change a contract on one side and leave the other broken — sync both (or keep backward-compatible).
- Changing a public symbol → must update **all** call sites in the same commit.
- Always inspect alongside: tests, migration, DI, related config.
- Touching patient-safety/audit/money/schema → raise the caution level, consider asking (`core-requirement-clarify`).
- Analyze enough to be safe, no "analysis paralysis" for a small leaf change.

## (8) Expected input
The symbol/contract/schema about to change + Grep/Read access across the repo.

## (9) Expected output
A short impact map: **dependents + tests + migration + DI + config affected** + a strategy (additive vs synchronized-breaking). Then edit.

## (10) Examples (HIS)
- Changing a backend DTO field (`SpecialtyEmrDto`) → Grep the FE using `specialty-emr` → update `api/*.ts` + the page field-map at the same time (avoid empty data).
- Adding a new service → remember to **register DI** in `DependencyInjection.cs` (forgetting = 500 — pitfall #1).
- Adding/changing a table → needs a hand-written SQL script (`his-db-migration`) + read/write sites + seed; the project IGNOREs EF pending changes.
- Changing `_v2kit` (a shared component) → Grep every `pages-v2/*` using that prop before changing the signature.

## (11) Anti-pattern / typical mistakes
- "Change to match this spot" and then 10 other places break.
- Editing BE forgetting FE (or vice versa) → contract mismatch.
- Forgetting the accompanying DI/migration/test.
- Renaming without Grepping all call sites.

## (12) Integration + file structure
- **Pre-flight pipeline:** after `core-requirement-clarify` (#1) + `core-verify-before-assert` (#2) → this skill (#3) → edit per `core-minimal-change`.
- Complements `core-architecture-follow` (right layer) + `core-types-contract` (sync the contract) + `his-qa-anti-pattern` (DI/audit).
- `references/impact-checklist.md` — the catalog of "what hangs off it" to inspect.

## When to update
- When there's a new kind of often-forgotten dependent (e.g. queue/feature-flag/cache) to add to the checklist.
