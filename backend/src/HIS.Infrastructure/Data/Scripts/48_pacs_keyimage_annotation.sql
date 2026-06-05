-- 48_pacs_keyimage_annotation.sql
-- PACS Key Images + Image Annotations persistence tables
-- Idempotent: IF NOT EXISTS guards — safe to re-run on prod (tables already created = NO-OP).
-- CreatedBy/UpdatedBy are NVARCHAR (string) matching BaseEntity default — no ValueConverter needed.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PacsKeyImages')
BEGIN
    CREATE TABLE [dbo].[PacsKeyImages] (
        [Id]                UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PacsKeyImages PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        [StudyInstanceUID]  NVARCHAR(128)    NOT NULL,
        [SeriesInstanceUID] NVARCHAR(128)    NULL,
        [SOPInstanceUID]    NVARCHAR(128)    NOT NULL,
        [Description]       NVARCHAR(500)    NULL,
        [MarkedBy]          NVARCHAR(200)    NULL,
        [MarkedTime]        DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy]         NVARCHAR(450)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(450)    NULL
    );
    CREATE INDEX [IX_PacsKeyImages_StudyUID]  ON [dbo].[PacsKeyImages] ([StudyInstanceUID]);
    CREATE INDEX [IX_PacsKeyImages_SOPInstUID] ON [dbo].[PacsKeyImages] ([SOPInstanceUID]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PacsImageAnnotations')
BEGIN
    CREATE TABLE [dbo].[PacsImageAnnotations] (
        [Id]                UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_PacsImageAnnotations PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        [StudyInstanceUID]  NVARCHAR(128)    NULL,
        [SeriesInstanceUID] NVARCHAR(128)    NULL,
        [SOPInstanceUID]    NVARCHAR(128)    NOT NULL,
        [AnnotationType]    NVARCHAR(50)     NOT NULL DEFAULT '',
        [AnnotationData]    NVARCHAR(MAX)    NULL,
        [AnnotatedBy]       NVARCHAR(200)    NULL,
        [AnnotatedTime]     DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy]         NVARCHAR(450)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(450)    NULL
    );
    CREATE INDEX [IX_PacsAnnotations_SOPInstUID]   ON [dbo].[PacsImageAnnotations] ([SOPInstanceUID]);
    CREATE INDEX [IX_PacsAnnotations_StudyUID]     ON [dbo].[PacsImageAnnotations] ([StudyInstanceUID]);
END
GO
