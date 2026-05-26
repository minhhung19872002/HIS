# Skill-routes · TẦNG OPS + DOC (Deploy / Tài liệu)

> Map con — đọc **CÙNG** `.claude/SKILL-MAP.md`. Nguyên tắc CORE xem (1a) trong SKILL-MAP.

## Skill OPS/DOC (`his-ops-*`, `his-doc-*`)

| Skill | Mục đích | Chọn khi yêu cầu liên quan |
|---|---|---|
| `his-ops-deploy` | Cloud Run (thủ công) + Vercel (auto) + verify | deploy prod |
| `his-doc-feature` | bộ tài liệu `docs/features/<feature>/` | viết tài liệu phân hệ |

## Prompt → chuỗi skill (OPS/DOC) + PATH

| Khi developer prompt | Skills | File/đường dẫn chạm tới |
|---|---|---|
| "deploy [X]" | `his-ops-deploy` | `cloudbuild.yaml`, `gcloud`, `/health/schema-drift` |
| "viết tài liệu [feature]" | `his-doc-feature` | `docs/features/<feature>/` |

## Nhắc deploy (gotcha sống còn)
- Vercel **auto-deploy** FE khi push; Cloud Run **KHÔNG** tự deploy — backend phải `gcloud builds submit` + `gcloud run services update` thủ công.
- Triệu chứng "FE live nhưng API 404" = quên deploy backend.
