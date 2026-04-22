-- Sprint 1 Item 1.5: Multi-room + khám thêm chuyên khoa khác
-- Idempotent columns for Examination entity

IF COL_LENGTH('dbo.Examinations', 'ParentExaminationId') IS NULL
BEGIN
    ALTER TABLE [dbo].[Examinations] ADD [ParentExaminationId] UNIQUEIDENTIFIER NULL;
END
GO

IF COL_LENGTH('dbo.Examinations', 'IsBillPrinted') IS NULL
BEGIN
    ALTER TABLE [dbo].[Examinations] ADD [IsBillPrinted] BIT NOT NULL DEFAULT 0;
END
GO

IF COL_LENGTH('dbo.Examinations', 'BillPrintedAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[Examinations] ADD [BillPrintedAt] DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.Examinations', 'BillPrintedBy') IS NULL
BEGIN
    ALTER TABLE [dbo].[Examinations] ADD [BillPrintedBy] UNIQUEIDENTIFIER NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Examinations_ParentExaminationId')
    AND COL_LENGTH('dbo.Examinations', 'ParentExaminationId') IS NOT NULL
BEGIN
    CREATE INDEX [IX_Examinations_ParentExaminationId]
        ON [dbo].[Examinations]([ParentExaminationId])
        WHERE [ParentExaminationId] IS NOT NULL;
END
GO
