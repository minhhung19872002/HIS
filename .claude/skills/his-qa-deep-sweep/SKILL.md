---
name: his-qa-deep-sweep
description: Use this skill when running a whole-application QA sweep on HIS — "rà soát tất cả chức năng/nghiệp vụ, test có lỗi thì fix", "rà sâu toàn hệ thống", QA round N — where many domains are reviewed in parallel by agents, bugs are reproduced against a live API, fixed with minimal diffs, then integrated, reviewed for breaking risk and deployed. Covers the static FE↔BE contract scans (missing routes, field/enum mismatches, implicitly-required DTOs), E2E OPD/IPD flow replay, and the pre-push risk review. Do NOT use for a single bug fix (code-change-controller) or for writing test suites (his-test-engineer).
metadata:
  type: project
---

# HIS whole-app deep QA sweep

Playbook distilled from QA round 1 (`qa-sweep-full-0915`, ~190 fixes) and round 2 (`qa-sweep-round2-0915`,
~290 fixes). Orchestration quality rules → `his-flow-multi-agent-orchestration`; guardrails → `his-qa-anti-pattern`.

## Khi nào dùng
- User asks to review/test/fix *all* features or "rà sâu thêm lần nữa".
- A previous sweep exists and you need the next, deeper pass without redoing it.

## Quy trình

1. **Sync + coordinate** — `git pull`, read the latest `[qa-sweep-*]` entry in `docs/workspace-docs/STATUS.md`
   (what was fixed / left as decision). `ListAgents` + `bash .claude/window-lock.sh list`: message peer sessions,
   split scope, claim your own lock. Never edit files dirty from another window.
2. **Private API** — run your own backend so agents can hammer it without colliding:
   `dotnet run --launch-profile http --artifacts-path <scratch>/art --urls http://localhost:5107`.
   A 2nd verification instance needs `PACS__MPPS__Enabled=false` (DICOM port clash). Builds always use a separate
   `--artifacts-path` per agent/instance (shared `obj/` + a running process = file locks).
3. **Static scans first** (cheap, find whole bug classes) — run `scripts/` against `/swagger/v1/swagger.json`:
   - `getscan.py` — every GET with placeholder + real IDs → any 5xx is a bug.
   - `fecontract.py` — FE `apiClient.*('…')` calls (resolving `const BASE='/x'`) with no matching route/verb.
   - `fieldscan.py` — FE interface fields vs BE response schema (noisy: paged wrappers/optional fields).
   - `reqscan.py` — `[FromBody]` DTOs whose non-nullable uninitialised `string`/`List` props are implicitly
     `[Required]` (`<Nullable>enable`) → FE omitting the key gets 400. `""` passes, missing/null does not.
   - `writescan.py` (round 4) — every POST/PUT/PATCH/DELETE with `{}` and a schema-minimal body + zero-GUID
     path params → 5xx = unhandled (should be 400/404/409); a 2xx on placeholder-only input = candidate silent
     accept / orphan row (blank catalog codes, zero-GUID parents) — triage per route, then delete the junk rows.
   - `anonscan.py` (round 4) — every route without a token (or as a low-privilege user with `--user`) → anything
     mutating or PHI that is not 401/403 is P0 (found `[AllowAnonymous]` dev endpoints rewriting dates).
   - `writeauthz.py` + `permgap.py` (round 6) — every write as several low-privilege accounts (400/404 = past the
     gate), then diff against the v2 page `permission` each call sits behind → GAP = backend wider than the UI.
     `[Authorize(Roles=…)]` actions bypass `WritePermissionMap`; before widening a role alias in `AuthService`,
     grep every `RoleNames.<alias>` gate.
   - `latscan.py` (round 6) — sequential GET timings + response sizes (unbounded lists, N+1).
   Then keep only hits whose function is actually called by a v2 page (`frontend/src/modules/*/pages/`).
   ⚠️ Write scans EXECUTE whatever accepts `{}` — keep the shared `writescan_risky.py` list, never a shorter copy,
   and clean rows created in the scan window afterwards (round 6 fired "activate code blue" locally).
4. **Fan out** domain agents (general-purpose) with `references/agent-brief.md`; send each the scan hits for its
   domain. Wave 1 = domains/logic; wave 2 = FE↔BE contract per core module; plus one `flow` agent replaying OPD/IPD
   exactly as v2 pages call the API, checking SQL at every hop. Forward cross-domain findings by `SendMessage`.
5. **Integrate** — full build, `dotnet test`, `npx tsc -b`, `npx vite build`; restart the API on the merged code;
   re-run scans (0×5xx), your verify script and the flow scripts.
6. **Pre-push risk review** — `his-quality-reviewer` on the whole diff looking ONLY for changes that break
   legitimate prod use: new permission gates vs role seeds + FE route `permission`, new guards with no v2 escape
   hatch, all-or-nothing validations over legacy data, constructor/DI/signature changes, data-semantics changes.
   Relax/soften before pushing (warnings instead of hard blocks for legacy data).
7. **Commit per domain** with explicit paths (`git add --pathspec-from-file`), STATUS.md entry (fixed + "CẦN ANH
   QUYẾT"), `git pull --rebase --autostash`, push once, watch `deploy-backend.yml`, smoke prod + `/health/schema-drift`.

## Template / Reference
- Agent brief (rules, fix discipline, report format, contract method): [references/agent-brief.md](references/agent-brief.md)
- Scan scripts: [scripts/](scripts/) — `python scripts/<x>.py --help`

## Lưu ý / Pitfalls
- v2 pages live in `frontend/src/modules/<m>/pages/`, NOT `pages-v2/`; `src/pages/` is v1 (retiring, must still compile).
- Git Bash: prefix `docker exec` with `MSYS_NO_PATHCONV=1`; Python on Windows writes CRLF — strip before `comm`.
- Static name matching gives false positives (same function name in several api files) — verify live before fixing.
- A write that succeeds with a zero/unknown GUID parent is itself a bug (orphan rows) — and clean up test rows.
- Data repairs go into an idempotent `Data/Scripts/NN_*.sql` (guarded WHERE), never ad-hoc prod SQL.
- Agents' fixes are not live until the API restarts — keep every repro command for the integration pass.
