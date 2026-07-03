---
name: his-doc-feature
description: Use this skill when writing the feature documentation set under `docs/features/<feature>/` for a HIS module/package (e.g. NangCapNN). Triggers include "write documentation for [feature]", "create the test doc set", documenting a new module with README + analysis + test-plan + test-guide + workflow-test + summary. Do NOT use for code generation or for skills (skills live in .claude/skills, never docs).
metadata:
  type: project
---

# HIS Feature Documentation Set

A skill standardizing how to write the doc set for a HIS module/upgrade package, placed under `docs/features/<feature>/` (convention `docs/architecture/PROJECT_STRUCTURE.md` §4). Reference templates: `docs/features/nangcap23/` and `docs/features/nangcap24/` — 6 files.

## When to use

- Writing documentation for a new NangCapNN package (after coding is done).
- Writing test documentation (test-plan / test-guide / workflow-test) for a module.
- Adding/syncing documentation when a feature changes.

## When NOT to use

- Generating code → use the matching scaffold/page skill.
- Creating a skill → a skill lives in `.claude/skills/`, **NEVER** in `docs/`.

## The standard 6-file set (`docs/features/<feature>/`)

| File | Role | Audience |
|---|---|---|
| `README.md` | Overview + gap/feature table + architecture + config + known risks + commit ref | Tech lead, Dev |
| `analysis.md` | Per-layer source-code analysis (entity/DTO/service/controller/validation/business logic/risks) | Dev review, Audit |
| `test-plan.md` | Per-function test plan: business description + API + test cases (TC code) + expected + edge + regression; smoke→E2E flow; release checklist | QA lead, QA |
| `test-guide.md` | UI/manual QA checklist: screens to test, business flow, validation, permission, regression, commands | QA team |
| `workflow-test.md` | Workflow + dependency map + UI matrix + critical risk + role-based access matrix + regression priority | QA + Dev |
| `summary.md` | Cross-doc index + function↔API↔test↔file mapping + module impact ranking + comparison with the prior package + outstanding | Tech lead, PO |

→ Standard outline + headings per file: `references/doc-set-outline.md`.

## Standard process

### Step 1 — Read the REAL SOURCE before writing (no guessing)
- The feature's Entities/DTOs/Service/Controller/Migration.
- The route (`App.tsx`) + menu (`TerminalLayout.tsx`).
- Existing test files.
- The CLAUDE.md work-log for the feature (commit, deploy revision, pitfalls).

### Step 2 — Create the folder + 6 files
`docs/features/<feature>/` (kebab-case name, e.g. `nangcap25`). Each file follows the outline.
Do NOT create an odd folder — follow the `docs/features/<feature>/` convention.

### Step 3 — Reflect the feature's SPECIFICS (no mechanical copy)
State the real differences (e.g. NangCap24: status string instead of int; NO exception filter → 500 errors; biometric MVP not verified; shared FK bug) — this is the most valuable part, don't copy it from another feature.

### Step 4 — Cross-link + commit reference
Each file has a "Related documents" block linking the other 5 files + a commit/release section.

## Patterns & Conventions

- **Language**: Vietnamese (matching nangcap23/24); keep technical terms in English.
- **Lots of tables**: use tables for mapping/test-cases/role-matrix (easy to look up).
- **Coded test cases**: `TC-<MODULE>-NNN` + Case/Body/Expected columns.
- **No duplication**: README=overview, analysis=source, test-plan=cases, test-guide=UI checklist, workflow-test=dependency+role, summary=index. Each file one viewpoint.
- **Honesty**: if it's MVP/placeholder/known-risk → state it (don't gloss over). Have a "Known risks" section.

## Pitfalls

- **Guessing the business**: you must read the real code. HIS field names often deviate from convention (Medicine=`MedicineCode/MedicineName`; ServiceRequest→MedicalRecord→Patient; Admission Status=0 is "In treatment").
- **Copying verbatim from another feature** without editing the specifics → wrong documentation.
- **Putting a skill-like file into docs**: docs is ONLY documentation — skills live in `.claude/skills/`.
- **`cat`-ing the whole CLAUDE.md**: a ~5000-line file → only extract the feature's work-log section.

## Reference

- `references/doc-set-outline.md` — detailed headings/outline for the 6 files (copy as a frame)

## When to update

- When the `docs/features/<feature>/` convention changes (add/remove a standard file).
- When the nangcap23/24 reference template's structure is improved.
