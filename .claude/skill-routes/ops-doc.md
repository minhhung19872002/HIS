# Skill-routes · OPS + DOC TIER (Deploy / Documentation)

> Sub-map — read it **TOGETHER WITH** `.claude/SKILL-MAP.md`. For the CORE principles see (1a) in SKILL-MAP.

## OPS/DOC skills (`his-ops-*`, `his-doc-*`)

| Skill | Purpose | Choose when the request involves |
|---|---|---|
| `his-ops-deploy` | Azure Container Apps (auto via GitHub Actions) + verify + rollback | prod deploy |
| `his-doc-feature` | the `docs/features/<feature>/` doc set | write module documentation |

## Prompt → skill chain (OPS/DOC) + PATH

| When the developer prompts | Skills | Files/paths touched |
|---|---|---|
| "deploy [X]" | `his-ops-deploy` | `.github/workflows/deploy-backend.yml`, `backend/src/HIS.API/Dockerfile`, `/health/schema-drift` |
| "write documentation for [feature]" | `his-doc-feature` | `docs/features/<feature>/` |

## Deploy reminder (critical gotcha)
- **GCP/Cloud Run is dead** (migrated to Azure 2026-08-02) — never run a `gcloud`/`cloudbuild.yaml` recipe.
- A push to `main` touching `backend/**`, `frontend/**` or `.dockerignore` auto-deploys the ONE image that serves both API and SPA; verify with `gh run list --workflow=deploy-backend.yml`.
- Details (replica pin for SignalR · wwwroot must stay private · rollback · reading a prod 500) = `his-ops-deploy`, not repeated here.
