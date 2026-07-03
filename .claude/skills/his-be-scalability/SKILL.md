---
name: his-be-scalability
description: Use this skill when sizing or hardening HIS for concurrent load — many users at once, a hospital with 100 vs 1000 staff, peak-hour overload, slow endpoints under load, DB connection exhaustion, or N+1 / unbounded queries. Triggers include "optimize for load / overload / many concurrent users", "hospital A 100 users vs B 1000 users", "API slow when busy", tuning Cloud Run concurrency/min/max-instances, pagination/AsNoTracking/Include, Redis caching hot reads, DB indexes for hot queries, or rate-limiting. Do NOT use for frontend bundle/render (his-fe-performance), creating a plain CRUD service (his-be-module-scaffold), background jobs (his-be-background-worker), or writing the index DDL itself (his-db-migration).
metadata:
  type: project
---

# HIS Backend Scalability (load handling / many concurrent users)

The same codebase sold to a 100-user hospital vs a 1000-user hospital differs in **infrastructure config + query discipline**,
not a rewrite. This skill gathers the right-stack load levers (ASP.NET Core + SQL Server + Cloud Run + Redis)
to avoid peak-hour overload (morning registration, dispensing, paraclinical results).

## When to use
- Estimating/configuring for a hospital by user count; preparing for peak hours.
- An endpoint slow/timing-out when busy; connection pool/SQL timeout errors; high Cloud Run CPU/memory.
- A page returning "all records" (no pagination) or a suspected N+1.

## When NOT to use
- FE bundle/re-render → `his-fe-performance`. Writing index/table DDL → `his-db-migration`.
- A new CRUD service → `his-be-module-scaffold`. A background worker → `his-be-background-worker`.

## Load levers (check in order of impact)

**1. Query discipline (biggest impact, cheapest)**
- **Pagination MANDATORY** for every list — use `PagedResultDto` + `Skip/Take`; do NOT `ToListAsync()` on a large transactional table (Patients/Examinations/ServiceRequests…). The existing `.Take(200)` cap is a minimum.
- **Anti N+1** — `.Include()`/`.ThenInclude()` or a projection `.Select(new {...})` for related data; don't repeat a query inside a for loop.
- **`AsNoTracking()`** for every GET (read-only) query — less RAM + faster.
- **Index for hot queries** — frequently-filtered columns (date, status, FK, code) must be indexed; create via `his-db-migration` (idempotent script). Measure with real queries, don't index blindly.

**2. Read-heavy/write-light caching (Redis available)**
- A rarely-changing catalog (Departments, Services, ICD, master catalogs) → Redis cache, reasonable TTL + invalidate on edit. This group is the most re-queried when users are busy.
- Do NOT cache patient/transaction-sensitive data in a way that leaks between users.

**3. Cloud Run autoscaling (the "100 vs 1000 user" lever)**
- Levers: `--concurrency` (requests/instance), `--min-instances` (reduce cold start at peak), `--max-instances` (a ceiling so the DB isn't broken), `--cpu`/`--memory`.
- Small hospital: low min, moderate max. Large hospital: raise min (pre-warmed) + max, but **max must match SQL Server's connection ceiling** (see #4) — scaling the app while the DB can't keep up = crash the DB.
- Verify the current config with `gcloud run services describe his-api` before changing (don't guess numbers).

**4. DB connections & async**
- Connection pool: total `max-instances × pool-size` must NOT exceed the Cloud SQL connection limit → tune `Max Pool Size` in the connection string to the DB ceiling.
- `async/await` throughout (already the convention) — blocking a thread synchronously kills throughput when busy.
- Side tasks that don't block the request: fire-and-forget correctly (the audit log uses `Task.Run` + `IServiceScopeFactory` — do NOT reuse the request's DbContext, it'll ObjectDisposedException; see `his-be-background-worker`).

**5. Overload protection**
- Rate limiting for heavy/login endpoints (ASP.NET RateLimiter) so one client doesn't choke it.
- Timeout + cancel (`CancellationToken`) for long queries; avoid holding a hung request.

## How to apply
1. **Measure first** — identify the genuinely slow endpoint (log/APM), don't optimize blindly.
2. Fix the query (pagination/N+1/AsNoTracking/index) — usually enough.
3. Still bottlenecked → cache the hot catalog (Redis).
4. Genuinely high load → tune Cloud Run (concurrency/min/max) balanced with the DB ceiling.
5. Re-verify by measurement, record the config per hospital (sizing profile).

## Pitfalls
- **Scaling the app but forgetting the DB** — raising max-instances exhausts Cloud SQL connections → mass 500s. Balance `max-instances × pool ≤ DB ceiling`.
- **Caching patient data wrong** — leaks between session/user; only cache shared, non-sensitive data.
- **Filtering `CreatedAt.Date == today` unindexed** + a large table → full scan; index the date column (there's a precedent of a blank page due to timezone — see CLAUDE.md).
- **Changing config by gut** — always `describe` the current state + measure before/after; an infra change is an op to surface clearly (core-execution-output).

## Reference
- Index/DDL: `his-db-migration`. Worker/safe scope: `his-be-background-worker`. Cloud Run deploy: `his-ops-deploy`.

## When to update
- When the infrastructure changes (DB to a different Cloud SQL tier, adding a cache layer), or when there's a new per-hospital sizing profile.
