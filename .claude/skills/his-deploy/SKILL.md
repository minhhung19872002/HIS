---
name: his-deploy
description: Use this skill when deploying HIS to production — backend to Google Cloud Run (gcloud builds submit + run services update) and frontend to Vercel. Triggers include "deploy backend lên prod", "deploy NangCapNN", releasing API changes, verifying schema-drift after migration, or diagnosing "FE live nhưng API 404". Reminds that Vercel auto-deploys on push but Cloud Run does NOT — backend must be deployed manually.
type: project
---

# HIS Production Deploy

Skill chuẩn hoá quy trình deploy production HIS: **backend → Google Cloud Run** (thủ công), **frontend → Vercel** (auto khi push). Ghi nhớ gotcha lớn nhất: **push GitHub KHÔNG tự deploy backend** → FE live mà API 404 nếu quên.

## Khi nào dùng

- Deploy backend sau khi thêm/sửa controller/service/migration (vd NangCapNN mới).
- Verify schema-drift sau khi có SQL script mới.
- Chẩn đoán "FE đã live nhưng gọi API 404/500" (thường do BE chưa deploy / chưa apply migration).

## Khi nào KHÔNG dùng

- Viết code BE/FE → dùng skill scaffold/page tương ứng.
- Viết migration SQL → dùng `his-sql-table-migration`.

## ⚠️ Gotcha sống còn

- **Vercel auto-deploy FE** khi `git push` (build `npm run build` = `tsc -b && vite`).
- **Cloud Run KHÔNG auto-deploy BE** — phải chạy `gcloud builds submit` + `gcloud run services update` **thủ công**.
- Hệ quả hay gặp: commit BE đã push, FE live, nhưng mọi endpoint mới trả **404** vì Cloud Run còn ở revision cũ. → Luôn deploy BE sau khi push code BE.

## Quy trình deploy backend (Cloud Run)

```bash
# 1. Build image (tại repo root — Dockerfile: backend/src/HIS.API/Dockerfile, config: cloudbuild.yaml)
IMG="asia-southeast1-docker.pkg.dev/project-4d4a3f8e-d582-4536-97f/his/his-api:$(date +%Y%m%d-%H%M%S)"
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_IMAGE=$IMG \
  --project=project-4d4a3f8e-d582-4536-97f

# 2. Rollout revision mới (bump env để recycle instance → EF pool + schema repair chạy lại)
gcloud run services update his-api --image=$IMG \
  --region=asia-southeast1 \
  --project=project-4d4a3f8e-d582-4536-97f \
  --update-env-vars=DEPLOY_AT=$(date +%s)
```

`ProductionSchemaRepairRunner` tự apply mọi `Data/Scripts/NN_*.sql` (embedded) lúc cold start.

## Verify sau deploy

```bash
# Token
TOKEN=$(curl -s -X POST https://his-api-694913628964.asia-southeast1.run.app/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin@123"}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['data']['token'])")

# Schema drift (phải missingCount = 0)
curl -s https://his-api-694913628964.asia-southeast1.run.app/health/schema-drift \
  -H "Authorization: Bearer $TOKEN"

# Smoke endpoint mới (200, không 404)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://his-api-694913628964.asia-southeast1.run.app/api/<endpoint-moi>
```

Đầy đủ checklist: `references/deploy-checklist.md`.

## Key IDs / URLs (cập nhật theo session gần nhất trong CLAUDE.md)

| Mục | Giá trị |
|---|---|
| GCP project | `project-4d4a3f8e-d582-4536-97f` (account `minhhung19872004@gmail.com`) |
| Region | `asia-southeast1` |
| Cloud Run service | `his-api` |
| API URL | `https://his-api-694913628964.asia-southeast1.run.app` |
| Vercel URL | `https://his-psi.vercel.app` |
| Image tag pattern | `.../his/his-api:YYYYMMDD-HHMMSS` |
| Admin login | `admin` / `Admin@123` |

> ⚠️ Project ID + URL có thể đổi (đã từng rename). LUÔN xác nhận giá trị mới nhất trong CLAUDE.md (work-log gần nhất) trước khi chạy.

## Pitfalls (đã dính)

- **Quên deploy BE** sau push → 404 hàng loạt. Deploy BE thủ công.
- **Cloud Build poll 429 `RESOURCE_EXHAUSTED`**: đừng hammer `gcloud builds describe`/submit nhiều lần. Submit 1 lần, poll ≥60s/lần. Build vẫn chạy trên cloud dù lệnh foreground lỗi.
- **Build im lặng exit 0 không có build ID** (background gcloud) → re-submit; xác nhận bằng `gcloud builds list`.
- **POST body rỗng qua Google LB → 411** "Content-Length required": thêm `-H "Content-Length: 0"`.
- **Đọc exception prod**: app KHÔNG log ERROR cho unhandled exception, nhưng Cloud Run httpRequest log có. Tìm 500: `gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="his-api" AND httpRequest.status>=500' --freshness=40m`; stack trace ở `textPayload` entry gần đó (grep `xception|FOREIGN|SqlExcept|column`).
- **Migration không apply local**: dự án IGNORE pending model changes → KHÔNG dùng `dotnet ef migrations`; viết SQL script tay (`his-sql-table-migration`). Trên prod, `ProductionSchemaRepairRunner` apply embedded scripts.
- **`gcloud auth`**: nếu cần login lại, gợi ý user chạy `! gcloud auth login` trong session (interactive).

## Reference

- `references/deploy-checklist.md` — checklist trước/sau deploy + lệnh rollback

## When to update this skill

- Khi đổi GCP project ID / region / service name / URL (đồng bộ với CLAUDE.md).
- Khi đổi cloudbuild.yaml / Dockerfile path / cơ chế schema repair.
