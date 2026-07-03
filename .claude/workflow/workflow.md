# SOFTWARE DELIVERY WORKFLOW — Pipeline & I/O contract between agents

> **This is the end-to-end map** for every code task in HIS. It does **not replace** SKILL-MAP (skill routing)
> but **adds the orchestration layer**: a task runs through a **5-stage pipeline**, each stage owned by a **real agent**,
> the stages exchanging via a **state-store** ([`task.md`](task.md)) under a **fixed I/O contract**.
>
> The source of truth for *the detailed how* is the **skill** (`.claude/skills/*`) + the **agent prompt**
> (`.claude/agents/*.md`). This file only **wires them into a flow** + defines the **handoff contract**.

---

## 0. When to apply the full vs reduced pipeline

| Task type | Pipeline |
|---|---|
| **TRIVIAL** (numeric definition below) · Q&A · explanation · lookup | **Skip the pipeline + skip the state-store + skip the skill-note.** Only the minimal gate: verify-before-assert → build-gate if touching code. |
| Feature · bug_fix · refactor · technical_debt · migration · multi-file (NOT trivial) | **Pipeline** — reduced (skip state-store) if ≤M & 1 module & 1 pass; **full + state-store** if multi-file / blast-radius ≥ MEDIUM. |
| Multi-domain / mixed | Router **splits** into several sub-workflows, each running its own pipeline. |
| **URGENT Production bug** (service down / data corruption / security leak) | **Hotfix fast-path** §6 (overrides DoR). |

### ★ Definition of TRIVIAL (numeric — THE SINGLE SOURCE OF TRUTH; SKILL-MAP/hook/CLAUDE.md only POINT here)
**TRIVIAL = (no change in business behavior) AND (≤5 lines) AND (1 file) AND (does NOT touch shared/contract/DB/auth/money/patient-safety).**
→ Exceeding **any** condition → NOT trivial (e.g. a 3-line `bug_fix` that touches a shared service = NOT trivial).

### ★ Inline vs spawning a REAL agent (default INLINE — cheapest)
By default **one Claude plays the phases sequentially INLINE** in the same context (the pipeline = a thinking framework; the "I/O contract §2" when inline = self-discipline, NO separate file needed).
**Spawn a real agent (Agent tool) ONLY when ≥1 of:** blast-radius **HIGH** · **>5 files** · an **independent, parallelizable** chunk · need for **independent review** (money/contract/DB/patient-safety change). When spawning → the **state-store is MANDATORY in the GitHub Issue body** + pass `task_id` (subagents do NOT share context — see §2/§8).

Golden rule: **do not IMPLEMENT before finishing UNDERSTAND + PLAN.** Do not mark DONE before VERIFY + REVIEW.

### ★ Definition of Ready (DoR) — conditions to be allowed to START stage [3] Worker
Do NOT enter IMPLEMENT until **all** are met:
- [ ] `goal` + `scope_in`/`non_goals` clear; **no blocking `open_questions` left** (ambiguous → STOP and ask, §5)
- [ ] `classification` + `agent_sequence` decided (Router done)
- [ ] `impact` + `file_allow_list` mapped (Planner done); deps/prerequisites ready (not BLOCKED)
- [ ] `completion_criteria` measurable + `verification_required` defined
- [ ] A risky prod change (money/schema/contract/patient-safety) → has **≥3 options** + a **planned rollback** ([`project-rules.md`](project-rules.md) §6)

Missing any item → **do NOT code**; go back to Router/Planner or STOP and ask the user. *(DoR = entry gate; DoD = exit gate.)*
> **Exception:** the **Hotfix fast-path (§6) OVERRIDES DoR** — it does NOT require ≥3 options; only an evidence-backed root-cause + a known rollback. The full DoR applies only to normal tasks.

---

## 1. The 5-stage pipeline ↔ real Agent ↔ Skill

```
 Input
   │
   ▼
[1] ROUTER/TRIAGE ─────────► classify · scope · risk · choose the agent flow
   │                          agent: ai-project-orchestrator
   ▼
[2] PLANNER ───────────────► break into steps · done-criteria · impact map
   │                          agent: his-architecture-planner
   ▼
[3] WORKER(S) ─────────────► execute (code / doc / data / research)
   │                          agents: code-change-controller · his-docs-manager
   │                          research skill: core-codebase-map-tooling
   ▼
[4] REVIEWER/CRITIC ───────► find bugs · edge cases · regression · security · test
   │                          agents: his-quality-reviewer · his-test-engineer
   ▼
[5] FINALIZER ─────────────► gather results · rollback · next action · sync Issue
   │                          agent: ai-project-orchestrator (post-execution)
   ▼
 Output

         ┌──── STATE-STORE INSTANCE = GitHub Issue body (per the task.md template) ────┐
 each     │ task_id · goal · context · assumptions · steps · results                    │
 stage    │ errors · final_decision · status   (task.md = read-only TEMPLATE, do NOT   │
 reads/   │ write state into a tracked file — avoid multi-machine write races)          │
 writes   └────────────────────────────────────────────────────────────────────────────┘
```

| Stage | Agent (file) | Maps to the "5 core agents" | Main skills applied |
|---|---|---|---|
| [1] Router/Triage | [`agents/ai-project-orchestrator.md`](../agents/ai-project-orchestrator.md) | Router/Triage | `core-requirement-clarify`, `core-prod-change-discipline` |
| [2] Planner | [`agents/his-architecture-planner.md`](../agents/his-architecture-planner.md) | Planner | `core-impact-analysis`, `core-architecture-follow`, `core-types-contract` |
| [3] Worker — Code | [`agents/code-change-controller.md`](../agents/code-change-controller.md) | Worker/Code | `core-code-change-workflow`, `core-minimal-change`, `core-reusable-code`, `his-*` by tier |
| [3] Worker — Doc | [`agents/his-docs-manager.md`](../agents/his-docs-manager.md) | Worker/Doc | `his-doc-feature` |
| [3] Worker — Research/Data | inline `Explore` / `core-codebase-map-tooling` | Worker/Research+Data | `core-codebase-map-tooling` |
| [4] Reviewer | [`agents/his-quality-reviewer.md`](../agents/his-quality-reviewer.md) + [`agents/his-test-engineer.md`](../agents/his-test-engineer.md) | Reviewer/Critic | `core-testing-architecture`, `his-qa-anti-pattern` |
| [+] Tech-debt | [`agents/tech-debt-manager.md`](../agents/tech-debt-manager.md) | (specialized debt Worker) | `his-tech-debt-workflow`, `core-refactor` |
| [5] Finalizer | `ai-project-orchestrator` (POST-EXECUTION) | Orchestrator/Finalizer | — |

> **Orchestration note (CLAUDE.md):** default to **replying inline** (cheapest); only spawn an agent when the work is
> independent/heavy enough to justify the token cost; light/repetitive work → `agy`. This pipeline is a **logical model** — Claude can
> play several stages inline for a medium task, or spawn real agents for a large one. **Always state at the start of the reply
> whether you are inline or which agent you're using.**

---

## 2. I/O contract between agents (state-store contract)

> This is the part **previously missing**: a handoff is no longer free prose but an **input/output contract**.
> Each stage **may only read** the fields the previous stage wrote, **may only write** its own fields.

### [1] Router/Triage
- **INPUT:** the user's raw request + repo state (`git log origin/main`, `gh issue list`).
- **OUTPUT (writes state §1-3, §Risks):**
  - `classification` (1 of 11: feature/bug_fix/refactor/technical_debt/**migration**/architecture/testing/documentation/release/investigation/mixed)
    - *Stages activated BY type (not every task has all 5):* `architecture`→Planner; `testing`→Worker=test-engineer+Reviewer; `documentation`→Worker=docs-manager; `release`→Reviewer+ops(deploy-verify §6); `investigation`→`Explore`/`core-codebase-map-tooling` (NO quality-reviewer). **Finalizer always runs** (sync Issue).
  - `goal`, `scope.in`, `scope.non_goals`
  - `priority`, `risk_level`
  - `agent_sequence` (the chosen agent flow — the smallest-safe flow)
  - `verification_required` (which lint/typecheck/build/test are mandatory)
  - `completion_criteria` (measurable)
- **GATE:** ambiguous → STOP and ask (`core-requirement-clarify`); do NOT guess.

### [2] Planner
- **INPUT (reads state):** `classification`, `scope`, `constraints`.
- **OUTPUT (writes state §3 Plan + §Impact):**
  - `steps[]` (small ordered steps) + `done_criteria` per step
  - `impact`: affected files / modules / APIs / DB objects / auth flows / UI flows / integrations
  - `phases` (if blast-radius is large → split into batches)
  - `file_allow_list` (only the files allowed to be touched)
- **GATE:** can't determine impact → route to `investigation` first.

### [3] Worker — Code (`code-change-controller`)
- **INPUT (reads state):** one `step` + `file_allow_list` + conventions ([`project-rules.md`](project-rules.md)) + change limits.
- **OUTPUT (writes state §4 Execute):**
  - `diff` / changed files (only within the allow-list; exceeding → STOP, re-plan)
  - short `change_summary` (WHAT + WHY)
  - `suggested_tests`
  - `build_result` (FE `npm run build` EXIT 0 / BE `dotnet build` 0 errors — **BUILD-GATE mandatory**)
- **GATE:** exceeding the allow-list / changing a contract-DB-API outside the plan → STOP, tell Router to re-plan (SKILL-MAP P0).

### [3] Worker — Doc (`his-docs-manager`)
- **INPUT:** the merged code change + `final_decision`.
- **OUTPUT:** docs/ADR (record an architecture decision in [`ai-memory.md`](ai-memory.md) if it's a long-lived decision).

### [4] Reviewer/Critic (`his-quality-reviewer` + `his-test-engineer`)
- **INPUT (reads state):** `diff` + the original `goal`/`scope` + `build_result` + test result.
- **OUTPUT (writes state §5 Verify/Review):**
  - `verdict`: PASS / FAIL
  - `review_dims`: **Code Quality · Performance · Security · Maintainability** (each: OK / issue — follow the 9-point self-review `his-qa-anti-pattern` #30)
  - `issues[]` (logic bug · missing edge case · requirement violation · regression · security)
  - `must_fix[]` (must be fixed before DONE)
  - `residual_risk`
- **GATE:** FAIL → go back to [3] Worker with `must_fix`; do NOT let it pass while `must_fix` remains.

### [5] Finalizer (`ai-project-orchestrator` post-execution)
- **INPUT (reads the entire state).**
- **OUTPUT (writes state §6 Close + report):**
  - `completed_work`, `deferred_work` (+ reason)
  - `remaining_risks` (+ owner)
  - `rollback_notes`
  - `next_actions` (prioritized)
  - `status` → `READY_FOR_PUSH` (do NOT auto-push — SKILL-MAP §0c) → after the user pushes: `DONE` + `gh issue close`.

---

## 3. The 7 WORKFLOW steps (standardized — point to the skill, do NOT repeat content)

These 7 steps are the **thinking framework within each stage**. The detailed how lives in the pointed-to skill — this is an index.

| Step | Goal | Source of truth (skill) | Maps to stage |
|---|---|---|---|
| **1 · UNDERSTAND** | Understand the business requirement correctly; restate; state assumptions/risks/open questions | `core-requirement-clarify` | Router |
| **2 · ANALYZE** | Impact map: file/module/DB/API/contract/dependency | `core-impact-analysis`, `core-verify-before-assert` | Router→Planner |
| **3 · PLAN** | Break into small steps · done-criteria · ≥3 options for a prod change | `core-prod-change-discipline`, `core-minimal-change` | Planner |
| **4 · IMPLEMENT** | Edit only the necessary files · reuse-first · keep conventions · no over-refactor | `core-code-change-workflow`, `core-reusable-code`, `core-clean-code`, `his-fe-convention` | Worker |
| **5 · VERIFY** | Build/lint/typecheck/test · edge cases · error handling | `his-qa-anti-pattern` #27, `core-testing-architecture` | Worker→Reviewer |
| **6 · REVIEW** | Self-review like a senior: quality · architecture · performance · security · maintainability (9-point self-review) | `his-qa-anti-pattern` #30, `core-prod-change-discipline` | Reviewer |
| **7 · COMPLETE** | DONE only when Done-criteria + verify + review + report are all met; otherwise keep IN_PROGRESS | [`checklist.md`](checklist.md) Completion | Finalizer |

**3 distinct milestones (anti "DONE too early" AND "stuck at READY_FOR_PUSH"):**

| Milestone | Condition | Who transitions |
|---|---|---|
| **CODE_COMPLETE** | (1) requirement meets `goal`+`completion_criteria` · (2) no known logic/runtime bug · (3) build-gate green on the touched tier · (4) VERIFY+REVIEW done, no `must_fix` left · (5) 7-part report done + state-store synced to the Issue | **AI reaches on its own** |
| **READY_FOR_PUSH** | = CODE_COMPLETE + awaiting user permission to push. **This is the final state AI reaches on its own — NOT an error, NOT "unfinished"** | **AI reaches on its own** |
| **DONE** | = `git push` OK (+ verify deploy if it touched prod) | **ONLY user explicit "push"** → then AI may `gh issue close` |

> 🔴 **AI MUST NEVER `gh issue close` at READY_FOR_PUSH** (= falsely reporting DONE, code not yet on remote). Close only in the same turn the user permits push + push OK. If the user deliberately doesn't push yet (batching) → keep READY_FOR_PUSH, the Issue stays open — **correct**, not an error-hang.

(Aligned with memory `feedback_task-lifecycle-dod-remote`. Git-ops: `project-rules.md` §2-4.)

---

## 4. Anti scope-creep (mandatory at every stage)

Detect scope expansion (unplanned refactor · architecture/contract/DB change outside the plan · "while-I'm-here extra edits") → **STOP immediately**, create a new task/Issue for the expansion, re-plan, **ask the user's permission** before doing it. Do NOT cram new scope into the running task. (SKILL-MAP P0 + agent `ai-project-orchestrator` SCOPE CONTROL.)

---

## 5. ★ Escalation / STOP-and-ask — when to STOP and ask the user (consolidated here)
STOP immediately + report/ask the user, **do NOT decide on your own**, when:
- The request is **ambiguous** / ≥2 readings lead to different results (`core-requirement-clarify`).
- **Scope expands** (a refactor/contract/DB/feature outside the plan arises) → create a new task, re-plan (§4).
- **Risk Critical** or touching **money · schema · contract · patient-safety · security** outside the plan.
- **BLOCKED**: missing info/decision/external dependency (e.g. a vendor gateway) → record `errors`, move to `BLOCKED`.
- Verify/Review has **a `must_fix` that can't be safely fixed on your own** (touches a risk area).
- About to **commit / push / deploy / migrate / delete** (a hard-to-reverse op) → ask permission (SKILL-MAP §0c).
- Build-gate fails **with no clear cause after 2 attempts** → report, do NOT hide the error, do NOT claim success.

How to report: state the **problem + ≥2 options + a recommendation**, let the user decide. *(Honesty > confidence.)*

---

## 6. ★ Incident / Hotfix fast-path (URGENT Production bug)
A serious prod bug (service down / data corruption / security leak) → a **reduced** flow that still **KEEPS safety**:
1. **Fast triage**: blast-radius + an **evidence-backed root-cause** (NO blind patching).
2. **Minimal fix** (`core-minimal-change`) — drop the ≥3-options/long-plan, BUT **keep**: verify-before-assert · build-gate · no-hardcode · audit/patient-safety.
3. **Verify**: build green + smoke test on the affected path.
4. **Ask permission to push/deploy** (still §0c) — speed first but with user approval; know the **rollback** beforehand ([`project-rules.md`](project-rules.md) §6).
5. **Short post-mortem**: root-cause + how to prevent recurrence → record in the Issue; if it's an architecture issue → ADR (`ai-memory.md`).

> The fast-path is **ONLY** for urgent incidents; a normal bug still goes through the full pipeline.

---

## 7. Links
- Skill routing: [`../SKILL-MAP.md`](../SKILL-MAP.md) — **read first** for every code task.
- State-store template: [`task.md`](task.md) · Checklist: [`checklist.md`](checklist.md)
- Conventions · git · **rollback** · **estimation**: [`project-rules.md`](project-rules.md)
- Architecture decision log: [`ai-memory.md`](ai-memory.md) · Requirement coverage: [`requirement-coverage.md`](requirement-coverage.md)
