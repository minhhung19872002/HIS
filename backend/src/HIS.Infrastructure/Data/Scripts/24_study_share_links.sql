-- Sprint 4 Item 2.18: Study share links (PACS sharing with password + TTL)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StudyShareLinks')
BEGIN
    CREATE TABLE [dbo].[StudyShareLinks] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [Token] NVARCHAR(64) NOT NULL,
        [StudyInstanceUID] NVARCHAR(255) NOT NULL,
        [OrthancStudyId] NVARCHAR(100) NULL,
        [PatientId] UNIQUEIDENTIFIER NULL,
        [PasswordHash] NVARCHAR(128) NULL,
        [HideDemographics] BIT NOT NULL DEFAULT 0,
        [ExpiresAt] DATETIME2 NULL,
        [ViewCount] INT NOT NULL DEFAULT 0,
        [MaxViews] INT NULL,
        [CreatedByUserId] UNIQUEIDENTIFIER NOT NULL,
        [IsRevoked] BIT NOT NULL DEFAULT 0,
        [RevokedAt] DATETIME2 NULL,
        [RevokeReason] NVARCHAR(500) NULL,
        [LastViewerIp] NVARCHAR(45) NULL,
        [LastViewedAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX [IX_StudyShareLinks_Token] ON [dbo].[StudyShareLinks]([Token]);
    CREATE INDEX [IX_StudyShareLinks_Study] ON [dbo].[StudyShareLinks]([StudyInstanceUID]);
    CREATE INDEX [IX_StudyShareLinks_CreatedBy] ON [dbo].[StudyShareLinks]([CreatedByUserId]);
END
GO
