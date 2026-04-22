-- Sprint 4 Item 2.16: Radiology permissions + dispatch
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RadiologyPermissions')
BEGIN
    CREATE TABLE [dbo].[RadiologyPermissions] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [UserId] UNIQUEIDENTIFIER NOT NULL,
        [RoomId] UNIQUEIDENTIFIER NULL,
        [ModalityType] NVARCHAR(30) NULL,
        [Permissions] INT NOT NULL DEFAULT 0,
        [RoleTemplate] NVARCHAR(20) NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_RadiologyPermissions_User] ON [dbo].[RadiologyPermissions]([UserId]);
    CREATE INDEX [IX_RadiologyPermissions_User_Room] ON [dbo].[RadiologyPermissions]([UserId], [RoomId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RadiologyDispatches')
BEGIN
    CREATE TABLE [dbo].[RadiologyDispatches] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ServiceRequestDetailId] UNIQUEIDENTIFIER NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [RoomId] UNIQUEIDENTIFIER NOT NULL,
        [ModalityType] NVARCHAR(30) NULL,
        [DispatchedByUserId] UNIQUEIDENTIFIER NOT NULL,
        [DispatchedAt] DATETIME2 NOT NULL,
        [Priority] INT NOT NULL DEFAULT 1,
        [IsArrived] BIT NOT NULL DEFAULT 0,
        [ArrivedAt] DATETIME2 NULL,
        [IsPerformed] BIT NOT NULL DEFAULT 0,
        [PerformedAt] DATETIME2 NULL,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_RadiologyDispatches_Room_Perf] ON [dbo].[RadiologyDispatches]([RoomId], [IsPerformed]);
    CREATE INDEX [IX_RadiologyDispatches_Patient] ON [dbo].[RadiologyDispatches]([PatientId]);
END
GO
