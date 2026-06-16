-- 118_billing_guarantor.sql
-- Module Bao lanh vien phi (#41 #68 #69 #70 #71 #72):
--   tao bang SponsorOrgs (don vi bao lanh) + BillingGuarantors (gan bao lanh cho luot/BN)
-- Idempotent: kiem tra OBJECT_ID truoc khi CREATE.
-- Audit cols: NVARCHAR(450) NULL (tranh InvalidCastException Guid<->String ValueConverter).
-- KHONG co FK sang Patients / MedicalRecords / Admissions (chi luu Guid de tranh cascade).

-- ─── SponsorOrgs ─────────────────────────────────────────────────────────────

IF OBJECT_ID(N'dbo.SponsorOrgs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SponsorOrgs (
        Id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        Code          NVARCHAR(50)     NOT NULL,
        Name          NVARCHAR(500)    NOT NULL,
        TaxCode       NVARCHAR(20)     NULL,
        Address       NVARCHAR(500)    NULL,
        ContactPerson NVARCHAR(200)    NULL,
        Phone         NVARCHAR(20)     NULL,
        IsActive      BIT              NOT NULL DEFAULT 1,
        -- Audit
        CreatedAt     DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy     NVARCHAR(450)    NULL,
        UpdatedAt     DATETIME2        NULL,
        UpdatedBy     NVARCHAR(450)    NULL,
        IsDeleted     BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_SponsorOrgs PRIMARY KEY (Id)
    );

    CREATE UNIQUE INDEX UX_SponsorOrgs_Code
        ON dbo.SponsorOrgs (Code)
        WHERE IsDeleted = 0;

    CREATE INDEX IX_SponsorOrgs_Name
        ON dbo.SponsorOrgs (Name);
END

-- ─── BillingGuarantors ───────────────────────────────────────────────────────

IF OBJECT_ID(N'dbo.BillingGuarantors', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BillingGuarantors (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        SponsorOrgId    UNIQUEIDENTIFIER NOT NULL,   -- ref SponsorOrgs.Id (khong FK)
        PatientId       UNIQUEIDENTIFIER NULL,        -- ref Patients.Id    (khong FK)
        MedicalRecordId UNIQUEIDENTIFIER NULL,        -- ref MedicalRecords / Admissions (khong FK)
        GuaranteeNo     NVARCHAR(100)    NULL,        -- so cong van bao lanh
        GuaranteeRate   DECIMAL(5,2)     NOT NULL DEFAULT 0,   -- % 0-100
        GuaranteeAmount DECIMAL(18,2)    NULL,        -- han muc tien (NULL = khong gioi han)
        FromDate        DATETIME2        NULL,
        ToDate          DATETIME2        NULL,
        Status          INT              NOT NULL DEFAULT 0,   -- 0=Hieu luc, 1=Het han, 2=Huy
        Notes           NVARCHAR(MAX)    NULL,
        -- Audit
        CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(450)    NULL,
        UpdatedAt       DATETIME2        NULL,
        UpdatedBy       NVARCHAR(450)    NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_BillingGuarantors PRIMARY KEY (Id)
    );

    CREATE INDEX IX_BillingGuarantors_SponsorOrgId
        ON dbo.BillingGuarantors (SponsorOrgId);

    CREATE INDEX IX_BillingGuarantors_PatientId
        ON dbo.BillingGuarantors (PatientId)
        WHERE PatientId IS NOT NULL;

    CREATE INDEX IX_BillingGuarantors_MedicalRecordId
        ON dbo.BillingGuarantors (MedicalRecordId)
        WHERE MedicalRecordId IS NOT NULL;

    CREATE INDEX IX_BillingGuarantors_Status
        ON dbo.BillingGuarantors (Status);
END
