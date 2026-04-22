-- Sprint 3 Item 2.4: Discount reason workflow
IF COL_LENGTH('dbo.Receipts', 'DiscountReasonCode') IS NULL
    ALTER TABLE [dbo].[Receipts] ADD [DiscountReasonCode] INT NOT NULL DEFAULT 0;
GO
IF COL_LENGTH('dbo.Receipts', 'DiscountNote') IS NULL
    ALTER TABLE [dbo].[Receipts] ADD [DiscountNote] NVARCHAR(500) NULL;
GO
IF COL_LENGTH('dbo.Receipts', 'DiscountApprovedBy') IS NULL
    ALTER TABLE [dbo].[Receipts] ADD [DiscountApprovedBy] UNIQUEIDENTIFIER NULL;
GO
IF COL_LENGTH('dbo.Receipts', 'DiscountApprovedAt') IS NULL
    ALTER TABLE [dbo].[Receipts] ADD [DiscountApprovedAt] DATETIME2 NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Receipts_DiscountReasonCode')
    AND COL_LENGTH('dbo.Receipts', 'DiscountReasonCode') IS NOT NULL
BEGIN
    CREATE INDEX [IX_Receipts_DiscountReasonCode] ON [dbo].[Receipts]([DiscountReasonCode])
        WHERE [DiscountReasonCode] > 0;
END
GO
