---
name: his-sql-table-migration
description: Use this skill when creating, fixing, or seeding SQL Server tables for the HIS database (DB name `HIS`, container `his-sqlserver`, password `HisDocker2024Pass#`). Triggers include writing scripts in `scripts/create_*.sql`, `scripts/fix_*.sql`, `scripts/seed_*.sql`, adding audit columns (CreatedBy/UpdatedBy uniqueidentifier với ValueConverter), idempotent IF NOT EXISTS, FK references Users/Patients/MedicalRecords, hoặc fix lỗi `InvalidCastException Guid↔String`.
type: project
---

# HIS SQL Table Migration

Skill chuẩn hoá cách tạo/sửa bảng SQL Server cho HIS. Project hiện có 80+ file `.sql` trong `scripts/` — mỗi script mới phải tuân theo convention sau để khớp với HISDbContext + tránh lặp lại lỗi `Guid↔String` đã từng dính 31 bảng.

## Khi nào dùng

- Thêm bảng mới: `scripts/create_<feature>_tables.sql`
- Sửa bảng có sẵn (thêm cột, đổi kiểu): `scripts/fix_<issue>.sql`, `scripts/add_<columns>.sql`
- Seed master data: `scripts/seed_<module>_data.sql`
- Hợp nhất nhiều migration nhỏ thành một bundle (NangCap14, NangCap15, ...).

## Quy trình chuẩn

1. **Đọc template**: `references/sql-table-template.sql` — copy block CREATE TABLE chuẩn.
2. **Quyết định kiểu CreatedBy/UpdatedBy** dựa vào `references/audit-columns-convention.md`:
   - Bảng business mới (Inpatient, Billing, Pharmacy logic, Surgery...) → **UNIQUEIDENTIFIER** + thêm vào ValueConverter list.
   - Bảng log/legacy/external (CashBooks, Receipts, InvoiceSummaries, AuditLogs) → **NVARCHAR(200)**.
3. **Ghi script idempotent**: mọi statement bao bằng `IF NOT EXISTS`/`IF EXISTS` để chạy lại không lỗi.
4. **Đặt FK** tới `Users`, `Patients`, `MedicalRecords` đúng convention (xem template).
5. **Chạy thử qua docker**:
   ```powershell
   .\scripts\run-migration.ps1 -ScriptPath scripts\create_<feature>_tables.sql
   ```
   (script gọi `sqlcmd` trong container `his-sqlserver` — đường dẫn `/opt/mssql-tools18/bin/sqlcmd`, KHÔNG phải `/opt/mssql-tools/bin/`).
6. **Cập nhật entity C#** nếu thêm bảng mới: tạo class trong `backend/src/HIS.Core/Entities/`, đăng ký `DbSet` trong `HISDbContext`, kiểm tra ValueConverter cho audit columns nếu là Guid.
7. **Commit script + entity cùng nhau**.

## Convention bắt buộc

### Cột chuẩn cho mọi bảng business
```sql
Id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
-- ... business columns ...
CreatedAt    DATETIME2(7)     NOT NULL DEFAULT GETDATE(),
CreatedBy    UNIQUEIDENTIFIER NULL,    -- xem note dưới
UpdatedAt    DATETIME2(7)     NULL,
UpdatedBy    UNIQUEIDENTIFIER NULL,
IsDeleted    BIT              NOT NULL DEFAULT 0
```

### Foreign Key naming
```sql
CONSTRAINT FK_<TableName>_<RefTable>_<Column> FOREIGN KEY (<Column>) REFERENCES <RefTable>(Id)
```
Ví dụ: `CONSTRAINT FK_Receipts_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id)`.

### Idempotent guard
```sql
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TenBang')
BEGIN
    CREATE TABLE TenBang (...);
    PRINT 'Created TenBang';
END
GO

-- Thêm cột:
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'TenBang' AND COLUMN_NAME = 'TenCot')
BEGIN
    ALTER TABLE TenBang ADD TenCot NVARCHAR(200) NULL;
    PRINT 'Added TenBang.TenCot';
END
GO
```

### Status/Type enum columns
Dùng INT + comment giải thích:
```sql
Status INT NOT NULL DEFAULT 1, -- 1-Active, 2-Inactive, 3-Deleted
PaymentMethod INT NOT NULL DEFAULT 1, -- 1-Cash, 2-Bank, 3-Card, 4-EWallet
```

## Pitfalls (đã từng dính)

- **Bug `InvalidCastException Guid↔String` (đã fix 31 bảng)**: khi DB là `UNIQUEIDENTIFIER` mà C# entity khai `string?` → cần ValueConverter global trong `HISDbContext`. Khi tạo bảng mới với `CreatedBy UNIQUEIDENTIFIER`, **PHẢI thêm bảng đó vào danh sách áp dụng ValueConverter** (xem `audit-columns-convention.md` mục "Đăng ký ValueConverter").
- **InvoiceSummary ngoại lệ**: `CreatedBy NVARCHAR(200)` → KHÔNG được áp ValueConverter Guid cho bảng này (đã từng misapply gây lỗi).
- **`shadow FK`**: nếu có cả navigation property `User DischargedByUser` và string `DischargedBy` → EF Core tự sinh shadow FK `DischargedById`. Fix bằng Fluent API trong `HISDbContext.OnModelCreating`:
  ```csharp
  builder.Entity<Discharge>().HasOne(d => d.DischargedByUser).WithMany().HasForeignKey(d => d.DischargedBy);
  ```
- **Tên DB**: `HIS` (KHÔNG phải `HIS_DB`). Password: `HisDocker2024Pass#` (chú ý ký tự `#`).
- **sqlcmd path** trong container: `/opt/mssql-tools18/bin/sqlcmd` (mssql-tools18, không phải mssql-tools).
- **Vietnamese encoding**: dùng NVARCHAR + `N'...'` cho literal có dấu (đã từng dính double-encoding → fix bằng `scripts/fix_encoding.sql`).
- **Quên `GO`** giữa các CREATE TABLE → SQL Server treat thành 1 batch, fail vì PK constraint conflict.

## Reference

- `references/sql-table-template.sql` — template CREATE TABLE + ALTER COLUMN + seed
- `references/audit-columns-convention.md` — quyết định Guid vs nvarchar + cách đăng ký ValueConverter
- `scripts/run-migration.ps1` — runner gọi sqlcmd qua docker container
