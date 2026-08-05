# Skill Map — HIS (slim router)

ROUTER map: choose which skill to use for a request. **The full description of every skill is auto-loaded by Claude via `description`** (the available-skills list) → this map does NOT repeat those descriptions, it keeps only **routing + governance**.

> **★ RESPONSE LANGUAGE (always):** reply to the user in the language of their message — a Vietnamese prompt gets a Vietnamese reply, an English prompt gets an English reply. Governance/skill files being written in English is for token efficiency only; it does **NOT** change the response language. (Enforced by the `UserPromptSubmit` hook in `settings.json`, which requires the one-line skill note in Vietnamese **only when a code task actually starts** — a Q&A/explanation turn prints none.)

**★ THE ONLY ENTRY POINT (every input starts here → runs one full process):**
```
Input ─► [MAP] SKILL-MAP.md (choose skill) ─► workflow/workflow.md (choose flow/pipeline + state-store)
        ─► run the 5-stage pipeline (Router→Planner→Worker→Reviewer→Finalizer) ─► Output/DONE
```
- **SKILL-MAP** = *which skill to do it with* (routing). **`workflow/workflow.md`** = *which flow/pipeline to run + what the agent writes to the state-store*. The two are complementary, NOT interchangeable.
- A **non-trivial** task MUST go through the full pipeline ([`workflow/workflow.md`](workflow/workflow.md)) + use the state-store ([`workflow/task.md`](workflow/task.md)); mark `DONE` only after passing [`workflow/checklist.md`](workflow/checklist.md).
- Branch/commit/PR/review conventions: [`workflow/project-rules.md`](workflow/project-rules.md) · architecture decisions: [`workflow/ai-memory.md`](workflow/ai-memory.md).
- **Session operations** (what to read at session start · choosing a model · when to use plan-mode · context cleanup `/compact`·`/clear`·`/rewind`·`/context` · keeping STATUS short for handoff): [`workflow/session-ops.md`](workflow/session-ops.md).
- **Installed plugins** (USE net-new chrome-devtools/playwright MCP · DEFER-to-HIS for frontend-design/code-review/github · meta recommender): [`plugins.md`](plugins.md).
- **Task "review / compare against docs / gap analysis / is-it-complete / backlog from `docs/requirements/**`"**
  → MANDATORY per [`workflow/requirement-coverage.md`](workflow/requirement-coverage.md): source-manifest
  first · read the original PDF if the `.md` is incomplete · enumerate fully (no summarizing) · the **competitor-parity** principle
  (competitor-has → mandatory; not-there-not-needed → DO NOT create) · dedup · **completeness-gate** (DO NOT say "enough" until 100% of the sources are covered). Guards against over-confidence/omissions.

**How to use (2 steps, token-saving):**
1. Read this file (governance + index + dispatch).
2. Per dispatch (2) → read **exactly one sub-map** in `.claude/skill-routes/` for the task's tier. Open `skill-routes/_reference.md` only when you need the end-to-end playbook / full dependency map.

**2-tier** structure: **A · CORE** (`core-*`, portable, tech-agnostic) and **B · PROJECT/HIS** (`his-*`, stack-bound). Skills live in `.claude/skills/` (**only the top-level `SKILL.md` auto-loads via description**; content under `references/` + `scripts/` does NOT auto-load — Read it when the skill says so, progressive disclosure). Docs live in `docs/` (NOT skills).

> **Section index** (read by logic, not by line order): **(0)** skill-naming · **(0a)** file-location · **(0b)** P0/P1/P2 (the most core rules) · **(0c)** git-ops · **(1)** skill index · **(2)** dispatch · **(5)** conflict-resolution+tiebreaker · **(6)** fallback · **(7)** split. **Sections (3) playbook + (4) dependency-map** live in `skill-routes/_reference.md`.

---

## (0a) ★ LOCATION OF REPORT / PLAN / HANDOFF FILES (MANDATORY)

**All report, plan, handoff, audit, and roadmap files** in the project MUST be stored under **`docs/workspace-docs/`** — do NOT put them at the project root, do NOT scatter them inside `frontend/` or `backend/`.

| File type | Naming convention | Related skill |
|---|---|---|
| Evergreen tech-debt schedule | `docs/workspace-docs/20-backlog/tech-debt-roadmap.md` | `his-tech-debt-workflow` Rule 2 |
| Rule-compliance metrics audit | `docs/workspace-docs/10-assessment/rule-compliance-audit.md` | `his-tech-debt-workflow` Rule 3 |
| End-of-long-session handoff | `docs/workspace-docs/90-archive/handoffs/session-YYYY-MM-DD-handoff.md` (suffix `-AM`/`-PM` if 2 sessions/day) | `his-tech-debt-workflow` Rule 10 |
| Module/feature assessment | `docs/workspace-docs/10-assessment/danh-gia-<topic>.md` | `his-doc-feature` (if it's an official feature doc set → put it under `docs/features/<feature>/`) |
| NangCapNN analysis | `docs/workspace-docs/NangCap_<NN>_PhanTich.md` OR `docs/requirements/` | `his-flow-nangcap-package` |

**Do NOT:**
- Create plan/report `*.md` at the project root (`/PLAN.md`, `/REPORT.md`)
- Create them inside `frontend/` or `backend/` (those are code dirs)
- Use `.txt` or `.docx` — always use `.md` markdown
- Skip cross-refs (every handoff must link to `20-backlog/tech-debt-roadmap.md` + `10-assessment/rule-compliance-audit.md` + the related skill)

**When to create a new file vs update an existing one:**
- Evergreen schedule (roadmap/audit) → UPDATE the existing file (do not create a v2)
- Snapshot of a specific session (handoff/work-log) → CREATE a new file with a date suffix
- One-off assessment (feature gap analysis) → CREATE a new file with a clear name

**Subfolders when files get long/numerous:**
- `docs/workspace-docs/20-backlog/items/plan-<ID>-<topic>.md` for a detailed per-task tech-debt plan (T1/T4/T5/T6/K1-K5) — each plan has pre-requisite + verify command + steps + rollback + estimate
- `docs/workspace-docs/90-archive/handoffs/session-YYYY-MM-DD.md` when there are many handoffs (>5 files)
- Do NOT create a subfolder for a single file — only when >3 files of the same kind

User explicit 2026-05-30: "Every time you write a report or make a plan, you must write it down here, remember".

---

## (0c) ★ GIT OPS — ABSOLUTELY DO NOT commit/push ON YOUR OWN (MANDATORY)

User explicit 2026-05-30 (reprimanded 3+ times):
> "why do you keep pushing code on your own. update the skill-map or somewhere so you know
> that on continue you follow the pre-set schedule without pushing code"
> "absolutely do not push code, and especially do not push code in the workspace-docs folder"

**Core principles** (★ **full table + edge cases + thresholds = source of truth** [`workflow/project-rules.md`](workflow/project-rules.md) §2-4 — NOT repeated here, to prevent drift):
- "continue / keep going / carry on" / "the rest is up to you" = code-change + build-verify + report **ONLY** → do NOT `git add`/`commit`/`push`.
- Only an explicit keyword **in the current turn** unlocks it: "commit" → commit LOCAL (do NOT push); "push" (in any language) → only then `git push`. A previous turn's permission does NOT extend to a later turn.
- workspace-docs commit + push is **normal** (the never-push rule was **REMOVED** 2026-06-13).

Cross-ref memory: `feedback_no-commit-push-without-permission.md` · `feedback_continue-no-git-ops.md`
*(removed `feedback_workspace-docs-never-push.md` — that memory was deleted + the rule was reversed 2026-06-13.)*

---

## (0) Skill naming rules (MANDATORY — do not ask, do not invent)

Every `his-*` skill must carry a **tier token** right after `his-`: `his-<token>-<descriptive-name>` (lowercase-kebab).
When creating a new skill, **pick the token from the table — do NOT ask again, do NOT free-name**.

| Token | Tier | Used for |
|---|---|---|
| `fe` | Frontend | React page/component, api client, Antd UI, viewer, print form, portal |
| `be` | Backend | service/controller/entity, external gateway, payment, worker trigger logic |
| `db` | Database | SQL Server tables, migration, seed |
| `fs` | Fullstack (FE+BE) | a feature spanning both tiers that can't be split (e.g. SignalR realtime) |
| `ops` | DevOps | deploy, CI/CD, prod infrastructure |
| `test` | Testing | a specific test runner (Cypress/Playwright/PowerShell API) |
| `qa` | Quality/guardrail | anti-pattern, convention, safety, patient-safety |
| `doc` | Documentation | feature doc set |
| `flow` | Orchestration | multi-skill chained playbook (e.g. the NangCapNN package) |

Rules:
- `core-*` (portable, tech-agnostic) does **NOT** carry a tier token — keep it `core-<name>`.
- A cross-tier skill → `fs`; if it's mostly one tier, assign it to the dominant tier (e.g. payment is mostly BE → `be`).
- A new token (outside the table) is added **only** when a genuinely new task group appears, together with an update to this table.
- Name is lowercase-kebab; the **`name:` frontmatter MUST match the folder name** (verify the match after creating/renaming).
- **Standard frontmatter (Agent Skills spec):** only `name` + `description` (required) + optional
  `metadata` / `allowed-tools`. A custom field (e.g. `type: project`) MUST live under `metadata:`,
  NOT at the top level. `description` ≤ 1024 chars, third person, trigger-rich + `Do NOT use`.
  How to write the frontmatter/description/body + template → skill **`core-skill-authoring`**.

---

## (0b) ★ RULE PRIORITY TIERS — P0 / P1 / P2 (every session MUST follow)

When generating/refactoring code, apply rules by tier. **P0 = absolutely never violate · P1 = mandatory · P2 = recommended (don't turn it into an excuse to over-engineer).**

### 🔴 P0 — ABSOLUTE (a violation = patient-safety loss / broken runtime / security leak / false reporting)
1. **Patient safety**: keep drug-interaction/allergy/contraindication checks; correct Patient↔MedicalRecord↔Order mapping (`his-qa` #20-22).
2. **🔝 NO HALLUCINATION / FABRICATION (highest P0)**: absolutely do not infer/assume/fabricate/make things up; do NOT invent files/functions/endpoints/fields/DB columns/props/config/logic-structures/data-flows that **don't exist**. You must Read/Grep verify in the real code before asserting; when unsure → write "assumption" or STOP and ask, never present a guess as fact (`core-verify-before-assert`, `his-qa` P0 at top of file).
3. **BUILD-GATE**: add/modify/delete code → build the touched tier clean (FE `npm run build` EXIT 0 · BE `dotnet build` 0 errors) BEFORE reporting done (`his-qa` #27). Never claim success without verifying.
4. **Register DI** for a new service/controller (forgetting = 500) (`his-qa` #1).
5. **Do NOT hardcode** credentials/secret/connection string/token (`his-qa` #18); hospital name/URL → constants/env (#16-17).
6. **Medical-record audit & privacy**: keep the audit log on mutations; `CreatedBy` = real user (≠ `Guid.Empty`); role-guard records (`his-qa` #23-26).
7. **Validate on the BE** (do not trust the client) (`core-validation-pattern`).
8. **PUT FILES in the right folder — NOT at the root**; missing folder → propose the user creates it (`his-qa` #28-29).

### 🟠 P1 — MANDATORY (core architecture & quality — keep the codebase maintainable/scalable)
9. **REUSE-FIRST** (FE+BE): find existing code/folder → reuse/extend, don't create duplicates (`core-reusable-code`).
10. **9-POINT SELF-REVIEW** (BE+FE) before reporting (`his-qa` #30).
11. **Layer separation / separation of concerns**: UI · service (`api/*`) · state · validation · mapper · constants; do NOT mix business/axios into the render component (`his-fe-convention` §2, §8).
12. **FE ANTD-FIRST + config-driven**: prefer Antd v6/`_v2kit`, JSON-shaped options; no plain HTML/CSS when not needed (`his-fe-convention` §5).
13. **Naming convention** correct + domain-aligned (`his-fe-convention` §1).
14. **Safe refactor**: backward-compat · preserve behavior · migrate incrementally · NO mechanical replace/blind mass-migrate · impact-analysis before editing shared code (`core-refactor`, `core-impact-analysis`, `his-fe-convention` §6).
15. **Keep the stack — NO redesign/rewrite**: no CQRS/MediatR/Minimal-API/Next.js/Tailwind-first; hand-written idempotent SQL scripts (NO auto `ef migrations`) (`his-qa` #2-4).
16. **Security/permission rendering** + route guard + no hardcoded roles (`his-fe-convention` §9).
17. **Error/loading/empty** complete + standardized API errors (`core-error-loading-state`, `his-fe-convention` §10).

### 🟡 P2 — RECOMMENDED (clean-code & polish — apply when reasonable, do NOT over-engineer)
18. Function-level clean-code: SRP, guard clauses, few parameters, magic-value→const, immutability (`core-clean-code`).
19. Performance: lazy/code-split, `useMemo`/memo **where appropriate** (measure first), debounce/throttle, virtualize large tables (`his-fe-performance`) — NO premature optimization.
20. a11y/WCAG for clinical screens (`core-accessibility-pattern`).
21. DRY by the **rule-of-three** — avoid premature abstraction; YAGNI (`core-minimal-change`).

> ⚠️ **Anti over-engineering (real-world HIS enterprise):** P2 must NOT be used as an excuse to add unneeded
> layers/abstractions. The project uses **Controller+Service / React+Antd+`_v2kit` / context+local+refetch** — NO Redux/
> normalized-store, NO heavy DDD (aggregate/value-object/repo-per-aggregate), NO CQRS. When torn between
> "theoretically correct pattern" and "matches the current codebase" → **follow the current codebase** (`core-architecture-consistency`).

---

## (1) Skill index (name + tier) — the "choose when" lives in the sub-maps

### GROUP A · CORE (`core-*`) — applied at the head of every chain, NO tier token

| Sub-tier | Skill | Choose when the request involves |
|---|---|---|
| A0 governance | `core-skill-authoring` | creating/editing/reviewing a skill `.claude/skills/*/SKILL.md` |
| A-discipline (pre-flight) | `core-prod-change-discipline` | ★ **Tech-Lead umbrella** for a Production change — wraps the lifecycle (clarify→analyze→root-cause→blast-radius→minimal→**≥3 options**→scope→tech-debt→**self-critique**→**gate lint+test**→**7-part report**→priority order); LINKS the skills below |
| | `core-requirement-clarify` | understand the requirement correctly; STOP-and-ask vs proceed (start of EVERY task) |
| | `core-verify-before-assert` | anti-hallucination; verify file/symbol/endpoint/field before asserting |
| | `core-impact-analysis` | blast-radius map (callers/contract/test/migration) before editing shared code |
| | `core-minimal-change` | YAGNI; smallest correct change, no over-engineering, no out-of-scope edits |
| | `core-code-change-workflow` | **the umbrella workflow for ANY code change** (add/modify/delete) — pre-flight + file-allow-list + fail criteria + rollback; practical for FE/BE/DB/API/test/doc |
| | `core-execution-output` | reporting command output: concise by default, auto-expand on failure, always surface destructive ops |
| A1 arch/reuse | `core-architecture-follow` | code touching multiple layers |
| | `core-reusable-code` | **every** time you create a file/abstraction (reuse before create) |
| | `core-clean-code` | **every** code-gen/refactor — function/statement-level clean code (SRP, guard clause, magic value, immutability, async hygiene, maintainability/upgradability) |
| | `core-architecture-consistency` | adding a feature by precedent |
| | `core-refactor` | "refactor / clean up / split" while preserving behavior |
| | `core-safe-branch-merge` | consolidating/merging local branches + worktree work into `main` (merge vs cherry-pick vs skip · supersession check · parallel-window/worktree merge safety) |
| | `core-codebase-map-tooling` | navigate the codebase fast (find a function/class/symbol "where / who calls it") via the **ctags** (`tags`) index / LSP-MCP — low token; onboarding an unfamiliar repo |
| A2 cross-cutting | `core-types-contract` | defining an API contract / signature |
| | `core-validation-pattern` | validating a form/payload (FE+BE consistency) |
| | `core-error-loading-state` | UI with fetch/submit (loading/empty/error/success) |
| | `core-accessibility-pattern` | UI needing a11y/WCAG (keyboard, focus, ARIA, contrast, labels) |
| | `core-ui-aesthetics` | UI that needs **taste / less generic / more pro** (spacing/typo/color/hierarchy/restraint) — no UX harm; portable across projects |
| | `core-ui-ux-audit` | **system-wide UX/UI AUDIT** (light↔dark, consistency, off-system, hardcode-vs-token, reuse/scale) → **plan + tasks FIRST**, root-first fixes AFTER; audit-first, no edits until the audit is done. Scope-able (1 module/full), token-heavy |
| | `core-localization-pattern` | adding display text / multi-language |
| A3 testing | `core-testing-architecture` | choosing the level unit/integration/e2e/contract |
| | `core-testing-reuse` | reusing helper/fixture/mock + regression |
| A4 thinking (systematic) | `core-meta-reasoning-orchestrator` | **ENTRY/ROUTER** of the thinking group: heavy-reasoning problem → classify into 11 types → gauge impact LOW/MED/HIGH → dispatch skills+techniques → assumptions/alt-model/confidence (call BEFORE reasoning; LOW → skip) |
| | `core-open-thinking` | widen the solution space — generate multiple **orthogonal** models, anti-anchoring (DIVERGE phase, start of cycle) |
| | `core-inversion-thinking` | invert the problem — "what would make it FAIL" → pre-mortem / backward / assumption-flip (REFRAME phase / when stuck) |
| | `core-critic` | audit **one existing artifact** — errors/wrong-assumptions/risks/missing-evidence → severity-ranked findings + verdict (CONVERGE phase / gate). USER's idea/decision in conversation → `core-sparring-partner` |
| | `core-synthesis-decision` | converge: merge options + findings + failure-map → 1 decision + rationale + residual risk; **OWNS §Orchestration of the 4 modes** |

### GROUP B · HIS (`his-*`) — indexed by tier, detailed "choose when" + prompt chains in the sub-maps

| Tier | Skill | Sub-map (read when the task is in this tier) |
|---|---|---|
| FE | `his-fe-convention` (★ convention/architecture guardrail — with EVERY FE code-gen/refactor), `his-fe-library-policy` (★ choose/integrate the right library at the right time — with EVERY FE code-gen), `his-fe-page-v2`, `his-fe-api-client`, `his-fe-antd-v6`, `his-fe-webauthn-biometric`, `his-fe-standalone-portal`, `his-fe-dicom-viewer`, `his-fe-emr-print-form`, `his-fe-performance`, `his-fs-realtime-signalr` | `skill-routes/fe.md` |
| BE/DB | `his-be-module-scaffold`, `his-db-migration`, `his-be-payment-gateway`, `his-be-external-gateway`, `his-be-background-worker`, `his-be-scalability` | `skill-routes/be.md` |
| TEST | `his-test-api-powershell`, `his-test-e2e` | `skill-routes/test.md` |
| OPS/DOC | `his-ops-deploy`, `his-doc-feature` | `skill-routes/ops-doc.md` |
| Orchestration / Guardrail | `his-flow-nangcap-package` (the NangCapNN package), `his-flow-multi-agent-orchestration` (ensure quality when orchestrating many agents/subagents/Workflow), `his-qa-anti-pattern` (with **every** code-gen) | see (2) below |

---

## (2) Dispatch — which tier the task belongs to → read that sub-map

| Task type (prompt) | Also read sub-map | Note |
|---|---|---|
| v2 page · api client · antd v1 · fingerprint/WebAuthn · standalone login portal · DICOM viewer · print form · realtime/SignalR · **FE performance/bundle optimization** · **a11y/WCAG** | `skill-routes/fe.md` | the skill chain + paths are in the file |
| backend module · create/edit/seed tables · payment/QR · national/BHXH/Zalo/SMS/FHIR gateway · background worker · **load/concurrent-users** | `skill-routes/be.md` | |
| UI/E2E test · backend API test | `skill-routes/test.md` | |
| prod deploy · write module documentation | `skill-routes/ops-doc.md` | |
| do the **whole package** NangCapNN / compare against a tender PDF | (no sub-map needed) `his-flow-nangcap-package` orchestrates → chain by gap (read `_reference.md` for the playbook) | PDFs in `docs/requirements/`, `NangCap_PhanTich.md` |
| **fast codebase navigation / find "where is function·class·symbol / who calls it" / onboard a repo** | (no sub-map needed) `core-codebase-map-tooling` — grep the `tags` index (ctags) or LSP-MCP | install: `winget install UniversalCtags.Ctags` · regen `scripts/gen-tags.ps1` · `tags` is gitignored |

**Cross-cutting chains (kept here — not bound to one tier):**

| When the developer prompts | Skills (in order) |
|---|---|
| "add validate / form [X]" | `core-validation-pattern` → `core-types-contract` → (`his-fe-page-v2`/`his-be-module-scaffold`) |
| "refactor [X]" | `core-refactor` → `core-architecture-consistency` → `his-qa-anti-pattern` |
| "**tech-debt cleanup / split god-file / tighten any / easy → hard**" (any task driven by `docs/workspace-docs/20-backlog/tech-debt-roadmap.md`) | `his-tech-debt-workflow` (6 rules: progress markers · schedule discipline · report sync · no-commit-without-permission · side-effect audit · defer-on-logic-change) → `core-refactor` → `core-architecture-consistency` → `his-qa-anti-pattern` |
| "create / edit / standardize / review skill [X]" | `core-reusable-code` (extend before create) → `core-skill-authoring` |
| "**merge branches into main / consolidate local branches / merge vs cherry-pick / is this branch safe to merge / combine worktree work**" | `core-safe-branch-merge` (fetch-origin → classify → **supersession** → cherry-pick-specific-over-full-merge → stage-review → build+semantic verify → push discipline). git-ops permission → `workflow/project-rules.md` §2-4 · parallel-window/worktree → `workflow/parallel-windows.md` |
| **a heavy-reasoning problem that needs CHOOSING HOW TO THINK** (design/architecture/decision/planning/security/risk/optimization/troubleshooting/research; "how should I approach", "analyze/assess for me") | `core-meta-reasoning-orchestrator` (classify → impact → dispatch → assumption/alt-model/confidence). LOW → answer directly. Does NOT override `SKILL-MAP` (skill-for-code) / `workflow.md` (flow) |
| "design/assess/brainstorm/**finalize an approach** · critique one artifact · pre-mortem · widen solutions" (systematic thinking) | (by risk, use one or more) `core-open-thinking` → `core-inversion-thinking` → `core-critic` → `core-synthesis-decision`. How-many-skills + order = **§Orchestration** in `core-synthesis-decision` |
| **using MANY agents/subagents · `Workflow` fan-out · "ensure quality with many agents" · parallel review/audit/research/migration/design** | `his-flow-multi-agent-orchestration` (7-layer gate: right-size → one-writer/worktree → schema → **adversarial-verify** → consensus-when-same-question → **objective build-gate** → completeness; anchored to the real harness, do NOT copy a generic template). DISTINGUISH: many human WINDOWS = mutex → `workflow/parallel-windows.md`; 1-Claude thinking → `core-meta-reasoning-orchestrator`/`core-synthesis-decision` |
| **PRE-FLIGHT — EVERY code task (run BEFORE writing)** | `core-requirement-clarify` (ambiguous → ask in one batch; clear → record the assumption) → `core-verify-before-assert` (verify, do NOT invent file/symbol/field) → `core-impact-analysis` (blast-radius map if editing shared code) → write per `core-minimal-change`. **When the user says "add/edit/delete code", "fix bug", "refactor", "delete file/function", or any scoped code-gen task** → add `core-code-change-workflow` (the umbrella add/modify/delete workflow with pre-flight, file-allow-list, fail criteria, rollback). **A Production change (risky/hard-to-rollback/auth·money·schema·contract) or "fix a prod bug"** → wrap the whole lifecycle with `core-prod-change-discipline` (root-cause+evidence · **≥3 options** pros/cons/complexity/risk/cost · self-critique · **gate lint+typecheck+build+test** · **7-part report** · priority order) |
| **ANY code-gen / refactor** | always include `core-reusable-code` + `core-clean-code` + `his-qa-anti-pattern`; **FE code** also includes `his-fe-convention` + `his-fe-library-policy` (consider + explain the library choice for each form/data/state/test group… — HIS default stack, a new lib only with a clear win + user approval); **building/editing UI** also includes `core-ui-aesthetics` (taste + restraint, anti "AI-slop", no UX harm). **(1) REUSE-FIRST (FE+BE):** before creating a file/function/component/folder → **check whether related code/folder already exists** (grep `_v2kit`/`components`/`hooks`/`utils`/`api`/`constants` on FE; `Services`/`Controllers`/`Entities`/`DTOs` on BE) → if it exists, **reuse / extend**, do NOT duplicate. **(2) FE ANTD-FIRST:** prefer Antd v6 / `_v2kit`, **do NOT write plain HTML/CSS when not needed**. **(3) PUT THE FILE IN THE RIGHT FOLDER:** a new file is NEVER at the root → into the right folder by type (FE `frontend/src/...`, BE `backend/src/...`, test/docs/script accordingly); no suitable folder → **propose the user creates the folder before creating the file** (see `his-qa-anti-pattern` #28-29). **(4)** Rule skills (convention/guardrail) MUST be applied RIGHT WHILE writing/editing code — not standalone, not "read then ignore". Order: **core-* first → his-* after** |
| **REPORTING command output (any task)** | `core-execution-output`: concise by default · auto-expand root-cause on failure · always surface destructive/security ops · never claim success without verifying |
| **BUILD-GATE before reporting done** (add/modify/DELETE code) | Build the touched tier clean before reporting "done" (FE `npm run build` EXIT 0 · BE `dotnet build` 0 err · touched both → build both · only `.claude`/docs → no build needed). Remaining errors = not done. **Detail (source of truth):** `his-qa-anti-pattern` #27 |
| **9-POINT SELF-REVIEW before reporting (BE+FE)** | AI self-reviews 9 points (duplicate · dead-code · hard-code · anti-pattern · god-unit · long-function · import-cycle · naming · state) before reporting, without being prompted. **Detail (source of truth):** `his-qa-anti-pattern` #30 (FE view: `his-fe-convention` §7) |

---

## (5) Conflict resolution

| Situation | Rule |
|---|---|
| Page v1 (Antd) vs v2 (`_v2kit`) | v1 → `his-fe-antd-v6`; v2 → `his-fe-page-v2`. Default new feature = v2. Do NOT mix. |
| BE test vs E2E | BE API → `his-test-api-powershell`; UI/route/flow → `his-test-e2e`. |
| EF migration vs SQL script | Always hand-written SQL scripts (`his-db-migration`) — the project IGNOREs pending model changes. |
| core (portable) vs his (specific) | General principles in `core-*`; `his-*` only adds the stack-specific part + restates the relevant bit. |
| Duplicate "no hardcode / don't forget DI" | Common source of truth: `his-qa-anti-pattern` (+ `core-*`). |
| **Self-review / build-gate duplicated in many places** | **Source of truth = `his-qa-anti-pattern` #27 (build) + #30 (canonical 9 points).** `his-fe-convention` §7 = FE view = "9 points + 2 slices (API/Data, Security)", does NOT renumber; `core-clean-code` §9 = function-level view. Build-gate = `npm run build` (NOT `tsc --noEmit`). |
| **git-ops / commit / push / workspace-docs** | **Source of truth = [`workflow/project-rules.md`](workflow/project-rules.md) §2-4.** workspace-docs commit+push is **normal** (never-push REMOVED 2026-06-13). Elsewhere keep only "do not commit/push on your own without permission" + a LINK, do NOT repeat the table. |
| **trivial vs pipeline** | The **single numeric definition** is in [`workflow/workflow.md`](workflow/workflow.md) §0 (≤5 lines·1 file·doesn't touch shared/contract/DB/auth/money/patient-safety). Elsewhere points to it, does NOT state it differently. |
| **DONE vs READY_FOR_PUSH** | Per `workflow/workflow.md` DoD: READY_FOR_PUSH = done-awaiting-handoff (the final state AI reaches on its own); DONE only after the user pushes OK → then `gh issue close`. AI does NOT close at READY_FOR_PUSH. |
| **Migration number / changing state** | **Do NOT hard-code the number** in governance. Always `ls Data/Scripts/` and take max(NN)+1. Forbidden to write a specific number (it always drifts). |
| **Who owns the refactor/god-file-split diff** | `tech-debt-manager` = plan+orchestrate (does not do large edits itself); `code-change-controller` = EXECUTES every diff; `his-architecture-planner` = design only. One god-file-split has only one executing owner. |

### (5b) ★ Tiebreaker when 2 rules ARE IN TENSION (rule-tension — avoid AI over-engineering / drift)

| Tension between | Decide (in order) |
|---|---|
| **Reuse-first ↔ SRP/no-god-service** | Reuse when **same responsibility**. If extending makes a service/component "absorb" ANOTHER responsibility → **create new**, do NOT stuff it in to "reuse". *Reuse ≠ stuffing.* |
| **DRY/extract ↔ rule-of-three/YAGNI** | **Reusing** something that ALREADY EXISTS is always preferred. But **EXTRACTING a NEW abstraction** only when repeated **≥3** times + **same reason to change**. "Accidental" duplication in different contexts → do NOT merge (premature merge = wrong coupling). |
| **Split small (SRP) ↔ over-split / meaningless wrapper** | Split when there are **>1 clear responsibilities/reasons-to-change** OR it's too long/hard-to-test/hard-to-read. Do NOT split just by line count; do NOT create a 1-layer wrapper that adds no value. When unsure → keep it together (more readable). |
| **Clean-up/refactor ↔ minimal-change/backward-compat** | Within the **scope being edited** you may clean dead-code/naming of that part (light boy-scout). Do NOT expand the refactor to files/modules **out of scope** unless requested; do NOT change behavior/public API (avoid over-refactor + large hard-to-review diff + breaking the running system). |
| **Performance ↔ readability/maintainability** | Default to **readability**. Optimize (memo/lazy/virtualize/cache) only when a real lag/bundle/slowness is **MEASURED** (`his-fe-performance`/`his-be-scalability`) — do NOT memoize/abstract everything "just in case". |

### (5c) ★ Quality-attribute priority order (HIS in production — when you must trade off)

**Patient safety + Correctness + Security (P0)** → **Backward-compat / Refactor-safety** (do NOT break the running system) →
**Readability + Maintainability** → **Scalability** (per `his-be-scalability`, when there's a load need) →
**Performance** (optimize when a hotspot is MEASURED) → **Delivery-speed** (fast but NOT at the cost of the above).

> Why (years of real HIS): **not breaking what runs > theoretically pretty**. Scalability/Performance are
> optimized only when measured (avoid premature over-engineering). When the user's prompt demands "fast" but conflicts with P0/P1 → prioritize P0/P1, and state the trade-off clearly.

---

## (6) ★ FALLBACK — when NO suitable skill exists

If the request **doesn't match** any skill in (1)/(2): **do NOT rush to create a new skill.** A skill is only worth creating when it's **reusable many times** — otherwise it bloats into "junk skills". Only propose a skill and an approach based on the tech stack, libraries, framework, naming convention, and workflow already in the system. Only create a new skill when the problem is genuinely different, can't reasonably fold into an existing skill, and is likely reusable across many future tasks.
When evaluating, consider: intended use, workflow, input/output, domain, processing pattern, and the degree of logic overlap with existing skills. Decide in this order:

**Step 1 — Can you extend an existing skill?**
If a skill is *almost right* → **update/extend that skill** (add the case to SKILL.md / reference) instead of creating new. Prefer reuse (per `core-reusable-code`). After updating → fix the index (1) / dispatch (2) / sub-map / `_reference.md` if needed.

**Step 2 — Is the request REUSED MANY TIMES?** (decision gate) Ask: will this pattern/task type recur later?
- **YES (worth packaging)** → propose **creating a new skill**: name **per (0) naming rules** (correct tier token, do NOT ask/invent) · **tier** (`core-*` if portable to other projects / `his-<token>-*` if HIS-specific) · purpose · trigger · dependency (`his→core`). **Ask the user to approve** → create per skill **`core-skill-authoring`** (standard frontmatter `name`+`description`+`metadata.type`, progressive disclosure) → **add it to index (1) + dispatch (2) + sub-map + `_reference.md`** → reuse next time.
- **NO (one-off, doesn't recur)** → **do NOT create a skill.** Do the task directly with the `core-*` skills + the general approach, and **say so clearly**: "one-off task, no new skill needed".

**Always prefer:** reuse > expand > merge > create new. Do NOT "wing it" against the convention; do NOT cram things into the wrong-purpose skill.

> A skill is born only when it's **worth reusing many times** (or extending an existing one) → SKILL-MAP grows correctly,
> without bloating with one-off skills.

---

## (7) Split plan — anti token-bloat (already applied + how to extend)

**Already split (progressive disclosure for the map itself):** this file keeps only governance + index + dispatch. The detailed "choose when" + prompt chains + paths moved to the per-tier sub-maps; the playbook + dependency map are in `_reference.md`.
- `skill-routes/fe.md` · `be.md` · `test.md` · `ops-doc.md` — prompt chains + paths by tier.
- `skill-routes/_reference.md` — (3) end-to-end playbook + (4) full dependency map + location notes.

**Threshold to split further:** when a sub-map exceeds **~250 lines** → split that sub-map into narrower groups (e.g. `be.md` → `be-core.md` + `be-gateway.md`), add a dispatch line in (2). Do NOT let one routing file exceed ~300 lines.
**Golden rule when splitting:** only *move* content (don't drop requirements), each new file has a header `> read TOGETHER WITH SKILL-MAP.md`, and (2) must point to the new file. This file is always the single entry point you must read first.
