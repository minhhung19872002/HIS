-- 47_microbiology_results.sql
-- Microbiology culture results: MicrobiologyCultures + MicrobiologyOrganismFindings + AntibioticSensitivityResults
-- Idempotent: IF NOT EXISTS guards — safe to re-run on prod (tables already created = NO-OP).
-- No ValueConverter needed: CreatedBy/UpdatedBy are NVARCHAR (string), matching default BaseEntity behavior.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MicrobiologyCultures')
BEGIN
    CREATE TABLE [dbo].[MicrobiologyCultures] (
        [Id]             UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_MicrobiologyCultures PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        [LabRequestId]   UNIQUEIDENTIFIER NULL,
        [RequestCode]    NVARCHAR(60)     NOT NULL DEFAULT '',
        [PatientId]      UNIQUEIDENTIFIER NULL,
        [PatientName]    NVARCHAR(200)    NOT NULL DEFAULT '',
        [PatientCode]    NVARCHAR(50)     NOT NULL DEFAULT '',
        [SampleType]     NVARCHAR(60)     NOT NULL DEFAULT '',
        [SampleBarcode]  NVARCHAR(80)     NULL,
        [CultureType]    NVARCHAR(40)     NOT NULL DEFAULT '',
        [CultureDate]    DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        [IncubationStart] DATETIME2       NULL,
        [IncubationEnd]  DATETIME2        NULL,
        [ResultDate]     DATETIME2        NULL,
        [Status]         INT              NOT NULL DEFAULT 0,
        [Notes]          NVARCHAR(MAX)    NULL,
        [CreatedAt]      DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy]      NVARCHAR(450)    NULL,
        [UpdatedAt]      DATETIME2        NULL,
        [UpdatedBy]      NVARCHAR(450)    NULL,
        [IsDeleted]      BIT              NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_MicroCultures_PatientId]   ON [dbo].[MicrobiologyCultures] ([PatientId]);
    CREATE INDEX [IX_MicroCultures_LabRequestId] ON [dbo].[MicrobiologyCultures] ([LabRequestId]);
    CREATE INDEX [IX_MicroCultures_Status]       ON [dbo].[MicrobiologyCultures] ([Status]);
    CREATE INDEX [IX_MicroCultures_CultureDate]  ON [dbo].[MicrobiologyCultures] ([CultureDate] DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MicrobiologyOrganismFindings')
BEGIN
    CREATE TABLE [dbo].[MicrobiologyOrganismFindings] (
        [Id]                   UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_MicroOrganismFindings PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        [CultureId]            UNIQUEIDENTIFIER NOT NULL,
        [LabOrganismId]        UNIQUEIDENTIFIER NULL,
        [OrganismCode]         NVARCHAR(40)     NOT NULL DEFAULT '',
        [OrganismName]         NVARCHAR(200)    NOT NULL DEFAULT '',
        [ColonyCount]          NVARCHAR(60)     NULL,
        [Morphology]           NVARCHAR(200)    NULL,
        [GramStain]            NVARCHAR(20)     NULL,  -- positive, negative, mixed
        [IdentificationMethod] NVARCHAR(60)     NULL,
        [CreatedAt]            DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy]            NVARCHAR(450)    NULL,
        [UpdatedAt]            DATETIME2        NULL,
        [UpdatedBy]            NVARCHAR(450)    NULL,
        [IsDeleted]            BIT              NOT NULL DEFAULT 0,
        CONSTRAINT FK_MicroOrg_Culture FOREIGN KEY ([CultureId]) REFERENCES [dbo].[MicrobiologyCultures]([Id])
    );
    CREATE INDEX [IX_MicroOrg_CultureId] ON [dbo].[MicrobiologyOrganismFindings] ([CultureId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AntibioticSensitivityResults')
BEGIN
    CREATE TABLE [dbo].[AntibioticSensitivityResults] (
        [Id]                  UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AntibioticSensResults PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        [OrganismFindingId]   UNIQUEIDENTIFIER NOT NULL,
        [LabAntibioticId]     UNIQUEIDENTIFIER NULL,
        [AntibioticCode]      NVARCHAR(20)     NOT NULL DEFAULT '',
        [AntibioticName]      NVARCHAR(200)    NOT NULL DEFAULT '',
        [Mic]                 DECIMAL(10,4)    NULL,
        [ZoneDiameter]        DECIMAL(6,2)     NULL,
        [Interpretation]      NVARCHAR(5)      NOT NULL DEFAULT '',  -- S / I / R
        [Method]              NVARCHAR(20)     NULL,                 -- disk, mic, etest
        [CreatedAt]           DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy]           NVARCHAR(450)    NULL,
        [UpdatedAt]           DATETIME2        NULL,
        [UpdatedBy]           NVARCHAR(450)    NULL,
        [IsDeleted]           BIT              NOT NULL DEFAULT 0,
        CONSTRAINT FK_AntibioticSens_Organism FOREIGN KEY ([OrganismFindingId]) REFERENCES [dbo].[MicrobiologyOrganismFindings]([Id])
    );
    CREATE INDEX [IX_AntibioticSens_OrganismId] ON [dbo].[AntibioticSensitivityResults] ([OrganismFindingId]);
END
GO
