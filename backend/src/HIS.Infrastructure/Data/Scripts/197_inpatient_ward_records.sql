-- QA sweep 2026-09-15 (inpatient): real persistence for two FE screens that were stubs, plus the
-- Discharges uniqueness fix. Idempotent.
--   * Nursing care sheets (NursingSection) returned the input with a new Guid and saved nothing.
--   * Deposit requests (Inpatient.tsx) were never stored; the list was always empty.
--   * cancel-discharge soft-deletes the row, so UNIQUE(AdmissionId) blocked discharging again (409 forever).
-- CreatedBy/UpdatedBy are NVARCHAR (BaseEntity string) — no Guid<->String ValueConverter needed.
SET QUOTED_IDENTIFIER ON; -- filtered indexes require it (sqlcmd defaults OFF)
GO

-- 1) Per-shift inpatient nursing care sheets (entity HIS.Core.Entities.InpatientNursingCareSheet)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InpatientNursingCareSheets')
BEGIN
    CREATE TABLE [dbo].[InpatientNursingCareSheets] (
        [Id]                   UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [AdmissionId]          UNIQUEIDENTIFIER NOT NULL,
        [MedicalRecordId]      UNIQUEIDENTIFIER NOT NULL,
        [CareDate]             DATETIME2        NOT NULL,
        [Shift]                INT              NOT NULL,
        [NurseId]              UNIQUEIDENTIFIER NOT NULL,
        [PatientCondition]     NVARCHAR(2000)   NULL,
        [Consciousness]        NVARCHAR(500)    NULL,
        [HygieneActivities]    NVARCHAR(2000)   NULL,
        [MedicationActivities] NVARCHAR(2000)   NULL,
        [NutritionActivities]  NVARCHAR(2000)   NULL,
        [MovementActivities]   NVARCHAR(2000)   NULL,
        [SpecialMonitoring]    NVARCHAR(2000)   NULL,
        [IssuesAndActions]     NVARCHAR(MAX)    NULL,
        [Notes]                NVARCHAR(MAX)    NULL,
        [CareLevel]            INT              NULL,
        [CreatedAt]            DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy]            NVARCHAR(450)    NULL,
        [UpdatedAt]            DATETIME2        NULL,
        [UpdatedBy]            NVARCHAR(450)    NULL,
        [IsDeleted]            BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [FK_InpatientNursingCareSheets_Admissions] FOREIGN KEY ([AdmissionId]) REFERENCES [dbo].[Admissions]([Id]),
        CONSTRAINT [CK_InpatientNursingCareSheets_Shift] CHECK ([Shift] BETWEEN 1 AND 3)
    );
    CREATE INDEX [IX_InpatientNursingCareSheets_Admission_CareDate]
        ON [dbo].[InpatientNursingCareSheets]([AdmissionId], [CareDate]) WHERE [IsDeleted] = 0;
END
GO

-- 2) Ward -> cashier deposit requests (entity HIS.Core.Entities.InpatientDepositRequest)
--    Deliberately separate from dbo.Deposits (collected money read by billing reports).
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InpatientDepositRequests')
BEGIN
    CREATE TABLE [dbo].[InpatientDepositRequests] (
        [Id]              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [AdmissionId]     UNIQUEIDENTIFIER NOT NULL,
        [MedicalRecordId] UNIQUEIDENTIFIER NOT NULL,
        [PatientId]       UNIQUEIDENTIFIER NOT NULL,
        [DepartmentId]    UNIQUEIDENTIFIER NOT NULL,
        [RequestedAmount] DECIMAL(18,2)    NOT NULL,
        [Reason]          NVARCHAR(1000)   NULL,
        [RequestedById]   UNIQUEIDENTIFIER NOT NULL,
        [RequestDate]     DATETIME2        NOT NULL,
        [Status]          INT              NOT NULL DEFAULT 0,   -- 0 pending, 2 cancelled (1 collected is derived from Deposits)
        [CreatedAt]       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy]       NVARCHAR(450)    NULL,
        [UpdatedAt]       DATETIME2        NULL,
        [UpdatedBy]       NVARCHAR(450)    NULL,
        [IsDeleted]       BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [FK_InpatientDepositRequests_Admissions] FOREIGN KEY ([AdmissionId]) REFERENCES [dbo].[Admissions]([Id]),
        CONSTRAINT [CK_InpatientDepositRequests_Amount] CHECK ([RequestedAmount] > 0)
    );
    CREATE INDEX [IX_InpatientDepositRequests_Department_RequestDate]
        ON [dbo].[InpatientDepositRequests]([DepartmentId], [RequestDate]) WHERE [IsDeleted] = 0;
    CREATE INDEX [IX_InpatientDepositRequests_MedicalRecord]
        ON [dbo].[InpatientDepositRequests]([MedicalRecordId]) WHERE [IsDeleted] = 0;
END
GO

-- 3) (wave-1 #12) Discharges: UNIQUE(AdmissionId) conflicts with soft-delete on cancel-discharge.
--    Code already reuses the soft-deleted row; this makes the constraint match soft-delete semantics.
DECLARE @uq sysname = (
    SELECT kc.name FROM sys.key_constraints kc
    JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE kc.parent_object_id = OBJECT_ID('dbo.Discharges') AND kc.type = 'UQ' AND c.name = 'AdmissionId');
IF @uq IS NOT NULL EXEC('ALTER TABLE dbo.Discharges DROP CONSTRAINT [' + @uq + ']');
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Discharges_AdmissionId_Active' AND object_id = OBJECT_ID('dbo.Discharges'))
    CREATE UNIQUE INDEX [UX_Discharges_AdmissionId_Active] ON [dbo].[Discharges]([AdmissionId]) WHERE [IsDeleted] = 0;
GO
