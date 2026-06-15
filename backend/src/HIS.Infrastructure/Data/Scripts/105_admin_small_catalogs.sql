-- 104: DM hanh chinh nho — Nghe nghiep / Gioi tinh / Dan toc / Quoc gia / CSKCB ban dau (F10.2 #95)
-- Idempotent: IF OBJECT_ID / IF NOT EXISTS guards — chay lai khong loi.
-- CreatedBy/UpdatedBy = NVARCHAR(450) theo pattern 42_nangcap22_catalogs.sql.
SET QUOTED_IDENTIFIER ON;
GO

-- #1 Occupations — DM nghe nghiep
IF OBJECT_ID('dbo.Occupations', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Occupations] (
        [Id]        UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code]      NVARCHAR(50)  NOT NULL,
        [Name]      NVARCHAR(255) NOT NULL,
        [Note]      NVARCHAR(500) NULL,
        [SortOrder] INT           NOT NULL DEFAULT 0,
        [IsActive]  BIT           NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2     NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT           NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_Occupations_Code ON dbo.Occupations(Code) WHERE IsDeleted = 0;
END
GO

-- #2 Genders — DM gioi tinh (co the tuy chinh theo nghiep vu)
IF OBJECT_ID('dbo.Genders', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Genders] (
        [Id]        UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code]      NVARCHAR(10)  NOT NULL,
        [Name]      NVARCHAR(100) NOT NULL,
        [Note]      NVARCHAR(500) NULL,
        [SortOrder] INT           NOT NULL DEFAULT 0,
        [IsActive]  BIT           NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2     NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT           NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_Genders_Code ON dbo.Genders(Code) WHERE IsDeleted = 0;
    -- Seed co ban
    INSERT INTO [dbo].[Genders] ([Id],[Code],[Name],[SortOrder],[CreatedAt])
    VALUES
        (NEWID(), N'1', N'Nam',               1, SYSUTCDATETIME()),
        (NEWID(), N'2', N'Nu',                2, SYSUTCDATETIME()),
        (NEWID(), N'0', N'Khong xac dinh',    3, SYSUTCDATETIME());
END
GO

-- #3 Ethnics — DM dan toc
IF OBJECT_ID('dbo.Ethnics', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Ethnics] (
        [Id]        UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code]      NVARCHAR(20)  NOT NULL,
        [Name]      NVARCHAR(255) NOT NULL,
        [Note]      NVARCHAR(500) NULL,
        [SortOrder] INT           NOT NULL DEFAULT 0,
        [IsActive]  BIT           NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2     NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT           NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_Ethnics_Code ON dbo.Ethnics(Code) WHERE IsDeleted = 0;
    -- Seed dan toc pho bien (co the bo sung qua UI)
    INSERT INTO [dbo].[Ethnics] ([Id],[Code],[Name],[SortOrder],[CreatedAt])
    VALUES
        (NEWID(), N'01', N'Kinh',    1, SYSUTCDATETIME()),
        (NEWID(), N'02', N'Tay',     2, SYSUTCDATETIME()),
        (NEWID(), N'03', N'Thai',    3, SYSUTCDATETIME()),
        (NEWID(), N'04', N'Muong',   4, SYSUTCDATETIME()),
        (NEWID(), N'05', N'Khmer',   5, SYSUTCDATETIME()),
        (NEWID(), N'06', N'Nung',    6, SYSUTCDATETIME()),
        (NEWID(), N'07', N'Hmong',   7, SYSUTCDATETIME()),
        (NEWID(), N'08', N'Dao',     8, SYSUTCDATETIME()),
        (NEWID(), N'09', N'Gia Rai', 9, SYSUTCDATETIME()),
        (NEWID(), N'10', N'E De',   10, SYSUTCDATETIME());
END
GO

-- #4 Nations — DM quoc gia
IF OBJECT_ID('dbo.Nations', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Nations] (
        [Id]        UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code]      NVARCHAR(10)  NOT NULL,
        [Name]      NVARCHAR(255) NOT NULL,
        [Note]      NVARCHAR(500) NULL,
        [SortOrder] INT           NOT NULL DEFAULT 0,
        [IsActive]  BIT           NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2     NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT           NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_Nations_Code ON dbo.Nations(Code) WHERE IsDeleted = 0;
    -- Seed quoc gia pho bien
    INSERT INTO [dbo].[Nations] ([Id],[Code],[Name],[SortOrder],[CreatedAt])
    VALUES
        (NEWID(), N'VN',  N'Viet Nam',        1, SYSUTCDATETIME()),
        (NEWID(), N'CN',  N'Trung Quoc',       2, SYSUTCDATETIME()),
        (NEWID(), N'LA',  N'Lao',              3, SYSUTCDATETIME()),
        (NEWID(), N'KH',  N'Campuchia',        4, SYSUTCDATETIME()),
        (NEWID(), N'US',  N'Hoa Ky',           5, SYSUTCDATETIME()),
        (NEWID(), N'FR',  N'Phap',             6, SYSUTCDATETIME()),
        (NEWID(), N'KR',  N'Han Quoc',         7, SYSUTCDATETIME()),
        (NEWID(), N'JP',  N'Nhat Ban',         8, SYSUTCDATETIME()),
        (NEWID(), N'OTH', N'Quoc gia khac',  999, SYSUTCDATETIME());
END
GO

-- #5 InitialFacilities — DM co so kham chua benh ban dau (CSKCB)
IF OBJECT_ID('dbo.InitialFacilities', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[InitialFacilities] (
        [Id]        UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code]      NVARCHAR(20)  NOT NULL,
        [Name]      NVARCHAR(500) NOT NULL,
        [Province]  NVARCHAR(100) NULL,
        [Level]     INT           NULL,        -- 1=TW, 2=tinh, 3=huyen, 4=xa
        [BhxhCode]  NVARCHAR(20)  NULL,        -- ma CSKCB theo BHXH
        [Note]      NVARCHAR(500) NULL,
        [SortOrder] INT           NOT NULL DEFAULT 0,
        [IsActive]  BIT           NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2     NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT           NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_InitialFacilities_Code ON dbo.InitialFacilities(Code) WHERE IsDeleted = 0;
    CREATE INDEX IX_InitialFacilities_BhxhCode ON dbo.InitialFacilities(BhxhCode) WHERE BhxhCode IS NOT NULL;
END
GO
