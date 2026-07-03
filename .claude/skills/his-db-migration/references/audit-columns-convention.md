# Audit Columns Convention (CreatedBy / UpdatedBy)

HIS has TWO schools of audit columns. You must pick the right school when creating a new table, otherwise you cause an `InvalidCastException Guid↔String` (hit 31 tables before).

## School 1 — Guid (DEFAULT for a new business table)

Use when: the new table belongs to a main workflow (Inpatient, OPD, Surgery, RIS/PACS, LIS, Pharmacy logic, Reception, ...).

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

**MANDATORY: register the ValueConverter** in `HISDbContext.OnModelCreating` so EF Core maps `string ↔ Guid`. The current pattern (applied to 31 tables):

```csharp
var guidStringConverter = new ValueConverter<string?, Guid?>(
    s => string.IsNullOrEmpty(s) ? (Guid?)null : Guid.Parse(s),
    g => g.HasValue ? g.Value.ToString() : null);

// For each entity using Guid CreatedBy/UpdatedBy:
modelBuilder.Entity<TEntity>().Property(e => e.CreatedBy).HasConversion(guidStringConverter);
modelBuilder.Entity<TEntity>().Property(e => e.UpdatedBy).HasConversion(guidStringConverter);
```

**Or** use an automatic convention loop — check `HISDbContext` for whether there's already a loop applying the converter to every entity with a `CreatedBy/UpdatedBy` property; if so, a new entity is auto-picked-up.

### Tables using Guid (sample, not exhaustive)
- Inpatient: Admissions, BedAssignments, Transfers, Discharges
- OPD: ServiceRequests, ServiceRequestDetails, Prescriptions
- Surgery: SurgeryRequests, SurgerySchedules
- RIS/PACS: ImagingOrders, ImagingResults, DigitalSignatures
- 31+ other tables already wired into the ValueConverter (see CLAUDE.md "Bugs fixed in Session 2-3")

## School 2 — Nvarchar (LEGACY / log / external)

Use when: a log table, audit history, integration with an external system (BHXH, MOH), or an already-legacy table.

```sql
CreatedBy NVARCHAR(200) NULL,
UpdatedBy NVARCHAR(200) NULL,
```

**C# entity**: `string? CreatedBy { get; set; }` — no converter needed.

### Tables using Nvarchar (EXCEPTIONS, don't wire the converter for these)
- `CashBooks` (see `scripts/create_billing_tables.sql:23`)
- `Receipts` (see `scripts/create_billing_tables.sql:52`)
- `ReceiptDetails`
- `InvoiceSummaries` — **once misapplied the ValueConverter and caused an error** (see CLAUDE.md "Removed the wrong ValueConverter for InvoiceSummary")
- `AuditLogs`, `SmsLogs` — log tables

## Quick decision

| Question | → Pick |
|---|---|
| A table a user operates on (create/edit/approve) in a main workflow? | **Guid** |
| A table holding only log / history / external data? | **Nvarchar** |
| An existing table — being edited? | **Keep** the current type, don't change |
| A BHXH/MOH integration table tracking an external user ID? | **Nvarchar** |

## Checklist when adding a new business table (Guid)

- [ ] CREATE TABLE with `CreatedBy/UpdatedBy UNIQUEIDENTIFIER NULL`
- [ ] Create the entity `backend/src/HIS.Core/Entities/<Name>.cs` with `string? CreatedBy/UpdatedBy`
- [ ] Register `DbSet<TEntity>` in `HISDbContext`
- [ ] Verify `HISDbContext.OnModelCreating` applies the ValueConverter (via the loop convention or an explicit `HasConversion`)
- [ ] Run `dotnet build` — a failure with a cast error means the converter isn't wired
- [ ] Smoke test: insert 1 record via the API → query it back without an error

## When fixing a cast-error bug on an old table

1. Confirm what the DB is: `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='X' AND COLUMN_NAME='CreatedBy'`
2. Confirm the C# entity property type.
3. If DB = uniqueidentifier, C# = string → apply the ValueConverter (Guid path).
4. If DB = nvarchar, C# = string → do NOT apply the converter (Nvarchar path).
5. Don't change the DB schema just to match C# — editing the entity or adding a converter is far cheaper.
