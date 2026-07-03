---
name: his-tech-debt-workflow
description: Use this skill whenever working on tech-debt clean-up / refactor in HIS — splitting god-files, removing `:any`/`as any`, removing dead EF migrations, thinning controllers, blanket Fluent FK changes, sweep unused imports, planning multi-phase work, OR session handoff. Triggers include "clean up tech debt", "refactor", "split a god-file", "tighten any", "fix all / sweep all / old files", "continue per the easy → hard schedule", "K1/K2/K5", "T1/T4/T5/T6", "D7-r*", "D8", "summary / make a plan / handoff". Enforces 10 hard-learned rules from the 2026-05-30 session (output markers, report sync, schedule discipline, no-commit-without-permission, side-effect audit, defer-on-logic-change, subagent bulk delegation, spot-check after bulk, scope expansion interpretation, comprehensive backlog planning).
metadata:
  type: project
---

# HIS Tech-Debt Workflow — 10 Rules

A "guardrail" skill for tech-debt clean-up. **EVERY** "debt cleanup" / god-file refactor / mass-replace types / FE-BE pattern migration task must follow the rules below. Violating them → unclear output, stale reports, or worse — broken business logic.

Cross-ref:
- Detailed roadmap: `docs/workspace-docs/20-backlog/tech-debt-roadmap.md`
- Debt metrics: `docs/workspace-docs/10-assessment/rule-compliance-audit.md`
- Unfinished operations: `docs/workspace-docs/90-archive/handoffs/session-handoff-*.md`
- Detailed memory entries (auto-load): see `~/.claude/projects/.../memory/feedback_*.md`

---

## Rule 1 — Output progress markers (English, every reply)

Every tech-debt-related reply must have a **clear marker** so the user knows the position at a glance:

- **Start of reply**: `[EASY/D7-r3]`, `[MEDIUM/T5]`, `[HARD/K1-session-3]`…
- **When reporting done**: the terminal content (not just the task tool) must **clearly** have `[X/Y] COMPLETE` or `[X/Y] session N done`.
- **Task tool subject**: also prefix `[EASY|MEDIUM|HARD]` (e.g. `[HARD] K1 — split FE god-file`).
- **English** (not the Vietnamese words for easy/medium/hard), format `[<DIFFICULTY>/<TASK_ID>]`.

> **Why:** User explicit 2026-05-30: "I don't see in the output a mention of which part is being worked on in English" + "this must be in the terminal content when you report done".

---

## Rule 2 — Schedule discipline (roadmap easy → hard)

1. Every tech-debt work starts by **reading `20-backlog/tech-debt-roadmap.md`** first.
2. Pick the first `⏳` item per the **infrastructure-constraint decision matrix** (the D:\ machine can't deploy → skip items needing deploy).
3. Sort the schedule by: **EASY → MEDIUM → HARD** (easy first).
4. Each roadmap item must have:
   - ID + remaining scope + estimate
   - Pre-flight commands
   - Verify before editing (grep/read the real code)
   - Verify after (build/test command)
   - Deliverable + blast-radius + blocker
   - "Needs deploy or not"

> **Why:** User explicit 2026-05-30: "make a detailed schedule … so just looking at it you know what to do, where to start. Prioritize the schedule from easy to hard".

---

## Rule 3 — Update the report after EVERY step (atomic)

After each item is done (e.g. D7 round 1, K1 session 2…) → **update immediately**, don't wait for session end:

1. `10-assessment/rule-compliance-audit.md`: strike-through the item, change ✅/🟬, record real numbers.
2. `20-backlog/tech-debt-roadmap.md`: update the item + add 1 Update-log line at the end of the file.
3. In the terminal output: "Report X updated" so the user sees it.
4. When listing "Done" at the end of a reply: clearly list the report files updated.

> **Why:** User explicit 2026-05-30: "note that after each step you must update the report to match". A stale report = the next session / another person doesn't know the current state.

---

## Rule 4 — Do NOT commit/push until the user is explicit (EXPANDED 2026-05-30)

- Editing files (Edit/Write) = OK, locally safe.
- `git add` / `git commit` (even LOCAL) + `git push` = **ONLY when the user is explicit** with a keyword
  in the **current turn**:
  - "commit" / "save a commit" / "git add" → OK to commit local
  - "push" / "git push" → OK to push
- **"continue" / "keep going" / "carry on" / "the rest is up to you" is NOT implicit OK**
  for any git op. Only do:
  1. Code change per the roadmap schedule
  2. Build verify (tsc, dotnet build)
  3. Report progress + flag pending
  4. KEEPING the working tree dirty is OK
- A previous turn's permission does **NOT extend** to a later turn (e.g. "commit" at turn N does not
  mean you may commit again at turn N+1 where the user only said "continue").
- Danger: HIS has a GitHub Actions `deploy-backend.yml` auto-deploying Cloud Run on a BE push
  → a sneaky push = a prod deploy. Plus the user treats a local commit as "pushing" via the log.
- Workspace-docs: commit + push is **NORMAL** (never-push REMOVED 2026-06-13). Don't auto-exclude it.
  Git-ops source of truth: `.claude/workflow/project-rules.md` §2-4.
- When in doubt → STOP + a clear status report, do NOT `AskUserQuestion` (the user usually answers "continue").

> **Why:** User reprimanded 2026-05-30:
> 1. After commit `0be6eb1` sneakily pushed docs
> 2. "why do you keep pushing code on your own. update the skill-map or somewhere so you know
>    that on continue you follow the pre-set schedule without pushing code"
> 3. "absolutely do not push code, and especially do not push code in workspace-docs"

---

## Rule 5 — Audit side-effects when splitting a god-file

**Before committing a refactor batch**, grep for timers/subscriptions in each new sub-file:

```bash
grep -nE "setInterval|setTimeout|addEventListener|subscribe|IntersectionObserver" pages/<feature>/*.tsx
```

For each side-effect → audit:

1. In the original god-file, is the side-effect gated by `if (activeTab === 'X')` / a route-visible check / a modal-open check?
2. Does the container keep the component mounted? (Antd Tabs keep mounted by default, React Router with state also keeps it, Modal `destroyOnClose=false` keeps it)
3. If there's a check + the container keeps it mounted → after the split the side-effect runs forever → **logic CHANGE**.

**Fix to preserve behavior**: pass an `active` / `enabled` / `visible` prop from the parent → the sub-component uses the prop in the useEffect deps + early-returns when `!active`.

Hit on 2026-05-30: K1 session 3 `HealthTab` 30s interval — the pause-on-leave was lost, fixed with the `active={activeTab === 'health'}` prop.

> **Why:** User explicit 2026-05-30: "apply the rule but note: don't break the system's logic".

---

## Rule 6 — Defer when touching business logic

When cleaning tech-debt and you discover a change would **affect business logic**:

1. **STOP** right there.
2. Document it in `20-backlog/tech-debt-roadmap.md`: move the item to 🔴 BLOCKED / ⚠️ NEEDS CONFIRMATION, state what the change affects.
3. Report to the user **the before/after code snippet** + impact.
4. Ask the user: fix-now (if minimal) / defer-and-schedule / revert entirely.
5. **Auto-fix ONLY WHEN**: (a) the change is minimal (e.g. 1 prop preserving behavior), AND (b) you verified behavior is preserved by reading the code both ways — not guessing.

**Mental checklist before committing a batch:**
- [ ] Build/typecheck pass? (necessary, not sufficient)
- [ ] Behavior identical to before? (read the code both ways, don't guess)
- [ ] Side-effects preserved? (see Rule 5)
- [ ] API contract preserved? (FE shape + BE shape)
- [ ] Edge case preserved? (null/empty/error path)

Any uncertain checkbox → **defer + roadmap**, don't commit.

**Cases:** T5 (blindly `deleting Migrations/` would break `DatabaseSeeder.cs:32 MigrateAsync()` at runtime) → BLOCKED, deferred to a session with deploy. CORRECT.

> **Why:** User explicit 2026-05-30: "if the rule being applied affects business logic, you must consider it and schedule it appropriately to apply later".

---

## Decision matrix — the D:\ machine CANNOT deploy/smoke-test

| Situation | Items you can do | Items to SKIP |
|---|---|---|
| FE build verify only | D7 (tighten any) · K1 (split FE god-file) | — |
| Build BE + FE | K2 (partial class) · T6 (build-gate) | — |
| Needs deploy + smoke-test | — | T1 · T4 · T5 · K5 |
| Needs hardware/Pkcs11 | — | USB Token PIN, smart card |

**On the D:\ machine prefer:** `D7-r*` → `K1` → `K2`. **Skip:** `T1` `T4` `T5` `T6` `K5` until a session with deploy.

---

---

## Rule 7 — Subagent delegation for bulk mechanical (>50 files)

When tech-debt needs a bulk repeated-pattern fix (e.g. 570 unused imports in 70 files, >100 identical typed casts) — do **NOT do it sequentially alone**, it wastes the context window. Delegate **2-3 (`general-purpose`) subagents in parallel**:

**Subagent prompt pattern:**
1. **Clear scope**: a full list of file paths OR a regex pattern + exclude list (avoid overlap between subagents)
2. **Specific rules**: behavior-preserving · do NOT touch JSX/logic · do NOT commit/push · do NOT touch another task (e.g. do NOT touch `:any` if that's a separate task)
3. **Verify commands**: `tsc --noEmit -p tsconfig.app.json` after each file
4. **Edge case handling**: e.g. `const [loading, setLoading]` where `loading` is unused but setLoading is used → `const [, setLoading]`
5. **Report format**: per-file count + build status + uncertain cases
6. **Run in background**: `run_in_background: true` so 3 agents run in parallel

**Warning:** A subagent has its own context, does NOT know the HIS domain. Only assign mechanical work (remove imports, rename param, extract helper). Do NOT assign logic refactor / business rule / API contract change.

**When NOT to use a subagent:** <50 issues · cross-file dependencies · needs complex context reading.

---

## Rule 8 — Spot-check after a bulk fix (MANDATORY)

After EVERY bulk fix (manual or subagent) >20 files — you MUST do a real spot-check:

1. **3-5 random files** from the batch → read `git diff <file>` to verify:
   - Only the expected imports/types changed
   - Did NOT remove side-effect imports by mistake (`import './styles.css'`, `import 'dayjs/locale/vi'`)
   - Did NOT change JSX render
   - Did NOT change handler/useEffect logic
2. **Full build verify**:
   - `tsc --noEmit -p tsconfig.app.json` → 0 errors
   - `tsc --noEmit --noUnusedLocals --noUnusedParameters` → 0 unused (for a D8-style task)
   - `npm run build` for FE / `dotnet build HIS.sln` for BE — full bundle OK
3. **Audit side-effects** (see Rule 5): grep timer/subscription
4. **Output report (MANDATORY)**: list spot-checked files + verdict (PASS/WARN/FAIL) + build status

**Why:** Build pass ≠ behavior preserved. A subagent might remove `import 'styles.css'` by mistake (build passes but UI breaks), a `_param` rename forgotten at the call site (silent runtime undefined). A spot-check catches it early.

---

## Rule 10 — Comprehensive backlog planning + session handoff doc

At the end of a LARGE tech-debt session (>5 tasks or >50 files modified) OR when the user asks for **"summary / make a plan / handoff"** — you MUST create a session handoff doc.

**MANDATORY location:** `docs/workspace-docs/90-archive/handoffs/session-YYYY-MM-DD-handoff.md` (with a `-AM`/`-PM` suffix if there are 2 sessions the same day).

**7 mandatory sections:**

| Section | Content |
|---|---|
| **A. DONE** | A table of finished tasks + real numbers (file count, lines reduced, build time) + method |
| **B. IN PROGRESS** | Background tasks/agents: ID, scope, % done, ETA, files still unfixed |
| **C. NOT DONE (defer)** | A table of pending tasks split EASY/MEDIUM/HARD + a **Defer reason** column + **Pre-requisite** |
| **D. NEXT PLAN** | Session N+1, N+2, N+3… per the 1-session-1-job principle, sorted easy→hard. Each session: clear scope, pre-flight, effort estimate, risk, verify command |
| **E. KEY DECISIONS** | Decisions settled this session (e.g. "D:\ decision matrix", "subagent delegation effective", "logic-preserve via `active` prop") so the next session doesn't re-debate |
| **F. SKILL + MEMORY UPDATES** | Which skills were updated + which memory feedback was added (link path) |
| **G. WARNINGS + GOTCHAS** | A risk list for the next session (e.g. "D:\ can't deploy", "Antd Tabs keep mounted", "subagent doesn't know the domain") |

**Mandatory cross-ref in the doc:**
- `docs/workspace-docs/20-backlog/tech-debt-roadmap.md`
- `docs/workspace-docs/10-assessment/rule-compliance-audit.md`
- `.claude/skills/his-tech-debt-workflow/SKILL.md`
- Relevant memory feedback files

**After writing:** report the created file to the user + a 3-5 point summary, do NOT paste the full content.

**Why:** The 2026-05-30 session was long (~13h) finishing D7/D8 + K1 partial + 148 files modified. Without full documentation → the next session repeats work / re-debates decisions / pushes unapproved commits.

---

## Rule 9 — Scope expansion interpretation (tech-debt)

When the user uses "**fix all**" / "fix everything" / "sweep all" / "old files" in a tech-debt context — interpret it **as broadly as reasonable**:

| User says | Scope interpretation |
|---|---|
| "fix all unused / dead code" | the WHOLE project (`tsc --noUnusedLocals` whole project, not just session files) |
| "fix old files" in a refactor context | ALL old v1 files + files edited this session |
| "review everything" | whole project, every area, every rule |
| "continue fixing" after a narrow scope was set | expand the scope (the user wants to complete the cycle) |
| "fix [specific X] in [file Y]" | narrow scope, exactly X+Y |

**How:** DEFAULT WIDE. If the scope is too broad → estimate effort (e.g. "570 issues / 70 files / ~6-9h") + propose a plan (delegate subagent / batching) + ask the user **HOW to do it, NOT the scope**.

**Why:** The 2026-05-30 session, D8 — I interpreted "old files" = session-modified files (filtered to 22 issues) → the user repeated "continue fixing" 3 times before I understood it was the whole project (570 issues). Wasted time + repeated messages.

---

## Pair with other skills

- General pre-flight for any code: `core-verify-before-assert` + `core-impact-analysis` + `core-minimal-change`
- Specific refactor: `core-refactor` (behavior-preserving) + `core-architecture-consistency`
- HIS anti-pattern: `his-qa-anti-pattern` (no hallucination, don't drop DI, don't hardcode the hospital name)
- When touching output style: `core-execution-output` (concise, surface destructive ops)
- When touching an API contract: `core-types-contract`
