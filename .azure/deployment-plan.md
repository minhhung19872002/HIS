# HIS Production Deployment Plan

**Status:** Single-origin image ready — awaiting user approval to push
**Last Updated:** 2026-08-14 (Asia/Ho_Chi_Minh)

## 1. Objective

Serve the Vite SPA from the same Azure Container App that serves the API, so the
frontend and the API share one origin. Previous milestone (NangCap27 fix batch) is
deployed and verified — see section 7.

## 2. Existing Environment

- Mode: MODIFY existing production deployment
- Backend: Azure Container Apps `his-api`, FQDN `his-api.thankfulcoast-bd0486a9.southeastasia.azurecontainerapps.io`
- Frontend today: Vercel Git integration, production alias `https://his-psi.vercel.app` (stays live)
- Azure subscription: `Azure subscription 1` (`c8f2432f-6ab7-48df-be40-64ce06bb7ba2`)
- Resource group / region: `rg-his` / Southeast Asia · environment `cae-his`
- Current baseline: revision `his-api--0000036`, image `…:20260814-013026-269ad9c`, `Succeeded`

## 3. Why single-origin

`/hubs/notifications` was returning HTTP 404 for most connections in production.
Measured on 2026-08-14: negotiate-then-connect succeeded 3 times out of 8. Cause:
the app ran **2 replicas** with no ingress session affinity and no SignalR backplane,
so the negotiate and the transport upgrade landed on different replicas.

`maxReplicas` is now pinned to **1** (revision `his-api--0000036`) → re-measured **8/8
connects HTTP 200**. That is the immediate fix and it is independent of where the
frontend is hosted.

Same-origin hosting is the follow-up that makes the situation structurally better:
cookie-based affinity becomes first-party (so scaling out later is actually viable),
CORS disappears, and the `#422` httpOnly refresh-token cookie becomes usable —
`frontend/src/config/api.config.ts` already documents that it only works when the FE
and the API share a site.

## 4. Change set

| File | Change |
|---|---|
| `backend/src/HIS.API/Dockerfile` | Stage 1 builds the SPA with Node 22; runtime stage copies `dist` → `/app/clientapp`. Build context moves to the repo root. `VITE_API_URL=/api` + `VITE_REALTIME_URL=/` override the Vercel-era absolute URLs in `.env.production`. |
| `backend/src/HIS.API/Program.cs` | Serves `clientapp/` through an explicit `PhysicalFileProvider` (hard cache for `/assets`, `no-cache` for the shell) and adds an anonymous SPA fallback that still 404s `/api`, `/hubs`, `/health`, `/swagger`, `/assets`. Skipped entirely when `clientapp/` is absent, so `dotnet run` and the Vercel deployment are unaffected. |
| `.dockerignore` (new, repo root) | Keeps `node_modules`, `.git`, `docs` out of the now-root build context. |
| `.github/workflows/deploy-backend.yml` | Triggers on `frontend/**` too; build context `.`; extra smoke step asserting the SPA shell, a deep link, and that an unknown `/api` route is still 404. |
| `.claude/skills/his-ops-deploy/**`, `.claude/skill-routes/ops-doc.md` | Rewritten from the dead GCP/Cloud Run recipe to Azure + the replica pin + the wwwroot warning. |

**`wwwroot` is deliberately not served.** It holds the 117 MB ONNX models, BHXH XSDs
and patient photos (`wwwroot/photos/{patientId}`); a bare `UseStaticFiles()` would
publish all of it. Only `clientapp/` is exposed.

## 5. Pre-deployment gates (all run 2026-08-14)

- [x] `dotnet build` (Release, isolated output) → 0 errors.
- [x] `docker build` of the combined image → success, 679 MB, 481 asset files in `clientapp/`.
- [x] Bundle contains **no** absolute `thankfulcoast`/`vercel.app` URL; the compiled
      constant is `normalizeUrl("/api")` → the env override beat `.env.production`.
- [x] Image run against an **isolated** `HIS_smoketest` database (never the real `HIS`):
      `/` · `/v2/reception` · `/health-exchange` → 200 HTML with `id="root"`;
      `/health` → JSON; `/api/no-such-route` · `/swagger/x` → 404;
      `/health/schema-drift` · `/hubs/notifications` → 401 (auth still enforced);
      `/assets/<hash>.js` → `immutable`, shell → `no-cache`.
- [x] Login through the bundled SPA + SignalR negotiate→connect → 200 on that image.
- [x] Playwright against the local image: login, `/v2/reception`, hard reload on the
      deep link — 0 page errors, **0 cross-origin API calls**.
- [x] `bash .claude/lint.sh` → LINT OK.

Two real defects were caught by running the image and fixed before any deploy:
the global `FallbackPolicy` made the SPA shell answer **401** (login page unreachable),
and unknown `/api` routes answered 401 instead of 404. Both fixed with
`MapFallback(...).AllowAnonymous()` plus the explicit prefix guard.

## 6. Deployment steps

1. Push to `origin/main` → `deploy-backend.yml` runs the test gate, builds the combined
   image, updates the Container App, and smoke-tests login + SPA shell + fallback guard.
2. Confirm the revision image tag matches the pushed commit and reports `Succeeded`.
3. Verify on the Azure origin: login, a v2 deep link with a hard reload, SignalR
   negotiate→connect, `GET /health/schema-drift` = 0 missing.
4. Vercel keeps deploying in parallel — it stays the fallback until the Azure origin has
   run clean for a while. Decide later whether to point a custom domain at Azure and
   retire the Vercel alias.

## 7. Previous milestone — NangCap27 fix batch (verified 2026-08-14)

Deployed as `his-api--0000035` / `269ad9c` and verified on production: pharmacy sales
200 (was 500), roster 200, `month=13` → 400 (was 500), schema-drift `missingCount` 0,
and the five repaired v2 routes render with no page error and no 5xx.

## 8. Known trade-offs

- **Cold start.** `minReplicas: 0` — with the SPA in the same image, the first request
  after idle now delays page load, not just the API. Raising it to 1 costs money
  (the ACA free grant does not cover an always-on replica).
- **No CDN** in front of the SPA on the Azure origin; assets are served by Kestrel with
  a one-year immutable cache header.
- **Frontend deploys are slower** — a frontend-only change now rebuilds the image
  (~4 minutes) instead of Vercel's incremental build.
- **`maxReplicas` must stay 1** until SignalR gets a backplane or sticky sessions.

## 9. Rollback

- Backend + SPA: `az containerapp update -n his-api -g rg-his --image <previous tag>`
  (previous known-good `…:20260814-013026-269ad9c`, revision `his-api--0000036`).
- Frontend: Vercel is untouched and still serves `https://his-psi.vercel.app`.
- No data rollback — the change adds no schema and no migration.
