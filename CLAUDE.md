# HIS - Hospital Information System

> **★ RESPONSE LANGUAGE (all sessions):** reply to the user in the language of their message — a Vietnamese prompt gets a Vietnamese reply, an English prompt gets an English reply. These governance files being written in English is for token efficiency only; it does NOT change the response language. (The `UserPromptSubmit` hook in `.claude/settings.json` requires the one-line skill note in Vietnamese **only when a code task actually starts** — a Q&A/explanation turn prints none.)

## Skills & pipeline (reference, not a mandatory pre-step)

> User decision 2026-09-03: the old "MUST read `.claude/SKILL-MAP.md` BEFORE every task" mandate is
> **REMOVED**, along with its `UserPromptSubmit` reminder hook. Do not open the map as ceremony and do
> not announce it — get straight to the work.

`.claude/SKILL-MAP.md` (+ the `skill-routes/<tier>.md` sub-maps) and `.claude/workflow/workflow.md` are
still there as **reference**: consult them when a task is genuinely unfamiliar or when you want the
established recipe for a tier. The engineering standards they encode still apply and are not optional —
verify before asserting, map the blast radius before editing shared code, keep the diff minimal, pass the
build-gate — but they apply as habits, not as a file you must read first.

> ★ **WHEN CREATING/EDITING any file in `.claude` (governance) — MANDATORY** (anti-drift, the root of all past contradictions):
> (a) **Check `.claude/REGISTRY.md` FIRST** — a rule that already has an owner file → only **1 line + a link**, do NOT copy the content;
> a new rule → add a row to REGISTRY then write it in **one single place**. (b) **Do NOT hard-code changing values**
> (migration number/date/count) → use a dynamic directive. (c) **After editing → run `bash .claude/lint.sh`** (must be LINT OK).

Skills live in `.claude/skills/` (their description auto-loads, so a relevant one surfaces on its own). SKILL-MAP/PROMPT-TEMPLATES + `.claude/workflow/*` are ordinary reference files — read them when they help, not on every task.

## Agent routing (self-selected — ALWAYS state what you're using)

Default to **replying inline** (cheapest). Only spawn a subagent when the work is **independent / parallel / heavy** enough to justify the token cost; **light/repetitive work → `agy`** (free). At the start of every reply, state clearly: *inline* or *which agent* (+ a brief why).

> **Reconcile `agy` ↔ guardrail (project overrides global):** only delegate to `agy` the **isolated boilerplate that does NOT touch the guardrail**; the `agy` output MUST be re-reviewed by Claude against `his-fe-convention` + `his-qa-anti-pattern` + the build-gate before acceptance. Do **NOT delegate** code touching patient-safety / DI / contract / DB / secret / money.

| Kind of work | Choose |
|---|---|
| Q&A · explanation · lookup · a very small edit | **inline** |
| Broad search across many files (only need the conclusion) | `Explore` |
| Add/edit/refactor real code (has blast radius) | `code-change-controller` |
| Design · plan · a new module · a large migration | `his-architecture-planner` |
| Documentation (README/API/handoff/ADR) | `his-docs-manager` |
| Review · quality audit · regression | `his-quality-reviewer` |
| Write/edit tests | `his-test-engineer` |
| Large tech-debt (god-file split, tightening `:any`) | `tech-debt-manager` |
| A large multi-domain task (classify + orchestrate) | `ai-project-orchestrator` |
| Many independent pieces | fan-out **in parallel** (warn about the token cost first) |

**Model tier (save the Opus budget — every session/machine):** the main-loop model is chosen by the user via `/model`; I do **NOT change it mid-session**. Light/repeated/bulk **isolated** work (as above) — besides `agy` — can be pushed to a **subagent `model: haiku/sonnet`** to avoid spending the Opus budget; **heavy / needs-intelligence / touches HIS patient-safety·DI·contract·DB·secret·money** work → **keep Opus** on the main loop (per "Reconcile agy↔guardrail" above — do NOT delegate guardrail code). A session of all light work → prefer `/model` **Sonnet**; a heavy/refactor/migration session → **Opus**. **★ AT THE START OF EVERY session / new chat window (every session·every machine):** assess the session's nature right from the first request → if the current model is in the **wrong tier**, **nudge the user to `/model` the right tier BEFORE starting** (e.g. an all-Q&A/boilerplate session on Opus → suggest dropping to **Sonnet**; about to refactor/migrate/patient-safety on Sonnet → suggest **Opus**); if the model already matches, stay quiet and get to work. *(A soft nudge — not a harness auto-switch.)*

## Working conventions

- **Tìm/đọc code dùng tool Grep và Read, KHÔNG dùng `cd ... && grep <glob>` qua Bash** — Bash luôn
  phải qua vòng permission (một `grep -r` neo ở gốc repo chạm được `./.env`, `./frontend/.env`,
  `./deploy/pacs/oracle/*.key` nên bị deny rule chặn phòng ngừa), còn Grep/Read là read-only nên
  không bị hỏi. Deny/allow của repo: `.claude/settings.json` (secret được neo theo đường dẫn thật,
  không chặn cả cây source).

## Project Structure
- **Backend**: ASP.NET Core Clean Architecture (HIS.Core → HIS.Application → HIS.Infrastructure → HIS.API)
- **Frontend**: React 19 + TypeScript + Ant Design v6 + Vite
- **Database**: SQL Server (Docker container `his-sqlserver`)
- **External**: Orthanc PACS (DICOM), HL7 LIS, Redis

## Key Ports
- Frontend: `http://localhost:3001` (Vite dev server)
- Backend API: `http://localhost:5106` (ASP.NET Core)
- SQL Server: `localhost:1433`
- Orthanc PACS: `localhost:8042` (Web), `localhost:4242` (DICOM)
- Redis: `localhost:6379`

## Running
- Frontend: `cd frontend && npm run dev`
- Backend: `cd backend/src/HIS.API && ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http`
- Docker (SQL + PACS + Redis): `docker compose up -d`

## Testing
- Cypress E2E: `cd frontend && npx cypress run --spec "cypress/e2e/console-errors.cy.ts" --browser chrome`
- Playwright: `cd frontend && npx playwright test`

## Auth
- Login: `POST /api/auth/login` with `{"username":"admin","password":"Admin@123"}`
- JWT stored in `localStorage` keys: `token`, `user`

## Antd v6 Migration Notes (completed 2026-02-24)
- `<Space direction=...>` replaced with `orientation=...` (49 occurrences in 20 files)
- `<Alert message=...>` replaced with `title=...` (50 occurrences in 18 files)
- `<Drawer width=...>` replaced with `size=...` (7 occurrences in 3 files)
- `<Timeline>` items: `children` → `content` (6 files)
- `<Timeline.Item>` converted to `items` array prop (3 files)
- `<List>` deprecated component replaced with div-based custom (6 files)
- `<Tabs tabPosition=...>` replaced with `tabPlacement=...` (1 file)
- API error logging changed from `console.error` to `console.warn` for expected failures

## Backend DI Registration
All services must be registered in `backend/src/HIS.Infrastructure/DependencyInjection.cs`. If a new service/controller is added, register it there or you get 500 errors.

---

## Architecture & conventions (stable)

### Frontend 2-tier
- **v2 (main)** — route `/v2/*`, `TerminalLayout`, design pack `_v2kit`
  (`KpiStrip/TopTabs/StatusTabs/DataTable/DrawerShell/ModalShell` in `frontend/src/pages-v2/_v2kit.tsx`)
  + CSS `ab-*` (`frontend/src/components/layout/terminal/ab-module.css`). List-page helper: `SimpleV2Page<T>`.
  → skill `his-fe-page-v2`.
- **v1 (old)** — `frontend/src/pages/`, `MainLayout`, Antd v6 → skill `his-fe-antd-v6`.
- **API client** — `frontend/src/api/*.ts` via the axios `apiClient`; login returns `{data:{token}}` → skill `his-fe-api-client`. ⚠️ The interceptor (`client.ts`) **auto-unwraps the envelope** `{success,data}` → the caller receives the inner `data` directly. **Do NOT check `response.success`/`.data` after calling `apiClient`** — this mismatch once broke prod login (fixed to tolerate both shapes in `AuthContext.tsx`, commit `92d35a2`). New code: read the already-unwrapped payload directly.
- When paying down FE tech debt: **prioritize `pages-v2/` before `pages/`**.
- **★ v1 IS BEING PHASED OUT (decision #204, 2026-06-17): v2 is going to market, do NOT develop/fix v1 debt (`pages/`) in place** (wasted effort — v1 is about to retire). If v1 has a feature NOT yet in v2 → **port it to v2**; **if the ported part has tech debt → CLEAN THE DEBT FIRST then port (v2 receives CLEAN code, does not inherit v1 debt)**. All FE tech-debt goes to `pages-v2`. (#205 v1-god-split, #209 raw-fetch-v1 = MOOT.)

### Backend
- Clean Architecture; DI is **mandatory** in `DependencyInjection.cs` (see above) → skill `his-be-module-scaffold`.
- **Migration**: `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql`, idempotent (IF NOT EXISTS), wildcard embedded, auto-applied at startup. **Get the next number by listing the folder `ls Data/Scripts/` → max(NN)+1** (do NOT hard-code the number — already past `100_*`). → skill `his-db-migration`.
- The `InvalidCastException Guid↔String` bug: a table with `CreatedBy/UpdatedBy` of type uniqueidentifier needs a whitelist
  ValueConverter in `HISDbContext.cs`.

### Plan/task management (updated 2026-08-04 — NO issue creation)
- **★ DO NOT create NEW GitHub Issues** (user decision 2026-08-04). No `gh issue create` for plans/tasks/bugs; no
  `in-progress` label claiming. **Existing open Issues are still real work** — finish them; close one only after its
  code is pushed. Never bulk-close issues to "clean up".
- **Where a plan lives**: for a multi-part job, keep the plan **inline in the reply** + (if it belongs to an upgrade
  package) the analysis file `docs/requirements/20-yeu-cau-nang-cap/nangcap-phan-tich.md`. Session state →
  `docs/workspace-docs/STATUS.md`.
- **Same-machine multi-window** still coordinates via `bash .claude/window-lock.sh claim <slug>` (local mkdir mutex,
  no GitHub round-trip).
- **★ LONG / MULTI-PART TASK — finish EVERYTHING then push + done (MANDATORY, every session/machine):** for a large multi-part task,
  commit **LOCALLY** per stage to checkpoint, BUT **only `git push` when ALL parts are done per the process** (build-gate + verify each stage) → push once. **Do NOT push partial.** (Pull `--rebase` before the final push to sync with other machines; a short/atomic task still pushes-as-soon-as-done as usual.)
- **★ SCOPE OVERLAP between parts of a job:** while doing part A, if you find work belonging to part B → record it in the
  plan/STATUS **first**, then finish A. Do NOT do the same work twice, do NOT drop context on handoff.
- **Before picking work**: `git fetch origin` + read `git log origin/main` (many machines work in parallel — the source of
  truth is the git log, NOT local docs).
- **★★ HARD RULE (every request/session/machine) — TEST IS MANDATORY BUT ALWAYS GOES LAST:** for ANY request,
  finish ALL fix / feature / tech-debt / security / patient-safety (e.g. #180-215 EXCEPT test) FIRST; **every TEST task (label `test`, INCLUDING harness/CI-gate #191/#212/#213) goes LAST — only start when 100% of fix tasks are DONE. ABSOLUTELY no "early harness" exception.** Enforced via the `session-start.sh` + `remind-pipeline.sh` hooks. To compensate for the missing test-net: every fix sticks tightly to the SAFETY-PROTOCOL (pre-flight · build-gate · manual smoke · minimal-change). The full test program → `docs/workspace-docs/10-assessment/test-plan-2026-06-17.md` + `test`-labeled Issues.
  **★ EVIDENCE + VIEWER (every session/every machine):** every test task with UI MUST capture evidence of all states + view it through the evidence viewer. The naming convention · viewer layout · capture/regen method · DEDUP vs GitHub (#216-289) = the single source of truth in `docs/architecture/evidence/README.md` (do NOT copy the content here). Coverage follows the roadmap `docs/architecture/his-roadmap/` + `his-data-structure.js` (38 modules/485 tables/12 flows).
- **★ A TEST FINDS A BUG → CREATE A LINKED FIX TASK (every session/every machine):** when running a test task and you hit a **bug/error/broken
  UI**, you MUST immediately create a new fix Issue: the title states **what bug + which screen/business**; the body = description + repro steps + evidence (image) + expected-vs-actual; **two-way link with the source test task** (the fix notes "Found from #<test>"; comment back on the test task "Bug → #<fix>"). Label `bug` + module. So the fix knows what to change + can trace back to the test. **★ Test-task DoD (MANDATORY):** a test task may only be marked **DONE** after **EVERY bug it found has a corresponding fix-task fully created (complete info) + a two-way link**. Any bug without a complete fix-task → the test task is **NOT done**.
- `docs/workspace-docs/` now only has: `STATUS.md` (session-state for the hook) · `luong_nghiep_vu.md` (business reference) · 2 roadmap/audit pointers. **Workspace-docs commit + push is normal** (the never-push rule was REMOVED 2026-06-13 — the pre-push hook + guard + `scripts/push-code.ps1` have been deleted).
- End of session: update `STATUS.md`. **Do NOT write a session log into CLAUDE.md** (keep this file slim).

## Production status (update only when it really changes — don't write a session log here)

| Item | Value |
|---|---|
| Backend (Azure Container Apps) | app `his-api` · resource group `rg-his` · env `cae-his` · region `southeastasia` · image `ghcr.io/minhhung19872002/his-api` (migrated off GCP 2026-08-02, GCP billing delinquent) |
| API URL prod | https://his-api.thankfulcoast-bd0486a9.southeastasia.azurecontainerapps.io |
| Frontend (Vercel) | https://his-psi.vercel.app |
| Azure SQL DB | `HIS` · server `his-sql-bp2026.database.windows.net` · serverless **free offer** (100k vCore-s/month, auto-pause when exhausted) · collation Vietnamese_CI_AS · login `hisadmin` (password in Container App secret `sqlconn`) |
| Admin login (all envs) | `admin` / `Admin@123` |
| Local Docker | container `his-sqlserver` · DB `HIS` · sqlcmd `/opt/mssql-tools18/bin/sqlcmd` |
| PACS prod | Orthanc @ https://168-110-52-7.nip.io (Oracle VM `168.110.52.7`) · storage Cloudflare R2 `his-pacs-dicom` |
| Jitsi prod | https://161-33-180-17.nip.io (Oracle VM `161.33.180.17`) |

### Deploy (→ skill `his-ops-deploy`)
- **Frontend Vercel**: auto-deploys on every push to `main`.
- **Backend Azure Container Apps**: **auto-deploys via GitHub Actions** (`.github/workflows/deploy-backend.yml`) when a push
  touches `backend/**` (since 2026-08-02, Azure OIDC keyless auth, image on ghcr.io). Check: `gh run list --workflow=deploy-backend.yml`.
  Manual fallback: `docker build -f backend/src/HIS.API/Dockerfile -t ghcr.io/minhhung19872002/his-api:<tag> backend`
  → `docker push` → `az containerapp update -n his-api -g rg-his --image <tag>`.
- After a migration: `GET /health/schema-drift` (Admin) → `missingCount` must be 0.
  `ProductionSchemaRepairRunner` auto-applies `Data/Scripts/*.sql` at startup.

### Secrets
Do NOT hardcode cloud secrets (Orthanc/R2/seed-key/DB sa) into a tracked file. Get them from the Cloud Run env (`gcloud run services describe his-api`). Security TODO: **rotate the R2 API token** → Issue #25.
