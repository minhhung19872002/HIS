-- Migration 65: Kiểm kê tài sản cố định (AssetStocktake + AssetStocktakeItem)
-- Idempotent: IF NOT EXISTS guards on table and column level
-- Applied automatically by ProductionSchemaRepairRunner on startup

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AssetStocktakes')
BEGIN
    CREATE TABLE AssetStocktakes (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        StocktakeCode NVARCHAR(50) NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        StocktakeDate DATETIME2 NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        DepartmentName NVARCHAR(200) NULL,
        ConductedById NVARCHAR(100) NULL,
        ApprovedById NVARCHAR(100) NULL,
        ApprovedAt DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 1,
        Notes NVARCHAR(MAX) NULL,
        -- BaseEntity audit fields
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedBy NVARCHAR(100) NULL
    );
    PRINT 'Created table AssetStocktakes';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AssetStocktakeItems')
BEGIN
    CREATE TABLE AssetStocktakeItems (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        AssetStocktakeId UNIQUEIDENTIFIER NOT NULL,
        FixedAssetId UNIQUEIDENTIFIER NOT NULL,
        AssetCode NVARCHAR(50) NULL,
        AssetName NVARCHAR(200) NULL,
        SerialNumber NVARCHAR(100) NULL,
        LocationDescription NVARCHAR(300) NULL,
        IsFound BIT NOT NULL DEFAULT 1,
        ConditionStatus INT NOT NULL DEFAULT 1,
        Remark NVARCHAR(500) NULL,
        -- BaseEntity audit fields
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        DeletedAt DATETIME2 NULL,
        DeletedBy NVARCHAR(100) NULL,
        CONSTRAINT FK_AssetStocktakeItems_AssetStocktakes
            FOREIGN KEY (AssetStocktakeId) REFERENCES AssetStocktakes(Id),
        CONSTRAINT FK_AssetStocktakeItems_FixedAssets
            FOREIGN KEY (FixedAssetId) REFERENCES FixedAssets(Id)
    );
    CREATE INDEX IX_AssetStocktakeItems_StocktakeId ON AssetStocktakeItems(AssetStocktakeId);
    CREATE INDEX IX_AssetStocktakeItems_AssetId ON AssetStocktakeItems(FixedAssetId);
    PRINT 'Created table AssetStocktakeItems';
END
