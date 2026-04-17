-- ============================================================================
-- Blood Bank tables that have no EF entity (raw SQL access via BloodBankCompleteService).
-- Created from column lists in the service's INSERT / SELECT statements.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BloodProductTypes')
BEGIN
    CREATE TABLE [dbo].[BloodProductTypes] (
        Id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BloodProductTypes PRIMARY KEY,
        Code        NVARCHAR(32) NOT NULL,
        Name        NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive    BIT NOT NULL CONSTRAINT DF_BloodProductTypes_IsActive DEFAULT 1,
        CreatedAt   DATETIME2 NOT NULL CONSTRAINT DF_BloodProductTypes_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy   NVARCHAR(MAX) NULL,
        UpdatedAt   DATETIME2 NULL,
        UpdatedBy   NVARCHAR(MAX) NULL,
        IsDeleted   BIT NOT NULL CONSTRAINT DF_BloodProductTypes_IsDeleted DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BloodSuppliers')
BEGIN
    CREATE TABLE [dbo].[BloodSuppliers] (
        Id          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BloodSuppliers PRIMARY KEY,
        Code        NVARCHAR(64) NULL,
        Name        NVARCHAR(256) NOT NULL,
        Address     NVARCHAR(500) NULL,
        Phone       NVARCHAR(64) NULL,
        Email       NVARCHAR(256) NULL,
        ContactName NVARCHAR(200) NULL,
        IsActive    BIT NOT NULL CONSTRAINT DF_BloodSuppliers_IsActive DEFAULT 1,
        CreatedAt   DATETIME2 NOT NULL CONSTRAINT DF_BloodSuppliers_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy   NVARCHAR(MAX) NULL,
        UpdatedAt   DATETIME2 NULL,
        UpdatedBy   NVARCHAR(MAX) NULL,
        IsDeleted   BIT NOT NULL CONSTRAINT DF_BloodSuppliers_IsDeleted DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BloodBags')
BEGIN
    CREATE TABLE [dbo].[BloodBags] (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BloodBags PRIMARY KEY,
        BagCode         NVARCHAR(64) NOT NULL,
        Barcode         NVARCHAR(128) NULL,
        BloodType       NVARCHAR(8) NOT NULL,
        RhFactor        NVARCHAR(8) NOT NULL,
        ProductTypeId   UNIQUEIDENTIFIER NOT NULL,
        Volume          DECIMAL(18,2) NOT NULL CONSTRAINT DF_BloodBags_Volume DEFAULT 0,
        Unit            NVARCHAR(16) NOT NULL CONSTRAINT DF_BloodBags_Unit DEFAULT N'mL',
        CollectionDate  DATETIME2 NOT NULL,
        ExpiryDate      DATETIME2 NOT NULL,
        DonorCode       NVARCHAR(64) NULL,
        DonorName       NVARCHAR(256) NULL,
        SupplierId      UNIQUEIDENTIFIER NULL,
        Status          NVARCHAR(32) NOT NULL CONSTRAINT DF_BloodBags_Status DEFAULT N'Available',
        StorageLocation NVARCHAR(256) NULL,
        Temperature     DECIMAL(5,2) NULL,
        TestResults     NVARCHAR(MAX) NULL,
        IsTestPassed    BIT NOT NULL CONSTRAINT DF_BloodBags_IsTestPassed DEFAULT 1,
        Note            NVARCHAR(MAX) NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_BloodBags_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(MAX) NULL,
        UpdatedAt       DATETIME2 NULL,
        UpdatedBy       NVARCHAR(MAX) NULL,
        IsDeleted       BIT NOT NULL CONSTRAINT DF_BloodBags_IsDeleted DEFAULT 0
    );
    CREATE UNIQUE INDEX IX_BloodBags_BagCode ON [dbo].[BloodBags](BagCode);
    CREATE INDEX IX_BloodBags_Status ON [dbo].[BloodBags](Status);
    CREATE INDEX IX_BloodBags_ProductTypeId ON [dbo].[BloodBags](ProductTypeId);
    CREATE INDEX IX_BloodBags_SupplierId ON [dbo].[BloodBags](SupplierId);
    CREATE INDEX IX_BloodBags_ExpiryDate ON [dbo].[BloodBags](ExpiryDate);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BloodImportReceipts')
BEGIN
    CREATE TABLE [dbo].[BloodImportReceipts] (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BloodImportReceipts PRIMARY KEY,
        ReceiptCode     NVARCHAR(64) NULL,
        ReceiptDate     DATETIME2 NOT NULL,
        SupplierId      UNIQUEIDENTIFIER NULL,
        DeliveryPerson  NVARCHAR(256) NULL,
        Note            NVARCHAR(MAX) NULL,
        TotalBags       INT NOT NULL CONSTRAINT DF_BloodImportReceipts_TotalBags DEFAULT 0,
        TotalAmount     DECIMAL(18,2) NOT NULL CONSTRAINT DF_BloodImportReceipts_TotalAmount DEFAULT 0,
        Status          NVARCHAR(32) NOT NULL CONSTRAINT DF_BloodImportReceipts_Status DEFAULT N'Draft',
        ApprovedByUserId UNIQUEIDENTIFIER NULL,
        ApprovedAt      DATETIME2 NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_BloodImportReceipts_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(MAX) NULL,
        UpdatedAt       DATETIME2 NULL,
        UpdatedBy       NVARCHAR(MAX) NULL,
        IsDeleted       BIT NOT NULL CONSTRAINT DF_BloodImportReceipts_IsDeleted DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BloodImportItems')
BEGIN
    CREATE TABLE [dbo].[BloodImportItems] (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BloodImportItems PRIMARY KEY,
        ReceiptId       UNIQUEIDENTIFIER NOT NULL,
        BagId           UNIQUEIDENTIFIER NULL,
        BagCode         NVARCHAR(64) NULL,
        Barcode         NVARCHAR(128) NULL,
        BloodType       NVARCHAR(8) NULL,
        RhFactor        NVARCHAR(8) NULL,
        ProductTypeId   UNIQUEIDENTIFIER NULL,
        Volume          DECIMAL(18,2) NOT NULL CONSTRAINT DF_BloodImportItems_Volume DEFAULT 0,
        Unit            NVARCHAR(16) NOT NULL CONSTRAINT DF_BloodImportItems_Unit DEFAULT N'mL',
        CollectionDate  DATETIME2 NULL,
        ExpiryDate      DATETIME2 NULL,
        DonorCode       NVARCHAR(64) NULL,
        Price           DECIMAL(18,2) NOT NULL CONSTRAINT DF_BloodImportItems_Price DEFAULT 0,
        Amount          DECIMAL(18,2) NOT NULL CONSTRAINT DF_BloodImportItems_Amount DEFAULT 0,
        TestResults     NVARCHAR(MAX) NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_BloodImportItems_CreatedAt DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_BloodImportItems_ReceiptId ON [dbo].[BloodImportItems](ReceiptId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BloodIssueRequests')
BEGIN
    CREATE TABLE [dbo].[BloodIssueRequests] (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BloodIssueRequests PRIMARY KEY,
        RequestCode     NVARCHAR(64) NULL,
        RequestDate     DATETIME2 NOT NULL,
        DepartmentId    UNIQUEIDENTIFIER NULL,
        PatientId       UNIQUEIDENTIFIER NULL,
        BloodType       NVARCHAR(8) NULL,
        RhFactor        NVARCHAR(8) NULL,
        Quantity        INT NOT NULL CONSTRAINT DF_BloodIssueRequests_Quantity DEFAULT 0,
        Reason          NVARCHAR(500) NULL,
        Status          NVARCHAR(32) NOT NULL CONSTRAINT DF_BloodIssueRequests_Status DEFAULT N'Pending',
        ApprovedByUserId UNIQUEIDENTIFIER NULL,
        ApprovedAt      DATETIME2 NULL,
        Note            NVARCHAR(MAX) NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_BloodIssueRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(MAX) NULL,
        UpdatedAt       DATETIME2 NULL,
        UpdatedBy       NVARCHAR(MAX) NULL,
        IsDeleted       BIT NOT NULL CONSTRAINT DF_BloodIssueRequests_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_BloodIssueRequests_Status ON [dbo].[BloodIssueRequests](Status);
    CREATE INDEX IX_BloodIssueRequests_PatientId ON [dbo].[BloodIssueRequests](PatientId);
END
GO

-- PrescriptionTemplateItems - child collection of PrescriptionTemplates.
-- Column names must match the entity (PrescriptionTemplateId, Days, UsageInstructions).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionTemplateItems')
BEGIN
    CREATE TABLE [dbo].[PrescriptionTemplateItems] (
        Id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PrescriptionTemplateItems PRIMARY KEY,
        PrescriptionTemplateId  UNIQUEIDENTIFIER NOT NULL,
        MedicineId              UNIQUEIDENTIFIER NOT NULL,
        Quantity                DECIMAL(18,2) NOT NULL CONSTRAINT DF_PrescriptionTemplateItems_Quantity DEFAULT 0,
        Days                    INT NOT NULL CONSTRAINT DF_PrescriptionTemplateItems_Days DEFAULT 0,
        Dosage                  NVARCHAR(200) NULL,
        Frequency               NVARCHAR(200) NULL,
        Route                   NVARCHAR(64) NULL,
        UsageInstructions       NVARCHAR(MAX) NULL,
        SortOrder               INT NOT NULL CONSTRAINT DF_PrescriptionTemplateItems_SortOrder DEFAULT 0,
        CreatedAt               DATETIME2 NOT NULL CONSTRAINT DF_PrescriptionTemplateItems_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy               NVARCHAR(MAX) NULL,
        UpdatedAt               DATETIME2 NULL,
        UpdatedBy               NVARCHAR(MAX) NULL,
        IsDeleted               BIT NOT NULL CONSTRAINT DF_PrescriptionTemplateItems_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_PrescriptionTemplateItems_PrescriptionTemplateId ON [dbo].[PrescriptionTemplateItems](PrescriptionTemplateId);
    CREATE INDEX IX_PrescriptionTemplateItems_MedicineId ON [dbo].[PrescriptionTemplateItems](MedicineId);
END
GO

-- InsuranceClaims missing columns (pre-existing table variant)
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InsuranceClaims')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsuranceType')
BEGIN
    ALTER TABLE [dbo].[InsuranceClaims] ADD InsuranceType NVARCHAR(32) NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InsuranceClaims')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsuranceStartDate')
BEGIN
    ALTER TABLE [dbo].[InsuranceClaims] ADD InsuranceStartDate DATETIME2 NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InsuranceClaims')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsuranceEndDate')
BEGIN
    ALTER TABLE [dbo].[InsuranceClaims] ADD InsuranceEndDate DATETIME2 NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InsuranceClaims')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'MaLK')
BEGIN
    ALTER TABLE [dbo].[InsuranceClaims] ADD MaLK NVARCHAR(64) NULL;
END
GO
