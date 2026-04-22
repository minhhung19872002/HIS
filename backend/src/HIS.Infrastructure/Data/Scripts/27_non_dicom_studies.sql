-- Sprint 5 Item 2.17: NON-DICOM studies (endoscopy, dermatology, ophthalmology...)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'NonDicomStudies')
BEGIN
    CREATE TABLE [dbo].[NonDicomStudies] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ServiceRequestDetailId] UNIQUEIDENTIFIER NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [DeviceType] NVARCHAR(50) NOT NULL DEFAULT 'Other',
        [DeviceName] NVARCHAR(100) NULL,
        [RoomId] UNIQUEIDENTIFIER NULL,
        [PerformedByUserId] UNIQUEIDENTIFIER NULL,
        [CapturedAt] DATETIME2 NOT NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [Description] NVARCHAR(MAX) NULL,
        [Conclusion] NVARCHAR(MAX) NULL,
        [Findings] NVARCHAR(MAX) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_NonDicomStudies_Patient] ON [dbo].[NonDicomStudies]([PatientId]);
    CREATE INDEX [IX_NonDicomStudies_Detail] ON [dbo].[NonDicomStudies]([ServiceRequestDetailId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'NonDicomImages')
BEGIN
    CREATE TABLE [dbo].[NonDicomImages] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [NonDicomStudyId] UNIQUEIDENTIFIER NOT NULL,
        [MediaType] NVARCHAR(20) NOT NULL DEFAULT 'image',
        [FileName] NVARCHAR(255) NOT NULL,
        [FilePath] NVARCHAR(500) NOT NULL,
        [FileSize] BIGINT NOT NULL DEFAULT 0,
        [MimeType] NVARCHAR(100) NULL,
        [Width] INT NOT NULL DEFAULT 0,
        [Height] INT NOT NULL DEFAULT 0,
        [DurationSeconds] FLOAT NOT NULL DEFAULT 0,
        [ThumbnailBase64] NVARCHAR(MAX) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [Annotation] NVARCHAR(1000) NULL,
        [IncludeInReport] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_NonDicomImages_Study] ON [dbo].[NonDicomImages]([NonDicomStudyId]);
END
GO
