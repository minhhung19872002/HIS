-- BUG-012: Seed pharmacy inventory data
-- Creates a default pharmacy warehouse and inventory items for existing medicines
-- Idempotent: checks before inserting

USE HIS;
GO

-- 1. Create default pharmacy warehouse if not exists
IF NOT EXISTS (SELECT 1 FROM Warehouses WHERE WarehouseCode = 'KHO-THUOC-01')
BEGIN
    INSERT INTO Warehouses (Id, WarehouseCode, WarehouseName, WarehouseType, Location, IsPharmacy, IsCabinet, IsActive, IsDeleted, CreatedAt, CreatedBy)
    VALUES (
        NEWID(),
        'KHO-THUOC-01',
        N'Kho thuốc chính',
        1, -- Kho thuốc
        N'Tầng 1 - Nhà thuốc bệnh viện',
        1, -- IsPharmacy
        0,
        1, -- IsActive
        0,
        GETDATE(),
        'system'
    );
    PRINT 'Created warehouse KHO-THUOC-01';
END
GO

-- 2. Insert inventory items for all active medicines
DECLARE @warehouseId UNIQUEIDENTIFIER;
SELECT TOP 1 @warehouseId = Id FROM Warehouses WHERE WarehouseCode = 'KHO-THUOC-01';

IF @warehouseId IS NOT NULL
BEGIN
    -- Only insert for medicines that don't already have inventory
    INSERT INTO InventoryItems (Id, WarehouseId, MedicineId, ItemType, BatchNumber, ExpiryDate, ManufactureDate,
                                Quantity, ReservedQuantity, ImportPrice, UnitPrice, IsLocked, IsDeleted, CreatedAt, CreatedBy)
    SELECT
        NEWID(),
        @warehouseId,
        m.Id,
        'Medicine',
        'L' + FORMAT(GETDATE(), 'yyyyMM') + '-' + RIGHT('000' + CAST(ROW_NUMBER() OVER (ORDER BY m.MedicineCode) AS VARCHAR), 3),
        DATEADD(MONTH, 18, GETDATE()), -- 18 months from now
        DATEADD(MONTH, -6, GETDATE()), -- 6 months ago
        CASE
            WHEN m.MedicineCode LIKE '%PARA%' THEN 500
            WHEN m.MedicineCode LIKE '%AMOX%' THEN 300
            WHEN m.Unit = N'Viên' THEN ABS(CHECKSUM(NEWID())) % 400 + 100
            WHEN m.Unit = N'Ống' THEN ABS(CHECKSUM(NEWID())) % 200 + 50
            WHEN m.Unit = N'Chai' THEN ABS(CHECKSUM(NEWID())) % 100 + 20
            ELSE ABS(CHECKSUM(NEWID())) % 300 + 50
        END, -- Quantity
        0, -- ReservedQuantity
        m.UnitPrice * 0.7, -- ImportPrice (70% of selling price)
        m.UnitPrice,
        0, -- IsLocked
        0, -- IsDeleted
        GETDATE(),
        'system'
    FROM Medicines m
    WHERE m.IsActive = 1
      AND NOT EXISTS (
          SELECT 1 FROM InventoryItems ii
          WHERE ii.MedicineId = m.Id AND ii.WarehouseId = @warehouseId AND ii.IsDeleted = 0
      );

    PRINT 'Inserted inventory items for ' + CAST(@@ROWCOUNT AS VARCHAR) + ' medicines';
END
ELSE
    PRINT 'ERROR: Warehouse KHO-THUOC-01 not found';
GO

-- 3. Create stock thresholds for medicines (low stock alerts)
DECLARE @warehouseId2 UNIQUEIDENTIFIER;
SELECT TOP 1 @warehouseId2 = Id FROM Warehouses WHERE WarehouseCode = 'KHO-THUOC-01';

IF @warehouseId2 IS NOT NULL
BEGIN
    INSERT INTO StockThresholds (Id, MedicineId, WarehouseId, MinimumQuantity, MaximumQuantity, ReorderPoint, IsActive, IsDeleted, CreatedAt, CreatedBy)
    SELECT
        NEWID(),
        m.Id,
        @warehouseId2,
        20, -- MinimumQuantity
        500, -- MaximumQuantity
        50, -- ReorderPoint
        1,
        0,
        GETDATE(),
        'system'
    FROM Medicines m
    WHERE m.IsActive = 1
      AND NOT EXISTS (
          SELECT 1 FROM StockThresholds st
          WHERE st.MedicineId = m.Id AND st.IsActive = 1
      );

    PRINT 'Inserted stock thresholds for ' + CAST(@@ROWCOUNT AS VARCHAR) + ' medicines';
END
GO

PRINT 'Pharmacy inventory seed completed';
GO
