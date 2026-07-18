# DoD-CHECKLIST — per-task completion checklist (materialize → tick → self-verify)

> **OWNER** (REGISTRY): the per-task *Definition-of-Done checklist* lifecycle. Turns the static gate
> [`checklist.md`](checklist.md) into a **live, ticked, self-verified** checklist that lives in the task's
> **GitHub Issue body** (the state-store — [`workflow.md`](workflow.md) §2). Aligned with memory
> `feedback_task-lifecycle-dod-remote`.
>
> **Why this exists:** `checklist.md` is the *source of items* (a reference gate); `task.md` has a
> `completion_criteria` field. Neither was being **instantiated per task, ticked as work progressed, or
> re-verified before DONE** → items got silently skipped. This file makes that a required, visible loop.

---

## 0. When it applies

| Task | DoD checklist? |
|---|---|
| **TRIVIAL** (numeric def [`workflow.md`](workflow.md) §0) · Q&A · lookup | **Skip** — no Issue, no checklist. |
| Non-trivial (feature · bug_fix · refactor · tech-debt · migration · multi-file / blast-radius ≥ MEDIUM) | **MANDATORY** — materialize in the Issue body + mirror to TodoWrite. |

The checklist is **per-task and concrete** (this task's actual items), NOT a copy of the whole `checklist.md`.
It is built by **selecting** the applicable items — see step 1.

---

## 1. CREATE — materialize the DoD when the task is created (Router)

When the Router opens the Issue (or the user asks to "do task X"), the **first** thing written into the
Issue body is a `## ✅ DoD checklist` section = the union of:

1. **`completion_criteria`** for this task (the measurable "done" — from [`task.md`](task.md) STATE) → 1 line each.
2. The **applicable 🔴 items** from [`checklist.md`](checklist.md) — include only the ones this task actually
   triggers, e.g.:
   - always: `- [ ] 🔴 BUILD-GATE green on the touched tier (FE npm run build EXIT 0 / BE dotnet build 0 err)`
   - if new service/controller: `- [ ] 🔴 DI registered in DependencyInjection.cs`
   - if touches money/drugs/schema/contract/patient-safety: `- [ ] 🔴 ≥1 test PASS + patient-safety checks kept`
   - if governance (`.claude`) edit: `- [ ] 🔴 bash .claude/lint.sh = LINT OK`
3. **Non-goals** (what is explicitly OUT) — so scope-creep is visible.

Each item is a GitHub task-list line `- [ ]`. The scaffold ships in
`.github/ISSUE_TEMPLATE/task.md` so a UI-created Issue already has the section.

> A `≥M` / multi-file task → the DoD **must** be in the Issue body (survives across machines/sessions).
> A reduced inline task → at minimum mirror it to **TodoWrite** (below), even if you skip the Issue.

## 2. TICK — check items off as work completes (every stage)

- The moment an item is genuinely done (verified, not assumed) → flip `- [ ]` → `- [x]` on the Issue body
  via `gh issue edit <n> --body-file` (rewrite the body) or a progress `gh issue comment`.
- **Mirror the same list into `TodoWrite`** for the in-session live view: one todo per DoD item, exactly one
  `in_progress` at a time, mark `completed` as you tick. This is what the user watches; keep it in sync with
  the Issue body.
- Never tick an item you have not actually verified (see step 3). Ticking ≠ "I intend to"; ticking = "done + evidence".

## 3. SELF-VERIFY — the re-check pass before READY_FOR_PUSH (Finalizer) 🔴

Before declaring CODE_COMPLETE / READY_FOR_PUSH ([`workflow.md`](workflow.md) §3), run **one explicit
self-verification pass** — do NOT trust memory that "I did it":

For **each** DoD item, write one line: **PASS + evidence** *(the exact command output, or `file:line`, or the
diff hunk that satisfies it)* — or leave it `- [ ]` and treat the task as **NOT done**.

- Any **🔴 item** unchecked → status stays `IN_PROGRESS`/`REVIEW`, never `READY_FOR_PUSH`.
- Re-run the objective gates fresh (build-gate, `lint.sh`) — a stale green from 20 edits ago is not evidence.
- Verify-before-assert: re-read the changed files/lines you claim; do not assert an edit you didn't confirm.
- Output the self-verify result to the user + sync ticked boxes to the Issue body.

> This pass is the "**đúng cách để tự kiểm tra lại việc đã làm**": evidence per item, fresh gates, honest
> unchecked-means-not-done. It is the exit gate that complements the DoR entry gate ([`workflow.md`](workflow.md) §0).

## 4. CLOSE

`READY_FOR_PUSH` → user pushes → `DONE` + `gh issue close` **only** with every DoD box `- [x]` and the
push OK (SKILL-MAP §0c; never close at READY_FOR_PUSH). The closed Issue's ticked DoD = the audit trail.

---

## Links
- Item source (the gate) → [`checklist.md`](checklist.md) · State-store template → [`task.md`](task.md)
- Pipeline / milestones (CODE_COMPLETE·READY_FOR_PUSH·DONE) → [`workflow.md`](workflow.md) §3
- Issue scaffold → `.github/ISSUE_TEMPLATE/task.md` · git-ops → [`project-rules.md`](project-rules.md) §2-4
