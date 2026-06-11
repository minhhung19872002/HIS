-- ============================================================
-- TT46 (2026-06-12): khóa nội dung HSBA sau finalize + vết tu chỉnh/phiên bản.
-- Plan: docs/workspace-docs/20-backlog/items/plan-emr-tt46-immutability.md
-- - MedicalRecords.EmrFinalizedAt/By: NULL = chưa khóa. KHÔNG dùng Status=5 (PendingCLS)
--   và KHÔNG dùng IsClosed (billing chiếm). KHÔNG backfill Status=5 cũ (đó là PendingCLS thật).
-- - EmrAmendments: Action 1=Finalize · 2=Reopen · 3=AmendNote; VersionNo theo chu kỳ finalize.
-- Idempotent.
-- ============================================================

IF COL_LENGTH('MedicalRecords', 'EmrFinalizedAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[MedicalRecords] ADD [EmrFinalizedAt] DATETIME2 NULL;
    PRINT 'Added MedicalRecords.EmrFinalizedAt';
END
GO
IF COL_LENGTH('MedicalRecords', 'EmrFinalizedBy') IS NULL
BEGIN
    ALTER TABLE [dbo].[MedicalRecords] ADD [EmrFinalizedBy] UNIQUEIDENTIFIER NULL;
    PRINT 'Added MedicalRecords.EmrFinalizedBy';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EmrAmendments')
BEGIN
    CREATE TABLE [dbo].[EmrAmendments] (
        [Id] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        [MedicalRecordId] UNIQUEIDENTIFIER NOT NULL,
        [Action] INT NOT NULL,            -- 1=Finalize, 2=Reopen, 3=AmendNote
        [VersionNo] INT NOT NULL DEFAULT 1,
        [Reason] NVARCHAR(MAX) NULL,
        [SnapshotJson] NVARCHAR(MAX) NULL,
        [PerformedBy] UNIQUEIDENTIFIER NOT NULL,
        [PerformedByName] NVARCHAR(200) NULL,
        [PerformedAt] DATETIME2 NOT NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0,
        CONSTRAINT [FK_EmrAmendments_MedicalRecords] FOREIGN KEY ([MedicalRecordId]) REFERENCES [dbo].[MedicalRecords]([Id])
    );
    CREATE INDEX [IX_EmrAmendments_MedicalRecordId] ON [dbo].[EmrAmendments]([MedicalRecordId]);
    PRINT 'Created EmrAmendments table';
END
GO

PRINT '95_emr_tt46_finalize_amendments completed';
