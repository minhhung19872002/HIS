-- Create StockThresholds table (BUG-012 fix)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'StockThresholds')
BEGIN
    CREATE TABLE StockThresholds (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MedicineId UNIQUEIDENTIFIER NOT NULL,
        WarehouseId UNIQUEIDENTIFIER NULL,
        MinimumQuantity DECIMAL(18,4) NOT NULL DEFAULT 0,
        MaximumQuantity DECIMAL(18,4) NOT NULL DEFAULT 0,
        ReorderPoint DECIMAL(18,4) NOT NULL DEFAULT 0,
        ReorderQuantity DECIMAL(18,4) NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_StockThresholds_Medicine FOREIGN KEY (MedicineId) REFERENCES Medicines(Id),
        CONSTRAINT FK_StockThresholds_Warehouse FOREIGN KEY (WarehouseId) REFERENCES Warehouses(Id)
    );
    CREATE INDEX IX_StockThresholds_MedicineId ON StockThresholds(MedicineId);
    CREATE INDEX IX_StockThresholds_WarehouseId ON StockThresholds(WarehouseId);
    PRINT 'Created StockThresholds table';
END
ELSE
    PRINT 'StockThresholds table already exists';
