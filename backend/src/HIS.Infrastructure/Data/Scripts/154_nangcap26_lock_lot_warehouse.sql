-- NangCap26 (TTYT Tinh Bien) muc V.31 + V.33:
--   V.31 Khoa lo thuoc  -> InventoryItems.IsLocked da co san, bo sung LockedBy/LockedAt de audit.
--   V.33 Khoa kho       -> Warehouses chua co cot khoa nao, them IsLocked/LockReason/LockedBy/LockedAt.
-- ADDITIVE — chi them cot, khong sua/xoa du lieu. Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) Warehouses: khoa kho
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Warehouses') AND name = 'IsLocked')
    ALTER TABLE dbo.Warehouses ADD IsLocked BIT NOT NULL CONSTRAINT DF_Warehouses_IsLocked DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Warehouses') AND name = 'LockReason')
    ALTER TABLE dbo.Warehouses ADD LockReason NVARCHAR(500) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Warehouses') AND name = 'LockedBy')
    ALTER TABLE dbo.Warehouses ADD LockedBy UNIQUEIDENTIFIER NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Warehouses') AND name = 'LockedAt')
    ALTER TABLE dbo.Warehouses ADD LockedAt DATETIME2 NULL;
GO

-- 2) InventoryItems: audit khoa lo (IsLocked + LockReason da ton tai truoc do)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InventoryItems') AND name = 'LockedBy')
    ALTER TABLE dbo.InventoryItems ADD LockedBy UNIQUEIDENTIFIER NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InventoryItems') AND name = 'LockedAt')
    ALTER TABLE dbo.InventoryItems ADD LockedAt DATETIME2 NULL;
GO

-- 3) Index phuc vu man hinh "danh sach lo dang khoa"
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_InventoryItems_IsLocked' AND object_id = OBJECT_ID('dbo.InventoryItems'))
    CREATE INDEX IX_InventoryItems_IsLocked ON dbo.InventoryItems (IsLocked) INCLUDE (WarehouseId, MedicineId, SupplyId, BatchNumber);
GO
