-- AI-1: AiLabelingResult — audit mọi lần chạy AI trên ảnh DICOM.
-- Idempotent. Yêu cầu theo TT 54/2017 (audit log y tế).

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'AiLabelingResults')
BEGIN
    CREATE TABLE dbo.AiLabelingResults
    (
        Id uniqueidentifier NOT NULL DEFAULT NEWID(),
        StudyInstanceUID nvarchar(100) NOT NULL,
        PatientId uniqueidentifier NULL,
        RadiologyRequestId uniqueidentifier NULL,
        ModelName nvarchar(200) NOT NULL,
        ModelVersion nvarchar(50) NULL,
        ModelUrl nvarchar(500) NULL,
        DurationMs int NOT NULL DEFAULT 0,
        LabelsJson nvarchar(max) NOT NULL DEFAULT '[]',
        ReviewStatus int NOT NULL DEFAULT 0,
        AcceptedLabelsJson nvarchar(max) NULL,
        ReviewedBy uniqueidentifier NULL,
        ReviewedAt datetime2 NULL,
        ReviewNote nvarchar(max) NULL,
        InputImageHash nvarchar(64) NULL,
        InputWidth int NULL,
        InputHeight int NULL,
        ErrorMessage nvarchar(max) NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt datetime2 NULL,
        CreatedBy uniqueidentifier NULL,
        UpdatedBy uniqueidentifier NULL,
        IsDeleted bit NOT NULL DEFAULT 0,
        CONSTRAINT PK_AiLabelingResults PRIMARY KEY CLUSTERED (Id)
    );

    CREATE INDEX IX_AiLabelingResults_Study ON dbo.AiLabelingResults (StudyInstanceUID, CreatedAt DESC);
    CREATE INDEX IX_AiLabelingResults_Patient ON dbo.AiLabelingResults (PatientId, CreatedAt DESC);
    CREATE INDEX IX_AiLabelingResults_Reviewer ON dbo.AiLabelingResults (ReviewedBy, ReviewedAt DESC);
END
