# Data/Scripts — NGUỒN SCHEMA DUY NHẤT (embedded, auto-apply)

> Các file `NN_*.sql` ở đây là **nguồn-sự-thật** cho schema "vá tay" của HIS, cùng với
> EF model. Mọi SQL khác trong repo (vd [`scripts/archive/`](../../../../../scripts/archive/README.md))
> là **di sản chết** — không được load.

## Runner hoạt động thế nào (`ProductionSchemaRepairRunner.cs`)

Chạy **mỗi lần backend startup** (chỉ khi provider = SQL Server), 2 phase:

1. **Phase 1 — Embedded scripts.** Load mọi resource embedded dưới
   `HIS.Infrastructure.Data.Scripts.*.sql` (khai báo trong `HIS.Infrastructure.csproj`:
   `<EmbeddedResource Include="Data\Scripts\*.sql" />` → **file mới tự động được nhặt, không cần sửa csproj**),
   tách batch theo `GO`, execute tuần tự. Lỗi 1 batch → **log warning + nuốt** (không chặn startup).
2. **Phase 2 — Model-driven.** Gọi `GenerateCreateScript()` từ EF model rồi chỉ chạy
   `CREATE TABLE/INDEX` cho bảng **chưa tồn tại** (skip ALTER/DROP/FK; retry 4 pass, hạ
   `ON DELETE CASCADE`→`NO ACTION`, pass cuối strip inline-FK). Đây là lưới backfill cho
   bảng mà script tay bỏ sót.

### Hệ quả quan trọng

- **KHÔNG có bảng "applied-migrations".** Mọi script chạy **lại mỗi startup** ⇒ **BẮT BUỘC idempotent**:
  bọc `IF NOT EXISTS (...)` quanh `CREATE TABLE` / `CREATE INDEX`, `IF NOT EXISTS sys.columns` quanh
  `ALTER TABLE ... ADD`, `IF NOT EXISTS (SELECT 1 FROM <bảng> WHERE ...)` quanh `INSERT` seed.
- **Idempotent → đổi tên/đổi số script là an toàn về "tracking"** (không có gì để lệch); chỉ cần
  cẩn thận **thứ tự apply trên DB trắng** (xem dưới).

## Quy ước đặt tên & số thứ tự

- Tên: `NN_<mô-tả-ngắn>.sql` (vd `139_*.sql`). `NN` = số thứ tự apply.
- **Lấy số kế tiếp = max(NN) + 1** bằng cách liệt kê thư mục (`ls Data/Scripts/`), KHÔNG hard-code.
  Hiện tại max = **140**.
- **Mỗi prefix số phải DUY NHẤT** (không trùng). *(Lịch sử: từng có cặp `44_*` trùng —
  `44_nangcap23_dedupe_idx` + `44_nangcap24` — đã resolve trong #199 bằng cách đổi
  `44_nangcap24` → `140_nangcap24` vì script này tự-chứa, không phụ thuộc thứ tự; còn
  `44_nangcap23_dedupe_idx` GIỮ ở 44 vì phụ thuộc script 43.)*
- **Gap số đã biết (bỏ qua khi dev, vô hại, không mang ý nghĩa):** `64`, `71`, `127`.
  Không cần lấp; chỉ document để khỏi tưởng "thiếu script".

## ⚠️ Caveat thứ tự sort (đã biết — KHÔNG tự sửa runner trong scope này)

Runner sort bằng `StringComparer.Ordinal` trên **tên chuỗi**, KHÔNG phải theo số:
do `'1' < '4' < '9'`, **cả khối `100-140` sort TRƯỚC nhóm 2-chữ-số `44–99`** (vd thứ tự thực:
`…10, 100, …, 140, 11, …, 44, …, 99`). Trên **DB trắng** một script 2-chữ-số có thể chạy *sau* một
script 1xx tham chiếu nó.

**Vì sao hiện vẫn an toàn (không cần gấp):**
- Prod/DB đang chạy đã apply đủ → re-run idempotent = no-op, thứ tự vô hại.
- Trên DB trắng: script lỗi vì bảng cha chưa có → chỉ **log warning + nuốt**, rồi **Phase 2
  model-driven backfill** tạo bù bảng ⇒ schema cuối vẫn đúng (đã verify `schema-drift` = 0 nhiều lần).

**Hardening đề xuất (task riêng, cần fresh-DB smoke):** đổi runner sang **sort theo số**
(parse prefix `^\d+`) *hoặc* zero-pad tên về 3 chữ số. KHÔNG làm chung scope #199 để tránh đổi
thứ tự apply mà chưa có lưới e2e/fresh-DB đầy đủ.

## Checklist khi thêm migration mới

1. Số = max+1 (liệt kê thư mục). Tên mô tả rõ.
2. Mọi statement idempotent (guard `IF NOT EXISTS`).
3. Cột audit `CreatedBy/UpdatedBy` kiểu `nvarchar(450)` (khớp ValueConverter, tránh `InvalidCastException Guid↔String`).
4. Build BE → confirm file được embed (csproj glob tự nhặt).
5. Sau deploy: `GET /health/schema-drift` → `missingCount = 0`.
