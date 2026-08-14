# HIS Deploy Checklist (Azure Container Apps)

`API=https://his-api.thankfulcoast-bd0486a9.southeastasia.azurecontainerapps.io`

## Before pushing
- [ ] `cd backend && dotnet build HIS.sln --nologo` → 0 errors
      (output locked by a running local HIS → build to a separate `-o` folder)
- [ ] `cd frontend && npm run build` → exit 0 (`tsc -b && vite build`; a TS error fails BOTH the
      image build and the Vercel build)
- [ ] New table → idempotent `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql`
      (number = `ls Data/Scripts/` max + 1, embedded resource is auto-picked-up)
- [ ] Confirm the live values in `CLAUDE.md` §Production status

## Deploy
- [ ] Push to `main` → `.github/workflows/deploy-backend.yml` fires on `backend/**`,
      `frontend/**`, `.dockerignore` or the workflow file
- [ ] `gh run list --workflow=deploy-backend.yml -L 3` → the run is green
      (test gate → image build → `az containerapp update` → login + SPA + fallback smoke)
- [ ] `e2e-prod-smoke.yml` chains off it automatically → also green

Manual fallback:
```bash
TAG="ghcr.io/minhhung19872002/his-api:$(date +%Y%m%d-%H%M%S)-manual"
docker build -f backend/src/HIS.API/Dockerfile -t "$TAG" .   # context = REPO ROOT
docker push "$TAG" && az containerapp update -n his-api -g rg-his --image "$TAG"
```

## Verify prod
```bash
TOKEN=$(curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
```
- [ ] `GET /health/schema-drift` → `missingCount: 0`
- [ ] New endpoint → 200 (404 = not deployed · 500 = migration/DI problem)
- [ ] `curl -s $API/ | grep 'id="root"'` → the SPA shell is served from the image
- [ ] `curl -o /dev/null -w '%{http_code}' $API/api/no-such-route` → **404**, never 200
- [ ] SignalR still healthy — negotiate then connect must both succeed:
      ```bash
      CID=$(curl -s -X POST "$API/hubs/notifications/negotiate?negotiateVersion=1" \
        -H "Authorization: Bearer $TOKEN" | python -c "import sys,json;print(json.load(sys.stdin)['connectionToken'])")
      curl -s -o /dev/null -w '%{http_code}\n' -m 5 "$API/hubs/notifications?id=$CID" \
        -H "Authorization: Bearer $TOKEN" -H "Accept: text/event-stream"   # 200, not 404
      ```
      A 404 here means the app scaled past 1 replica — see the SignalR pitfall in SKILL.md.
- [ ] Revision actually live:
      `az containerapp show -n his-api -g rg-his --query "properties.latestRevisionName" -o tsv`
- [ ] New env var needed:
      `az containerapp update -n his-api -g rg-his --set-env-vars "KEY=VALUE"`
      (a secret → `--secrets name=value` then reference it as `secretref:name`)

## Rollback
```bash
az containerapp revision list -n his-api -g rg-his \
  --query "[].{name:name,created:properties.createdTime,img:properties.template.containers[0].image}" -o table
az containerapp update -n his-api -g rg-his --image <previous-image-tag>
```
- The app is in `Single` revision mode → the update itself shifts 100% of traffic.
- DB scripts are idempotent → no schema undo on rollback (keep the tables, don't drop).
- Frontend on Vercel → promote the previous Ready deployment back to the production alias.

## Reading a prod 500
```bash
az containerapp logs show -n his-api -g rg-his --type console --tail 200
az containerapp logs show -n his-api -g rg-his --type system  --tail 50    # platform events
```
Grep the stack trace for `xception|FOREIGN|SqlExcept|column|collation`.
