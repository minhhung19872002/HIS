# Audit Columns Convention (CreatedBy / UpdatedBy)

HIS có HAI trường phái audit columns. Phải pick đúng trường phái khi tạo bảng mới, nếu không sẽ gây `InvalidCastException Guid↔String` (đã dính 31 bảng trước đây).

## Trường phái 1 — Guid (DEFAULT cho bảng business mới)

Dùng khi: bảng mới thuộc workflow chính (Inpatient, OPD, Surgery, RIS/PACS, LIS, Pharmacy logic, Reception, ...).

```sql
CreatedAt DATETIME2(7)     NOT NULL DEFAULT GETDATE(),
CreatedBy UNIQUEIDENTIFIER NULL,
UpdatedAt DATETIME2(7)     NULL,
UpdatedBy UNIQUEIDENTIFIER NULL,
IsDeleted BIT              NOT NULL DEFAULT 0
```

**C# entity**:
```csharp
public DateTime CreatedAt { get; set; }
public string? CreatedBy { get; set; }   // string in C#, Guid in DB
public DateTime? UpdatedAt { get; set; }
public string? UpdatedBy { get; set; }
public bool IsDeleted { get; set; }
```

**BẮT BUỘC đăng ký ValueConverter** trong `HISDbContext.OnModelCreating` để EF Core map `string ↔ Guid`. Pattern hiện tại (đã apply cho 31 bảng):

```csharp
var guidStringConverter = new ValueConverter<string?, Guid?>(
    s => string.IsNullOrEmpty(s) ? (Guid?)null : Guid.Parse(s),
    g => g.HasValue ? g.Value.ToString() : null);

// For each entity using Guid CreatedBy/UpdatedBy:
modelBuilder.Entity<TEntity>().Property(e => e.CreatedBy).HasConversion(guidStringConverter);
modelBuilder.Entity<TEntity>().Property(e => e.UpdatedBy).HasConversion(guidStringConverter);
```

**Hoặc** dùng convention loop tự động — kiểm tra `HISDbContext` xem đã có loop áp converter cho mọi entity nào có property tên `CreatedBy/UpdatedBy` chưa, nếu có thì entity mới sẽ tự được pick up.

### Bảng đã dùng Guid (sample, không exhaustive)
- Inpatient: Admissions, BedAssignments, Transfers, Discharges
- OPD: ServiceRequests, ServiceRequestDetails, Prescriptions
- Surgery: SurgeryRequests, SurgerySchedules
- RIS/PACS: ImagingOrders, ImagingResults, DigitalSignatures
- 31+ bảng khác đã được wire vào ValueConverter (xem CLAUDE.md "Bugs da fix trong Session 2-3")

## Trường phái 2 — Nvarchar (LEGACY / log / external)

Dùng khi: bảng log, audit history, integration với hệ thống ngoài (BHXH, MOH), hoặc bảng cũ đã legacy.

```sql
CreatedBy NVARCHAR(200) NULL,
UpdatedBy NVARCHAR(200) NULL,
```

**C# entity**: `string? CreatedBy { get; set; }` — không cần converter.

### Bảng đã dùng Nvarchar (NGOẠI LỆ, đừng wire converter cho các bảng này)
- `CashBooks` (xem `scripts/create_billing_tables.sql:23`)
- `Receipts` (xem `scripts/create_billing_tables.sql:52`)
- `ReceiptDetails`
- `InvoiceSummaries` — **đã từng misapply ValueConverter và gây lỗi** (xem CLAUDE.md "Loai bo ValueConverter sai cho InvoiceSummary")
- `AuditLogs`, `SmsLogs` — log tables

## Cách quyết định nhanh

| Câu hỏi | → Chọn |
|---|---|
| Bảng có user thao tác (tạo/sửa/duyệt) trong workflow chính? | **Guid** |
| Bảng chỉ chứa log / history / external data? | **Nvarchar** |
| Bảng đã có sẵn — đang sửa? | **Giữ nguyên** kiểu hiện tại, đừng đổi |
| Bảng tích hợp BHXH/MOH có tracking external user ID? | **Nvarchar** |

## Checklist khi thêm bảng business mới (Guid)

- [ ] CREATE TABLE với `CreatedBy/UpdatedBy UNIQUEIDENTIFIER NULL`
- [ ] Tạo entity `backend/src/HIS.Core/Entities/<Name>.cs` với `string? CreatedBy/UpdatedBy`
- [ ] Đăng ký `DbSet<TEntity>` trong `HISDbContext`
- [ ] Verify `HISDbContext.OnModelCreating` áp ValueConverter (qua loop convention hoặc explicit `HasConversion`)
- [ ] Chạy `dotnet build` — nếu fail với cast error là chưa wire converter
- [ ] Smoke test: insert 1 record qua API → query lại không lỗi

## Khi sửa bug cast error trên bảng cũ

1. Xác nhận DB đang là gì: `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='X' AND COLUMN_NAME='CreatedBy'`
2. Xác nhận C# entity property type là gì.
3. Nếu DB = uniqueidentifier, C# = string → áp ValueConverter (Guid path).
4. Nếu DB = nvarchar, C# = string → KHÔNG áp converter (Nvarchar path).
5. Đừng đổi schema DB chỉ để khớp C# — sửa entity hoặc thêm converter rẻ hơn nhiều.
