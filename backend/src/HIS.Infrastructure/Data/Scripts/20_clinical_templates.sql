-- Sprint 3 Item 2.1: Clinical templates unified table
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ClinicalTemplates')
BEGIN
    CREATE TABLE [dbo].[ClinicalTemplates] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [TemplateCode] NVARCHAR(50) NOT NULL,
        [TemplateName] NVARCHAR(255) NOT NULL,
        [TemplateType] INT NOT NULL,
        [IcdCode] NVARCHAR(20) NULL,
        [IcdName] NVARCHAR(255) NULL,
        [DepartmentId] UNIQUEIDENTIFIER NULL,
        [Gender] INT NOT NULL DEFAULT 0,
        [MinAgeYears] INT NULL,
        [MaxAgeYears] INT NULL,
        [Content] NVARCHAR(MAX) NOT NULL,
        [DefaultMembersJson] NVARCHAR(MAX) NULL,
        [IsPublic] BIT NOT NULL DEFAULT 1,
        [OwnerUserId] UNIQUEIDENTIFIER NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [UsageCount] INT NOT NULL DEFAULT 0,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_ClinicalTemplates_Type] ON [dbo].[ClinicalTemplates]([TemplateType]);
    CREATE INDEX [IX_ClinicalTemplates_Type_Icd] ON [dbo].[ClinicalTemplates]([TemplateType], [IcdCode]);
    CREATE INDEX [IX_ClinicalTemplates_Type_Dept] ON [dbo].[ClinicalTemplates]([TemplateType], [DepartmentId]);
END
GO
