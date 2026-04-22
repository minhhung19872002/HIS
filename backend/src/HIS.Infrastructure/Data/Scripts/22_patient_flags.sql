-- Sprint 3 Item 2.3: Patient flags (red flag warnings)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PatientFlags')
BEGIN
    CREATE TABLE [dbo].[PatientFlags] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [FlagType] INT NOT NULL,
        [Color] NVARCHAR(20) NOT NULL DEFAULT 'red',
        [Note] NVARCHAR(1000) NOT NULL DEFAULT '',
        [IsActive] BIT NOT NULL DEFAULT 1,
        [ExpiresAt] DATETIME2 NULL,
        [CreatedByUserId] UNIQUEIDENTIFIER NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_PatientFlags_PatientId_Active] ON [dbo].[PatientFlags]([PatientId], [IsActive]);
END
GO
