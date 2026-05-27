---
name: his-be-scalability
description: Use this skill when sizing or hardening HIS for concurrent load — many users at once, a hospital with 100 vs 1000 staff, peak-hour overload, slow endpoints under load, DB connection exhaustion, or N+1 / unbounded queries. Triggers include "tối ưu chịu tải / quá tải / nhiều người dùng cùng lúc", "bệnh viện A 100 user vs B 1000 user", "API chậm khi đông", tuning Cloud Run concurrency/min/max-instances, pagination/AsNoTracking/Include, Redis caching hot reads, DB indexes for hot queries, or rate-limiting. Do NOT use for frontend bundle/render (his-fe-performance), creating a plain CRUD service (his-be-module-scaffold), background jobs (his-be-background-worker), or writing the index DDL itself (his-db-migration).
metadata:
  type: project
---

# HIS Backend Scalability (chịu tải / nhiều user đồng thời)

Cùng codebase nhưng bán cho BV 100 user khác BV 1000 user: khác ở **cấu hình hạ tầng + kỷ luật query**,
không phải viết lại. Skill này gom các đòn bẩy chịu tải đúng stack (ASP.NET Core + SQL Server + Cloud Run + Redis)
để tránh quá tải giờ cao điểm (đăng ký sáng, phát thuốc, kết quả CLS).

## Khi nào dùng
- Ước lượng/cấu hình cho 1 BV theo số user; chuẩn bị giờ cao điểm.
- Endpoint chậm/timeout khi đông; lỗi connection pool/timeout SQL; CPU/memory Cloud Run cao.
- Trang trả "tất cả bản ghi" (không phân trang) hoặc nghi N+1.

## Khi nào KHÔNG dùng
- Bundle/re-render FE → `his-fe-performance`. Viết DDL index/bảng → `his-db-migration`.
- CRUD service mới → `his-be-module-scaffold`. Worker nền → `his-be-background-worker`.

## Đòn bẩy chịu tải (kiểm tra theo thứ tự tác động)

**1. Query kỷ luật (tác động lớn nhất, rẻ nhất)**
- **Phân trang BẮT BUỘC** cho mọi list — dùng `PagedResultDto` + `Skip/Take`; KHÔNG `ToListAsync()` trên bảng giao dịch lớn (Patients/Examinations/ServiceRequests…). Tiền lệ có `.Take(200)` cap — coi là tối thiểu.
- **Chống N+1** — `.Include()`/`.ThenInclude()` hoặc projection `.Select(new {...})` cho dữ liệu liên quan; đừng lặp query trong vòng for.
- **`AsNoTracking()`** cho mọi query GET (read-only) — giảm RAM + nhanh hơn.
- **Index cho hot query** — cột lọc thường (date, status, FK, code) phải có index; tạo qua `his-db-migration` (script idempotent). Đo bằng query thật, đừng index bừa.

**2. Caching đọc-nhiều/ghi-ít (Redis có sẵn)**
- Danh mục ít đổi (Departments, Services, ICD, master catalogs) → cache Redis, TTL hợp lý + invalidate khi sửa. Đây là nhóm bị query lại nhiều nhất khi đông user.
- KHÔNG cache dữ liệu bệnh nhân/giao dịch nhạy cảm theo cách rò rỉ giữa user.

**3. Cloud Run autoscaling (đòn bẩy "100 vs 1000 user")**
- Lever: `--concurrency` (số request/instance), `--min-instances` (giảm cold start giờ cao điểm), `--max-instances` (trần để không vỡ DB), `--cpu`/`--memory`.
- BV nhỏ: min thấp, max vừa. BV lớn: tăng min (ấm sẵn) + max, nhưng **max phải khớp trần connection của SQL Server** (xem #4) — scale app mà DB không chịu nổi = sập DB.
- Verify cấu hình hiện tại bằng `gcloud run services describe his-api` trước khi đổi (đừng đoán số).

**4. Kết nối DB & async**
- Connection pool: tổng `max-instances × pool-size` KHÔNG vượt giới hạn kết nối Cloud SQL → chỉnh `Max Pool Size` trong connection string theo trần DB.
- `async/await` xuyên suốt (đã là convention) — chặn thread đồng bộ giết throughput khi đông.
- Tác vụ phụ không chặn request: fire-and-forget đúng cách (audit log đã dùng `Task.Run` + `IServiceScopeFactory` — KHÔNG tái dùng DbContext của request, sẽ ObjectDisposedException; xem `his-be-background-worker`).

**5. Bảo vệ khi quá tải**
- Rate limiting cho endpoint nặng/đăng nhập (ASP.NET RateLimiter) để 1 client không làm nghẽn.
- Timeout + huỷ (`CancellationToken`) cho query dài; tránh giữ request treo.

## Quy trình áp dụng
1. **Đo trước** — xác định endpoint chậm thật (log/APM), đừng tối ưu mò.
2. Sửa query (phân trang/N+1/AsNoTracking/index) — thường đủ.
3. Còn nghẽn → cache danh mục nóng (Redis).
4. Tải cao thật → chỉnh Cloud Run (concurrency/min/max) cân bằng với trần DB.
5. Verify lại bằng đo lường, ghi cấu hình theo từng BV (sizing profile).

## Pitfalls
- **Scale app mà quên DB** — tăng max-instances làm cạn connection Cloud SQL → 500 hàng loạt. Cân `max-instances × pool ≤ trần DB`.
- **Cache dữ liệu bệnh nhân sai** — rò rỉ giữa phiên/user; chỉ cache dữ liệu dùng chung, không nhạy cảm.
- **Lọc `CreatedAt.Date == today` không index** + bảng lớn → full scan; index cột ngày (đã có tiền lệ trang trống do timezone — xem CLAUDE.md).
- **Đổi cấu hình theo cảm tính** — luôn `describe` hiện trạng + đo trước/sau; thay đổi infra là thao tác cần nêu rõ (core-execution-output).

## Reference
- Index/DDL: `his-db-migration`. Worker/scope an toàn: `his-be-background-worker`. Deploy Cloud Run: `his-ops-deploy`.

## When to update
- Khi đổi hạ tầng (DB sang Cloud SQL tier khác, thêm cache layer), hoặc khi có sizing profile mới cho 1 BV.
