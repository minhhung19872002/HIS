-- N1.11: Radiology master catalog (body parts, protocols, report templates)

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RadiologyBodyParts')
BEGIN
    CREATE TABLE [dbo].[RadiologyBodyParts] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [BodyPartCode] NVARCHAR(30) NOT NULL,
        [BodyPartName] NVARCHAR(255) NOT NULL,
        [EnglishName] NVARCHAR(255) NULL,
        [DicomCode] NVARCHAR(30) NULL,
        [Region] NVARCHAR(50) NULL,
        [Description] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_RadiologyBodyParts_Code] ON [dbo].[RadiologyBodyParts]([BodyPartCode]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RadiologyProtocols')
BEGIN
    CREATE TABLE [dbo].[RadiologyProtocols] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ProtocolCode] NVARCHAR(30) NOT NULL,
        [ProtocolName] NVARCHAR(255) NOT NULL,
        [ModalityId] UNIQUEIDENTIFIER NULL,
        [BodyPartId] UNIQUEIDENTIFIER NULL,
        [UseContrast] BIT NOT NULL DEFAULT 0,
        [ContrastAgent] NVARCHAR(100) NULL,
        [ContrastDose] NVARCHAR(100) NULL,
        [Kvp] DECIMAL(6,2) NULL,
        [Mas] DECIMAL(6,2) NULL,
        [SliceThickness] DECIMAL(6,2) NULL,
        [Position] NVARCHAR(50) NULL,
        [Instructions] NVARCHAR(1000) NULL,
        [Notes] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_RadiologyProtocols_Code] ON [dbo].[RadiologyProtocols]([ProtocolCode]);
    CREATE INDEX [IX_RadiologyProtocols_Modality] ON [dbo].[RadiologyProtocols]([ModalityId]);
    CREATE INDEX [IX_RadiologyProtocols_BodyPart] ON [dbo].[RadiologyProtocols]([BodyPartId]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RadiologyReportTemplates')
BEGIN
    CREATE TABLE [dbo].[RadiologyReportTemplates] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [TemplateCode] NVARCHAR(30) NOT NULL,
        [TemplateName] NVARCHAR(255) NOT NULL,
        [ModalityId] UNIQUEIDENTIFIER NULL,
        [BodyPartId] UNIQUEIDENTIFIER NULL,
        [TechniqueText] NVARCHAR(MAX) NULL,
        [FindingsTemplate] NVARCHAR(MAX) NULL,
        [ImpressionTemplate] NVARCHAR(MAX) NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_RadiologyReportTemplates_Code] ON [dbo].[RadiologyReportTemplates]([TemplateCode]);
    CREATE INDEX [IX_RadiologyReportTemplates_Modality] ON [dbo].[RadiologyReportTemplates]([ModalityId]);
    CREATE INDEX [IX_RadiologyReportTemplates_BodyPart] ON [dbo].[RadiologyReportTemplates]([BodyPartId]);
END
