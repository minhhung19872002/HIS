-- 106_bhyt_full_coverage_patient.sql
-- F3.4: Khai bao danh sach BN BHYT chi tra 100% thuoc dac tri
-- Idempotent (IF NOT EXISTS / COL_LENGTH IS NULL guards)

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'BhytFullCoveragePatients'
)
BEGIN
    CREATE TABLE BhytFullCoveragePatients (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        PatientId       UNIQUEIDENTIFIER NOT NULL,
        EffectiveFrom   DATE             NOT NULL,
        EffectiveTo     DATE             NOT NULL,
        -- Pham vi thuoc dac tri: NULL = tat ca, hoac danh sach MedicineCode cach nhau dau phay
        MedicineScopeJson NVARCHAR(MAX)  NULL,
        Note            NVARCHAR(500)    NULL,
        IsActive        BIT              NOT NULL DEFAULT 1,

        -- Audit cols
        CreatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(100)    NULL,
        UpdatedAt       DATETIME2        NULL,
        UpdatedBy       NVARCHAR(100)    NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0,

        CONSTRAINT FK_BhytFullCoverage_Patients FOREIGN KEY (PatientId)
            REFERENCES Patients (Id) ON DELETE NO ACTION
    );
END;

-- Index: tra cuu theo BN + ngay hieu luc
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('BhytFullCoveragePatients')
      AND name = 'IX_BhytFullCoverage_PatientId_Dates'
)
BEGIN
    CREATE INDEX IX_BhytFullCoverage_PatientId_Dates
        ON BhytFullCoveragePatients (PatientId, EffectiveFrom, EffectiveTo)
        WHERE IsDeleted = 0;
END;
