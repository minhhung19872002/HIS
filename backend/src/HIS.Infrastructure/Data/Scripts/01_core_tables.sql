-- ============================================================================
-- Core tables that belong to InitialCreate migration but are missing in some
-- production databases (ghost __EFMigrationsHistory state).
-- All statements use IF NOT EXISTS / IF NOT NULL guards so this is safe to run
-- on every startup.
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Allergies')
BEGIN
    CREATE TABLE [dbo].[Allergies] (
        Id                 UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Allergies PRIMARY KEY,
        PatientId          UNIQUEIDENTIFIER NOT NULL,
        AllergyType        INT NOT NULL,
        AllergenName       NVARCHAR(MAX) NOT NULL,
        AllergenCode       NVARCHAR(MAX) NULL,
        Reaction           NVARCHAR(MAX) NULL,
        Severity           INT NOT NULL,
        OnsetDate          DATETIME2 NULL,
        Notes              NVARCHAR(MAX) NULL,
        IsActive           BIT NOT NULL CONSTRAINT DF_Allergies_IsActive DEFAULT 1,
        RecordedByUserId   UNIQUEIDENTIFIER NULL,
        RecordedById       UNIQUEIDENTIFIER NULL,
        CreatedAt          DATETIME2 NOT NULL CONSTRAINT DF_Allergies_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy          NVARCHAR(MAX) NULL,
        UpdatedAt          DATETIME2 NULL,
        UpdatedBy          NVARCHAR(MAX) NULL,
        IsDeleted          BIT NOT NULL CONSTRAINT DF_Allergies_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_Allergies_PatientId ON [dbo].[Allergies](PatientId);
    CREATE INDEX IX_Allergies_RecordedById ON [dbo].[Allergies](RecordedById);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Contraindications')
BEGIN
    CREATE TABLE [dbo].[Contraindications] (
        Id                      UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Contraindications PRIMARY KEY,
        PatientId               UNIQUEIDENTIFIER NOT NULL,
        ContraindicationType    INT NOT NULL,
        ItemName                NVARCHAR(MAX) NOT NULL,
        ItemCode                NVARCHAR(MAX) NULL,
        Reason                  NVARCHAR(MAX) NULL,
        StartDate               DATETIME2 NULL,
        EndDate                 DATETIME2 NULL,
        Notes                   NVARCHAR(MAX) NULL,
        IsActive                BIT NOT NULL CONSTRAINT DF_Contraindications_IsActive DEFAULT 1,
        RecordedByUserId        UNIQUEIDENTIFIER NULL,
        RecordedById            UNIQUEIDENTIFIER NULL,
        CreatedAt               DATETIME2 NOT NULL CONSTRAINT DF_Contraindications_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy               NVARCHAR(MAX) NULL,
        UpdatedAt               DATETIME2 NULL,
        UpdatedBy               NVARCHAR(MAX) NULL,
        IsDeleted               BIT NOT NULL CONSTRAINT DF_Contraindications_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_Contraindications_PatientId ON [dbo].[Contraindications](PatientId);
    CREATE INDEX IX_Contraindications_RecordedById ON [dbo].[Contraindications](RecordedById);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PrescriptionTemplates')
BEGIN
    CREATE TABLE [dbo].[PrescriptionTemplates] (
        Id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PrescriptionTemplates PRIMARY KEY,
        TemplateCode        NVARCHAR(MAX) NOT NULL,
        TemplateName        NVARCHAR(MAX) NOT NULL,
        PrescriptionType    INT NOT NULL,
        DepartmentId        UNIQUEIDENTIFIER NULL,
        DiagnosisCode       NVARCHAR(MAX) NULL,
        DiagnosisName       NVARCHAR(MAX) NULL,
        Description         NVARCHAR(MAX) NULL,
        IsPublic            BIT NOT NULL CONSTRAINT DF_PrescriptionTemplates_IsPublic DEFAULT 0,
        CreatedByUserId     UNIQUEIDENTIFIER NULL,
        IsActive            BIT NOT NULL CONSTRAINT DF_PrescriptionTemplates_IsActive DEFAULT 1,
        SortOrder           INT NOT NULL CONSTRAINT DF_PrescriptionTemplates_SortOrder DEFAULT 0,
        CreatedAt           DATETIME2 NOT NULL CONSTRAINT DF_PrescriptionTemplates_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(MAX) NULL,
        UpdatedAt           DATETIME2 NULL,
        UpdatedBy           NVARCHAR(MAX) NULL,
        IsDeleted           BIT NOT NULL CONSTRAINT DF_PrescriptionTemplates_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_PrescriptionTemplates_DepartmentId ON [dbo].[PrescriptionTemplates](DepartmentId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InsuranceClaims')
BEGIN
    CREATE TABLE [dbo].[InsuranceClaims] (
        Id                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_InsuranceClaims PRIMARY KEY,
        ClaimCode           NVARCHAR(MAX) NOT NULL,
        MedicalRecordId     UNIQUEIDENTIFIER NULL,
        PatientId           UNIQUEIDENTIFIER NULL,
        InsuranceNumber     NVARCHAR(MAX) NULL,
        ClaimType           INT NOT NULL CONSTRAINT DF_InsuranceClaims_ClaimType DEFAULT 1,
        ClaimDate           DATETIME2 NOT NULL CONSTRAINT DF_InsuranceClaims_ClaimDate DEFAULT SYSUTCDATETIME(),
        SubmissionDate      DATETIME2 NULL,
        ResponseDate        DATETIME2 NULL,
        TotalAmount         DECIMAL(18,2) NOT NULL CONSTRAINT DF_InsuranceClaims_TotalAmount DEFAULT 0,
        ApprovedAmount      DECIMAL(18,2) NOT NULL CONSTRAINT DF_InsuranceClaims_ApprovedAmount DEFAULT 0,
        RejectedAmount      DECIMAL(18,2) NOT NULL CONSTRAINT DF_InsuranceClaims_RejectedAmount DEFAULT 0,
        Status              INT NOT NULL CONSTRAINT DF_InsuranceClaims_Status DEFAULT 1,
        RejectionReason     NVARCHAR(MAX) NULL,
        Notes               NVARCHAR(MAX) NULL,
        XmlPayload          NVARCHAR(MAX) NULL,
        ResponseXml         NVARCHAR(MAX) NULL,
        SubmittedByUserId   UNIQUEIDENTIFIER NULL,
        CreatedAt           DATETIME2 NOT NULL CONSTRAINT DF_InsuranceClaims_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(MAX) NULL,
        UpdatedAt           DATETIME2 NULL,
        UpdatedBy           NVARCHAR(MAX) NULL,
        IsDeleted           BIT NOT NULL CONSTRAINT DF_InsuranceClaims_IsDeleted DEFAULT 0
    );
    CREATE INDEX IX_InsuranceClaims_MedicalRecordId ON [dbo].[InsuranceClaims](MedicalRecordId);
    CREATE INDEX IX_InsuranceClaims_PatientId ON [dbo].[InsuranceClaims](PatientId);
    CREATE INDEX IX_InsuranceClaims_Status ON [dbo].[InsuranceClaims](Status);
END
GO
