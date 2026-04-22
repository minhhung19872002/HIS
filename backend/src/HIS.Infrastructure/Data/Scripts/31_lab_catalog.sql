-- Sprint 6 Item 2.15: LIS catalog (LabBook + LabBookGroup + LabChemical)

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabBooks')
BEGIN
    CREATE TABLE [dbo].[LabBooks] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [BookCode] NVARCHAR(30) NOT NULL,
        [BookName] NVARCHAR(255) NOT NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [BarcodePrefix] NVARCHAR(10) NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [Description] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_LabBooks_Code] ON [dbo].[LabBooks]([BookCode]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabBookGroups')
BEGIN
    CREATE TABLE [dbo].[LabBookGroups] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [LabBookId] UNIQUEIDENTIFIER NOT NULL,
        [GroupCode] NVARCHAR(30) NOT NULL,
        [GroupName] NVARCHAR(255) NOT NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [ServiceIdsJson] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_LabBookGroups_Book] ON [dbo].[LabBookGroups]([LabBookId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabChemicals')
BEGIN
    CREATE TABLE [dbo].[LabChemicals] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ServiceId] UNIQUEIDENTIFIER NOT NULL,
        [MedicalSupplyId] UNIQUEIDENTIFIER NOT NULL,
        [QuantityPerTest] DECIMAL(18,4) NOT NULL DEFAULT 1,
        [Unit] NVARCHAR(20) NULL,
        [ObjectType] NVARCHAR(20) NOT NULL DEFAULT 'HaoPhi',
        [IsActive] BIT NOT NULL DEFAULT 1,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_LabChemicals_Service] ON [dbo].[LabChemicals]([ServiceId]);
END
GO

-- Seed 6 sổ XN chuẩn
IF NOT EXISTS (SELECT 1 FROM LabBooks WHERE BookCode = 'HH')
BEGIN
    INSERT INTO LabBooks (Id, BookCode, BookName, SortOrder, BarcodePrefix, IsActive, CreatedAt) VALUES
        (NEWID(), 'HH', N'Sổ xét nghiệm Huyết học', 1, 'HH', 1, SYSUTCDATETIME()),
        (NEWID(), 'SH', N'Sổ xét nghiệm Sinh hóa máu', 2, 'SH', 1, SYSUTCDATETIME()),
        (NEWID(), 'NT', N'Sổ xét nghiệm Nước tiểu', 3, 'NT', 1, SYSUTCDATETIME()),
        (NEWID(), 'VS', N'Sổ xét nghiệm Vi sinh', 4, 'VS', 1, SYSUTCDATETIME()),
        (NEWID(), 'MB', N'Sổ xét nghiệm Miễn dịch', 5, 'MB', 1, SYSUTCDATETIME()),
        (NEWID(), 'GP', N'Sổ xét nghiệm Giải phẫu bệnh', 6, 'GP', 1, SYSUTCDATETIME());
END
GO
