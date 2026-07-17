# workflow/parallel-windows.md — Model for running MANY parallel Claude chat windows (same-tree, 1 RUNNER)

> **OWNER (REGISTRY):** the multi-window operating model on the SAME working tree. Sub-rules owned elsewhere → **LINK, do NOT copy**.
> Detailed git-ops mechanics = [`project-rules.md`](project-rules.md) §2-4 · claim-first + SYNC-GATE = `project-rules.md` §2 ·
> the 5-stage pipeline = [`workflow.md`](workflow.md) · build-gate/self-review = skill `his-qa-anti-pattern`.
>
> **CURRENT SCOPE:** used for **tech-debt / fix / feature**. **NOT** used for **TEST** tasks — test goes LAST after
> all fixes are DONE (owner: `../../CLAUDE.md` §"Plan/task management"). When switching to test → re-examine this model.

## 0. Why this model exists
Many Claude windows on the same machine **share 1 working tree + 1 backend + 1 DB + 1 set of gateways** (a worktree/external-tool/MCP
only isolates *files*, NOT the *runtime* — researched, conclusion: not suitable for a 16GB machine). Consequence: the danger is in
**RUNNING** (DB/gateways/migration), not **AUTHORING**. The model: **many windows AUTHOR — 1 window RUNS.**

**Hardware ceiling (measured on this 16GB machine — varies by machine):** WSL2/Docker is RAM-capped small (see `~/.wslconfig`), an idle SQL Server
already eats >1GB; the machine usually sits at high commit → **it can hold only 1 HIS stack + 1 running dev session**. Therefore:
- **DEFAULT 2 AUTHOR windows** (safest); **max 4 AUTHOR + 1 RUNNER**. The window count is NOT the goal — **count the number of genuinely
  separate-file backlog LANES** and open exactly that many windows (see §2 STEP-0). Not enough separate lanes → **fewer windows**. Do NOT stand up a 2nd stack/DB.
- **Build SEQUENTIALLY** — never run a heavy build in all 4 windows at once (OOM/swap risk).
- **Cannot achieve** "each window runs/tests its own app" — that's a hardware limit, not a lack of technique.

## 1. Role split by REGISTRY (avoid god-files) — invariant: **1 registry / 1 window at a time**
A god-file (append-magnet) is the main collision point. Give each window a **different registry** → no window competes for files:

| Window | Role | Holds registry (god-file) | Example tech-debt task | Runs the app? |
|---|---|---|---|---|
| **W1** | **RUNNER** | `HIS.Infrastructure/DependencyInjection.cs`, `Data/HISDbContext.cs`, **migration** | split BE god-service, tighten DI | ✅ **exclusive** app + DB + docker |
| **W2** | edit-only | `frontend/src/App.tsx` + menu `TerminalLayout.tsx` | refactor a v2 page, merge a route | ❌ only `npm run build`/`tsc -b` |
| **W3** | edit-only | **registry-free**: controller (auto-discover) · `api/*.ts` (no barrel) · refactor **1 isolated file** | tighten `:any`, split a component | ❌ build only |
| **W4** | edit-only | docs / governance / a DIFFERENT single tech-debt file | remove dead-code, sweep imports | ❌ build only |

> A principle, NOT a hard W1-W4: if the session is all FE tech-debt, you can have W1=runner+isolated-refactor, W2=App.tsx,
> W3/W4=other isolated files. **As long as no 2 windows touch the same registry/god-file/shared contract.**
> A shared/contract "committee file" (`client.ts`, `MappingProfile.cs`, `HISDbContext.cs`, core DTO, `_v2kit`) = the same
> mutex rule as a god-file: **only 1 window edits at a time**.
> **★ Partition by ISSUE-CLUSTER (not just god-files):** an issue **decomposed by *type-site*** (e.g. #354/#355/#356 children of #196 — bound
> type-a / aggregate / write-bulk) is split by *site type* so it's **same-file** → 2 windows picking 2 different sub-issues STILL collide on the file.
> → 1 window **owns the WHOLE sibling cluster** (single-owner); the other does NOT pick a sibling. The coordinator assigns **non-overlapping** issue-clusters per window.

**Suggested model / window** (the model is PER-WINDOW; full criteria → `../../CLAUDE.md` §"Agent routing"): a window touching
**DI / contract / DB / migration / risky-refactor** (usually = RUNNER) → **Opus** · a window doing **verifiable mechanical refactor /
FE page / import sweep / tightening `:any`** → **Sonnet** · a window doing **docs / pure Q&A / isolated bulk NOT touching the guardrail** →
**Haiku** or push to `agy`. Set `/model` **once** when assigning the window's role; nudge a change if a task is in the wrong tier.

## 2. Ritual at the START of each window (each session)
**★ STEP-0 — CLAIM ATOMICALLY BEFORE EDITING (safe-by-DEFAULT, no coordinator needed):** the moment you settle on a task, run
**`bash .claude/window-lock.sh claim <issue|slug> [model]`** BEFORE any Edit (⚠️ **M2** — from a **PowerShell** window you must use
**`powershell -File .claude/window-lock.ps1 claim ...`**; do NOT type `bash` directly because `bash` on the PowerShell PATH is an **empty WSL**
→ exit 1, the lock is NOT created **SILENTLY**). `mkdir` is **atomic at the OS level** → even if N same-machine windows pick the same issue SIMULTANEOUSLY, **exactly 1 window
wins the lock**; the others get `[BUSY]` → **SWITCH task**. Kills "2 same-machine windows duplicate a task" at the root with a **mutex**. Done/switch/blocked →
**`window-lock.sh release <key>`** (release **checks the session-owner** — another window CANNOT steal a LIVE lock; crash → `release <key> --force`).
**★ AUTO-ENFORCE (PreToolUse gate `hooks/pre-edit-lock-gate.sh`):** blocks Edit of a `backend/`/`frontend/` file when **≥2 windows are active** and
that window **has claimed NO lock** (a **1-window session is NOT blocked** → 0 friction) — turning the claim from "reminder" into "enforcement" for the forgot-to-claim case.

**Why a LOCAL lock and not GitHub:** 4 windows on the same machine = the **SAME GitHub account** → `gh` sees ONE identity →
`in-progress`+assignee+verify-after-claim is **BLIND to same-machine window collisions** (all 4 are `@me`). You need BOTH axes:

| axis | **same-machine** (4 windows/1 machine) | **cross-machine** (machine-2) |
|---|---|---|
| **prevention** | `window-lock.sh claim` = **mkdir mutex** (source of truth) | `gh in-progress` + **verify-after-claim** (a DIFFERENT account assignee = detection) |
| **attribution** | `.claude/locks/<key>/meta` (window·model·time) | `gh` assignee |

**COORDINATOR = OPTIONAL (optimization, NOT required):** the lock already blocks issue collisions, so the coordinator is only for **better lane-splitting**
(less file-overlap, assigning sibling clusters). Without a coordinator it's still SAFE thanks to the lock; with one it's more efficient. Windows do **NOT need to number themselves**
— `window-lock.sh` auto-generates a window-tag. Count the **separate-file lanes**, open exactly that many windows (§0).

**⚠️ LOCK LIMIT (no overstatement):** the lock is per **ISSUE** → blocks 2 windows on the same issue. **2 DIFFERENT issues touching the SAME file**
(e.g. #354/#355 on the same service file) the lock can't see → still need **foreign-scan (step 1) + single-owner cluster**; the radical fix for
file-overlap = **`git worktree` for an edit-only window** (physical file isolation, merge via git merge instead of silent last-write-wins).
A decompose-by-type cluster (e.g. #196's children) = **1 single-owner lane**. A **solo (1 window)**: still should claim (cheap) but not required.

Steps 0-4 below are **PER-window**:
0. **MODEL-TIER CHECK FIRST** (before starting the task): assess this window's task nature; if the current `/model`
   is **in the wrong tier** (e.g. Opus for mechanical work / Q&A) → **NUDGE the user to `/model` the right tier THEN work**, don't just dive in
   (the tier = the "Suggested model / window" table §1; owner criteria: `../../CLAUDE.md` §"Agent routing"; the `session-start.sh` hook already nudges).
   The nudge is **soft** — do NOT change the model mid-session yourself.
1. **SYNC-GATE** before picking (clean tree + `git pull --ff-only` + verify-against-CODE + **`git status` foreign-edit scan
   BEFORE claiming**: a dirty file you didn't edit = another window already owns that area → **SWITCH candidate**; a **decompose-by-type** issue
   = **single-owner of the whole sibling cluster**) — owner: `project-rules.md` §2 (step 3).
2. **CLAIM-FIRST = lock (same-machine) + gh (cross-machine):** run `bash .claude/window-lock.sh claim <issue|slug> [model]`
   — with the key as the **issue number** it does BOTH: a local `mkdir` mutex (anti same-machine window duplication) **and** `gh issue edit --add-label
   in-progress --add-assignee @me` + **verify-after-claim** (a DIFFERENT account assignee = machine-2 grabbed it → SWITCH task). Owner: `project-rules.md` §2 (step 4) + `../../CLAUDE.md`.
3. **Declare the allow-list**: state clearly *this window = which issue/module + which files/folders it will touch*. Only edit within the allow-list.
4. **Cross-recognition rule:** if `git status` shows a dirty file **outside your allow-list** → it's **another Claude window
   OR `agy`** (not "Antigravity" by default) → **do NOT touch, do NOT stage, do NOT claim it as your work.**

### 2b. Skill-routing by MODEL TIER — Sonnet/Haiku windows do NOT self-navigate multi-hop
> The SKILL-ROUTER hook + `SKILL-MAP.md` fire for **every** model but are **not tiered** → a weaker model (Haiku/Sonnet) easily
> **skips / mis-picks** when it has to traverse `SKILL-MAP → sub-map → pick skill` itself. The 3 rules below lock the right skill for a cheap window:
- **S1 — Pre-resolve (give the hard part to the strong tier):** the **Opus/coordinator** window (or you) resolves IN ADVANCE the list of *mandatory
  skills + P0 guardrails* for the task **per `SKILL-MAP.md` (2) dispatch**, written into the **brief/issue body** (state-store, owner:
  `workflow.md` §2). The cheap window **only applies the written list** — not its own multi-hop reasoning. If the brief has NO list yet →
  the cheap window reads **exactly the 1 dispatch line** for its task type in `SKILL-MAP.md` (2) and applies **the whole listed skill chain**,
  ABSOLUTELY no inventing skills (fallback `SKILL-MAP.md` (6): unsure → STOP and ask, no making-it-up).
- **S2 — Limit the task type for a cheap window:** Sonnet/Haiku **ONLY** takes **registry-free / verifiable-mechanical /
  docs** tasks (simple 1-2 skill routing). Do **NOT** give it a task touching the **guardrail** (DI · contract · DB/migration ·
  patient-safety · money · secret) → keep that on **Opus** (already a rule `../../CLAUDE.md` §"Agent routing"). A mis-route on a cheap window is
  therefore **less dangerous** (its work doesn't touch the guardrail anyway).
- **S3 — Auto-escalate:** while working, if you discover the task **inadvertently touches the guardrail** unexpectedly (must edit `DependencyInjection.cs`,
  change a contract/DTO, write a migration…) → **STOP, do NOT do it yourself**, nudge the user to switch to an **Opus** window / `/model opus`.
- **P0 applies to EVERY tier (cheap can't skip):** no-hallucination · build-gate · no-hardcode-secret · DI-registration —
  the hook + `SKILL-MAP.md` §0b enforce; every model must follow.

## 3. The model's OWN operating rules (beyond standard git-ops)
- **R1 — Only the RUNNER runs the app/DB/docker.** W2-W4 only `dotnet build` / `tsc -b` / `vite build` (build-gate, NOT run-gate).
  → kills: port collisions, dirtying the shared DB, testing in the wrong window.
- **R2 — god-file & migration = MUTEX.** Only 1 window has uncommitted edits on a god-file at a time. Adding a DI/route/DbSet line →
  **commit JUST that line + push immediately** so other windows rebase onto it before touching the same file.
- **R3 — Safe migration numbering:** only the **RUNNER** creates migrations. The next number = `ls Data/Scripts/` → **max(NN)+1** (ABSOLUTELY
  do not hard-code the number); `git fetch` **before** computing; create the empty `NN_*.sql` file → commit/push IMMEDIATELY so max+1 advances for
  all machines; the script is always idempotent `IF NOT EXISTS`, **no blind DROP**.
- **R4 — Safe git on a shared tree:** **only `git add <your own files>`** (FORBID `add -A`/`-am`) · **★ COMMIT THEO PATH TƯỜNG MINH
  `git commit -- <paths>` (hoặc `bash .claude/safe-commit.sh "<msg>" <paths>`) — TUYỆT ĐỐI KHÔNG `git commit`/`-a` trần**: index là
  **CHUNG** cho mọi cửa → một whole-index commit VƠ luôn file cửa khác vừa `git add` = **commit trộn** (đo được phiên 2026-07-18, nuốt
  WIP #407). "Add đúng file mình" CHƯA đủ — phải commit-scope theo path · use **Edit** not Write/sed (anti CRLF churn) · `git fetch`+`pull --rebase`
  before push · push small/atomic with `Closes #N`. `safe-commit.sh` gói cả: add-explicit → commit-partial → fetch → rebase-nếu-behind → push. Full mechanics → `project-rules.md` §2-4.
- **R5 — RAM:** `docker stop` unrelated containers (e.g. n8n / vhandelivery) while on HIS · **build sequentially**, max 1
  heavy build at a time · close spare browser tabs when building.
- **R6 — STATUS.md (per-window, anti last-writer-wins):** the Stop-hook reads the WHOLE tree → it may block because of another window's file.
  Do **NOT** commit a foreign file to unblock. **★ MỖI cửa cập nhật DÒNG RIÊNG** — thêm 1 bullet phân biệt dưới mục `## Cập nhật theo cửa` dạng
  `- **[<tag>]** updated <YYYY-MM-DD> — <việc> · <kế tiếp>` (mỗi cửa 1 dòng distinct → git merge sạch, KHÔNG ghi đè; Stop-hook chỉ cần 1 dòng
  chứa `updated <today>`). **KHÔNG viết lại dòng/tag của cửa khác**; header "Cập nhật cuối" do **RUNNER** sở hữu (đừng giành — `feedback_antigravity-parallel-same-tree`).
  Commit STATUS qua `safe-commit.sh` (partial-path, không nuốt file cửa khác).

## 4. Every case → how to handle
| # | Case | Level | Handling |
|---|---|---|---|
| 1 | 2 windows edit **the same file** (silent last-write-wins overwrite) | 🔴 | Split files/modules upfront (R-allow-list); **Read again before each Edit**; small/frequent commits → becomes a recoverable git-conflict |
| 2 | 2 windows both add to a **god-file** | 🔴 | R2 mutex; add-commit-push immediately; build-gate after every merge (a dropped DI line = 500 even if build passes) |
| 3 | 2 windows **duplicate a migration number** (merges clean but silently duplicates) | 🔴 | R3: only the runner creates; fetch first; push the empty file immediately; idempotent |
| 4 | A non-runner window **accidentally runs the app** (port collision / dirty DB) | 🔴 | R1 build-only; `vite strictPort` blocks the silent 3001→3002; (optionally) a separate DB `HIS_w2` |
| 5 | **Commit trộn**: `git add -A`/`-am` **HOẶC** `git commit` whole-index **nuốt WIP cửa khác** (index CHUNG) | 🔴 | R4: cấm add-all **+ commit PARTIAL-PATH** `git commit -- <paths>` / `safe-commit.sh` (chỉ commit path mình, bỏ qua thứ cửa khác stage) |
| 6 | A task with **hidden blast-radius** into another window's module | 🔴 | impact-analysis BEFORE claiming (grep callers); committee-file = mutex; prefer additive changes |
| 7 | A **non-fast-forward** push (4 windows + machine-2) | 🔴 | R4: `pull --rebase`; small/frequent push; fetch before claim/migration/push |
| 8 | **OOM/swap** when builds stack on the live stack | 🟡 | R5: build sequentially; `dotnet build` a single project `--no-restore`; stop spare containers |
| 9 | **A hung in-progress label** after a crash | 🟡 | At session start, sweep stale @me labels; small/atomic claims; stop/blocked → remove the label immediately |
| 10 | **Machine-2** = a 5th writer invisible to local | 🟡 | The source of truth is only `git fetch` + `gh issue list`; claim round-trips GitHub BEFORE working |
| 11 | A window **crashes / VS Code reloads** mid-task | 🟡 | Reopen: `git status` + build-gate detects half-done files; frequent checkpoint commits; reconcile labels |
| 12 | **STATUS.md Stop-hook** blocks by mistake (sees another window's file) | 🟡 | R6: don't commit a foreign file; the runner owns STATUS |
| 13 | **CRLF churn** (autocrlf=true) bloats the diff/fakes a conflict | 🟡 | R4: Edit not Write/sed; inspect `git diff` before add (`feedback_windows-line-ending-sed-churn`) |
| 14 | **DROP/seed wrecks the shared DB** (the runner runs every script each startup) | 🔴 | R3 idempotent + no blind DROP; every destructive script reviewed by hand; (optionally) per-window DB |
| 15 | **2 SAME-MACHINE windows pick the SAME issue** (gh assignee BLIND because same account; another window **edit-before-claim** → `gh issue list` doesn't see it yet; OR **decompose-by-type** shares the file) | 🔴 | **MAIN FIX = STEP-0 atomic lock** `bash .claude/window-lock.sh claim <key>` (`mkdir` mutex — exactly 1 window wins even on simultaneous pick). Backup: **foreign-edit scan** `git status` before Edit; decompose-by-type = **single-owner of the whole cluster** — owner `project-rules.md` §2 steps 3-4 (root of the 2026-06-28 bug) |
| 16 | **A hung lock after a crash** (the window holding `.claude/locks/<key>` died → a new window gets `[BUSY]`/gate-blocked) | 🟡 | `session-start` **LISTS** held locks + writes an active-marker (does NOT auto-sweep); **`window-lock.sh sweep`** (run BY HAND) warns about suspected-hung (**inactive session** / >12h / CLOSED issue); release **checks the session-owner** → truly-dead window: `window-lock.sh release <key> --force`; **a live lock → LEAVE IT**. No auto-delete |

## 5. Safety achieved & limits
- **After mitigation ≈ 90-93% smooth** (parallel authoring model). The remaining ~10% are mostly **recoverable** (git-conflict /
  loud port error / idempotent no-op script).
- **4 cases NOT fully eliminated by process, only reduced:** (1) hidden cross-module blast-radius; (2) hung labels after a hard-crash;
  (3) a dropped god-file line when a conflict is resolved sloppily but still build-passes; (4) DROP/scripts wrecking the shared DB. → this is why you should **pay down
  the god-file debt + add an applied-migrations table** to raise the safety ceiling (see skill `his-tech-debt-workflow`).
- **NOT achieved:** 4 windows each running/testing their own app (16GB hardware limit + shared DB). To get it → you need 32-64GB RAM / a cloud
  agent / per-window DB+port, NOT this approach on the current machine.

## 6. (Optional — separate smoke-test, NOT yet auto-applied) Safe SQL Server RAM cap
If you need to rein in SQL inside a small VM, set **BOTH** the SQL internal limit **and** container headroom (don't only set `mem_limit` or
Docker may OOM-kill SQL):
```yaml
# docker-compose.yml › services.sqlserver
environment:
  - MSSQL_MEMORY_LIMIT_MB=2048   # SQL self-limits to 2GB
mem_limit: 2560m                 # container headroom > the SQL limit
```
This is a **shared DB-infra** change (machine-2 inherits it) → **review + smoke-test** before committing; cheaper-safer than just
`docker stop` of unrelated containers to free RAM for SQL.

## 7. 4-WINDOW TEST MODE (run AFTER all fixes are DONE)
> Test goes **LAST** (owner: `../../CLAUDE.md` + `docs/architecture/evidence/README.md` §0). The conventions for **image naming /
> viewer / regen / dedup-GitHub** = owned by **`docs/architecture/evidence/README.md`** + skill `his-test-e2e` §6 — LINK, do NOT copy.

**Different from code mode:** testing runs on **PROD (his-psi)** → the runtime is in the cloud, **no local app/DB needed** → **turn OFF local Docker**
(frees RAM) → 4 windows each with **1 MCP browser running IN PARALLEL** (Playwright / Chrome-DevTools MCP). So the "1 exclusive RUNNER for the app" of §1
**does not apply during test**; replace it with **1 INTEGRATOR window** handling the merge (see below).

- **Split (coordinator):** divide the **WHOLE** plan (38 modules + 12 flows + cross) across 4 windows — **full coverage, NO gap/overlap**.
  Each window submits evidence in its **own folder** (`<layer>-<modid>/` · `flows/` · `cross/`) + its **own TC-code** → no self-collision.
  **Completeness = follow the per-item checklist state in the viewer**, NOT decided by the window split. **The concrete 4-window allocation table
  (C1-C4 + model tier + read-only) = `../../docs/workspace-docs/20-backlog/test-4window-allocation.md`** (source of truth, all machines).
- **Model-tier:** a simple flow/module (navigation, few branches) → a **Sonnet/Haiku** window (§2b S2); a complex flow (much
  setup/branches, tangled business) → **Opus**.
- **Capture:** the MCP auto-drives + screenshots each state, **naming it correctly** per evidence README §2.
- **Shared file during test:** ONLY **`manifest.js`** — **1 INTEGRATOR window** runs `gen-manifest` **ONCE** after all 4 submit
  images (mutex, like a god-file). `data/*.js` is **READ-ONLY** at run time (changing the plan → workflow `his-testplan-evidence`, single-owner).

**🔴 Flow when a TEST FAILS (STOP + create a task — + anti collision/omission):**
1. **STOP that flow** (do NOT fabricate next steps on a broken state); screenshot the `error`/`validation`/`fail` state as evidence.
2. **DEDUP before creating:** `gh issue list --label bug` (+ search the error keyword) → exists → **add a comment**, do NOT create a duplicate.
3. None yet → **create a `bug`/`fix` issue**: title = *what bug + screen/business*; body = description + repro steps + evidence +
   expected-vs-actual; **two-way link** (the fix notes "Found from #<test>"; comment back on the test task "Bug → #<fix>") —
   owner: evidence README §5 + `../../CLAUDE.md`.
4. Mark the item `fail` in the viewer — but the **source of truth for fail = the GitHub issue** (localStorage is only for LOCAL review, not
   committed) → **no shared file for the 4 windows to collide on**.
5. **Do NOT auto-fix during test** (test ≠ fix). The fix re-enters the fix queue for the next cycle; re-test when the fix has landed.

**Test DoD (anti "under-doing" with 4 windows):** a test-task is **DONE ONLY** when **EVERY fail it found has a complete fix-issue +
two-way link**; any fail without a fix-issue → **NOT done**. **Integrator final audit:** no fail is missing a fix-issue,
no module/flow is skipped.

### 7c. TEST ENVIRONMENT by TYPE (resolving the read-only ⊥ E2E tension — angle C)
The 12 flows are **data-consistency/E2E → inherently must WRITE + control data**. Don't pick one environment for everything:
- **STATIC per-screen states** (list · form · detail · validation · permission-view) → **PROD read-only RIGHT AWAY** (safe, covers most of the 38-module checklist).
- **The 12 E2E flows + FORCED states (error/empty/loading) + SENSITIVE modules (HIV/TB/Forensics/Psychiatry)** → need WRITE + data control + NOT touching real PHI → **STAGING (APPROVED 2026-06-24)**: 1 Cloud SQL `HIS_staging` + 1 Cloud Run staging revision · **LOGICALLY-CONSISTENT fake data** (referential-integrity + valid business-state so the flow runs) · resettable/seedable → **reproducible** · can force error/empty · **version freeze** (fixes T9/T24). Until staging is ready → flows + sensitive modules marked **"blocked: needs staging"** — do NOT fake-done.
- **Prod write-sandbox** = a LAST resort (NOT recommended) for a few **non-financial** flows, `ZZTEST_` + cleanup + avoiding payment gateways — drop it once staging exists.
> Why split: static-only-forever = an **illusion of coverage** (missing integration = under-doing); prod-write = **fake bugs from drift + real PHI in images** (wrong-doing + leak). Staging + fake data eliminates both.

## 8. THREE root-fix PILLARS (the radical cure — solving 1 pillar disables many dangers)
The T1-T24 case table is *spot patching*; the 3 pillars below are the *root* — prioritize building them:
1. **STAGING + LOGICALLY-CONSISTENT FAKE DATA** (approved) → disables **N2(PHI) · N5(sequence) · N10(schema) · F(force state) · D(version)** at once. This is the most radical cure; prod-test is just a patch.
2. **MCP READ-ONLY allow-list for prod windows** (don't grant write tools: click-submit/fill/upload/`evaluate`/`run_code`) → disables **N4(rogue LLM) · T5(side-effect)** at the *technical* layer, not relying on discipline.
3. **Route/selector reconciliation gate + screenshot-first** → disables **N1(fake 404) · N3(brittle)** before wasting effort capturing.
> 2 risks the process CAN'T patch — **real PHI in images (N2)** + **LLM rogue-writing prod (N4)** — MUST be solved by Pillar 1 + Pillar 2. Without those 2 pillars → only run **read-only static states, excluding sensitive modules, dropping the 12 E2E flows**.

## 9. ⚠️ REPOSITION (red-team round-4 — READ BEFORE USING §1-§8)
**Discovery 2026-06-24 (verified):** the repo **ALREADY HAS ~127 Playwright/Cypress tests** — `frontend/e2e/workflows/00-13` = **exactly the 12 E2E flows** · `frontend/e2e-prod/*` runs **PROD read-only** · `e2e/clinical-safety-checks.spec.ts` **asserts real patient-safety rules** · CI `.github/workflows/e2e-prod-smoke.yml` auto-runs after deploy on a **GitHub runner** (NOT touching the 16GB local).
- **Correctness** → use/extend the **EXISTING SUITE** (deterministic · CI · real asserts · NO 4-window collision). Do **NOT** rebuild it with manual 4-window-MCP.
- **Evidence-screenshots (compliance/tender)** → generate via a **Playwright script** (headless · CI · auto-name), no human 4-window MCP needed.
- **The 4-window-MCP model (§1-§8) is DEMOTED → OPTIONAL only** for the parts Playwright can't reach. **Screenshot ≠ correctness (M2)**: "% evidence" is NOT "tested".
- **Foundation-layer warnings (red-team round-4):** M1 duplicates the existing suite · M2 false-confidence · M3 test-last ⊥ test-spawns-fix (logical contradiction) · M4 complexity-is-safety self-defeating (32 cases) · M5 human=SPOF · M6 "prod not sold yet" hidden-expiry · M7 doc≠enforce · M8 4-window-MCP unverified (Playwright already runs for real) · M9 a few old 🔴 unverified/over-stated · M10 priority-inversion (open fixes gate everything first).
> **Right direction:** prioritize **running/extending the existing Playwright suite** (CI or on staging); 4-window-MCP is secondary. Before investing in anything more → settle **"what is the test FOR"** (compliance vs correctness vs regression).

**Red-team round-5 (verified 2026-06-24 — LOWERS confidence in "existing suite = enough" to LOW):** the suite has **hard-skip rot** (`'selector stale… route changed'`, `'No reception rows (seed failed'`, `'No inpatient rows'`) · **27 `test.skip`** mostly skip-if-no-data → **fake-green-by-skip** · **69 files point to localhost** (bulk need a backend, CI only runs a prod subset) · Cypress baseUrl `3003`≠dev`3001` · workflow read-dominant → **seed-via-test is CIRCULAR**.
- **NR1** suite rot → fake green · **NR2** skip-on-no-data on staging → false-green · **NR3** seed must be DEDICATED (not "run tests to seed") · **NR4** fresh-DB schema silently missing a column (runner ordinal+error-swallow) → validate the data-layer, not just schema-drift · **NR5** fixing-the-suite = a hidden fix backlog · **NR6** *analysis-paralysis*: 5 red-team rounds done → **STOP theorizing, run 1 real workflow to measure** (empirically refute/confirm).
- Hard rule: **SKIP ≠ PASS**; high skip = broken seed/suite, do NOT report "tested". Detailed remedy → `../../docs/workspace-docs/20-backlog/staging-runbook.md` §3-§5.

**Round-6 — DECISION: DROP STAGING + TEST PROD DIRECTLY (2026-06-24, empirical):** prod = **no-real-data + still being built** (deploys **1-3 times/day**, **26 commits/3 days**) → cloud staging is **REDUNDANT** (PHI/pollution moot; prod schema is more mature > a fresh staging). Measured for real `crud-25groups` (audit, **serial**) on prod = **22/23 pass · 1 flaky (opd) · 0 API-err**; 4 groups empty-data → n/a (false-green).
- **The STABLE VEHICLE = Playwright `mode:'serial'` / CI** — NOT **4-window-MCP IN PARALLEL**. 4-window-parallel-write on prod is **UNSTABLE** (data-confirmed): moving-target 1-3/day · **4-concurrent-write-on-1-DB** (the test team uses `serial` to dodge it) · 1/23 flaky even serial · selector rot. **Dropping staging does NOT fix these** (independent of prod-vs-staging).
- **🔴 GO-LIVE TRIPWIRE:** the moment there are real patients / a pilot / a sale → **STOP test-writing-on-prod**, switch to read-only or rebuild staging. + confirm gateways (e-invoice/payment/BHXH/SMS) are **mocked** before touching them.
- → **staging = DEPRIORITIZED** (`../../docs/workspace-docs/20-backlog/staging-plan.md`); test = **Playwright-serial/CI on prod + tripwire**; 4-window-MCP-parallel-write is **NOT used**.
