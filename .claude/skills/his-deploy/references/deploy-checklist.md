# HIS Deploy Checklist

## Trước khi deploy backend
- [ ] `cd backend && dotnet build HIS.sln --nologo` → 0 error
- [ ] Nếu có bảng mới: SQL script `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql` idempotent đã thêm (số tăng dần, embedded resource tự pick up)
- [ ] Commit + push code BE lên GitHub (Vercel sẽ tự build FE; BE thì chưa)
- [ ] Xác nhận project ID / URL mới nhất trong CLAUDE.md (work-log gần nhất)

## Deploy backend (Cloud Run)
```bash
IMG="asia-southeast1-docker.pkg.dev/project-4d4a3f8e-d582-4536-97f/his/his-api:$(date +%Y%m%d-%H%M%S)"
gcloud builds submit --config cloudbuild.yaml --substitutions=_IMAGE=$IMG --project=project-4d4a3f8e-d582-4536-97f
gcloud run services update his-api --image=$IMG --region=asia-southeast1 \
  --project=project-4d4a3f8e-d582-4536-97f --update-env-vars=DEPLOY_AT=$(date +%s)
```
- [ ] Build SUCCESS (poll ≥60s/lần, không hammer → tránh 429)
- [ ] Rollout 100% traffic revision mới (`gcloud run services describe his-api --region=asia-southeast1`)

## Frontend (Vercel)
- [ ] `cd frontend && npm run build` local 0 lỗi (tsc -b + vite) TRƯỚC khi push (Vercel build = npm run build, lỗi TS sẽ fail deploy)
- [ ] Push → Vercel auto-deploy → kiểm tra bundle hash đổi tại https://his-psi.vercel.app

## Verify prod
```bash
TOKEN=$(curl -s -X POST $API/api/auth/login -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")
```
- [ ] `GET /health/schema-drift` → `missingCount: 0`
- [ ] Smoke endpoint mới → 200 (không 404 = BE đã deploy; không 500 = migration OK)
- [ ] (nếu cần env mới) `gcloud run services update his-api --update-env-vars="KEY=VALUE" ...`

## Rollback (nếu lỗi sau deploy)
```bash
# Liệt kê revision
gcloud run revisions list --service=his-api --region=asia-southeast1 --project=project-4d4a3f8e-d582-4536-97f
# Trỏ traffic về revision trước
gcloud run services update-traffic his-api --to-revisions=<prev-rev>=100 \
  --region=asia-southeast1 --project=project-4d4a3f8e-d582-4536-97f
```
- DB script idempotent → rollback KHÔNG cần undo schema (giữ bảng, không xoá).

## Đọc lỗi 500 prod
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="his-api" AND httpRequest.status>=500' \
  --freshness=40m --format="value(timestamp,httpRequest.requestUrl,httpRequest.status)" \
  --project=project-4d4a3f8e-d582-4536-97f
# stack trace ở textPayload entry gần đó → grep "xception|FOREIGN|SqlExcept|column"
```
