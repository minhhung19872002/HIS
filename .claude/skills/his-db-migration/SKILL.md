---
name: his-db-migration
description: Use this skill when creating, fixing, or seeding SQL Server tables for the HIS database (DB name `HIS`, container `his-sqlserver`, password `HisDocker2024Pass#`). Triggers include writing scripts in `scripts/create_*.sql`, `scripts/fix_*.sql`, `scripts/seed_*.sql`, adding audit columns (CreatedBy/UpdatedBy uniqueidentifier with a ValueConverter), idempotent IF NOT EXISTS, FK references to Users/Patients/MedicalRecords, or fixing an `InvalidCastException Guid↔String`.
metadata:
  type: project
---

# HIS SQL Table Migration

A skill standardizing how to create/edit SQL Server tables for HIS. The project has 80+ `.sql` files in `scripts/` — each new script must follow the convention below to match HISDbContext + avoid repeating the `Guid↔String` bug that once hit 31 tables.

## When to use

- Adding a new table: `scripts/create_<feature>_tables.sql`
- Editing an existing table (add column, change type): `scripts/fix_<issue>.sql`, `scripts/add_<columns>.sql`
- Seeding master data: `scripts/seed_<module>_data.sql`
- Consolidating several small migrations into one bundle (NangCap14, NangCap15, ...).

## When NOT to use

- Do NOT use `dotnet ef migrations` — the project IGNOREs pending model changes; always write a hand-written SQL script.
- Service/controller logic on a table → `his-be-module-scaffold`. API test → `his-test-api-powershell`.

## Standard process

1. **Read the template**: `references/sql-table-template.sql` — copy the standard CREATE TABLE block.
2. **Decide the CreatedBy/UpdatedBy type** per `references/audit-columns-convention.md`:
   - A new business table (Inpatient, Billing, Pharmacy logic, Surgery...) → **UNIQUEIDENTIFIER** + add it to the ValueConverter list.
   - A log/legacy/external table (CashBooks, Receipts, InvoiceSummaries, AuditLogs) → **NVARCHAR(200)**.
3. **Write an idempotent script**: wrap every statement in `IF NOT EXISTS`/`IF EXISTS` so re-running is error-free.
4. **Place the FK** to `Users`, `Patients`, `MedicalRecords` per the convention (see the template).
5. **Test via docker**:
   ```powershell
   .\scripts\run-migration.ps1 -ScriptPath scripts\create_<feature>_tables.sql
   ```
   (the script calls `sqlcmd` in the `his-sqlserver` container — path `/opt/mssql-tools18/bin/sqlcmd`, NOT `/opt/mssql-tools/bin/`).
6. **Update the C# entity** if adding a new table: create a class in `backend/src/HIS.Core/Entities/`, register the `DbSet` in `HISDbContext`, check the ValueConverter for audit columns if it's a Guid.
7. **Commit the script + entity together**.

## Mandatory conventions

### Standard columns for every business table
```sql
Id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
-- ... business columns ...
CreatedAt    DATETIME2(7)     NOT NULL DEFAULT GETDATE(),
CreatedBy    UNIQUEIDENTIFIER NULL,    -- see note below
UpdatedAt    DATETIME2(7)     NULL,
UpdatedBy    UNIQUEIDENTIFIER NULL,
IsDeleted    BIT              NOT NULL DEFAULT 0
```

### Foreign Key naming
```sql
CONSTRAINT FK_<TableName>_<RefTable>_<Column> FOREIGN KEY (<Column>) REFERENCES <RefTable>(Id)
```
Example: `CONSTRAINT FK_Receipts_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id)`.

### Idempotent guard
```sql
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TableName')
BEGIN
    CREATE TABLE TableName (...);
    PRINT 'Created TableName';
END
GO

-- Add a column:
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = 'TableName' AND COLUMN_NAME = 'ColumnName')
BEGIN
    ALTER TABLE TableName ADD ColumnName NVARCHAR(200) NULL;
    PRINT 'Added TableName.ColumnName';
END
GO
```

### Status/Type enum columns
Use INT + an explanatory comment:
```sql
Status INT NOT NULL DEFAULT 1, -- 1-Active, 2-Inactive, 3-Deleted
PaymentMethod INT NOT NULL DEFAULT 1, -- 1-Cash, 2-Bank, 3-Card, 4-EWallet
```

## Pitfalls (hit before)

- **The `InvalidCastException Guid↔String` bug (fixed 31 tables)**: when the DB is `UNIQUEIDENTIFIER` but the C# entity declares `string?` → you need a global ValueConverter in `HISDbContext`. When creating a new table with `CreatedBy UNIQUEIDENTIFIER`, you **MUST add the table name to the `tablesWithGuidAudit` whitelist** in `HISDbContext` (a HashSet applying the Guid↔String ValueConverter to CreatedBy/UpdatedBy) — see `audit-columns-convention.md` section "Registering the ValueConverter". Forget = a 500 InvalidCastException when querying that table.
- **InvoiceSummary exception**: `CreatedBy NVARCHAR(200)` → do NOT apply the Guid ValueConverter to this table (misapplying it once caused an error).
- **`shadow FK`**: if there's both a navigation property `User DischargedByUser` and a string `DischargedBy` → EF Core auto-generates a shadow FK `DischargedById`. Fix with Fluent API in `HISDbContext.OnModelCreating`:
  ```csharp
  builder.Entity<Discharge>().HasOne(d => d.DischargedByUser).WithMany().HasForeignKey(d => d.DischargedBy);
  ```
- **DB name**: `HIS` (NOT `HIS_DB`). Password: `HisDocker2024Pass#` (note the `#` character).
- **sqlcmd path** in the container: `/opt/mssql-tools18/bin/sqlcmd` (mssql-tools18, not mssql-tools).
- **Vietnamese encoding**: use NVARCHAR + `N'...'` for a literal with diacritics (once hit double-encoding → fixed with `scripts/fix_encoding.sql`).
- **Forgetting `GO`** between CREATE TABLEs → SQL Server treats it as 1 batch, fails due to a PK constraint conflict.

## Seed / populate demo data (preparing a customer demo)

Many pages filter `CreatedAt.Date == today` → data with an old date makes the page empty. Patterns used:
- **Idempotent seed**: wrap every `PopulateX`/seed in `IF NOT EXISTS` or `!await db.X.AnyAsync()` to re-run safely.
- **`PopulateDataController`** (`/api/admin/populate/all`) + **DailySeed** (`/api/admin/seed-daily/patients`,
  header `X-Seed-Key`) — call the real API to fill data, no deploy needed. POST must have a body `-d '{}'` (Google LB
  returns 411 if empty).
- **Shift-to-today**: bump the latest slice of `MedicalRecords/Examinations/ServiceRequests/Prescriptions/
  QueueTickets/LabOrders/Receipts` to today. ⚠️ **The container runs UTC** → `SYSDATETIME()` in SQL returns UTC,
  off from the host. When shifting "to today" for a demo, use an **explicit VN date string** (e.g. `'2026-04-26'`), NOT
  `SYSDATETIME()`. Use `CAST(CAST(SYSDATETIME() AS date) AS datetime2)` when DATEADD minutes is needed.
- **Drift guard**: wrap UPDATE with `COL_LENGTH(...) IS NOT NULL` to skip a non-existent column (local BAK vs prod schema diverge).
- **Do NOT seed fake data if the user asks for real data** from the source DB.

## Reference

- `references/sql-table-template.sql` — CREATE TABLE + ALTER COLUMN + seed template
- `references/audit-columns-convention.md` — Guid vs nvarchar decision + how to register the ValueConverter
- `scripts/run-migration.ps1` — a runner calling sqlcmd via the docker container

## When to update
- When the audit-column/FK convention, or the seed/migration approach, changes.
