-- Sprint 6 Item 2.10: Sổ biên lai user-based enhancements
IF COL_LENGTH('dbo.CashBooks', 'StartNumber') IS NULL
    ALTER TABLE [dbo].[CashBooks] ADD [StartNumber] INT NOT NULL DEFAULT 1;
GO
IF COL_LENGTH('dbo.CashBooks', 'EndNumber') IS NULL
    ALTER TABLE [dbo].[CashBooks] ADD [EndNumber] INT NOT NULL DEFAULT 999999;
GO
IF COL_LENGTH('dbo.CashBooks', 'CurrentNumber') IS NULL
    ALTER TABLE [dbo].[CashBooks] ADD [CurrentNumber] INT NOT NULL DEFAULT 0;
GO
IF COL_LENGTH('dbo.CashBooks', 'UsageCategory') IS NULL
    ALTER TABLE [dbo].[CashBooks] ADD [UsageCategory] NVARCHAR(50) NULL;
GO
IF COL_LENGTH('dbo.CashBooks', 'DefaultReason') IS NULL
    ALTER TABLE [dbo].[CashBooks] ADD [DefaultReason] NVARCHAR(200) NULL;
GO
IF COL_LENGTH('dbo.CashBooks', 'IsActive') IS NULL
    ALTER TABLE [dbo].[CashBooks] ADD [IsActive] BIT NOT NULL DEFAULT 1;
GO
IF COL_LENGTH('dbo.CashBooks', 'AppliesToExamination') IS NULL
    ALTER TABLE [dbo].[CashBooks] ADD [AppliesToExamination] BIT NOT NULL DEFAULT 1;
GO

-- Index để check conflict sổ trùng tên
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CashBooks_BookCode_Active')
BEGIN
    CREATE INDEX [IX_CashBooks_BookCode_Active] ON [dbo].[CashBooks]([BookCode], [IsActive]);
END
GO
