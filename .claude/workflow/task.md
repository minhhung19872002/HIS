# TASK STATE-STORE — Template (scratchpad synced to a GitHub Issue)

> **State-store** = the shared structure the 5 pipeline stages read/write so they **don't hand off blindly** ([`workflow.md`](workflow.md) §2).
> This is a **supporting scratchpad** while doing one task — **NOT a second board**. The main task board is still
> **GitHub Issues** (`minhhung19872002/HIS`). At task end: **sync the result back to the Issue** (`gh issue ...`).

## How to use
> **This file = a read-only TEMPLATE.** The STATE-STORE **INSTANCE** of a task lives in the **GitHub Issue body** (with history + optimistic-lock + cross-machine/cross-session). Do **NOT write state into the tracked `task.md` file** (it would race-write across machines/tasks).
- A **non-trivial** task (see the threshold [`workflow.md`](workflow.md) §0) → Router creates an Issue + copies the "STATE" block into the **Issue body** right away; the stages read/write via `gh issue edit`/`comment` on that same Issue.
- When spawning a real agent: pass `task_id` to every subagent (they don't share context — they read/write state via the Issue body).
- When working INLINE (one Claude): you may keep STATE in the turn's context, not mandatory to use an Issue for a ≤M task; but an ≥M or multi-file task → MANDATORY Issue body.
- Which stage writes which field → the I/O contract [`workflow.md`](workflow.md) §2.
- A **trivial** task (Q&A, ≤5 lines) → skip the state-store, only the [`checklist.md`](checklist.md) gate.

## Status lifecycle (aligned with memory `feedback_task-lifecycle-dod-remote` + SKILL-MAP §0c)

```
BACKLOG → TODO → IN_PROGRESS → BLOCKED ⤺ → REVIEW → READY_FOR_PUSH → DONE
```

| Status | Meaning | Transition gate |
|---|---|---|
| `BACKLOG` | Recorded, not scheduled | — |
| `TODO` | Picked, not started | Router classification done |
| `IN_PROGRESS` | Working on it | Plan done, IMPLEMENTing |
| `BLOCKED` | Stuck (missing info/decision/deps) | record `errors` + reason; unblock → IN_PROGRESS |
| `REVIEW` | VERIFYing + REVIEWing | `must_fix` left → back to IN_PROGRESS |
| `READY_FOR_PUSH` | Code done + build green + review passed, **awaiting user permission to push** | **STOP here — do NOT auto-push** |
| `DONE` | Pushed + Issue closed | only after the user is explicit "push" and push OK |

---

## STATE (copy this block for each task)

```yaml
# ── META ──────────────────────────────────────────────
task_id:            # GitHub Issue # (e.g. #42) — the long-term store
title:
status:             # BACKLOG|TODO|IN_PROGRESS|BLOCKED|REVIEW|READY_FOR_PUSH|DONE
priority:           # Critical|High|Medium|Low
created:            # YYYY-MM-DD (absolute date, not "today")

# ── [1] ROUTER — UNDERSTAND ───────────────────────────
classification:     # feature|bug_fix|refactor|technical_debt|architecture|testing|documentation|release|investigation|mixed
goal:               # 1 sentence: the result to achieve
requirement_restated:   # restate the requirement in plain words
scope_in:           # - what is IN scope
scope_non_goals:    # - what is CLEARLY out of scope
open_questions:     # - open questions (if any → may need to STOP and ask)
assumptions:        # - assumptions being relied on
risks:              # - risks + level
risk_level:         # Critical|High|Medium|Low
agent_sequence:     # the chosen agent flow (the smallest-safe flow)
verification_required:  # lint? typecheck? build? unit? integration? e2e?
completion_criteria:    # measurable — when it counts as done

# ── [2] PLANNER — ANALYZE + PLAN ──────────────────────
impact:
  files:            # - affected files
  modules:          # - modules
  apis:             # - endpoint/contract
  db_objects:       # - table/view/proc
  auth_flows:       # - auth/role flows
  ui_flows:         # - UI flows
  integrations:     # - external systems
file_allow_list:    # - ONLY the files allowed to be touched
steps:              # small ordered steps + per-step done-criteria
  - step: 
    done_when: 
phases:             # (if blast-radius is large) batches

# ── [3] WORKER — IMPLEMENT ────────────────────────────
changed_files:      # - edited files (must be within allow_list)
change_summary:     # WHAT + WHY, concise
suggested_tests:    # - suggested tests
build_result:       # FE: npm run build EXIT? | BE: dotnet build errors?

# ── [4] REVIEWER — VERIFY + REVIEW ────────────────────
verdict:            # PASS|FAIL
review_dims:        # 4 dimensions — each OK|issue:
  code_quality:     #   duplicate/dead-code/naming/too-long-function (9-point self-review)
  performance:      #   expensive query/N+1/large payload (only when measured)
  security:         #   BE validate/auth/role/secret/medical-record audit
  maintainability:  #   layer split/SRP/coupling
verification:       # build:EXIT? | lint:? | test:? | manual:?
issues:             # - logic bug / missing edge case / requirement violation / regression / security
must_fix:           # - must fix before DONE (any item left → cannot be DONE)
residual_risk:      # - remaining risk

# ── [5] FINALIZER — COMPLETE ──────────────────────────
completed_work:     # what was delivered
deferred_work:      # what was deferred + why
remaining_risks:    # open risks + owner
rollback_notes:     # how to revert if needed
next_actions:       # next work (prioritized)
errors:             # log of bugs/blocks hit during the task
final_decision:     # final decision + (if a long-lived architecture decision → record in ai-memory.md)
```

---

## Sync to the GitHub Issue (task end)
```bash
# Create a new task (start of pipeline)
gh issue create --title "<title>" --body "<goal + scope>"     # → get the task_id

# Update progress
gh issue comment <task_id> --body "<change_summary + verdict>"

# Close when DONE (ONLY after the user permits push + push OK)
gh issue close <task_id> --comment "Done in <commit-sha>"
```
> The Issue body uses UTF-8 no-BOM (memory `project_github-issues-task-board`). Do NOT `gh issue close`
> on your own before push OK.
