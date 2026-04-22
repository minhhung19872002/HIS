-- Sprint 5 Item 1.4: Video conference consultation rooms
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ConsultationRooms')
BEGIN
    CREATE TABLE [dbo].[ConsultationRooms] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [RoomName] NVARCHAR(100) NOT NULL,
        [Title] NVARCHAR(255) NOT NULL,
        [Description] NVARCHAR(1000) NULL,
        [RoomType] INT NOT NULL,
        [StudyInstanceUID] NVARCHAR(255) NULL,
        [PatientId] UNIQUEIDENTIFIER NULL,
        [MedicalRecordId] UNIQUEIDENTIFIER NULL,
        [HostUserId] UNIQUEIDENTIFIER NOT NULL,
        [ScheduledAt] DATETIME2 NOT NULL,
        [StartedAt] DATETIME2 NULL,
        [EndedAt] DATETIME2 NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [ParticipantsJson] NVARCHAR(MAX) NULL,
        [IsRecorded] BIT NOT NULL DEFAULT 0,
        [RecordingUrl] NVARCHAR(500) NULL,
        [Password] NVARCHAR(100) NULL,
        [ConclusionNote] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX [IX_ConsultationRooms_RoomName] ON [dbo].[ConsultationRooms]([RoomName]);
    CREATE INDEX [IX_ConsultationRooms_Host] ON [dbo].[ConsultationRooms]([HostUserId]);
    CREATE INDEX [IX_ConsultationRooms_Status] ON [dbo].[ConsultationRooms]([Status]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ConsultationParticipants')
BEGIN
    CREATE TABLE [dbo].[ConsultationParticipants] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ConsultationRoomId] UNIQUEIDENTIFIER NOT NULL,
        [UserId] UNIQUEIDENTIFIER NULL,
        [DisplayName] NVARCHAR(255) NOT NULL,
        [Email] NVARCHAR(255) NULL,
        [Role] NVARCHAR(50) NULL,
        [JoinedAt] DATETIME2 NULL,
        [LeftAt] DATETIME2 NULL,
        [JoinIp] NVARCHAR(45) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_ConsultationParticipants_Room] ON [dbo].[ConsultationParticipants]([ConsultationRoomId]);
END
GO
