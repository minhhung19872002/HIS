# .claude/REGISTRY.md — SOURCE-OF-TRUTH register (single-source-of-truth index)

> **ROOT CAUSE of drift** (every time something new is created in `.claude` it spawns a contradiction): a cross-cutting rule gets **copied into many files WITHOUT declaring an owner file** → N copies → you fix one place, the other N-1 fall behind. This file declares the **SINGLE OWNER** for each rule. **Everywhere else MUST link, NOT copy the content.** To change a rule → change only the owner file.

## OWNER table (canonical owner)

| Rule / topic | **OWNER FILE** | Elsewhere may only |
|---|---|---|
| git-ops (commit/push/workspace-docs) | `workflow/project-rules.md` §2-4 | 1-line core-principle + link |
| safe-commit (multi-window RACE-PROOF **partial-path** commit + fetch/rebase/push — anti commit-trộn do shared `.git/index`) | `.claude/safe-commit.sh` | mechanism; MANDATE + root-cause → `workflow/parallel-windows.md` R4 + case T5; STATUS per-window → R6 |
| trivial threshold (numeric) | `workflow/workflow.md` §0 | link |
| DONE / READY_FOR_PUSH / CODE_COMPLETE | `workflow/workflow.md` DoD | link |
| build-gate (`npm run build`, NOT `tsc --noEmit`) | `his-qa-anti-pattern` #27 | link |
| 9-point self-review | `his-qa-anti-pattern` #30 | link (FE: `his-fe-convention` §7 = view) |
| next migration number | **DYNAMIC**: `ls Data/Scripts/` max(NN)+1 | NEVER hard-code the number |
| P0/P1/P2 priority | `SKILL-MAP` §0b | link |
| conflict tiebreaker / rule-tension | `SKILL-MAP` §5 / §5b | link |
| quality priority order | `SKILL-MAP` §5c | `core-prod-change-discipline` G12 only links |
| owner-diff (refactor/god-file-split) | `SKILL-MAP` §5 (tech-debt=plan · code-change=execute · planner=design) | |
| requirement coverage / completeness-gate | `workflow/requirement-coverage.md` | link |
| audit / review without overstating (no-quota, evidence, confidence) | `workflow/audit-protocol.md` | link |
| UI-test evidence + traceability (screenshot per case · test name=screen+business · report) | `skills/his-test-e2e` §6 | link; test-plan doc + `test` Issues only link |
| sparring / anti-sycophancy critique (4-step protocol, calibrated, no-quota) | `skills/core-sparring-partner` | link; global `~/.claude/CLAUDE.md` carries one pointer for other projects |
| thinking-modes (open/inversion/critic/synthesis): roles + boundaries + orchestration (use 1/2/3/4 · order Open→Inversion→Critic→Synthesis) | `skills/core-synthesis-decision` §Orchestration | each thinking skill only LINKs; critic-vs-sparring → `skills/core-sparring-partner` (owner of anti-sycophancy critique, target is the USER's IDEA/DECISION ≠ an artifact) |
| meta-reasoning: problem-classification (11 types) → impact LOW/MED/HIGH → dispatch how-to-think (calibrated) | `skills/core-meta-reasoning-orchestrator` | LINK; the 4-mode order is NOT repeated here (→ `core-synthesis-decision` §Orchestration); compose-not-replace `SKILL-MAP` (skill-for-code) + `workflow/workflow.md` (flow) |
| drift-lint (immune system) | `.claude/lint.sh` (auto via `hooks/stop-checks.sh`) | run after every `.claude` edit |
| agent memory-spec block (~137 lines of boilerplate) | **100% identical across all 7 agents** (NOT deduped — subagents need it inline) | edit one → edit ALL 7; lint [9] enforces sameness |
| estimation rubric (XS-XL · P0-P3 · risk) | `workflow/project-rules.md` §7 | link |
| rollback / recovery | `workflow/project-rules.md` §6 | link |
| pipeline I/O contract + state-store = Issue body | `workflow/workflow.md` §2 | agent prompts only link |
| per-task DoD-checklist lifecycle (materialize at CREATE · tick `- [ ]`→`- [x]` as you go · self-verify re-check before READY_FOR_PUSH · TodoWrite live-mirror) | `workflow/dod-checklist.md` | link; item SOURCE = `workflow/checklist.md` · state-store = Issue body → `workflow.md` §2 · status lifecycle → `workflow/task.md` · scaffold → `.github/ISSUE_TEMPLATE/task.md` |
| skill naming token (his-`<token>`-) | `SKILL-MAP` §0 | |
| agent slug ↔ display-name | `agents/ai-project-orchestrator.md` (AVAILABLE...) + `workflow.md` §1 | |
| file-placement (report→workspace-docs; backlog→GitHub Issues) | `SKILL-MAP` §0a + `CLAUDE.md` | |
| deploy (auto via GitHub Actions) | `his-ops-deploy` + `CLAUDE.md` Deploy | |
| test-goes-last (finish ALL fix/feature/tech-debt first, then test; no harness exception) | `CLAUDE.md` §"Plan/task management" | hook `session-start.sh`/`remind-pipeline.sh` inline-enforce + STATUS only links |
| model-tier routing (Opus/Sonnet/Haiku by session nature; soft nudge) | `CLAUDE.md` §"Agent routing" | hook `session-start.sh` nudges inline; elsewhere links |
| task-lifecycle (in-progress label · scope-overlap · long-task→push-once) | `CLAUDE.md` §"Plan/task management" | git-ops mechanics in `workflow/project-rules.md` §2-4; elsewhere links |
| SYNC-GATE anti-duplicate-code (same-machine **mkdir atomic-lock** + cross-machine gh-claim + verify-after-claim) | `workflow/project-rules.md` §2 — **mechanism: `.claude/window-lock.sh`** (+ `.ps1` shim) | **ENFORCE: `hooks/pre-edit-lock-gate.sh` PreToolUse** (blocks Edit when ≥2 windows are unclaimed) + `session-start.sh` nudge/active-marker; `remind-pipeline.sh` only reminds about the pipeline (does NOT enforce the lock); multi-window model → `workflow/parallel-windows.md` §2 |
| evidence viewer / file-layout / naming / regen / dedup-GitHub | `docs/architecture/evidence/README.md` | `CLAUDE.md` §test + `his-test-e2e` §6 (test-naming convention) only link |
| session-ops (what-to-read-at-session-start · plan-mode timing · context-cleanup `/compact`-`/clear`-`/rewind`-`/context` · keep STATUS short for handoff) | `workflow/session-ops.md` | link; does NOT own model (→`CLAUDE.md §Agent routing`) · git-sync (→`project-rules.md` §2) · pipeline/DONE (→`workflow.md`) · file-placement (→`SKILL-MAP` §0a) |
| session↔task display-name (statusline `🔖 task #N` + SessionStart `sessionTitle`, both READ the claimed window-lock; assistant CANNOT self-`/rename` a tab mid-session → user does) | `workflow/session-ops.md` §8 | mechanism: `.claude/statusline.sh` + `hooks/session-start.sh`; lock source → `workflow/project-rules.md` §2 / `.claude/window-lock.sh`; claim-first → `CLAUDE.md §Plan/task management` |
| plugin-routing (USE net-new · DEFER-to-HIS overlap · COMPLEMENT) | `plugins.md` | link; review→`his-quality-reviewer` · UI→`core-ui-aesthetics`+`his-fe-page-v2` · skill-routing→`SKILL-MAP` · enabledPlugins→`~/.claude/settings.json` |
| parallel MULTI-WINDOW same-tree model (4 authors + 1 runner · role×registry · case→fix · 16GB RAM ceiling) | `workflow/parallel-windows.md` | link; git-ops mechanics→`workflow/project-rules.md` §2-4 · claim/SYNC-GATE→`workflow/project-rules.md` §2 · test-goes-last→`CLAUDE.md` |
| multi-agent orchestration **QUALITY** (orchestrating many agents/subagents/Workflow: 7-layer gate · adversarial-verify · objective build-gate · no generic template copy) | `skills/his-flow-multi-agent-orchestration` | link; DISTINGUISH many human WINDOWS=mutex→`workflow/parallel-windows.md` · 1-Claude thinking→`core-synthesis-decision`/`core-meta-reasoning-orchestrator` |
| safe branch/worktree **MERGE process** (fetch-origin → ahead/behind → classify → SUPERSESSION via `git cherry`/patch-id → cherry-pick-specific-over-full-merge → stage-review → build+semantic verify) | `skills/core-safe-branch-merge` | link; git-ops permission → `workflow/project-rules.md` §2-4 · parallel-window/worktree → `workflow/parallel-windows.md` · rollback policy → `workflow/project-rules.md` §6 |
| FE component placement — **dùng chung vs dùng riêng** (shared UI-kit `components/<category>/` · module-private `modules/<mod>/` · page-local; gradual behavior-preserving move) | `skills/his-fe-convention` §4a | link; folder table → same skill §4 · reuse-first → §5 · move discipline → `core-prod-change-discipline`+`core-minimal-change` |

## ★ Rules for writing/editing a rule in `.claude` (MANDATORY — anti re-drift)
1. **Check the table above FIRST.** A rule that already has an owner → the new file gets only **1 line + a link**, ABSOLUTELY no copying of content.
2. A NEW cross-cutting rule → **add a row to this table** (declare the owner) and only then write it in one place.
3. **Do NOT hard-code changing values** (migration number / date / count) → use a dynamic directive (`ls`/`date`/`grep`).
4. **Do NOT reference a memory by a hard-coded name** if you're unsure it exists → check MEMORY.md.
5. After EVERY `.claude` edit → run **`bash .claude/lint.sh`** (must be LINT OK to count as done).

> Principle: governance stays consistent through **verify + enforce (lint)**, NOT through trust/diligence (which always drifts).
