# Skill-routes · TẦNG BE + DB (Backend / Database)

> Map con — đọc **CÙNG** `.claude/SKILL-MAP.md`. Nguyên tắc CORE (chọn khi) xem (1a) trong SKILL-MAP.
> Mọi chuỗi: **core-* trước → his-* sau**. Mọi code-gen KÈM `core-reusable-code` + `core-clean-code` + `his-qa-anti-pattern`.
> **★ REUSE-FIRST (BẮT BUỘC):** trước khi tạo Service/Controller/Entity/DTO/helper/bảng mới → **tìm xem đã tồn tại chưa**
> (grep `HIS.Infrastructure/Services`, `HIS.API/Controllers`, `HIS.Core/Entities`, `Application/DTOs`, `scripts/`).
> Đã có → **dùng lại / mở rộng** service/DTO/bảng sẵn có, KHÔNG tạo trùng.
> **★ SELF-REVIEW (BẮT BUỘC, trước khi báo xong):** tự rà 9 điểm cho code BE — duplicate logic · dead code ·
> hard-code · anti-pattern (quên DI / nuốt exception) · service-controller quá lớn · method quá dài · circular
> namespace/project-ref · naming · service **stateless** + DI lifetime đúng. Chi tiết: `his-qa-anti-pattern` #30.
> + **BUILD-GATE:** `cd backend && dotnet build HIS.sln` → 0 errors mới báo xong (#27).

## Skill BE/DB (`his-be-*`, `his-db-*`)

| Skill | Mục đích | Chọn khi yêu cầu liên quan |
|---|---|---|
| `his-be-module-scaffold` | Entity/DTO/Service/Controller + DI | thêm phân hệ/service/controller |
| `his-db-migration` | bảng SQL Server, script `NN_*.sql` idempotent | tạo/sửa/seed bảng |
| `his-be-payment-gateway` | VietQR/VNPay/MoMo/ZaloPay + bank confirm + Receipt | thanh toán, QR EMVCo, IPN, `/api/payment/*` |
| `his-be-external-gateway` | cổng ngoài HttpClient + MockMode + retry + config store | tích hợp cổng QG/BHXH/Zalo/DQGVN/FHIR/SMS |
| `his-be-background-worker` | BackgroundService + scope + interval + idempotent | worker/job nền, retry worker, worklist scanner |
| `his-be-scalability` | chịu tải: query (pagination/AsNoTracking/N+1/index), cache Redis, Cloud Run autoscale, rate limit | quá tải giờ cao điểm, API chậm khi đông, sizing 100 vs 1000 user |

## Prompt → chuỗi skill (BE/DB) + PATH

| Khi developer prompt | Skills (core → his, đúng thứ tự) | File/đường dẫn chạm tới |
|---|---|---|
| "thêm phân hệ backend [X]" | `core-architecture-follow` → `core-types-contract` → `core-reusable-code` → `his-be-module-scaffold` → `his-db-migration` → `his-qa-anti-pattern` | `HIS.Core/Entities`, `HIS.Application`, `HIS.Infrastructure/Services` + `DependencyInjection.cs`, `Data/Scripts/NN_*.sql`, `HIS.API/Controllers` |
| "tạo/sửa bảng [X]" | `core-types-contract` → `his-db-migration` | `Data/Scripts/NN_*.sql` |
| "thanh toán / QR VietQR / confirm bank [X]" | `core-types-contract` → `core-validation-pattern` → `his-be-payment-gateway` (+ `his-fe-page-v2` cho UI) | `PaymentGatewayService*.cs`, `/api/payment/*`, `pages-v2/BankPayments.tsx` |
| "tích hợp cổng QG/BHXH/Zalo/SMS/FHIR [X]" | `core-types-contract` → `his-be-external-gateway` (+ `his-be-background-worker` cho retry) → `his-qa-anti-pattern` | `HIS.Infrastructure/Services/External/*`, `DependencyInjection.cs`, appsettings (MockMode + env) |
| "worker/job nền / tự động quét-gửi lại [X]" | `core-architecture-follow` → `his-be-background-worker` → `his-qa-anti-pattern` | `HIS.Infrastructure/Services/Workers/*`, `AddHostedService` trong `DependencyInjection.cs` |
| "realtime / hub / đẩy thông báo (phần BE)" | `his-fs-realtime-signalr` (Hub + IHubContext + JWT query-string auth) | `HIS.API/Hubs/*`, `Program.cs` (xem thêm fe.md cho client) |
| "chịu tải / nhiều user đồng thời / quá tải [X]" | `core-impact-analysis` → `his-be-scalability` (+ `his-db-migration` cho index, `his-ops-deploy` cho Cloud Run) | query (Skip/Take/AsNoTracking/Include), Redis cache danh mục, `gcloud run` concurrency/min/max, `Max Pool Size` connection string |

## Conflict (BE/DB)
- Migration EF vs SQL script: **LUÔN SQL script tay** (`his-db-migration`) — dự án IGNORE pending model changes.
- Generic CRUD vs cổng ngoài vs worker vs payment: route đúng skill chuyên biệt (xem cột "Chọn khi").
- "không quên DI / không hardcode": nguồn chân lý `his-qa-anti-pattern`.
