# Agent brief — HIS deep QA sweep

Replace <BASE> with the private API (e.g. http://localhost:5107) and <SCRATCH> with the session scratchpad.

## Common rules

Goal: DEEP functional + business-logic review of ONE domain group, reproduce bugs against the live API,
FIX real bugs with minimal diffs, and report. A round-1 sweep already fixed ~190 bugs in core domains
(OPD/reception, inpatient/surgery, pharmacy/warehouse, billing/reports, LIS/RIS/bloodbank, security,
platform Repository lost-update). Do not re-report those; dig deeper into your group.

## Environment
- Repo: D:\Source\HIS. Backend Clean Architecture: HIS.Core (entities) → HIS.Application (DTO/interfaces)
  → HIS.Infrastructure (services, `Data/HISDbContext.cs`, `Data/Scripts/NN_*.sql`) → HIS.API (controllers).
- Frontend: `frontend/src/api/*.ts` (axios apiClient AUTO-UNWRAPS `{success,data}`), v2 pages `frontend/src/pages-v2/`.
  v1 `frontend/src/pages/` is being retired: do NOT fix v1 pages.
- Live API for testing: **<BASE>** (do NOT use 5106). Login:
  `curl -s -X POST <BASE>/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin@123"}'`
  → token at `.data.token` (or `.token`). Use `Authorization: Bearer <token>`.
- DB: docker container `his-sqlserver`, DB `HIS`:
  `docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SA" -C -d HIS -Q "..."`
  (find the sa password in `docker-compose.yml` / `backend/src/HIS.API/appsettings.Development.json`; never print it in your report).
- Local DB is dev data: you may create test records; prefix names/notes with `QA-R2`.

## Tools discipline
- Read files with the Read tool, search with Grep/Glob. Bash only for curl/docker/dotnet/git.
- Always absolute paths in Bash; do not `cd` then rely on relative paths.

## What "deep" means (check all that apply)
1. Every endpoint in your controllers: call it (GET with realistic params; POST/PUT/DELETE with valid AND invalid
   payloads). Look for 500s, wrong status codes, silent no-ops (returns success but writes nothing),
   `Random()`/hard-coded/fake data returned as real, `Task.CompletedTask` stubs pretending to save.
2. Business rules: state machines (can you approve twice? cancel after completion? edit a locked/finalized
   record?), validation (negative quantities, end < start dates, future birth dates, duplicates),
   concurrency/double-submit, totals/money arithmetic, date-range filters (inclusive end day, UTC vs VN +07),
   soft-delete (IsDeleted filtered?), paging, search.
3. FE↔BE contract: for each v2 page of your domain, check the `api/*.ts` calls hit endpoints that EXIST
   with matching route/verb/field names (a FE call to a missing endpoint = bug). Check field-name mismatches
   (camelCase), enum value mismatches, status numbers.
4. Data integrity: FK/orphan writes, Guid↔string CreatedBy (InvalidCastException needs whitelist converter in
   HISDbContext), entity columns missing in DB (schema drift).
5. Authorization: endpoints missing `[Authorize]`, PHI exposed anonymously, IDOR.

## Fix rules (MANDATORY)
- Fix only confirmed bugs (reproduced, or proven by reading code with file:line evidence). Minimal diff,
  match surrounding style, English comments only where needed.
- Before editing ANY file run `git -C D:/Source/HIS status --short -- <file>`. If the file is already
  modified and you did not modify it this run, another window owns it: DO NOT edit, report it instead.
- Never touch: patient merge/split (`PatientReferenceReassigner`, `DeletedPatientReferenceAudit`,
  `MergePatientsAsync`/`SplitPatientAsync`), `HealthController.cs`, `PatientPortal*`, `HIS.PatientApp.Api`,
  `.claude/**`, `mobile/**`, `docs/**`.
- **No new SQL migration files** and no DI registration changes without listing them in your report as
  PROPOSED (the coordinator assigns migration numbers). If a fix strictly needs a migration, write the SQL
  into your report instead.
- Product gaps (a whole feature missing, table doesn't exist) are NOT bugs: list them under "Gaps", don't build.
- Build-gate after your edits (separate artifacts dir so you don't collide with other agents):
  `dotnet build D:/Source/HIS/backend/src/HIS.API/HIS.API.csproj -nologo -v q --artifacts-path <SCRATCH>/art-<your-group-key>`
  must show 0 errors. For FE edits: `npx --prefix D:/Source/HIS/frontend tsc -b D:/Source/HIS/frontend` (or
  `cd`-free equivalent) 0 errors.
- The running API on 5107 will NOT pick up your fixes (no restart). Record the repro command so the
  coordinator can re-verify after restart.
- Do NOT git commit / push. Do NOT restart or kill the 5107 API.

## Report format (final message, concise, Vietnamese OK)
```
## <group-key>
### Fixed (each: severity P0/P1/P2 · title · file:line · root cause · repro curl/SQL · expected-after-fix)
### Found but NOT fixed (why: needs migration / owned by other window / needs product decision)
### Gaps (feature missing)
### Files modified (exact list)
### Build result
```

## Implicit-required DTO pattern
SYSTEMIC BUG PATTERN confirmed live: all projects have <Nullable>enable</Nullable> and no
SuppressImplicitRequiredAttributeForNonNullableReferenceTypes, so every NON-nullable `string` / `List<>` / DTO property
WITHOUT an initializer in a [FromBody] DTO is implicitly [Required]. When the FE omits the key (TS `x || undefined`
drops it from JSON) or sends null, the API returns 400 `{"error":"VALIDATION_FAILED","message":"The X field is required."}`
and the v2 form cannot save. Empty string "" passes. Example fixed: RegisterMCIVictimDto (every MCI intake failed).
For every write call your v2 pages make: compare the payload keys the page actually sends vs the DTO's
non-nullable uninitialized properties. If an optional field can be omitted → make that DTO property nullable
(`string?`) — only after checking the service/entity handles null (DB column nullable, no `.ToLower()` on it, etc.).
Do NOT change the global MVC option. Scan list of affected DTOs:
<SCRATCH>/reqscan.txt
Also: when testing live, a successful write with fake/zero GUID parents (orphan rows) is itself a bug — clean up rows you create.

## Contract agents (wave 2)

Read BRIEF.md and ADDENDUM.md (same folder) first — all rules there apply (port 5107, no commit, git-status
check before editing, minimal diff, build-gate with your own --artifacts-path, report format).

## Your mission
Wave 1 found a whole class of bugs the per-endpoint sweeps missed: the v2 page calls a route that exists, gets
200, but the JSON field names / enum representation differ from the FE interface, so the screen silently shows
blanks, wrong status tabs, "NaN", wrong totals, or the save payload is rejected/ignored. Examples fixed:
- MCI: BE `name`/`triageTag`/`status:"Active"` vs FE `fullName`/`victimCode`/`status:number` → no names, all triage=3.
- ClinicalGuidance: BE string codes `"Planning"`, `"ChuyenGiao"` vs FE numeric enums → every row in the "Hủy" tab,
  create rejected (number sent to a string field).
- Hospital pharmacy POS: BE `retailPrice/availableStock` vs FE `unitPrice/stockQuantity` → cart price undefined.

Inputs (static heuristics, NOISY — verify every item):
- `fieldscan.txt`: ratio \t verb \t url \t FE interface \t file:line \t FE fields missing in BE schema \t BE fields not in FE.
  Paged wrappers / optional fields cause false positives.
- `fecontract2.txt` + `reqscan.txt`: missing routes / implicitly-required body DTOs.

Method per v2 page in your domain (pages live in `frontend/src/modules/<m>/pages/`, routes in
`frontend/src/router/routeConfigs/*.routes.ts`):
1. List every api call the page makes and every field it RENDERS or SENDS.
2. Call the endpoint live with realistic params (real IDs from the DB) and diff the actual JSON against what the page reads.
   Also check enum semantics (numbers vs strings, 0-based vs 1-based, status meanings), date formats, money units.
3. For writes, replay the exact payload shape the page sends; a 400 on valid user input or a silently ignored field is a bug.
4. Fix preferably in the FE api client with a small normalizer (keep pages on one contract), or in BE DTO when the
   BE is plainly wrong. Never change a BE response shape other v2 pages already depend on without grepping all callers.
5. Only real, user-visible breakage counts. Unused api functions (no page caller) → list under Gaps, don't fix.
