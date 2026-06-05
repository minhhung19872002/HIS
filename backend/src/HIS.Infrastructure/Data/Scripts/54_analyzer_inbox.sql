-- =============================================================
-- Migration 54: LabRawResults table + inbox columns
-- LabRawResult entity already exists in HISDbContext but had no
-- migration script. This creates the table idempotently and adds
-- Transferred status (=4) support via a RejectedReason column.
-- Idempotent: IF NOT EXISTS guard on table, COL_LENGTH IS NULL on columns.
-- =============================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabRawResults')
BEGIN
    CREATE TABLE LabRawResults (
        Id              uniqueidentifier NOT NULL PRIMARY KEY DEFAULT NEWID(),
        AnalyzerId      uniqueidentifier NOT NULL,
        SampleId        nvarchar(100) NULL,
        PatientId       nvarchar(100) NULL,
        TestCode        nvarchar(100) NULL,
        Result          nvarchar(500) NULL,
        Unit            nvarchar(50) NULL,
        Flag            nvarchar(50) NULL,
        ResultTime      datetime2 NULL,
        RawMessage      nvarchar(max) NULL,
        -- Status: 0=Pending, 1=Matched, 2=ManualMapped, 3=Ignored, 4=Transferred
        Status          int NOT NULL DEFAULT 0,
        MappedToLabRequestItemId uniqueidentifier NULL,
        MappedAt        datetime2 NULL,
        MappedBy        uniqueidentifier NULL,
        -- Audit columns
        CreatedAt       datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy       nvarchar(450) NULL,
        UpdatedAt       datetime2 NULL,
        UpdatedBy       nvarchar(450) NULL,
        IsDeleted       bit NOT NULL DEFAULT 0,
        -- FK to LabAnalyzers
        CONSTRAINT FK_LabRawResults_LabAnalyzers FOREIGN KEY (AnalyzerId)
            REFERENCES LabAnalyzers(Id)
    );
    CREATE INDEX IX_LabRawResults_AnalyzerId ON LabRawResults(AnalyzerId);
    CREATE INDEX IX_LabRawResults_Status ON LabRawResults(Status);
    CREATE INDEX IX_LabRawResults_CreatedAt ON LabRawResults(CreatedAt);
    PRINT 'Created LabRawResults table';
END
ELSE
BEGIN
    PRINT 'LabRawResults already exists — skipped create';
END

-- Add RejectedReason column for rejected inbox items
IF COL_LENGTH('LabRawResults', 'RejectedReason') IS NULL
BEGIN
    ALTER TABLE LabRawResults ADD RejectedReason nvarchar(500) NULL;
    PRINT 'Added LabRawResults.RejectedReason';
END
ELSE
BEGIN
    PRINT 'LabRawResults.RejectedReason already exists — skipped';
END

-- Add TransferredAt column to track when result was transferred to LabOrderItem
IF COL_LENGTH('LabRawResults', 'TransferredAt') IS NULL
BEGIN
    ALTER TABLE LabRawResults ADD TransferredAt datetime2 NULL;
    PRINT 'Added LabRawResults.TransferredAt';
END
ELSE
BEGIN
    PRINT 'LabRawResults.TransferredAt already exists — skipped';
END
