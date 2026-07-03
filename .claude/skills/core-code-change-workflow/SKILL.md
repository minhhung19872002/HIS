---
name: core-code-change-workflow
description: Use this skill (portable, tech-agnostic) for ANY code-changing operation — add/edit/delete a file, function, class, schema, endpoint, config, test, doc — to reduce bugs · reduce blast radius · ease verification · ease rollback. Triggers include "add/edit/delete code", "fix bug X", "refactor X", "change API/DB/contract", "delete file/function", any code-gen task on FE/BE/DB/API/test/docs. It concretizes the workflow into 3 branches (add/modify/delete) with pre-flight, file-allow-list, fail criteria, rollback. Do NOT use for pure design discussion (no code touched yet) or open-ended brainstorm — apply only when there is a concrete code-change request.
metadata:
  type: core
  node_type: skill
  scope: portable
---

# Code Change Workflow — the standard process for an AI changing code

## 1. Core principles (NON-NEGOTIABLE)

1. **Verify first, code second** — do NOT guess that a file/symbol/field exists. Read/Grep/Glob before referencing.
2. **Minimal change** — the smallest diff that does the assigned job. Do NOT refactor/rename/clean up incidentally outside scope.
3. **Behavior-preserve by default** — change behavior only when the user explicitly asks. When unsure → STOP and ask.
4. **Narrow boundary catch** — try-catch at a real boundary (SDK/DB/HTTP), NOT a broad-catch that swallows errors in a service/controller.
5. **1 axis/session** — bug fix / refactor / split file / rename / migrate — pick 1 axis, do NOT mix.
6. **No commit no push unless the user is explicit** — only Edit/Write local files; the words "push"/"commit"/"deploy" (in any language) must appear clearly in the user's message.
7. **No destructive op without permission** — `rm -rf` · `git reset --hard` · `--force-push` · drop schema/table · uninstall dep · revert revision — STOP, describe + ask for confirmation.
8. **Defer logic-changing when no deploy/smoke** — a refactor touching interval / shape / side-effect / async → log to the roadmap, do it in a session with full verification.

---

## 2. General process (from receiving the request → integration)

| Step | Action | Output |
|---|---|---|
| **A. Clarify** | Read the request. If ≥2 interpretations lead to different results → ask in one short batch. Convert relative time → absolute. | Exact understanding of the task |
| **B. Verify-before-assert** | Read the real file, Grep the symbol, Glob the path. Do NOT rely on stale memory/docs. | A verified file/symbol list |
| **C. Impact analysis** | Map callers, dependencies, tests, migrations, configs, referencing docs | Blast-radius table |
| **D. Classify the operation** | Determine: ADD / MODIFY / DELETE (may be >1) | The process branch |
| **E. Plan minimal** | Decide: files allowed to touch, files NOT to touch, contract changed/not, tests to run | A clear plan |
| **F. Execute** | Edit/Write sequentially per the plan. Verify at each step when in doubt. | The diff |
| **G. Verify post-change** | Lint → typecheck → build → test (unit/integration/e2e as needed) | Pass/fail status |
| **H. Report** | Summarize the change + remaining risk + next step. Do NOT commit/push on your own. | Report + Q&A |

---

## 3. ADD code process

### Required input
- The name of the feature/function/file/endpoint/migration to add
- The location (folder/layer/module) or a convention to infer it
- The contract (signature, request/response shape) if it's an API/DB
- The use case → a minimal test case (happy path)

### Allowed conditions
- Does NOT duplicate existing code/file (verify Glob + Grep)
- There's a place matching the project convention (do NOT create a new folder if not allowed)
- Clarified if the request is ambiguous

### Files allowed to touch
- The new file in the convention-correct folder
- An index/barrel file to export (if the project uses one)
- The register/DI file if it's a new service/controller
- The accompanying test file (mandatory by default for a new function/endpoint)

### Files NOT to touch
- Files outside the related module
- Build/CI config unless explicitly requested
- Old already-applied schema/migration
- "While-I'm-here refactor" code files not in scope

### Completion criteria
- The new file compiles clean (typecheck/build pass)
- New tests pass + old tests do NOT break
- Registered in DI/route/index if needed
- Doc/comment WHY (not WHAT) if non-obvious

### Fail criteria
- Duplicates existing code/file → STOP, use the old one
- An old test breaks because of the add → impact spread outside scope → STOP, ask
- Must edit a file outside the allow-list → STOP, escalate
- Build/typecheck fail you can't fix within scope → STOP

### How to verify
1. `<lint>` + `<typecheck>` 0 errors
2. `<build>` produces an OK artifact
3. `<new test>` passes
4. `<related-scope full test suite>` passes
5. Manual smoke (if UI or workflow-critical)

### How to rollback
- `git checkout -- <new file>` not yet added → file disappears
- Already `git add` → `git restore --staged` then delete
- Committed not pushed → `git reset HEAD~1` (soft, keep working)
- Pushed → create a revert commit (do not reset --hard a shared branch)
- Deployed → roll back the artifact (cloud revision / old docker image)

---

## 4. MODIFY code process

### Required input
- The file + symbol (function/class/field) to change
- The reason (bug ID / requirement / refactor goal)
- Behavior before vs after (clearly)
- The tests that must pass after the change

### Allowed conditions
- Completed the **5 mandatory pre-edit steps**:
  1. **Impact scope** — grep callers, refs, imports, docs
  2. **Contract changed** — does the signature/shape/enum/route/schema change? If YES → needs explicit permission
  3. **Risk** — breaking change? performance? security? data loss?
  4. **Dependency** — which upstream-downstream service/module/lib is affected
  5. **Tests to run** — which units need verification (list test/suite names)
- If editing shared code (>1 caller): you MUST verify every caller

### Files allowed to touch
- The file containing the symbol to change
- The matching test file (update when behavior changes)
- The doc/comment that directly references it (if needed)
- The DI/config file if the constructor signature changes

### Files NOT to touch
- Caller files — touch only if the contract changes AND the user agrees
- Files that "look old/ugly" but aren't part of the bug — defer
- Format/style of neighboring files — defer
- Schema/migration already applied to prod — must go through a new migration

### Completion criteria
- The diff is exactly the part to change, NOT dragging in extra
- Old tests still pass (behavior preserved if the goal is to preserve)
- A new test reproduces the bug before the fix + passes after (if a bug fix)
- Callers do NOT break (verify a full build)

### Fail criteria
- Touching a file outside the allow-list without permission → STOP
- An old test breaks + it's not part of the behavior being changed → STOP, root-cause it
- Build/typecheck fail unrelated to the diff → repo may have been broken before, STOP and report to the user
- Diff > 3x the expectation → scope creep → STOP, re-plan

### How to verify
1. `git diff` review before commit (correct files + lines in scope)
2. Lint + typecheck pass
3. Build pass
4. Diff-targeted tests pass
5. Smoke the user-visible flow (if there's UI or a workflow)
6. Spot-check 3 random files if it's a bulk edit >20 files

### How to rollback
- Not committed: `git checkout -- <file>` revert from HEAD
- Committed not pushed: `git reset HEAD~1` (soft) → fix → re-commit
- Pushed: `git revert <sha>` creates a reverse commit
- A DB migration already applied: needs a reverse "down" migration, do NOT drop by hand
- Production: roll back the cloud revision/image, nothing destructive

---

## 5. DELETE code process

### Required input
- The file/symbol/folder to delete
- The reason (dead code, deprecated, replaced by X)
- Evidence it's NO longer used (grep result, log, version metadata)

### Allowed conditions
- **Mandatory verify**: grep the WHOLE PROJECT for NO remaining reference (import/usage/route/config/doc)
- Asked the user if the file is >100 lines or a public API
- Do NOT delete data/schema/migration already applied to prod (only deprecate)
- Do NOT delete a file of unknown origin (someone's in-progress work?)

### Files allowed to touch
- The file/folder to delete
- The index/barrel/route/DI file to remove the export/registration
- The matching test file
- The referencing doc

### Files NOT to touch
- Another file in the same folder that does NOT depend on it → defer cleanup separately
- Old schema/migration — only add a new migration (drop column/table), do NOT edit the old migration
- Git history files (do NOT `git rebase -i` to rewrite history)

### Completion criteria
- 0 references left (grep-verify BEFORE and AFTER deletion)
- Build pass (NO broken import)
- Old tests pass (only the deleted symbol's tests are removed)
- Referencing docs updated

### Fail criteria
- Grep still finds a reference → STOP, delete from the caller first
- Build/test break → there's a hidden dependency → STOP, restore
- Discover the file is actually in use that you thought was dead → STOP, escalate
- The user hasn't explicitly OK'd for a public-API/large file

### How to verify
1. `grep -rn '<symbol|filename>'` 0 hits (excluding the file being deleted)
2. Build + typecheck pass
3. Tests pass
4. Manual scan of route/menu/sidebar (if it's a page) — no orphan link left
5. Diff review: delete only, no extra modify dragged in

### How to rollback
- `git checkout HEAD~1 -- <path>` restore the file
- Committed not pushed: `git reset HEAD~1`
- Pushed: `git revert <sha>` restore via a reverse commit
- Data already DROPped: restore from backup (no backup → permanently lost, which is why you do NOT drop data on a whim)

---

## 6. Checking rules (CHECKING)

After EVERY change, in order (don't skip):

1. **Lint** — code style + import order + unused
2. **Typecheck** — `tsc --noEmit` OR compiler strict mode 0 errors
3. **Build verify** — full build produces an OK artifact (FE bundle / BE binary)
4. **Unit test** — tests directly on the changed symbol pass
5. **Integration test** — module/layer tests pass if a contract was touched
6. **E2E test** — only run when a user-visible critical workflow is touched
7. **Smoke prod-like** — manual or auto on staging if there's a deploy
8. **Diff review** — read the final git diff, no stray hunk outside the plan

**Stop conditions:**
- Lint/typecheck/build fail unrelated to the diff → repo broken before, STOP
- Old test breaks → impact outside scope, STOP and root-cause
- New test fails → fix before reporting done
- Diff larger than 3x the plan → scope creep, STOP and re-plan

---

## 7. Rollback rules (UNIVERSAL)

| State | Safe rollback | Do NOT use |
|---|---|---|
| Not staged | `git checkout -- <file>` | `git clean -fd` (loses other untracked files) |
| Staged not committed | `git restore --staged <file>` | — |
| Committed not pushed | `git reset --soft HEAD~N` (keep working) | `git reset --hard` (loses uncommitted) |
| Pushed to a private branch | `git revert <sha>` OR `git reset` + `force-push` (private branch only) | `force-push main/master` |
| Pushed to main + CI deploy | `git revert <sha>` + redeploy OR roll back the cloud revision | `force-push main` (history rewrite) |
| Deployed to prod | Roll back the cloud revision/old docker tag FIRST, fix code after | Drop schema / hand-edit data |
| DB migration applied | Write a "down" migration or a compensating new migration | Edit the old migration file |

**Principle:** rollback always prefers **forward** (reverse commit / old revision) over **destructive** (reset hard / force push / drop).

---

## 8. TECHNICAL DEBT handling rules

### Recording
- Found while editing → record it in `docs/workspace-docs/20-backlog/tech-debt-roadmap.md` (OR the project equivalent) IMMEDIATELY when you hit it
- Format: ID + description + file path + line + tier (EASY/MEDIUM/HARD) + blast radius

### Tier classification
| Tier | Definition | How to handle |
|---|---|---|
| **EASY** | <30m, FE-only or build-verify is enough, narrow blast | Can handle in the current session if the user OKs |
| **MEDIUM** | 30m-3h, touches many files or cross-layer, needs wide tests | A separate session, with a plan |
| **HARD** | >3h, cross-module, needs migration/deploy, large blast | A long session, split into small batches |

### Priority
- Bug fix (currently broken) > Risk (about to break) > Smell (ugly but OK)
- Release-blocking item > internal item
- EASY before MEDIUM before HARD (finish the easy → clear blockers → tackle the hard)

### Defer
- Logic-changing with no deploy/smoke → defer to a session with deploy
- Cross-state risk → defer to a session with e2e tests
- Hardware-dependent → defer until the device is available
- Scope creep found mid-session → record in the roadmap, do NOT expand the current session

### Handle later
- One axis per session (bug / refactor / split) — do NOT mix
- After finishing → update the roadmap entry with the commit SHA + verify result + what's left
- Re-prioritize the roadmap if a new blocker is found

---

## 9. NO-SPRAWL rules

1. **Strict allow-list** — only touch files listed in the plan. Touching an extra file → STOP, escalate.
2. **No opportunistic refactor** — see ugly neighboring code: record to the roadmap, do NOT edit.
3. **No implicit contract change** — changing a signature/shape/route/schema needs explicit permission. Note that "fix a bug" does NOT include changing a contract.
4. **No bulk rename/format** — do NOT mass-rename variables / mass-format files outside the requested scope.
5. **No dependency upgrade** — do NOT bump a package version unless explicitly requested.
6. **No files outside the layer** — editing a BE service does NOT touch FE (and vice versa) unless a contract change is agreed.
7. **No "while-I'm-here typo fix"** — a typo in a file other than the one being edited → roadmap.
8. **No git config / CI / hook change** — unless the user explicitly requests it.

### When you hit a problem

| Situation | Action |
|---|---|
| **Blocker** (can't continue — env missing, dep missing, schema drift) | STOP, document the blocker clearly (what's missing, how to fix), defer the current task, report to the user |
| **Dependency** (needs another task done first) | STOP, record to the roadmap "blocked by X", switch to another task or wait |
| **Conflict** (current code already has a different solution) | STOP, present 2 options (keep old vs change), user decides |
| **Scope expansion** (the work is larger than planned) | STOP, do not self-expand. Re-plan with the user, possibly split into sessions |

---

## 10. Final checklist for the AI before reporting DONE

Must tick ALL:

- [ ] **Pre-flight**: clarify + verify-before-assert + impact analysis + minimal-change plan all DONE
- [ ] **Allow-list**: only touched files in the plan; if extra arose → escalated to the user
- [ ] **Contract**: if changed → user OK'd explicitly; if not changed → verified callers do NOT break
- [ ] **Lint**: 0 new error/warning introduced by the diff
- [ ] **Typecheck**: 0 errors (strict mode passes, not just loose noEmit)
- [ ] **Build**: full build pass (produces a real artifact, no skip)
- [ ] **Test**: relevant unit + integration pass; e2e if a critical workflow
- [ ] **Smoke**: manual or auto for a user-visible change (if UI/API)
- [ ] **Diff review**: re-read the git diff, no stray hunk
- [ ] **Roadmap update**: found debt recorded in the tech-debt log
- [ ] **Doc update**: WHY-comment + handoff/changelog if a long session
- [ ] **No destructive op**: no rm/reset/force run unless the user was explicit
- [ ] **No self-initiated commit/push**: only when the user says "commit"/"push"/"deploy" clearly
- [ ] **Report**: summarize change + remaining risk + next step (<300 words)

---

## 11. Trigger phrases (when to apply this skill)

Apply as soon as the user says (or equivalent):
- "add/edit/delete code"
- "create file/function/endpoint X"
- "fix bug X"
- "refactor X"
- "change contract/schema/API"
- "delete dead code"
- "review and clean up the code"
- any code gen/edit task with a concrete scope

Do NOT apply when:
- Pure design discussion (no code touched yet) → use `core-requirement-clarify`
- Creating a new skill → use `core-skill-authoring`
- Pure docs (no code) → use the matching doc skill

---

## 12. Cross-ref related skills

- `core-requirement-clarify` — clarify ambiguity before editing
- `core-verify-before-assert` — verify the real file/symbol
- `core-impact-analysis` — map the blast radius
- `core-minimal-change` — smallest correct diff
- `core-refactor` — behavior-preserving refactor
- `core-reusable-code` — extend/reuse before creating new
- `core-testing-architecture` — pick the right test level
- `core-execution-output` — concise reporting, no log spam
- `his-tech-debt-workflow` — project-specific tech-debt workflow
- `his-qa-anti-pattern` — the HIS anti-pattern catalog

---

*(Portable skill — applies to any project. Project-specific overrides live in `his-*` skills.)*
