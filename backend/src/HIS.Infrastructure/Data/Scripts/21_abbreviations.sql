-- Sprint 3 Item 2.2: Abbreviations table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Abbreviations')
BEGIN
    CREATE TABLE [dbo].[Abbreviations] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [Code] NVARCHAR(20) NOT NULL,
        [Expansion] NVARCHAR(1000) NOT NULL,
        [Scope] INT NOT NULL DEFAULT 0,
        [ScopeKey] NVARCHAR(50) NULL,
        [OwnerUserId] UNIQUEIDENTIFIER NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [UsageCount] INT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_Abbreviations_Scope_Code] ON [dbo].[Abbreviations]([Scope], [Code]);
    CREATE INDEX [IX_Abbreviations_Owner] ON [dbo].[Abbreviations]([OwnerUserId]) WHERE [OwnerUserId] IS NOT NULL;
END
GO

-- Seed a few common abbreviations
IF NOT EXISTS (SELECT 1 FROM Abbreviations WHERE Code = 'ha')
BEGIN
    INSERT INTO Abbreviations (Id, Code, Expansion, Scope, IsActive, SortOrder, UsageCount, CreatedAt) VALUES
        (NEWID(), N'ha', N'Huyết áp', 2, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'hatt', N'Huyết áp tâm thu', 2, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'hattr', N'Huyết áp tâm trương', 2, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'nt', N'Nhịp tim', 2, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'nth', N'Nhịp thở', 2, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'sot', N'Sốt', 2, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'ho', N'Ho khan', 2, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'khom', N'Không khó thở, không đau ngực', 2, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'bt', N'Bình thường', 0, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'kbt', N'Không bất thường', 0, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'kpht', N'Không phát hiện bất thường', 4, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'ctl', N'Chụp toàn lồng ngực', 4, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'nsm', N'Ngày sáng, trưa, chiều, tối', 1, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'1v3l', N'1 viên 3 lần/ngày', 1, 1, 0, 0, SYSUTCDATETIME()),
        (NEWID(), N'tks', N'Tái khám sau 7 ngày', 5, 1, 0, 0, SYSUTCDATETIME());
END
GO
