-- NangCap26 (TTYT Tinh Bien) muc LIS #29 (Quan ly ngoai kiem - EQA) + LIS #15 (Don vi gui mau).
-- Noi kiem (IQC) da co san (LabQCResults) — script nay chi them phan NGOAI kiem.
-- ADDITIVE — chi tao bang moi. Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- 1) Danh muc xet nghiem ngoai kiem
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabEqaTests')
BEGIN
    CREATE TABLE dbo.LabEqaTests (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Code NVARCHAR(50) NOT NULL,
        Name NVARCHAR(300) NOT NULL,
        ServiceId UNIQUEIDENTIFIER NULL,
        ProviderName NVARCHAR(300) NULL,
        Cycle NVARCHAR(50) NULL,
        Unit NVARCHAR(50) NULL,
        Notes NVARCHAR(1000) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_LabEqaTests_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LabEqaTests_CreatedAt DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_LabEqaTests_IsDeleted DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_LabEqaTests_Code ON dbo.LabEqaTests (Code) WHERE IsDeleted = 0;
END
GO

-- 2) Dot (ky) ngoai kiem
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabEqaBatches')
BEGIN
    CREATE TABLE dbo.LabEqaBatches (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        BatchCode NVARCHAR(100) NOT NULL,
        ProviderName NVARCHAR(300) NULL,
        Period NVARCHAR(50) NULL,
        ReceivedDate DATETIME2 NOT NULL,
        DueDate DATETIME2 NULL,
        HandoverBy NVARCHAR(200) NULL,
        ReceivedBy UNIQUEIDENTIFIER NULL,
        Status NVARCHAR(50) NOT NULL CONSTRAINT DF_LabEqaBatches_Status DEFAULT N'Received',
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LabEqaBatches_CreatedAt DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_LabEqaBatches_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_LabEqaBatches_Status ON dbo.LabEqaBatches (Status, ReceivedDate);
END
GO

-- 3) Ket qua chay mau ngoai kiem
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabEqaResults')
BEGIN
    CREATE TABLE dbo.LabEqaResults (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        BatchId UNIQUEIDENTIFIER NOT NULL,
        EqaTestId UNIQUEIDENTIFIER NOT NULL,
        SampleCode NVARCHAR(50) NULL,
        ResultValue DECIMAL(18,4) NULL,
        ResultText NVARCHAR(500) NULL,
        RunAt DATETIME2 NULL,
        RunBy UNIQUEIDENTIFIER NULL,
        TargetValue DECIMAL(18,4) NULL,
        ZScore DECIMAL(18,4) NULL,
        Evaluation NVARCHAR(50) NULL,
        CorrectiveAction NVARCHAR(1000) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LabEqaResults_CreatedAt DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_LabEqaResults_IsDeleted DEFAULT 0,
        CONSTRAINT FK_LabEqaResults_Batch FOREIGN KEY (BatchId) REFERENCES dbo.LabEqaBatches(Id),
        CONSTRAINT FK_LabEqaResults_Test FOREIGN KEY (EqaTestId) REFERENCES dbo.LabEqaTests(Id)
    );
    CREATE INDEX IX_LabEqaResults_Batch ON dbo.LabEqaResults (BatchId);
END
GO

-- 4) Don vi gui mau (LIS #15)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabSendingUnits')
BEGIN
    CREATE TABLE dbo.LabSendingUnits (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Code NVARCHAR(50) NOT NULL,
        Name NVARCHAR(300) NOT NULL,
        Address NVARCHAR(500) NULL,
        PhoneNumber NVARCHAR(50) NULL,
        ContactPerson NVARCHAR(200) NULL,
        Email NVARCHAR(200) NULL,
        FacilityCode NVARCHAR(50) NULL,
        Notes NVARCHAR(1000) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_LabSendingUnits_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_LabSendingUnits_CreatedAt DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_LabSendingUnits_IsDeleted DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_LabSendingUnits_Code ON dbo.LabSendingUnits (Code) WHERE IsDeleted = 0;
END
GO
