# PROJECT RULES — Conventions · Architecture · Branch/Commit/PR/Review

> **An index**, not a new rule set. Conventions & architecture are already the source of truth in `CLAUDE.md`,
> `SKILL-MAP.md`, `skills/his-fe-convention`, `skills/his-qa-anti-pattern`. This file **gathers the paths** +
> **fills what's genuinely missing**: the **branch / commit / PR / review** conventions (previously scattered or only
> in the harness, never written down). On conflict → follow the origin source.

---

## 1. Architecture & conventions — POINT to the origin (no repetition)

| Topic | Source of truth |
|---|---|
| Project structure (Clean Arch BE · FE 2-tier v1/v2) | [`../../CLAUDE.md`](../../CLAUDE.md) "Project Structure" + "Architecture & conventions" |
| Rule tiers **P0/P1/P2** (patient safety · build-gate · DI · no-hardcode…) | [`../SKILL-MAP.md`](../SKILL-MAP.md) §0b |
| FE conventions (naming · layer · Antd-first · config-driven) | [`../skills/his-fe-convention/SKILL.md`](../skills/his-fe-convention/SKILL.md) |
| Anti-patterns / guardrail / patient-safety (#1-30) | [`../skills/his-qa-anti-pattern/SKILL.md`](../skills/his-qa-anti-pattern/SKILL.md) |
| Function-level clean-code | [`../skills/core-clean-code/SKILL.md`](../skills/core-clean-code/SKILL.md) |
| Skill naming rules (tier token) | [`../SKILL-MAP.md`](../SKILL-MAP.md) §0 |
| DI mandatory · idempotent SQL migration · ValueConverter Guid↔String | [`../../CLAUDE.md`](../../CLAUDE.md) "Backend" |

> P0 summary (detail in SKILL-MAP §0b): **no fabrication** · **build-gate** · **register DI** · **no hardcoded
> secret** · **medical-record audit + privacy** · **validate on BE** · **put files in the right folder** · **keep
> patient-safety checks**.

---

## 2. Branch — convention (FILLS A GAP)

- **Do NOT commit straight to `main`** for a large/independent change. On `main` → **create a branch first**.
- Name the branch by task type (matching the Router's `classification`):
  - `feat/<scope>-<short-desc>` · `fix/<scope>-<desc>` · `refactor/<scope>` · `debt/<scope>` ·
    `docs/<scope>` · `test/<scope>` · `chore/<scope>`
- 🔴 **PRE-FLIGHT PICK-TASK (parallel-safe — anti DUPLICATE CODE across 2 machines; MANDATORY before picking/writing code,
  enforced by hook `session-start.sh` reporting `behind=N` + `remind-pipeline.sh`):**
  1. **Clean tree** (commit/stash WIP) → **`git pull --ff-only`** — NOT just `fetch`; you must **SYNC the working tree**.
     Working on the OLD tree (behind>0) = **the root cause of duplication** (session 2026-06-15: local was 34 commits behind → redid #142/#101 that already existed on origin).
  2. **Verify-against-CODE, do NOT trust issue-state:** `grep`/`Read` the **synced** CODE for the feature's symbol/route/file.
     **Already there → close the issue (already-done), do NOT redo it.** An OPEN issue is only a **lagging** indicator (closed in batches) — **CODE is the verdict**.
  3. 🔴 **WORKING-TREE FOREIGN-EDIT SCAN (anti 2 windows on the SAME MACHINE picking the SAME issue — root of the 2026-06-28 bug):** right BEFORE claiming
     **AND** right before the first Edit → **`git status --short`**. A dirty file you **did NOT edit** = **another Claude/`agy` window
     is mid-work** (uncommitted + not yet claimed) → **the other 4 checks won't see it** (they only see committed/pushed/labeled state;
     the working tree is the EARLIEST same-machine signal). → Map the foreign file to a module/issue: **overlaps the candidate's area/file → another window
     already owns it → SWITCH to a different candidate**, do NOT double-claim. Do NOT touch/stage foreign files (R4 `parallel-windows.md`).
     ⚠️ **An issue decomposed BY TYPE** (e.g. #354/#355/#356 children of #196 — split by *type-site*, NOT by *file* → **same file**)
     = **SINGLE-OWNER**: one window owns the WHOLE sibling cluster; another window does NOT pick a sibling (claiming one child doesn't separate the area).
  4. **CLAIM-FIRST (GATE — the FIRST action the moment you settle on a task):** `bash .claude/window-lock.sh claim <issue|slug> [model]`
     (⚠️ in a **PowerShell** window: `powershell -File .claude/window-lock.ps1 claim ...` — do NOT type `bash` directly = empty WSL → silent lock)
     — one command handles BOTH axes (matrix `parallel-windows.md` §2 STEP-0); the PreToolUse gate `hooks/pre-edit-lock-gate.sh` **enforces** it when ≥2 windows:
     - 🔴 **same-machine (4 windows/1 machine):** `mkdir .claude/locks/<key>` **ATOMIC** = a real mutex → exactly one window wins even on simultaneous picks;
       the other gets `[BUSY]` → **SWITCH task**. ⚠️ **This is the ONLY layer that blocks same-machine window collisions** — because 4 windows = the **SAME
       GitHub account**, `gh` assignee/in-progress is **BLIND** (all 4 are `@me`). **Do NOT rely on gh for same-machine.**
     - **cross-machine (machine-2):** the script also runs `gh issue edit --add-label in-progress --add-assignee @me`, then **VERIFY-AFTER-CLAIM**
       re-reads `gh issue view <n> --json assignees`; **another account besides you** = machine-2 grabbed it → **SWITCH task** (verify-after-claim
       only catches a DIFFERENT account — useless same-machine, where the lock handles it).
     Steps 1-3 (sync + existence-check + foreign-scan) are LIGHT checks to CHOOSE; **all "doing the task" work — scope-measuring · file-reading ·
     impact-analysis · writing code — happens ONLY AFTER claiming.** An issue already in-progress + assignee OTHER than you → **STOP, do not pick**.
     Lock is per ISSUE; **a file-overlap of 2 different issues touching the same file** still needs foreign-scan (step 3) / single-owner / `git worktree`.
     Release (`window-lock.sh release <key>` when done/blocked/switching task) + label mechanics = owner `CLAUDE.md` §"Plan/task management".
  5. Source of truth = **git log origin + synced CODE + working-tree + Issues** (memory `feedback_fetch-origin-before-backlog`), NOT local docs.

## 3. Commit — convention (FILLS A GAP)

- **Conventional Commits**: `type(scope): description` — `type` ∈ `feat|fix|refactor|chore|docs|test|perf|build`.
  Real repo examples: `feat(ipd): consultation tab in Inpatient v2`, `chore(pm): ...`, `docs(status): ...`.
- Short description, present tense, state the **WHAT + WHY** (do not list WHAT diff-line by diff-line).
- **Mandatory** footer (per the machine config):
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- 🔴 **Do NOT `git add`/`commit`/`push` on your own until the user is explicit in the current turn** (★ source of truth — SKILL-MAP §0c keeps only a summary + points here). 3 unlock levels by keyword:
  - "continue / keep going / carry on" / "the rest is up to you" → code-change + build-verify + report ONLY; NO `git add`/`commit`/`push`.
  - "commit / save a commit" → `git add` + `git commit` **LOCAL**; NO push.
  - "push (in any language) / git push" → only then `git push` origin/main.
  - **Edge cases:** "finish all of X then review/push" is NOT implicit-OK (must be explicit "push") · a dirty working tree is NORMAL on "continue" (do NOT commit to clean up) · Auto-Mode does NOT override · a previous turn's permission does NOT extend to a later turn.
  - Change < 5 files / < 100 lines → **batch it**, don't push yet (memory
  `feedback_batch-changes-before-push`). ⚠️ **When 2 machines work in parallel:** PREFER **pushing early on each DONE feature**
  rather than stacking many uncommitted features — a long batch = a large divergence window = easier to duplicate/collide (ask permission to push each one).
- Commit only the real changes: `git diff --name-only | xargs git add` — avoid churn from CRLF/LF line-endings
  (memory `feedback_windows-line-ending-sed-churn`); prefer the `Edit` tool over `sed -i`.

## 4. Pull Request / Push — convention (FILLS A GAP)

- Only "push" / "git push" allows `git push`; "commit" only commits locally. (Full unlock levels: §3.)
- 🔴 **Close the issue ATOMICALLY with the push** (anti "fake OPEN" that makes another machine duplicate): commit the feature with
  **`Closes #N`** (GitHub auto-closes on merge to `main`) OR `gh issue close <n>` **right after the push**. **Do NOT close
  issues in a lagging batch** many commits after the code is up — that's the gap that leaves `gh issue list` still showing OPEN
  even though the feature is done (root of the 2026-06-15 duplication).
- PR into `main`. The PR body ends with:
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```
- **Separate the code commit (push-able) from the `docs/workspace-docs/` commit** — workspace-docs commit + push is normal
  since 2026-06-13 (the never-push rule was REMOVED), but still separate them logically for clear review.
- After pushing changes touching `backend/**` → Cloud Run auto-deploys via GitHub Actions; verify `gh run list
  --workflow=deploy-backend.yml` + `GET /health/schema-drift` = 0 (skill `his-ops-deploy`).

## 5. Review — convention

- Before reporting "done": **9-point self-review** (his-qa #30) + **build-gate** (his-qa #27) — step 6 REVIEW
  in [`workflow.md`](workflow.md).
- Large / prod-risk task → stage [4] Reviewer uses the `his-quality-reviewer` agent (+ `his-test-engineer`).
- Bulk fix > 20 files → **spot-check 3-5 random files** via `git diff` + build + side-effect audit
  (memory `feedback_spot-check-after-bulk`); build pass ≠ behavior preserved.
- Review against the [`checklist.md`](checklist.md) gate; any 🔴 fail remaining → do NOT allow DONE.

## 6. Rollback / Recovery (Production system — MANDATORY to know how to revert before changing)

When a change causes an incident, choose the **smallest-safe** revert. Always **tell the user before a prod revert op**.

| Situation | How to revert |
|---|---|
| Code not yet pushed | `git restore` / drop the local commit (`git reset --soft HEAD~1`) |
| Pushed, not yet deployed | **`git revert <sha>`** (do NOT `reset` a shared branch) + push |
| Backend Cloud Run deploy broken | Roll back to the **previous revision**: `gcloud run services update-traffic his-api --to-revisions=<old-rev>=100` (or redeploy the old image) |
| Frontend Vercel broken | Promote the **previous deployment** on Vercel (or revert the commit → auto-deploy) |
| SQL migration broke something | A **hand-written reverse** SQL script (idempotent) in `Data/Scripts/`; NO `ef migrations` |
| New feature broken | Turn it off via config/feature-flag (if any) **before** reverting the code |

→ Record `rollback_notes` in the state-store ([`task.md`](task.md)) + **re-verify after reverting**. Cross-ref the Hotfix fast-path ([`workflow.md`](workflow.md) §6).

## 7. Estimation rubric (level definitions — used consistently across issues)

- **Effort:** `XS` a few hours/1 file · `S` ~1 day/few files · `M` a few days/1 module · `L` ~1 week/multi-file-multi-tier · `XL` >1 week/multi-module/large blast-radius (**should be split**).
- **Priority:** `P0` missing → CANNOT operate (live system → very rare) · `P1` important: needed for real rollout / patient-safety / **competitor-parity** · `P2` nice-to-have, improves efficiency · `P3` do later, no operational impact.
- **Risk level:** `Critical` prod-down/data-loss/security-leak · `High` wide blast-radius/hard-to-rollback · `Medium` contained-within-module · `Low` local/cosmetic.

> Parity principle ([[competitor-parity-philosophy]] · `requirement-coverage.md` Rule 4): competitor-has→P0/P1; not-there-but-needed→P2; not-there-not-needed→DO NOT create.

---

## 8. Links
- Pipeline: [`workflow.md`](workflow.md) · State-store: [`task.md`](task.md) · Checklist: [`checklist.md`](checklist.md)
- Architecture decisions: [`ai-memory.md`](ai-memory.md)
- Skill routing (read first): [`../SKILL-MAP.md`](../SKILL-MAP.md)
