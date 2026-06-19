# scripts/ — Quy ước tổ chức

> **Mục đích:** Folder chứa ad-hoc scripts hỗ trợ dev/ops. KHÔNG phải migration system chính.
> **Authoritative migration system:** `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql` (embedded, tự apply lúc backend startup qua `ProductionSchemaRepairRunner`) — xem [`Data/Scripts/README.md`](../backend/src/HIS.Infrastructure/Data/Scripts/README.md).
> **Last updated:** 2026-06-19

## Subfolder

| Folder | Số file | Mục đích |
|---|---|---|
| [`archive/`](./archive/) | 92 | **SQL di sản CHẾT** (`legacy-sql/` 86 + `migrations/` 6) — không bao giờ được runner load. Chỉ tham khảo lịch sử. Xem [`archive/README.md`](./archive/README.md). |
| [`dev-tools/`](./dev-tools/) | 17 | PowerShell helper: docker start, deploy GCP, restore data, regression test, test cleanup, etc. |
| [`ai-model/`](./ai-model/) | 3 | Python script convert PyTorch → ONNX cho AI diagnostic imaging (X-quang, CT, US). Cần Python env + checkpoint. |
| [`legacy-py/`](./legacy-py/) | 2 | Python ad-hoc cũ (LIS parsing fix, Orthanc seed). Không còn dùng. |
| [`misc-js/`](./misc-js/) | 4 | JS one-off: encoding fix, blood bank generator, PDF parser, workflow test runner. |

## Khi nào thêm file mới vào đây

✅ **NÊN** thêm vào `scripts/` khi:
- Script chạy một lần để fix/seed/verify (không cần tích hợp vào product)
- Tool dev cá nhân (deploy, test, debug)
- AI model conversion / training

❌ **KHÔNG** thêm vào `scripts/` khi:
- DB migration mới → thêm vào `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql`
- Test thực sự → vào `frontend/cypress/` hoặc `frontend/e2e/` hoặc `frontend/e2e-prod/`
- Production seed dữ liệu → cập nhật `backend/src/HIS.Infrastructure/Data/DatabaseSeeder.cs`

## Lưu ý quan trọng

- File `scripts/test-prod/` là local-only (đã `.gitignore`). Test prod chạy từ máy dev.
- SQL di sản (`scripts/archive/legacy-sql/*.sql` + `scripts/archive/migrations/*.sql`) **đã apply** vào DB production thời kỳ trước. **Không chạy lại** — runner KHÔNG load chúng; nguồn schema = embedded `Data/Scripts`.
