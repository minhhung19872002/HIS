-- Asset Management Tables (NangCap17 Module A)
-- Idempotent: IF NOT EXISTS

-- 1. Tenders (Goi thau)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tenders')
BEGIN
    CREATE TABLE Tenders (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TenderCode NVARCHAR(50) NOT NULL,
        TenderName NVARCHAR(500) NOT NULL,
        TenderType INT NOT NULL DEFAULT 1, -- 1=Open, 2=Limited, 3=DirectPurchase
        PublishDate DATETIME2 NULL,
        ClosingDate DATETIME2 NULL,
        BudgetAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        Status INT NOT NULL DEFAULT 1, -- 1=Draft, 2=Published, 3=Evaluating, 4=Awarded, 5=Cancelled
        WinnerSupplierId UNIQUEIDENTIFIER NULL,
        ContractNumber NVARCHAR(100) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_Tenders_Status ON Tenders(Status) WHERE IsDeleted = 0;
    CREATE INDEX IX_Tenders_TenderCode ON Tenders(TenderCode) WHERE IsDeleted = 0;
END
GO

-- 2. TenderItems (Hang muc goi thau)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TenderItems')
BEGIN
    CREATE TABLE TenderItems (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TenderId UNIQUEIDENTIFIER NOT NULL,
        ItemName NVARCHAR(500) NOT NULL,
        ItemType INT NOT NULL DEFAULT 1, -- 1=FixedAsset, 2=Tool, 3=Supply
        Quantity INT NOT NULL DEFAULT 0,
        UnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
        Specification NVARCHAR(MAX) NULL,
        SupplierId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TenderItems_Tenders FOREIGN KEY (TenderId) REFERENCES Tenders(Id)
    );
    CREATE INDEX IX_TenderItems_TenderId ON TenderItems(TenderId) WHERE IsDeleted = 0;
END
GO

-- 3. FixedAssets (Tai san co dinh)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FixedAssets')
BEGIN
    CREATE TABLE FixedAssets (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AssetCode NVARCHAR(50) NOT NULL,
        AssetName NVARCHAR(500) NOT NULL,
        AssetGroupId NVARCHAR(50) NULL,
        OriginalValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        CurrentValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        PurchaseDate DATETIME2 NOT NULL,
        DepreciationMethod INT NOT NULL DEFAULT 1, -- 1=StraightLine, 2=DecliningBalance
        UsefulLifeMonths INT NOT NULL DEFAULT 0,
        MonthlyDepreciation DECIMAL(18,2) NOT NULL DEFAULT 0,
        AccumulatedDepreciation DECIMAL(18,2) NOT NULL DEFAULT 0,
        DepartmentId UNIQUEIDENTIFIER NULL,
        LocationDescription NVARCHAR(500) NULL,
        Status INT NOT NULL DEFAULT 1, -- 1=InUse, 2=Broken, 3=UnderRepair, 4=PendingDisposal, 5=Disposed, 6=Transferred
        QrCode NVARCHAR(MAX) NULL,
        SerialNumber NVARCHAR(100) NULL,
        TenderId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_FixedAssets_AssetCode ON FixedAssets(AssetCode) WHERE IsDeleted = 0;
    CREATE INDEX IX_FixedAssets_Status ON FixedAssets(Status) WHERE IsDeleted = 0;
    CREATE INDEX IX_FixedAssets_DepartmentId ON FixedAssets(DepartmentId) WHERE IsDeleted = 0;
END
GO

-- 4. AssetHandovers (Ban giao tai san)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssetHandovers')
BEGIN
    CREATE TABLE AssetHandovers (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        FixedAssetId UNIQUEIDENTIFIER NOT NULL,
        HandoverType INT NOT NULL DEFAULT 1, -- 1=Receive, 2=Transfer, 3=Borrow, 4=Return
        FromDepartmentId UNIQUEIDENTIFIER NULL,
        ToDepartmentId UNIQUEIDENTIFIER NULL,
        HandoverDate DATETIME2 NOT NULL,
        HandoverById NVARCHAR(450) NULL,
        ReceivedById NVARCHAR(450) NULL,
        Notes NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 1, -- 1=Pending, 2=Confirmed
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AssetHandovers_FixedAssets FOREIGN KEY (FixedAssetId) REFERENCES FixedAssets(Id)
    );
    CREATE INDEX IX_AssetHandovers_FixedAssetId ON AssetHandovers(FixedAssetId) WHERE IsDeleted = 0;
    CREATE INDEX IX_AssetHandovers_Status ON AssetHandovers(Status) WHERE IsDeleted = 0;
END
GO

-- 5. AssetDisposals (Thanh ly tai san)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssetDisposals')
BEGIN
    CREATE TABLE AssetDisposals (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        FixedAssetId UNIQUEIDENTIFIER NOT NULL,
        DisposalType INT NOT NULL DEFAULT 1, -- 1=Scrap, 2=Auction, 3=Liquidation
        ProposalDate DATETIME2 NOT NULL,
        ApprovalDate DATETIME2 NULL,
        DisposalDate DATETIME2 NULL,
        ApprovedById NVARCHAR(450) NULL,
        DisposalValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        ResidualValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        Reason NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 1, -- 1=Proposed, 2=Approved, 3=Completed, 4=Rejected
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AssetDisposals_FixedAssets FOREIGN KEY (FixedAssetId) REFERENCES FixedAssets(Id)
    );
    CREATE INDEX IX_AssetDisposals_FixedAssetId ON AssetDisposals(FixedAssetId) WHERE IsDeleted = 0;
    CREATE INDEX IX_AssetDisposals_Status ON AssetDisposals(Status) WHERE IsDeleted = 0;
END
GO

-- 6. AssetDepreciations (Khau hao tai san)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AssetDepreciations')
BEGIN
    CREATE TABLE AssetDepreciations (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        FixedAssetId UNIQUEIDENTIFIER NOT NULL,
        Month INT NOT NULL,
        Year INT NOT NULL,
        OpeningValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        DepreciationAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        ClosingValue DECIMAL(18,2) NOT NULL DEFAULT 0,
        CalculatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AssetDepreciations_FixedAssets FOREIGN KEY (FixedAssetId) REFERENCES FixedAssets(Id)
    );
    CREATE INDEX IX_AssetDepreciations_FixedAssetId ON AssetDepreciations(FixedAssetId) WHERE IsDeleted = 0;
    CREATE UNIQUE INDEX IX_AssetDepreciations_Unique ON AssetDepreciations(FixedAssetId, Month, Year) WHERE IsDeleted = 0;
END
GO

PRINT 'Asset Management tables created successfully.';
GO
