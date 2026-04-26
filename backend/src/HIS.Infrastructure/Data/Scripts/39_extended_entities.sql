-- ============================================================================
-- 39_extended_entities.sql
-- Tao 8 bang moi cho extended Warehouse / ServicePackage / Insurance entities
-- Idempotent: IF NOT EXISTS guards
-- ============================================================================

-- ConsignmentStocks
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ConsignmentStocks')
CREATE TABLE ConsignmentStocks (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SupplierId UNIQUEIDENTIFIER NOT NULL,
    WarehouseId UNIQUEIDENTIFIER NOT NULL,
    MedicineId UNIQUEIDENTIFIER NULL,
    SupplyId UNIQUEIDENTIFIER NULL,
    BatchNumber NVARCHAR(100) NULL,
    ExpiryDate DATETIME2 NULL,
    Quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    UsedQuantity DECIMAL(18,4) NOT NULL DEFAULT 0,
    UnitPrice DECIMAL(18,4) NOT NULL DEFAULT 0,
    ConsignmentDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ExpirationDate DATETIME2 NULL,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ConsignmentStocks_Supplier_Warehouse' AND object_id = OBJECT_ID('ConsignmentStocks'))
CREATE INDEX IX_ConsignmentStocks_Supplier_Warehouse ON ConsignmentStocks(SupplierId, WarehouseId);

-- IUMedicineConfigs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IUMedicineConfigs')
CREATE TABLE IUMedicineConfigs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MedicineId UNIQUEIDENTIFIER NOT NULL,
    BaseUnit NVARCHAR(50) NOT NULL,
    IUPerBaseUnit DECIMAL(18,4) NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IUMedicineConfigs_Medicine' AND object_id = OBJECT_ID('IUMedicineConfigs'))
CREATE INDEX IX_IUMedicineConfigs_Medicine ON IUMedicineConfigs(MedicineId);

-- SplitablePackageConfigs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SplitablePackageConfigs')
CREATE TABLE SplitablePackageConfigs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MedicineId UNIQUEIDENTIFIER NULL,
    SupplyId UNIQUEIDENTIFIER NULL,
    PackageUnit NVARCHAR(50) NOT NULL,
    SplitUnit NVARCHAR(50) NOT NULL,
    QuantityPerPackage DECIMAL(18,4) NOT NULL DEFAULT 1,
    PackagePricePerUnit DECIMAL(18,4) NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- ProfitMarginConfigs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProfitMarginConfigs')
CREATE TABLE ProfitMarginConfigs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    WarehouseId UNIQUEIDENTIFIER NULL,
    MedicineGroupCode NVARCHAR(50) NULL,
    SupplyGroupCode NVARCHAR(50) NULL,
    MinPriceFrom DECIMAL(18,4) NOT NULL DEFAULT 0,
    MinPriceTo DECIMAL(18,4) NOT NULL DEFAULT 0,
    MarginPercent DECIMAL(8,4) NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    EffectiveFrom DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EffectiveTo DATETIME2 NULL,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- ServicePackages
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ServicePackages')
CREATE TABLE ServicePackages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PackageCode NVARCHAR(50) NOT NULL,
    PackageName NVARCHAR(500) NOT NULL,
    [Description] NVARCHAR(1000) NULL,
    PackageType INT NOT NULL DEFAULT 1,
    GenderRestriction NVARCHAR(20) NULL,
    MinAge INT NULL,
    MaxAge INT NULL,
    TotalPrice DECIMAL(18,4) NOT NULL DEFAULT 0,
    DiscountPercent DECIMAL(8,4) NOT NULL DEFAULT 0,
    FinalPrice DECIMAL(18,4) NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    EffectiveFrom DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EffectiveTo DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ServicePackages_Code' AND object_id = OBJECT_ID('ServicePackages'))
CREATE INDEX IX_ServicePackages_Code ON ServicePackages(PackageCode);

-- ServicePackageItems
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ServicePackageItems')
CREATE TABLE ServicePackageItems (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PackageId UNIQUEIDENTIFIER NOT NULL,
    ServiceId UNIQUEIDENTIFIER NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    UnitPrice DECIMAL(18,4) NOT NULL DEFAULT 0,
    Notes NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ServicePackageItems_Package' AND object_id = OBJECT_ID('ServicePackageItems'))
CREATE INDEX IX_ServicePackageItems_Package ON ServicePackageItems(PackageId);

-- InsuranceActivityLogs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InsuranceActivityLogs')
CREATE TABLE InsuranceActivityLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MaLk NVARCHAR(100) NOT NULL,
    ActivityTime DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ActivityType NVARCHAR(50) NOT NULL,
    [Description] NVARCHAR(1000) NULL,
    RequestPayload NVARCHAR(MAX) NULL,
    ResponsePayload NVARCHAR(MAX) NULL,
    IsSuccess BIT NOT NULL DEFAULT 0,
    ErrorMessage NVARCHAR(2000) NULL,
    UserId UNIQUEIDENTIFIER NULL,
    UserName NVARCHAR(200) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InsuranceActivityLogs_MaLk' AND object_id = OBJECT_ID('InsuranceActivityLogs'))
CREATE INDEX IX_InsuranceActivityLogs_MaLk ON InsuranceActivityLogs(MaLk, ActivityTime DESC);

-- IcdInsuranceMaps
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IcdInsuranceMaps')
CREATE TABLE IcdInsuranceMaps (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    IcdCode NVARCHAR(20) NOT NULL,
    IcdName NVARCHAR(500) NOT NULL,
    IsCovered BIT NOT NULL DEFAULT 1,
    CoverageRule NVARCHAR(1000) NULL,
    RestrictionLevel NVARCHAR(50) NULL,
    EffectiveFrom DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    EffectiveTo DATETIME2 NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IcdInsuranceMaps_Code' AND object_id = OBJECT_ID('IcdInsuranceMaps'))
CREATE INDEX IX_IcdInsuranceMaps_Code ON IcdInsuranceMaps(IcdCode);

-- ============================================================================
-- Seed: cover all existing IcdCodes as BHYT-eligible by default
-- (idempotent: skip if already seeded)
-- ============================================================================
IF (SELECT COUNT(*) FROM IcdInsuranceMaps WHERE IsDeleted = 0) = 0
INSERT INTO IcdInsuranceMaps (IcdCode, IcdName, IsCovered, CoverageRule, RestrictionLevel, EffectiveFrom, IsActive)
SELECT TOP 500
    Code, Name, 1, N'Toàn dân theo TT 35/2020', N'1-Toàn dân',
    DATEFROMPARTS(2024, 1, 1), 1
FROM IcdCodes
WHERE IsDeleted = 0 AND IsActive = 1;
