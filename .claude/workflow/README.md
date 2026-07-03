# `.claude/workflow/` — Software Delivery Workflow

> **Purpose:** put a **visible orchestration** layer on top of the existing agent + skill system, so every code task
> goes through a **fixed pipeline** with a **clear I/O contract between agents** (no agents "talking blindly"). This is
> what was previously missing — the pieces existed but were scattered.

## ⚠️ Foundational principle: do NOT create a parallel governance layer

This file set does **NOT copy** content that already exists elsewhere (it would drift). It is an **index +
consolidation**: each item points to the running **source of truth**, adding only **what's genuinely
missing**. When 2 places conflict → follow the source of truth named in each file.

| File | Role | Source of truth it indexes to |
|---|---|---|
| [`workflow.md`](workflow.md) | **★ The end-to-end pipeline map** (Input→Router→Planner→Worker→Reviewer→Finalizer) + 7 steps + **the I/O contract between agents** | `agents/*.md`, `skills/core-prod-change-discipline`, `skills/core-code-change-workflow`, `SKILL-MAP.md` |
| [`task.md`](task.md) | **★ State-store** per task (scratchpad synced to a GitHub Issue) + status lifecycle | GitHub Issues (`minhhung19872002/HIS`), memory `feedback_task-lifecycle-dod-remote` |
| [`checklist.md`](checklist.md) | Delivery checklist — grouped by Requirement/Design/Impl/Quality/Security/Perf/Test/Done | `skills/his-qa-anti-pattern` #1-30, `SKILL-MAP.md` P0/P1/P2, 9-point self-review |
| [`project-rules.md`](project-rules.md) | Conventions · architecture · branch/commit/PR/review | `CLAUDE.md`, `SKILL-MAP.md`, `skills/his-fe-convention`, git-ops rules |
| [`ai-memory.md`](ai-memory.md) | **Architecture decision log (ADR-lite)** + index of the 2 memory tiers | `memory/` (global), `agent-memory/<agent>/`, `his-docs-manager` (ADR) |
| [`requirement-coverage.md`](requirement-coverage.md) | **Requirement coverage protocol** (anti-omission when reviewing docs): source manifest · read original PDF · enumerate fully · competitor-parity · completeness gate | `docs/requirements/**`, `checklist.md` section I |
| [`audit-protocol.md`](audit-protocol.md) | **Anti audit/agent "overstatement"**: no-quota · mandatory evidence-command · confidence · Fact/Inference/Assumption | `core-verify-before-assert`, `../REGISTRY.md` |
| [`session-ops.md`](session-ops.md) | **Running one session**: what-to-read-at-session-start · choose model (nudge) · plan-mode timing · context cleanup (`/compact`·`/clear`·`/rewind`·`/context`) · keep STATUS short for handoff | `CLAUDE.md §Agent routing`, `SKILL-MAP §0a`, `workflow.md`, `project-rules.md §2` |

> ★ **System-wide anti-drift:** [`../REGISTRY.md`](../REGISTRY.md) = the SOURCE-OF-TRUTH register (which rule lives in which file — link-not-copy) · [`../lint.sh`](../lint.sh) = the immune system that auto-detects drift (auto-runs via the `stop-checks.sh` Stop hook when `.claude` changes).
>
> ⚙️ **Environment prerequisite:** the hooks (`hooks/*.sh`) + `lint.sh` are **POSIX bash** scripts → they need **Git Bash or WSL2** (already present on this dev machine). Plain Windows (CMD/PowerShell, no bash) **can't run the hooks** — Claude Code still works but loses the DoD gate + drift-lint layer. Long-term recommendation: **WSL2** (full POSIX, Docker backend) ≥ **Git Bash** (enough for git + hooks).

## The pipeline in one line

```
Input → [1] Router/Triage → [2] Planner → [3] Worker(s) → [4] Reviewer/Critic → [5] Finalizer → Output
                    ↕               ↕              ↕                 ↕                  ↕
                 ┌──────────────────────────── STATE STORE (task.md) ──────────────────────────┐
                 │ task_id · goal · context · assumptions · steps · results · errors · decision │
                 └──────────────────────────────────────────────────────────────────────────────┘
```

Each agent **only reads/writes the state-store per the I/O contract** — no free-prose handoffs. Detail +
mapping to real agents → see [`workflow.md`](workflow.md).

## How to use (for humans + for Claude)

1. **Every code task** still starts with `SKILL-MAP.md` (skill routing) — unchanged.
2. SKILL-MAP now points to [`workflow.md`](workflow.md) to know **which pipeline the task runs + which agent
   writes what into the state-store**.
3. A **non-trivial** task (multi-file feature/bug/refactor/migration) → open [`task.md`](task.md) as a
   scratchpad, fill it in incrementally, finally sync the result to the corresponding **GitHub Issue**.
4. A trivial task (Q&A, 1-line edit) → no state-store needed; still follow the gate in [`checklist.md`](checklist.md).

## Relationship to settled decisions (NOT to be reversed)

- **The main task board = GitHub Issues** (since 2026-06-13). `task.md` is a **supporting scratchpad**, NOT a
  second board. At task end → sync to the Issue (`gh issue ...`).
- **Git-ops**: do NOT `commit`/`push` on your own until the user is explicit (SKILL-MAP §0c). The pipeline stops at
  `READY_FOR_PUSH`, asks permission, then `DONE`.
- **Report/plan files** still go to `docs/workspace-docs/` (SKILL-MAP §0a). The `.claude/workflow/` set is
  **governance/process**, not reports — so it lives in `.claude/`.
