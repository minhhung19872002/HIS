-- ============================================================================
-- Additional missing tables and columns discovered after the first prod deploy.
-- All statements are idempotent (IF NOT EXISTS / IF NOT EXISTS ... columns).
-- ============================================================================

-- PrescriptionTemplateItems column shim.
-- ALTER + UPDATE must be in separate batches; SQL Server parses the whole batch before
-- executing, so referencing a column freshly added in the same batch fails compile.
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionTemplateItems')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'PrescriptionTemplateId')
    ALTER TABLE [dbo].[PrescriptionTemplateItems] ADD PrescriptionTemplateId UNIQUEIDENTIFIER NULL;
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionTemplateItems')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'Days')
    ALTER TABLE [dbo].[PrescriptionTemplateItems] ADD Days INT NOT NULL CONSTRAINT DF_PTI_Days DEFAULT 0;
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionTemplateItems')
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'UsageInstructions')
    ALTER TABLE [dbo].[PrescriptionTemplateItems] ADD UsageInstructions NVARCHAR(MAX) NULL;
GO

-- Backfill from legacy column names (TemplateId -> PrescriptionTemplateId, etc.) via dynamic SQL
-- so missing legacy columns do not break the parse.
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionTemplateItems')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'TemplateId')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'PrescriptionTemplateId')
    EXEC sp_executesql N'UPDATE [dbo].[PrescriptionTemplateItems] SET PrescriptionTemplateId = TemplateId WHERE PrescriptionTemplateId IS NULL AND TemplateId IS NOT NULL';
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionTemplateItems')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'Duration')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'Days')
    EXEC sp_executesql N'UPDATE [dbo].[PrescriptionTemplateItems] SET Days = ISNULL(Duration, 0) WHERE Days = 0 AND Duration IS NOT NULL';
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionTemplateItems')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'UsageInstruction')
   AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PrescriptionTemplateItems') AND name = 'UsageInstructions')
    EXEC sp_executesql N'UPDATE [dbo].[PrescriptionTemplateItems] SET UsageInstructions = UsageInstruction WHERE UsageInstructions IS NULL AND UsageInstruction IS NOT NULL';
GO

-- BhxhAuditSession
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BhxhAuditSessions')
BEGIN
    CREATE TABLE [dbo].[BhxhAuditSessions] (
        Id              UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BhxhAuditSessions PRIMARY KEY,
        SessionCode     NVARCHAR(64) NOT NULL,
        PeriodMonth     INT NOT NULL CONSTRAINT DF_BhxhAuditSessions_PeriodMonth DEFAULT 0,
        PeriodYear      INT NOT NULL CONSTRAINT DF_BhxhAuditSessions_PeriodYear DEFAULT 0,
        TotalRecords    INT NOT NULL CONSTRAINT DF_BhxhAuditSessions_TotalRecords DEFAULT 0,
        TotalAmount     DECIMAL(18,2) NOT NULL CONSTRAINT DF_BhxhAuditSessions_TotalAmount DEFAULT 0,
        ErrorCount      INT NOT NULL CONSTRAINT DF_BhxhAuditSessions_ErrorCount DEFAULT 0,
        ErrorAmount     DECIMAL(18,2) NOT NULL CONSTRAINT DF_BhxhAuditSessions_ErrorAmount DEFAULT 0,
        Status          INT NOT NULL CONSTRAINT DF_BhxhAuditSessions_Status DEFAULT 0,
        AuditorId       UNIQUEIDENTIFIER NULL,
        Notes           NVARCHAR(MAX) NULL,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_BhxhAuditSessions_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(MAX) NULL,
        UpdatedAt       DATETIME2 NULL,
        UpdatedBy       NVARCHAR(MAX) NULL,
        IsDeleted       BIT NOT NULL CONSTRAINT DF_BhxhAuditSessions_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_BhxhAuditSessions_AuditorId ON [dbo].[BhxhAuditSessions](AuditorId);
    CREATE INDEX IX_BhxhAuditSessions_Status ON [dbo].[BhxhAuditSessions](Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BhxhAuditErrors')
BEGIN
    CREATE TABLE [dbo].[BhxhAuditErrors] (
        Id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_BhxhAuditErrors PRIMARY KEY,
        AuditSessionId      UNIQUEIDENTIFIER NOT NULL,
        RecordId            UNIQUEIDENTIFIER NULL,
        PatientName         NVARCHAR(256) NULL,
        InsuranceNumber     NVARCHAR(64) NULL,
        ErrorType           NVARCHAR(64) NOT NULL,
        ErrorDescription    NVARCHAR(MAX) NULL,
        OriginalAmount      DECIMAL(18,2) NOT NULL CONSTRAINT DF_BhxhAuditErrors_OriginalAmount DEFAULT 0,
        AdjustedAmount      DECIMAL(18,2) NOT NULL CONSTRAINT DF_BhxhAuditErrors_AdjustedAmount DEFAULT 0,
        IsFixed             BIT NOT NULL CONSTRAINT DF_BhxhAuditErrors_IsFixed DEFAULT 0,
        FixedBy             NVARCHAR(256) NULL,
        FixedDate           DATETIME2 NULL,
        Notes               NVARCHAR(MAX) NULL,
        CreatedAt           DATETIME2 NOT NULL CONSTRAINT DF_BhxhAuditErrors_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(MAX) NULL,
        UpdatedAt           DATETIME2 NULL,
        UpdatedBy           NVARCHAR(MAX) NULL,
        IsDeleted           BIT NOT NULL CONSTRAINT DF_BhxhAuditErrors_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_BhxhAuditErrors_AuditSessionId ON [dbo].[BhxhAuditErrors](AuditSessionId);
END
GO

-- DiseaseCase (Epidemiology)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DiseaseCases')
BEGIN
    CREATE TABLE [dbo].[DiseaseCases] (
        Id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_DiseaseCases PRIMARY KEY,
        PatientId           UNIQUEIDENTIFIER NULL,
        PatientName         NVARCHAR(256) NOT NULL CONSTRAINT DF_DiseaseCases_PatientName DEFAULT N'',
        PatientAge          INT NULL,
        PatientGender       INT NULL,
        DiseaseName         NVARCHAR(256) NOT NULL CONSTRAINT DF_DiseaseCases_DiseaseName DEFAULT N'',
        IcdCode             NVARCHAR(32) NULL,
        OnsetDate           DATETIME2 NULL,
        ReportDate          DATETIME2 NOT NULL CONSTRAINT DF_DiseaseCases_ReportDate DEFAULT SYSUTCDATETIME(),
        Classification      INT NOT NULL CONSTRAINT DF_DiseaseCases_Classification DEFAULT 0,
        Outcome             INT NOT NULL CONSTRAINT DF_DiseaseCases_Outcome DEFAULT 0,
        InvestigatorId      UNIQUEIDENTIFIER NULL,
        Location            NVARCHAR(500) NULL,
        Address             NVARCHAR(500) NULL,
        Notes               NVARCHAR(MAX) NULL,
        IsOutbreak          BIT NOT NULL CONSTRAINT DF_DiseaseCases_IsOutbreak DEFAULT 0,
        OutbreakId          NVARCHAR(64) NULL,
        LabTestResult       NVARCHAR(MAX) NULL,
        LabTestDate         DATETIME2 NULL,
        TreatmentSummary    NVARCHAR(MAX) NULL,
        Hospitalized        NVARCHAR(256) NULL,
        CreatedAt           DATETIME2 NOT NULL CONSTRAINT DF_DiseaseCases_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(MAX) NULL,
        UpdatedAt           DATETIME2 NULL,
        UpdatedBy           NVARCHAR(MAX) NULL,
        IsDeleted           BIT NOT NULL CONSTRAINT DF_DiseaseCases_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_DiseaseCases_PatientId ON [dbo].[DiseaseCases](PatientId);
    CREATE INDEX IX_DiseaseCases_ReportDate ON [dbo].[DiseaseCases](ReportDate);
    CREATE INDEX IX_DiseaseCases_IsOutbreak ON [dbo].[DiseaseCases](IsOutbreak);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ContactTraces')
BEGIN
    CREATE TABLE [dbo].[ContactTraces] (
        Id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ContactTraces PRIMARY KEY,
        DiseaseCaseId       UNIQUEIDENTIFIER NOT NULL,
        ContactName         NVARCHAR(256) NOT NULL CONSTRAINT DF_ContactTraces_ContactName DEFAULT N'',
        ContactPhone        NVARCHAR(64) NULL,
        Relationship        NVARCHAR(64) NULL,
        ExposureDate        DATETIME2 NULL,
        ExposureType        NVARCHAR(32) NULL,
        Status              INT NOT NULL CONSTRAINT DF_ContactTraces_Status DEFAULT 0,
        Notes               NVARCHAR(MAX) NULL,
        CreatedAt           DATETIME2 NOT NULL CONSTRAINT DF_ContactTraces_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(MAX) NULL,
        UpdatedAt           DATETIME2 NULL,
        UpdatedBy           NVARCHAR(MAX) NULL,
        IsDeleted           BIT NOT NULL CONSTRAINT DF_ContactTraces_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_ContactTraces_DiseaseCaseId ON [dbo].[ContactTraces](DiseaseCaseId);
END
GO

-- HealthCheckupCampaign (parent of HealthCheckupRecord)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'HealthCheckupCampaigns')
BEGIN
    CREATE TABLE [dbo].[HealthCheckupCampaigns] (
        Id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_HealthCheckupCampaigns PRIMARY KEY,
        CampaignCode        NVARCHAR(64) NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_CampaignCode DEFAULT N'',
        CampaignName        NVARCHAR(256) NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_CampaignName DEFAULT N'',
        OrganizationName    NVARCHAR(256) NULL,
        ContactPerson       NVARCHAR(256) NULL,
        ContactPhone        NVARCHAR(64) NULL,
        StartDate           DATETIME2 NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_StartDate DEFAULT SYSUTCDATETIME(),
        EndDate             DATETIME2 NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_EndDate DEFAULT SYSUTCDATETIME(),
        Status              INT NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_Status DEFAULT 0,
        TotalRegistered     INT NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_TotalRegistered DEFAULT 0,
        TotalCompleted      INT NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_TotalCompleted DEFAULT 0,
        Notes               NVARCHAR(MAX) NULL,
        PackageDescription  NVARCHAR(MAX) NULL,
        ContractAmount      DECIMAL(18,2) NULL,
        CreatedAt           DATETIME2 NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(MAX) NULL,
        UpdatedAt           DATETIME2 NULL,
        UpdatedBy           NVARCHAR(MAX) NULL,
        IsDeleted           BIT NOT NULL CONSTRAINT DF_HealthCheckupCampaigns_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_HealthCheckupCampaigns_Status ON [dbo].[HealthCheckupCampaigns](Status);
END
GO

-- HealthCheckupRecord
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'HealthCheckupRecords')
BEGIN
    CREATE TABLE [dbo].[HealthCheckupRecords] (
        Id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_HealthCheckupRecords PRIMARY KEY,
        CampaignId              UNIQUEIDENTIFIER NOT NULL,
        PatientId               UNIQUEIDENTIFIER NULL,
        EmployeeName            NVARCHAR(256) NULL,
        EmployeeCode            NVARCHAR(64) NULL,
        Department              NVARCHAR(256) NULL,
        CheckupDate             DATETIME2 NULL,
        ResultSummary           NVARCHAR(MAX) NULL,
        CertificateIssued       BIT NOT NULL CONSTRAINT DF_HealthCheckupRecords_CertificateIssued DEFAULT 0,
        CertificateNumber       NVARCHAR(64) NULL,
        Classification          NVARCHAR(16) NULL,
        DoctorId                UNIQUEIDENTIFIER NULL,
        Notes                   NVARCHAR(MAX) NULL,
        BloodPressure           NVARCHAR(32) NULL,
        Height                  FLOAT NULL,
        Weight                  FLOAT NULL,
        BMI                     FLOAT NULL,
        VisionLeft              NVARCHAR(16) NULL,
        VisionRight             NVARCHAR(16) NULL,
        HearingResult           NVARCHAR(64) NULL,
        LabResultSummary        NVARCHAR(MAX) NULL,
        ImagingResultSummary    NVARCHAR(MAX) NULL,
        CreatedAt               DATETIME2 NOT NULL CONSTRAINT DF_HealthCheckupRecords_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy               NVARCHAR(MAX) NULL,
        UpdatedAt               DATETIME2 NULL,
        UpdatedBy               NVARCHAR(MAX) NULL,
        IsDeleted               BIT NOT NULL CONSTRAINT DF_HealthCheckupRecords_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_HealthCheckupRecords_CampaignId ON [dbo].[HealthCheckupRecords](CampaignId);
    CREATE INDEX IX_HealthCheckupRecords_PatientId ON [dbo].[HealthCheckupRecords](PatientId);
END
GO

-- InsuranceClaims: add any columns the current model requires that are missing
-- on a legacy schema. Guard each ALTER with a sys.columns check.
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InsuranceClaims')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsuranceType')
        ALTER TABLE [dbo].[InsuranceClaims] ADD InsuranceType INT NOT NULL CONSTRAINT DF_InsuranceClaims_InsuranceType DEFAULT 1;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsuranceStartDate')
        ALTER TABLE [dbo].[InsuranceClaims] ADD InsuranceStartDate DATETIME2 NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsuranceEndDate')
        ALTER TABLE [dbo].[InsuranceClaims] ADD InsuranceEndDate DATETIME2 NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsuranceFacilityCode')
        ALTER TABLE [dbo].[InsuranceClaims] ADD InsuranceFacilityCode NVARCHAR(64) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'ServiceDate')
        ALTER TABLE [dbo].[InsuranceClaims] ADD ServiceDate DATETIME2 NOT NULL CONSTRAINT DF_InsuranceClaims_ServiceDate DEFAULT SYSUTCDATETIME();
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'DischargeDate')
        ALTER TABLE [dbo].[InsuranceClaims] ADD DischargeDate DATETIME2 NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'TreatmentType')
        ALTER TABLE [dbo].[InsuranceClaims] ADD TreatmentType INT NOT NULL CONSTRAINT DF_InsuranceClaims_TreatmentType DEFAULT 1;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'MainDiagnosisCode')
        ALTER TABLE [dbo].[InsuranceClaims] ADD MainDiagnosisCode NVARCHAR(32) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'MainDiagnosisName')
        ALTER TABLE [dbo].[InsuranceClaims] ADD MainDiagnosisName NVARCHAR(500) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'SubDiagnosisCodes')
        ALTER TABLE [dbo].[InsuranceClaims] ADD SubDiagnosisCodes NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'SubDiagnosisNames')
        ALTER TABLE [dbo].[InsuranceClaims] ADD SubDiagnosisNames NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsuranceAmount')
        ALTER TABLE [dbo].[InsuranceClaims] ADD InsuranceAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InsuranceClaims_InsuranceAmount DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'PatientAmount')
        ALTER TABLE [dbo].[InsuranceClaims] ADD PatientAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InsuranceClaims_PatientAmount DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'OutOfPocketAmount')
        ALTER TABLE [dbo].[InsuranceClaims] ADD OutOfPocketAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InsuranceClaims_OutOfPocketAmount DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'InsurancePaymentRate')
        ALTER TABLE [dbo].[InsuranceClaims] ADD InsurancePaymentRate DECIMAL(18,2) NOT NULL CONSTRAINT DF_InsuranceClaims_InsurancePaymentRate DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'DepartmentId')
        ALTER TABLE [dbo].[InsuranceClaims] ADD DepartmentId UNIQUEIDENTIFIER NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'DoctorId')
        ALTER TABLE [dbo].[InsuranceClaims] ADD DoctorId UNIQUEIDENTIFIER NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'ClaimStatus')
        ALTER TABLE [dbo].[InsuranceClaims] ADD ClaimStatus INT NOT NULL CONSTRAINT DF_InsuranceClaims_ClaimStatus DEFAULT 0;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'SubmittedAt')
        ALTER TABLE [dbo].[InsuranceClaims] ADD SubmittedAt DATETIME2 NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'SubmittedBy')
        ALTER TABLE [dbo].[InsuranceClaims] ADD SubmittedBy UNIQUEIDENTIFIER NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'ProcessedAt')
        ALTER TABLE [dbo].[InsuranceClaims] ADD ProcessedAt DATETIME2 NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'ProcessedBy')
        ALTER TABLE [dbo].[InsuranceClaims] ADD ProcessedBy UNIQUEIDENTIFIER NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'ProcessorName')
        ALTER TABLE [dbo].[InsuranceClaims] ADD ProcessorName NVARCHAR(256) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'ProcessorNote')
        ALTER TABLE [dbo].[InsuranceClaims] ADD ProcessorNote NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'AttachmentFiles')
        ALTER TABLE [dbo].[InsuranceClaims] ADD AttachmentFiles NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InsuranceClaims') AND name = 'Note')
        ALTER TABLE [dbo].[InsuranceClaims] ADD Note NVARCHAR(MAX) NULL;
END
GO
