-- =============================================================
-- Migration 52: Surgery Room Forms — G-04 + G-05
-- Creates tables for:
--   1. SurgeryConsents        (cam doan PTTT)
--   2. AnesthesiaRecords      (phieu gay me hoi suc)
--   3. AnesthesiaMonitors     (theo doi trong gay me)
--   4. AnesthesiaDrugs        (thuoc gay me)
--   5. AnesthesiaFluids       (dich truyen gay me)
--   6. SurgeryRequests.ImageUrl / ImageUrls for surgical photo attachments (G-05)
-- All idempotent: IF NOT EXISTS / COL_LENGTH IS NULL guards.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. SurgeryConsents
-- Raw SQL is used by SurgeryPrescriptionServiceImpl (no EF entity).
-- ---------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'SurgeryConsents') AND type = N'U'
)
BEGIN
    CREATE TABLE SurgeryConsents (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        SurgeryId           UNIQUEIDENTIFIER NOT NULL,
        ConsentType         INT              NOT NULL,  -- 1-PT, 2-Gay me, 3-Truyen mau, 4-Thu thuat
        Diagnosis           NVARCHAR(500)    NULL,
        PlannedProcedure    NVARCHAR(1000)   NULL,
        Risks               NVARCHAR(2000)   NULL,
        Alternatives        NVARCHAR(1000)   NULL,
        DoctorExplanation   NVARCHAR(2000)   NULL,
        SignerName          NVARCHAR(200)    NULL,
        SignerRelationship  NVARCHAR(100)    NULL,
        SignedAt            DATETIME2        NULL,
        IsSigned            BIT              NOT NULL DEFAULT 0,
        DoctorId            UNIQUEIDENTIFIER NULL,
        CreatedAt           DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy           UNIQUEIDENTIFIER NULL,
        UpdatedAt           DATETIME2        NULL,
        UpdatedBy           UNIQUEIDENTIFIER NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0
    );
    PRINT 'SurgeryConsents table created.';

    CREATE NONCLUSTERED INDEX IX_SurgeryConsents_SurgeryId
        ON SurgeryConsents (SurgeryId)
        WHERE IsDeleted = 0;
    PRINT 'Index IX_SurgeryConsents_SurgeryId created.';
END

-- ---------------------------------------------------------------
-- 2. AnesthesiaRecords
-- EF entity AnesthesiaRecord exists in HISDbContext.
-- ---------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'AnesthesiaRecords') AND type = N'U'
)
BEGIN
    CREATE TABLE AnesthesiaRecords (
        Id                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        SurgeryId         UNIQUEIDENTIFIER NOT NULL,
        PatientId         UNIQUEIDENTIFIER NOT NULL,
        PatientName       NVARCHAR(200)    NOT NULL DEFAULT '',
        AsaClass          INT              NOT NULL DEFAULT 1,  -- ASA 1-5
        MallampatiScore   INT              NOT NULL DEFAULT 1,  -- 1-4
        Allergies         NVARCHAR(500)    NULL,
        NpoStatus         NVARCHAR(200)    NULL,
        AnesthesiaType    NVARCHAR(100)    NOT NULL DEFAULT '',
        AirwayPlan        NVARCHAR(500)    NULL,
        PreOpAssessment   NVARCHAR(2000)   NULL,
        RecoveryNotes     NVARCHAR(2000)   NULL,
        Status            INT              NOT NULL DEFAULT 0,  -- 0=Draft, 1=InProgress, 2=Completed
        CreatedAt         DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy         UNIQUEIDENTIFIER NULL,
        UpdatedAt         DATETIME2        NULL,
        UpdatedBy         UNIQUEIDENTIFIER NULL,
        IsDeleted         BIT              NOT NULL DEFAULT 0
    );
    PRINT 'AnesthesiaRecords table created.';

    CREATE NONCLUSTERED INDEX IX_AnesthesiaRecords_SurgeryId
        ON AnesthesiaRecords (SurgeryId)
        WHERE IsDeleted = 0;
END

-- ---------------------------------------------------------------
-- 3. AnesthesiaMonitors
-- ---------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'AnesthesiaMonitors') AND type = N'U'
)
BEGIN
    CREATE TABLE AnesthesiaMonitors (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        AnesthesiaRecordId  UNIQUEIDENTIFIER NOT NULL,
        MonitorTime         DATETIME2        NOT NULL,
        SystolicBP          INT              NULL,
        DiastolicBP         INT              NULL,
        HeartRate           INT              NULL,
        SpO2                INT              NULL,
        EtCO2               INT              NULL,
        Temperature         DECIMAL(5,1)     NULL,
        Notes               NVARCHAR(500)    NULL,
        CreatedAt           DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy           UNIQUEIDENTIFIER NULL,
        UpdatedAt           DATETIME2        NULL,
        UpdatedBy           UNIQUEIDENTIFIER NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0
    );
    PRINT 'AnesthesiaMonitors table created.';

    CREATE NONCLUSTERED INDEX IX_AnesthesiaMonitors_RecordId
        ON AnesthesiaMonitors (AnesthesiaRecordId)
        WHERE IsDeleted = 0;
END

-- ---------------------------------------------------------------
-- 4. AnesthesiaDrugs
-- ---------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'AnesthesiaDrugs') AND type = N'U'
)
BEGIN
    CREATE TABLE AnesthesiaDrugs (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        AnesthesiaRecordId  UNIQUEIDENTIFIER NOT NULL,
        GivenTime           DATETIME2        NOT NULL,
        DrugName            NVARCHAR(200)    NOT NULL,
        Dose                NVARCHAR(100)    NULL,
        Route               NVARCHAR(50)     NULL,  -- IV/IM/SC/Inhalation
        CreatedAt           DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy           UNIQUEIDENTIFIER NULL,
        UpdatedAt           DATETIME2        NULL,
        UpdatedBy           UNIQUEIDENTIFIER NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0
    );
    PRINT 'AnesthesiaDrugs table created.';
END

-- ---------------------------------------------------------------
-- 5. AnesthesiaFluids
-- ---------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.objects
    WHERE object_id = OBJECT_ID(N'AnesthesiaFluids') AND type = N'U'
)
BEGIN
    CREATE TABLE AnesthesiaFluids (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        AnesthesiaRecordId  UNIQUEIDENTIFIER NOT NULL,
        FluidType           NVARCHAR(200)    NOT NULL,
        Volume              INT              NULL,
        StartTime           DATETIME2        NULL,
        EndTime             DATETIME2        NULL,
        CreatedAt           DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy           UNIQUEIDENTIFIER NULL,
        UpdatedAt           DATETIME2        NULL,
        UpdatedBy           UNIQUEIDENTIFIER NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0
    );
    PRINT 'AnesthesiaFluids table created.';
END

-- ---------------------------------------------------------------
-- 6. G-05: SurgeryRequests — add ImageUrls column (JSON array of URL strings)
-- SurgeryReportModal will store surgical photo URLs here.
-- ---------------------------------------------------------------
IF COL_LENGTH('SurgeryRequests', 'ImageUrls') IS NULL
BEGIN
    ALTER TABLE SurgeryRequests
        ADD ImageUrls NVARCHAR(MAX) NULL;  -- JSON: ["url1", "url2", ...]
    PRINT 'SurgeryRequests.ImageUrls added.';
END
