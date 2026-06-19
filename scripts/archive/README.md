# scripts/archive/ — SQL DI SẢN (KHÔNG còn được dùng)

> **TL;DR:** Thư mục này chỉ để **tham khảo lịch sử**. KHÔNG file nào ở đây được
> apply tự động hay thủ công nữa. **Nguồn schema DUY NHẤT** = embedded scripts
> `backend/src/HIS.Infrastructure/Data/Scripts/*.sql` + EF model (`EnsureCreated` /
> model-driven create) — xem [`Data/Scripts/README.md`](../../backend/src/HIS.Infrastructure/Data/Scripts/README.md).

## Vì sao archive (gỡ "nguồn schema thứ 2" giả)

`ProductionSchemaRepairRunner` **chỉ** load các SQL **embedded** dưới namespace
`HIS.Infrastructure.Data.Scripts.*` (xem `HIS.Infrastructure.csproj`:
`<EmbeddedResource Include="Data\Scripts\*.sql" />`). Các file dưới `scripts/`
**không bao giờ được runner load** — chúng từng được apply một lần bằng tay
(`docker exec ... sqlcmd`) ở thời kỳ trước khi có migration system, rồi trở thành
"chết". Để chúng nằm cạnh dev-tools đang dùng khiến người đọc lầm tưởng đây là
một nguồn schema song song → rủi ro sửa nhầm vào đây mà không có hiệu lực.

## Nội dung

| Thư mục | Số file | Mô tả |
|---|---|---|
| [`legacy-sql/`](./legacy-sql/) | 86 | SQL fix-up một-lần đã apply qua `docker exec sqlcmd` thời kỳ chưa có migration runner (gồm 3 SQL gom từ `docs/dev-notes/legacy` + `_dev-notes-origin.md`). |
| [`migrations/`](./migrations/) | 6 | Các batch `phase2_*` / `phase5_*` / `phase_k5_*` thủ công (đã hợp nhất vào embedded `Data/Scripts`). |

## Quy tắc

- ❌ **KHÔNG** thêm file mới vào đây.
- ❌ **KHÔNG** chạy lại các file này (đã apply prod; chạy lại không có tác dụng hoặc gây nhiễu).
- ✅ Migration mới → `backend/src/HIS.Infrastructure/Data/Scripts/NN_*.sql` (idempotent, embedded, auto-apply).
- ✅ Cần xoá hẳn? Lịch sử git đã giữ — có thể `git rm` trong một phiên dọn riêng nếu chắc chắn không cần tra cứu.

> Di chuyển từ `scripts/legacy-sql` + `scripts/migrations` sang đây trong #199 (DATA-6, migration hygiene);
> bổ sung 3 SQL chết từ `docs/dev-notes/legacy` trong đợt tái cấu trúc docs/ 2026-06-19.
