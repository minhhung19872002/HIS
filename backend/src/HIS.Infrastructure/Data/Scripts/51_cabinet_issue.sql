-- =============================================================
-- Migration 51: Emergency Cabinet (Tủ Trực) Issue Support
-- Ensures Warehouses.IsCabinet column exists so that WarehouseType=4
-- rows and explicitly-flagged cabinets are queryable.
-- Idempotent: COL_LENGTH IS NULL guard throughout.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Warehouses: add IsCabinet column if missing
-- ---------------------------------------------------------------
IF COL_LENGTH('Warehouses', 'IsCabinet') IS NULL
BEGIN
    ALTER TABLE Warehouses
        ADD IsCabinet BIT NOT NULL DEFAULT 0;
    PRINT 'Warehouses.IsCabinet added.';
END

-- ---------------------------------------------------------------
-- 2. Back-fill: any warehouse with WarehouseType=4 is a cabinet
-- ---------------------------------------------------------------
UPDATE Warehouses
    SET IsCabinet = 1
WHERE WarehouseType = 4
  AND IsCabinet = 0;

-- ---------------------------------------------------------------
-- 3. Index for cabinet queries (filter by IsCabinet + DepartmentId)
-- ---------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('Warehouses')
      AND name = 'IX_Warehouses_IsCabinet_Dept'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_Warehouses_IsCabinet_Dept
        ON Warehouses (IsCabinet, DepartmentId)
        WHERE IsCabinet = 1;
    PRINT 'Index IX_Warehouses_IsCabinet_Dept created.';
END

-- ---------------------------------------------------------------
-- 4. Seed one sample cabinet warehouse per DB (only if none exist)
--    Allows smoke-test without manual catalog setup.
-- ---------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM Warehouses WHERE IsCabinet = 1)
BEGIN
    INSERT INTO Warehouses (
        Id, WarehouseCode, WarehouseName, WarehouseType,
        Location, IsPharmacy, IsCabinet, IsActive, IsDeleted,
        CreatedAt, CreatedBy, UpdatedAt, UpdatedBy
    )
    VALUES (
        NEWID(),
        N'TT001',
        N'Tủ trực khoa (mẫu)',
        4,           -- WarehouseType = 4 Tủ trực
        N'Khoa Nội tổng hợp',
        0,           -- Not a pharmacy
        1,           -- IsCabinet = true
        1,           -- IsActive
        0,           -- IsDeleted
        GETUTCDATE(),
        N'system',
        GETUTCDATE(),
        N'system'
    );
    PRINT 'Seeded sample cabinet warehouse TT001.';
END
