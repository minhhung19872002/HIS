---
name: his-ops-deploy
description: Use this skill when deploying HIS to production — backend to Google Cloud Run (gcloud builds submit + run services update) and frontend to Vercel. Triggers include "deploy backend to prod", "deploy NangCapNN", releasing API changes, verifying schema-drift after migration, or diagnosing "FE live but API 404". Reminds that BOTH auto-deploy on push to main: Vercel (frontend) + Cloud Run via GitHub Actions when push touches backend/** (since 2026-05-29, WIF keyless). Manual gcloud = FALLBACK only. ALWAYS verify after: gh run list --workflow=deploy-backend.yml + GET /health/schema-drift = 0.
metadata:
  type: project
---

# HIS Production Deploy

A skill standardizing the HIS production deploy process: **backend → Google Cloud Run**, **frontend → Vercel** (auto on push). Remember the biggest gotcha: **a GitHub push does NOT auto-deploy the backend by default** → FE live but API 404 if you forget.

## When to use

- Deploying the backend after adding/editing a controller/service/migration (e.g. a new NangCapNN).
- Verifying schema-drift after a new SQL script.
- Diagnosing "FE is live but the API 404s/500s" (usually because the BE isn't deployed / migration not applied).

## When NOT to use

- Writing BE/FE code → use the matching scaffold/page skill.
- Writing a SQL migration → use `his-db-migration`.

## ⚠️ Survival gotcha

- **Vercel auto-deploys the FE** on `git push` (build `npm run build` = `tsc -b && vite`).
- **The backend NOW auto-deploys** via GitHub Actions (`.github/workflows/deploy-backend.yml`, since 2026-05-29): pushing to `main` touching `backend/**` (or `cloudbuild.yaml` / the workflow file itself) auto-builds (Cloud Build) + `gcloud run services update`. Auth via **Workload Identity Federation (keyless)** — no SA key (the org policy `iam.disableServiceAccountKeyCreation` blocks keys). Track: `gh run list --workflow=deploy-backend.yml`; run manually: Actions tab → "Run workflow" (workflow_dispatch).
- **The manual `gcloud` commands below still work** as a fallback (when you need a fast deploy bypassing git, or CI is broken).
- The OLD consequence (before CI): a BE commit pushed but deploy forgotten → FE live but the new endpoint 404s. Now it only happens if the workflow fails or the BE change is outside the path filter → still check `gh run list` after pushing the BE.

## Backend deploy process (Cloud Run)

```bash
# 1. Build the image (at repo root — Dockerfile: backend/src/HIS.API/Dockerfile, config: cloudbuild.yaml)
IMG="asia-southeast1-docker.pkg.dev/project-4d4a3f8e-d582-4536-97f/his/his-api:$(date +%Y%m%d-%H%M%S)"
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_IMAGE=$IMG \
  --project=project-4d4a3f8e-d582-4536-97f

# 2. Roll out the new revision (bump an env var to recycle the instance → EF pool + schema repair re-run)
gcloud run services update his-api --image=$IMG \
  --region=asia-southeast1 \
  --project=project-4d4a3f8e-d582-4536-97f \
  --update-env-vars=DEPLOY_AT=$(date +%s)
```

`ProductionSchemaRepairRunner` auto-applies every `Data/Scripts/NN_*.sql` (embedded) at cold start.

## Verify after deploy

```bash
# Token
TOKEN=$(curl -s -X POST https://his-api-694913628964.asia-southeast1.run.app/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin@123"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

# Schema drift (must be missingCount = 0)
curl -s https://his-api-694913628964.asia-southeast1.run.app/health/schema-drift \
  -H "Authorization: Bearer $TOKEN"

# Smoke the new endpoint (200, not 404)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://his-api-694913628964.asia-southeast1.run.app/api/<new-endpoint>
```

Full checklist: `references/deploy-checklist.md`.

## Key IDs / URLs (kept in sync with the latest session in CLAUDE.md)

| Item | Value |
|---|---|
| GCP project | `project-4d4a3f8e-d582-4536-97f` (account `minhhung19872004@gmail.com`) |
| Region | `asia-southeast1` |
| Cloud Run service | `his-api` |
| API URL | `https://his-api-694913628964.asia-southeast1.run.app` |
| Vercel URL | `https://his-psi.vercel.app` |
| Image tag pattern | `.../his/his-api:YYYYMMDD-HHMMSS` |
| Admin login | `admin` / `Admin@123` |

> ⚠️ The Project ID + URL may change (renamed before). ALWAYS confirm the latest value in CLAUDE.md (the latest work-log) before running.

## Pitfalls (hit before)

- **Forgetting to deploy the BE** after a push → mass 404s. Deploy the BE manually.
- **Cloud Build poll 429 `RESOURCE_EXHAUSTED`**: don't hammer `gcloud builds describe`/submit repeatedly. Submit once, poll ≥60s apart. The build still runs on the cloud even if the foreground command errors.
- **A silent exit 0 with no build ID** (background gcloud) → re-submit; confirm with `gcloud builds list`.
- **An empty POST body via Google LB → 411** "Content-Length required": add `-H "Content-Length: 0"`.
- **Reading a prod exception**: the app does NOT log ERROR for an unhandled exception, but the Cloud Run httpRequest log has it. Find 500s: `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="his-api" AND httpRequest.status>=500' --freshness=40m`; the stack trace is in a nearby `textPayload` entry (grep `xception|FOREIGN|SqlExcept|column`).
- **Migration not applied locally**: the project IGNOREs pending model changes → do NOT use `dotnet ef migrations`; write a hand-written SQL script (`his-db-migration`). On prod, `ProductionSchemaRepairRunner` applies the embedded scripts.
- **`gcloud auth`**: if a re-login is needed, suggest the user runs `! gcloud auth login` in the session (interactive).

## Reference

- `references/deploy-checklist.md` — a before/after deploy checklist + rollback commands

## When to update

- When the GCP project ID / region / service name / URL changes (sync with CLAUDE.md).
- When `cloudbuild.yaml` / the Dockerfile path / the schema-repair mechanism changes.
