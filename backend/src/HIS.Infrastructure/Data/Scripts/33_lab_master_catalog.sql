-- N1.10: LIS master catalog (measurement units, organisms, antibiotics)

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabMeasurementUnits')
BEGIN
    CREATE TABLE [dbo].[LabMeasurementUnits] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UnitCode] NVARCHAR(30) NOT NULL,
        [UnitName] NVARCHAR(150) NOT NULL,
        [UnitSymbol] NVARCHAR(30) NULL,
        [Description] NVARCHAR(300) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_LabMeasurementUnits_Code] ON [dbo].[LabMeasurementUnits]([UnitCode]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabOrganisms')
BEGIN
    CREATE TABLE [dbo].[LabOrganisms] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [OrganismCode] NVARCHAR(30) NOT NULL,
        [OrganismName] NVARCHAR(255) NOT NULL,
        [LatinName] NVARCHAR(255) NULL,
        [GramType] NVARCHAR(20) NULL,
        [MorphologyType] NVARCHAR(50) NULL,
        [Category] NVARCHAR(50) NULL,
        [Notes] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_LabOrganisms_Code] ON [dbo].[LabOrganisms]([OrganismCode]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LabAntibiotics')
BEGIN
    CREATE TABLE [dbo].[LabAntibiotics] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [AntibioticCode] NVARCHAR(30) NOT NULL,
        [AntibioticName] NVARCHAR(255) NOT NULL,
        [GenericName] NVARCHAR(255) NULL,
        [AtcCode] NVARCHAR(20) NULL,
        [DrugClass] NVARCHAR(100) NULL,
        [Route] NVARCHAR(30) NULL,
        [Notes] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsRestricted] BIT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_LabAntibiotics_Code] ON [dbo].[LabAntibiotics]([AntibioticCode]);
END
