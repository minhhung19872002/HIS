-- =============================================================
-- Migration 206: QA round 3 (r3-leftovers-b) — pharmacy / reports / HR leftovers
-- Runs on EVERY startup ⇒ fully idempotent (DDL behind COL_LENGTH guards, data fixes guarded
-- so a re-run matches nothing).
-- =============================================================

-- ---------------------------------------------------------------
-- 1. ExportReceipts.SupplierId — supplier of a "Xuất trả NCC" issue (ExportType 5).
--    Was carried as a "[NCC:<guid>]" note tag; the service still reads the tag for old rows.
-- ---------------------------------------------------------------
IF COL_LENGTH('ExportReceipts', 'SupplierId') IS NULL
BEGIN
    ALTER TABLE ExportReceipts ADD SupplierId UNIQUEIDENTIFIER NULL;
    PRINT 'ExportReceipts.SupplierId added.';
END
GO

-- Back-fill from the legacy note tag (only rows still without a SupplierId → re-run matches nothing).
IF COL_LENGTH('ExportReceipts', 'SupplierId') IS NOT NULL
BEGIN
    UPDATE e
        SET e.SupplierId = s.Id
    FROM ExportReceipts e
    CROSS APPLY (SELECT TRY_CONVERT(UNIQUEIDENTIFIER,
        SUBSTRING(e.Note, CHARINDEX('[NCC:', e.Note) + 5, 36)) AS TaggedId) t
    JOIN Suppliers s ON s.Id = t.TaggedId
    WHERE e.SupplierId IS NULL
      AND e.ExportType = 5
      AND e.Note LIKE '%[[]NCC:%]%';
END
GO

-- ---------------------------------------------------------------
-- 2. Warehouse type contradictions (HIS.Core WarehouseType: 4 = Nhà thuốc bệnh viện, 5 = Tủ trực khoa).
--    Migration 51 used to back-fill IsCabinet = 1 for type 4 on every startup, so the hospital pharmacy was
--    also flagged as an emergency cabinet (cabinet issues could deduct pharmacy stock). 51 now targets type 5.
--    a) the sample cabinet 51 seeded as type 4 (TT001, not a pharmacy) → type 5;
--    b) a real pharmacy (IsPharmacy = 1, type 4) is not a cabinet.
-- ---------------------------------------------------------------
IF COL_LENGTH('Warehouses', 'IsCabinet') IS NOT NULL
BEGIN
    UPDATE Warehouses
        SET WarehouseType = 5
    WHERE WarehouseCode = N'TT001' AND WarehouseType = 4 AND IsCabinet = 1 AND IsPharmacy = 0;

    UPDATE Warehouses
        SET IsCabinet = 0
    WHERE WarehouseType = 4 AND IsPharmacy = 1 AND IsCabinet = 1;
END
GO

-- ---------------------------------------------------------------
-- 3. GeneratedReports.FileContent — the generated report file itself. Prod runs one container without volumes,
--    so files written to local disk (OutputPath) were lost on every deploy; downloads now read this column.
-- ---------------------------------------------------------------
IF COL_LENGTH('GeneratedReports', 'FileContent') IS NULL
BEGIN
    ALTER TABLE GeneratedReports ADD FileContent VARBINARY(MAX) NULL;
    PRINT 'GeneratedReports.FileContent added.';
END
GO
