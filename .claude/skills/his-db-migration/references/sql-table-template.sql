-- Template for creating new HIS tables
-- Replace <FEATURE> and <TABLE> placeholders.
-- Pattern: idempotent (IF NOT EXISTS), audit columns, FK to core tables.

-- =============================================
-- 1. CREATE TABLE: <TABLE>
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '<TABLE>')
BEGIN
    CREATE TABLE <TABLE> (
        Id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

        -- Business columns
        Code            NVARCHAR(50)     NOT NULL,
        Name            NVARCHAR(200)    NOT NULL,
        Description     NVARCHAR(MAX)    NULL,
        Status          INT              NOT NULL DEFAULT 1, -- 1-Active, 2-Inactive

        -- FK to core entities (uncomment as needed)
        PatientId       UNIQUEIDENTIFIER NULL,
        MedicalRecordId UNIQUEIDENTIFIER NULL,
        -- DepartmentId UNIQUEIDENTIFIER NULL,
        -- RoomId       UNIQUEIDENTIFIER NULL,

        -- Audit columns (Guid version — DEFAULT for new business tables)
        CreatedAt       DATETIME2(7)     NOT NULL DEFAULT GETDATE(),
        CreatedBy       UNIQUEIDENTIFIER NULL,
        UpdatedAt       DATETIME2(7)     NULL,
        UpdatedBy       UNIQUEIDENTIFIER NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0,

        -- For LEGACY/log tables, replace audit columns with:
        -- CreatedBy NVARCHAR(200) NULL,
        -- UpdatedBy NVARCHAR(200) NULL,
        -- (and DO NOT add to ValueConverter list)

        -- Foreign keys
        CONSTRAINT FK_<TABLE>_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_<TABLE>_MedicalRecords FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id)
    );

    -- Indexes (add for FK + frequently filtered columns)
    CREATE INDEX IX_<TABLE>_PatientId ON <TABLE>(PatientId) WHERE IsDeleted = 0;
    CREATE INDEX IX_<TABLE>_Status ON <TABLE>(Status) WHERE IsDeleted = 0;

    PRINT 'Created <TABLE>';
END
ELSE
BEGIN
    PRINT '<TABLE> already exists, skipping';
END
GO

-- =============================================
-- 2. ALTER: add missing column (idempotent)
-- =============================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
               WHERE TABLE_NAME = '<TABLE>' AND COLUMN_NAME = '<NEW_COLUMN>')
BEGIN
    ALTER TABLE <TABLE> ADD <NEW_COLUMN> NVARCHAR(200) NULL;
    PRINT 'Added <TABLE>.<NEW_COLUMN>';
END
GO

-- =============================================
-- 3. SEED master data (idempotent via MERGE or IF NOT EXISTS)
-- =============================================
IF NOT EXISTS (SELECT 1 FROM <TABLE> WHERE Code = N'SAMPLE_001')
BEGIN
    INSERT INTO <TABLE> (Id, Code, Name, Status, CreatedAt)
    VALUES (NEWID(), N'SAMPLE_001', N'Mẫu dữ liệu', 1, GETDATE());
    PRINT 'Seeded SAMPLE_001';
END
GO

-- =============================================
-- 4. DROP / cleanup (only when explicitly requested)
-- =============================================
-- IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '<TABLE>')
-- BEGIN
--     DROP TABLE <TABLE>;
--     PRINT 'Dropped <TABLE>';
-- END
-- GO
