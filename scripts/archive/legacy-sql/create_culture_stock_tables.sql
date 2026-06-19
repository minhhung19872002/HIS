-- Create CultureStocks and CultureStockLogs tables for Vi Sinh culture collection
-- Idempotent: IF NOT EXISTS

USE HIS;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CultureStocks')
BEGIN
    CREATE TABLE CultureStocks (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        StockCode NVARCHAR(50) NOT NULL,
        SourceCultureId UNIQUEIDENTIFIER NULL,
        OrganismCode NVARCHAR(50) NOT NULL,
        OrganismName NVARCHAR(200) NOT NULL,
        ScientificName NVARCHAR(200) NULL,
        GramStain NVARCHAR(20) NULL,
        SourceType NVARCHAR(50) NULL,
        SourceDescription NVARCHAR(500) NULL,
        FreezerCode NVARCHAR(50) NULL,
        RackCode NVARCHAR(50) NULL,
        BoxCode NVARCHAR(50) NULL,
        Position NVARCHAR(20) NULL,
        PreservationMethod NVARCHAR(50) NOT NULL,
        StorageTemperature NVARCHAR(20) NULL,
        PassageNumber INT NOT NULL DEFAULT 1,
        AliquotCount INT NOT NULL DEFAULT 1,
        RemainingAliquots INT NOT NULL DEFAULT 1,
        PreservationDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        ExpiryDate DATETIME2 NULL,
        LastViabilityCheck DATETIME2 NULL,
        LastViabilityResult BIT NULL,
        Status INT NOT NULL DEFAULT 0,
        PreservedBy NVARCHAR(200) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_CultureStocks_StockCode ON CultureStocks(StockCode);
    CREATE INDEX IX_CultureStocks_OrganismCode ON CultureStocks(OrganismCode);
    CREATE INDEX IX_CultureStocks_Status ON CultureStocks(Status);
    CREATE INDEX IX_CultureStocks_FreezerCode ON CultureStocks(FreezerCode);
    CREATE INDEX IX_CultureStocks_ExpiryDate ON CultureStocks(ExpiryDate);
    CREATE INDEX IX_CultureStocks_PreservationDate ON CultureStocks(PreservationDate);

    PRINT 'Created CultureStocks table with indexes';
END
ELSE
    PRINT 'CultureStocks table already exists';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CultureStockLogs')
BEGIN
    CREATE TABLE CultureStockLogs (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CultureStockId UNIQUEIDENTIFIER NOT NULL,
        Action NVARCHAR(50) NOT NULL,
        AliquotsTaken INT NULL,
        Purpose NVARCHAR(500) NULL,
        Result NVARCHAR(500) NULL,
        PerformedBy NVARCHAR(200) NULL,
        PerformedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_CultureStockLogs_CultureStocks FOREIGN KEY (CultureStockId) REFERENCES CultureStocks(Id)
    );

    CREATE INDEX IX_CultureStockLogs_CultureStockId ON CultureStockLogs(CultureStockId);
    CREATE INDEX IX_CultureStockLogs_Action ON CultureStockLogs(Action);
    CREATE INDEX IX_CultureStockLogs_PerformedAt ON CultureStockLogs(PerformedAt);

    PRINT 'Created CultureStockLogs table with indexes';
END
ELSE
    PRINT 'CultureStockLogs table already exists';
GO
