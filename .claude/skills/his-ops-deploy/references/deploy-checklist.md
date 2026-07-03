# HIS Deploy Checklist

## Before deploying the backend
- [ ] `cd backend && dotnet build HIS.sln --nologo` → 0 errors
- [ ] If there's a new table: the idempotent SQL script `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql` is added (incrementing number, embedded resource auto-picked-up)
- [ ] Commit + push the BE code to GitHub (Vercel auto-builds the FE; the BE doesn't yet)
- [ ] Confirm the latest project ID / URL in CLAUDE.md (the latest work-log)

## Deploy the backend (Cloud Run)
```bash
IMG="asia-southeast1-docker.pkg.dev/project-4d4a3f8e-d582-4536-97f/his/his-api:$(date +%Y%m%d-%H%M%S)"
gcloud builds submit --config cloudbuild.yaml --substitutions=_IMAGE=$IMG --project=project-4d4a3f8e-d582-4536-97f
gcloud run services update his-api --image=$IMG --region=asia-southeast1 \
  --project=project-4d4a3f8e-d582-4536-97f --update-env-vars=DEPLOY_AT=$(date +%s)
```
- [ ] Build SUCCESS (poll ≥60s apart, don't hammer → avoid 429)
- [ ] Roll out 100% traffic to the new revision (`gcloud run services describe his-api --region=asia-southeast1`)

## Frontend (Vercel)
- [ ] `cd frontend && npm run build` locally, 0 errors (tsc -b + vite) BEFORE pushing (the Vercel build = npm run build, a TS error fails the deploy)
- [ ] Push → Vercel auto-deploy → check the bundle hash changed at https://his-psi.vercel.app

## Verify prod
```bash
TOKEN=$(curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
```
- [ ] `GET /health/schema-drift` → `missingCount: 0`
- [ ] Smoke the new endpoint → 200 (not 404 = BE deployed; not 500 = migration OK)
- [ ] (if a new env is needed) `gcloud run services update his-api --update-env-vars="KEY=VALUE" ...`

## Rollback (if broken after deploy)
```bash
# List revisions
gcloud run revisions list --service=his-api --region=asia-southeast1 --project=project-4d4a3f8e-d582-4536-97f
# Point traffic to the previous revision
gcloud run services update-traffic his-api --to-revisions=<prev-rev>=100 \
  --region=asia-southeast1 --project=project-4d4a3f8e-d582-4536-97f
```
- The DB scripts are idempotent → rollback does NOT need a schema undo (keep the tables, don't drop).

## Reading a prod 500
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="his-api" AND httpRequest.status>=500' \
  --freshness=40m --format="value(timestamp,httpRequest.requestUrl,httpRequest.status)" \
  --project=project-4d4a3f8e-d582-4536-97f
# the stack trace is in a nearby textPayload entry → grep "xception|FOREIGN|SqlExcept|column"
```
