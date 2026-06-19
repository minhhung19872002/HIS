-- Phase 2 Batch 6: StockTake + StockTakeItem tables
-- Date: 2026-06-02
-- Idempotent: safe to run multiple times

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StockTakes')
BEGIN
    CREATE TABLE StockTakes (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        StockTakeCode NVARCHAR(50) NOT NULL,
        StockTakeDate DATETIME2 NOT NULL,
        WarehouseId UNIQUEIDENTIFIER NOT NULL,
        PeriodFrom DATETIME2 NOT NULL,
        PeriodTo DATETIME2 NOT NULL,
        Status INT NOT NULL DEFAULT 0,
        CancelReason NVARCHAR(500) NULL,
        Notes NVARCHAR(MAX) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL
    );
    PRINT 'Created StockTakes';
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StockTakeItems')
BEGIN
    CREATE TABLE StockTakeItems (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        StockTakeId UNIQUEIDENTIFIER NOT NULL,
        InventoryItemId UNIQUEIDENTIFIER NOT NULL,
        ItemId UNIQUEIDENTIFIER NOT NULL,
        ItemCode NVARCHAR(50) NOT NULL,
        ItemName NVARCHAR(200) NOT NULL,
        Unit NVARCHAR(50) NULL,
        BatchNumber NVARCHAR(50) NULL,
        ExpiryDate DATETIME2 NULL,
        BookQuantity DECIMAL(18,4) NOT NULL DEFAULT 0,
        ActualQuantity DECIMAL(18,4) NOT NULL DEFAULT 0,
        UnitPrice DECIMAL(18,4) NOT NULL DEFAULT 0,
        Notes NVARCHAR(500) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        CONSTRAINT FK_StockTakeItems_StockTakes FOREIGN KEY (StockTakeId)
            REFERENCES StockTakes(Id) ON DELETE CASCADE
    );
    PRINT 'Created StockTakeItems';
END

COMMIT TRANSACTION;
PRINT 'Phase 2 Batch 6 migration completed successfully.';
GO
