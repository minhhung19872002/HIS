# Skill-routes · OPS + DOC TIER (Deploy / Documentation)

> Sub-map — read it **TOGETHER WITH** `.claude/SKILL-MAP.md`. For the CORE principles see (1a) in SKILL-MAP.

## OPS/DOC skills (`his-ops-*`, `his-doc-*`)

| Skill | Purpose | Choose when the request involves |
|---|---|---|
| `his-ops-deploy` | Cloud Run (manual) + Vercel (auto) + verify | prod deploy |
| `his-doc-feature` | the `docs/features/<feature>/` doc set | write module documentation |

## Prompt → skill chain (OPS/DOC) + PATH

| When the developer prompts | Skills | Files/paths touched |
|---|---|---|
| "deploy [X]" | `his-ops-deploy` | `cloudbuild.yaml`, `gcloud`, `/health/schema-drift` |
| "write documentation for [feature]" | `his-doc-feature` | `docs/features/<feature>/` |

## Deploy reminder (critical gotcha)
- Vercel **auto-deploys** the FE on push; Cloud Run does **NOT** auto-deploy — the backend must be deployed manually with `gcloud builds submit` + `gcloud run services update`.
- The symptom "FE live but API 404" = forgot to deploy the backend.
