---
name: his-ops-deploy
description: Use this skill when deploying HIS to production — one Azure Container Apps image (`his-api` in `rg-his`) that now serves BOTH the ASP.NET API and the Vite SPA from the same origin, plus the legacy Vercel frontend. Triggers include "deploy backend to prod", "deploy NangCapNN", releasing API or frontend changes, verifying schema-drift after a migration, rolling back a bad revision, reading a production 500, or diagnosing "FE live but API 404". Reminds that GitHub Actions auto-deploys on push to main touching backend/**, frontend/** or .dockerignore, that the app is pinned to ONE replica because SignalR has no backplane, and that wwwroot must never be served publicly. ALWAYS verify after: gh run list --workflow=deploy-backend.yml + GET /health/schema-drift = 0.
metadata:
  type: project
---

# HIS Production Deploy (Azure)

Production runs on **Azure Container Apps**. One image contains the API *and* the SPA:
the Vite build lands in `/app/clientapp`, so `https://<fqdn>/` serves the app and
`https://<fqdn>/api/...` serves the API — same origin, no CORS, first-party cookies,
SignalR on a relative URL.

> Migrated off **Google Cloud Run 2026-08-02** (GCP billing delinquent). Any `gcloud` /
> `cloudbuild.yaml` recipe you remember is DEAD — do not run it. Single-origin image
> since **2026-08-14**.

## When to use

- Deploying after adding/editing a controller, service, migration or frontend page.
- Verifying schema-drift after a new SQL script.
- Rolling back a bad revision, or reading a production exception.
- Diagnosing "FE is live but the API 404s/500s".

## When NOT to use

- Writing BE/FE code → the matching scaffold/page skill.
- Writing a SQL migration → `his-db-migration`.

## Deploy = push to main (there is no manual step)

`.github/workflows/deploy-backend.yml` fires on a push to `main` touching
`backend/**`, `frontend/**`, `.dockerignore` or the workflow file. It runs the
`dotnet test` gate → builds the image (**build context = repo root**) → pushes to
`ghcr.io/minhhung19872002/his-api:<ts>-<sha7>` → `az containerapp update` → smoke-tests
login, the SPA shell and the fallback guard. Azure auth is **OIDC federated** (keyless).

```bash
gh run list --workflow=deploy-backend.yml -L 5     # track it
gh run watch <run-id>                              # follow a live run
```

Manual fallback (CI broken, or a deploy without a push):

```bash
TAG="ghcr.io/minhhung19872002/his-api:$(date +%Y%m%d-%H%M%S)-manual"
docker build -f backend/src/HIS.API/Dockerfile -t "$TAG" .   # context = REPO ROOT, not backend/
docker push "$TAG"
az containerapp update -n his-api -g rg-his --image "$TAG"
```

`ProductionSchemaRepairRunner` auto-applies every embedded `Data/Scripts/NN_*.sql` at
startup — no migration step to run by hand.

**Vercel still auto-deploys the frontend** on every push to `main`
(https://his-psi.vercel.app). It is the legacy path, kept as a fallback while the
same-origin deploy proves out; it points at the Azure API cross-origin.

## Verify after deploy

```bash
API=https://his-api.thankfulcoast-bd0486a9.southeastasia.azurecontainerapps.io
TOKEN=$(curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

curl -s $API/health/schema-drift -H "Authorization: Bearer $TOKEN"   # missingCount MUST be 0
curl -s $API/ | grep -q 'id="root"'                                  # SPA shell served
curl -s -o /dev/null -w '%{http_code}\n' $API/api/no-such-route      # MUST be 404, never 200
```

Which revision is actually live:

```bash
az containerapp show -n his-api -g rg-his \
  --query "{rev:properties.latestRevisionName,img:properties.template.containers[0].image,state:properties.provisioningState}" -o json
```

Full checklist: `references/deploy-checklist.md`.

## Key IDs / URLs

| Item | Value |
|---|---|
| Container App / RG / env | `his-api` · `rg-his` · `cae-his` |
| Region | `southeastasia` |
| Subscription | `c8f2432f-6ab7-48df-be40-64ce06bb7ba2` |
| API + app URL | `https://his-api.thankfulcoast-bd0486a9.southeastasia.azurecontainerapps.io` |
| Image repo | `ghcr.io/minhhung19872002/his-api` · tag `YYYYMMDD-HHMMSS-<sha7>` |
| Legacy frontend | `https://his-psi.vercel.app` |
| Revision mode | `Single` (100% traffic to latest) |
| Replicas | min **0** · max **1** — see the SignalR pitfall below |
| Admin login | `admin` / `Admin@123` |

> Confirm against `CLAUDE.md` §Production status before running anything destructive.

## Pitfalls (all hit for real)

- **Do NOT raise `maxReplicas` above 1.** `AddSignalR()` has no backplane and the ingress
  has no session affinity, so with 2 replicas the negotiate lands on one replica and the
  WebSocket upgrade on the other → `/hubs/notifications` returns **404** and realtime dies
  (measured 2026-08-14: 5 of 8 connects failed; 8/8 pass after pinning to 1). To scale out
  again you must first add a Redis backplane or enable sticky sessions, then re-measure.
- **`wwwroot` must never be served publicly.** It holds the 117 MB ONNX models, BHXH XSDs
  and patient photos (`wwwroot/photos/{patientId}`). `Program.cs` serves only `clientapp/`
  through an explicit `PhysicalFileProvider` — never add a bare `app.UseStaticFiles()`.
- **Build context is the repo root.** `docker build ... backend` (the old context) cannot see
  `frontend/` and fails in stage 1. Keep the root `.dockerignore` — without it the context
  ships `node_modules` and `.git`.
- **The SPA fallback must not swallow API routes.** An unknown `/api/...` has to stay 404;
  if it starts answering `200 text/html`, the guard in `Program.cs` `MapFallback` broke.
- **Cold start.** `minReplicas: 0` means the first request after idle waits for the container
  to start — with the SPA in the same image, that delay now hits page load too.
- **Reading a production exception:**
  ```bash
  az containerapp logs show -n his-api -g rg-his --type console --tail 200
  az containerapp logs show -n his-api -g rg-his --type system --tail 50   # platform events
  ```
- **Migration not applied locally**: the project IGNOREs pending model changes → never
  `dotnet ef migrations`; hand-write an idempotent SQL script (`his-db-migration`).
- **Azure SQL is a serverless free offer** (100k vCore-s/month) and **auto-pauses** when the
  quota is spent → the API returns connection errors that look like an app bug.

## Rollback

```bash
az containerapp revision list -n his-api -g rg-his \
  --query "[].{name:name,created:properties.createdTime,img:properties.template.containers[0].image}" -o table
az containerapp update -n his-api -g rg-his --image <previous-image-tag>
```

DB scripts are idempotent → a rollback needs no schema undo (keep the tables, don't drop).

## Reference

- `references/deploy-checklist.md` — before/after checklist + rollback commands

## When to update

- When the Container App name / RG / region / FQDN / image repo changes (sync with `CLAUDE.md`).
- When the Dockerfile, build context, workflow triggers or the schema-repair mechanism change.
- When the replica pin or the SignalR backplane decision changes.
