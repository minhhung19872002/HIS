-- Hospital-grade PACS networking fields and auto-send idempotency.
-- Idempotent: safe for startup schema repair and repeated deployments.

IF COL_LENGTH('dbo.RadiologyModalities', 'SupportsWorklist') IS NULL
    ALTER TABLE dbo.RadiologyModalities ADD SupportsWorklist bit NOT NULL
        CONSTRAINT DF_RadiologyModalities_SupportsWorklist DEFAULT (0);

IF COL_LENGTH('dbo.RadiologyModalities', 'SupportsMPPS') IS NULL
    ALTER TABLE dbo.RadiologyModalities ADD SupportsMPPS bit NOT NULL
        CONSTRAINT DF_RadiologyModalities_SupportsMPPS DEFAULT (0);

IF COL_LENGTH('dbo.RadiologyExams', 'MppsInstanceUid') IS NULL
    ALTER TABLE dbo.RadiologyExams ADD MppsInstanceUid nvarchar(64) NULL;

IF COL_LENGTH('dbo.RadiologyExams', 'MppsStatus') IS NULL
    ALTER TABLE dbo.RadiologyExams ADD MppsStatus nvarchar(16) NULL;

IF COL_LENGTH('dbo.RadiologyExams', 'MppsLastUpdatedAt') IS NULL
    ALTER TABLE dbo.RadiologyExams ADD MppsLastUpdatedAt datetime2 NULL;

GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_RadiologyExams_MppsInstanceUid'
      AND object_id = OBJECT_ID('dbo.RadiologyExams'))
BEGIN
    CREATE UNIQUE INDEX IX_RadiologyExams_MppsInstanceUid
        ON dbo.RadiologyExams (MppsInstanceUid)
        WHERE MppsInstanceUid IS NOT NULL AND IsDeleted = 0;
END;

IF COL_LENGTH('dbo.RemotePacsServers', 'CallingAeTitle') IS NULL
    ALTER TABLE dbo.RemotePacsServers ADD CallingAeTitle nvarchar(16) NOT NULL
        CONSTRAINT DF_RemotePacsServers_CallingAeTitle DEFAULT ('HIS_RIS');

IF COL_LENGTH('dbo.RemotePacsServers', 'UseTls') IS NULL
    ALTER TABLE dbo.RemotePacsServers ADD UseTls bit NOT NULL
        CONSTRAINT DF_RemotePacsServers_UseTls DEFAULT (0);

IF COL_LENGTH('dbo.RemotePacsServers', 'UseStorageCommitment') IS NULL
    ALTER TABLE dbo.RemotePacsServers ADD UseStorageCommitment bit NOT NULL
        CONSTRAINT DF_RemotePacsServers_UseStorageCommitment DEFAULT (0);

IF COL_LENGTH('dbo.RemotePacsServers', 'TimeoutSeconds') IS NULL
    ALTER TABLE dbo.RemotePacsServers ADD TimeoutSeconds int NOT NULL
        CONSTRAINT DF_RemotePacsServers_TimeoutSeconds DEFAULT (30);

IF COL_LENGTH('dbo.DicomTransmissionLogs', 'DeduplicationKey') IS NULL
    ALTER TABLE dbo.DicomTransmissionLogs ADD DeduplicationKey nvarchar(160) NULL;

IF COL_LENGTH('dbo.DicomTransmissionLogs', 'RetryCount') IS NULL
    ALTER TABLE dbo.DicomTransmissionLogs ADD RetryCount int NOT NULL
        CONSTRAINT DF_DicomTransmissionLogs_RetryCount DEFAULT (0);

IF COL_LENGTH('dbo.DicomTransmissionLogs', 'NextRetryAt') IS NULL
    ALTER TABLE dbo.DicomTransmissionLogs ADD NextRetryAt datetime2 NULL;

GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_DicomTransmissionLogs_DeduplicationKey'
      AND object_id = OBJECT_ID('dbo.DicomTransmissionLogs'))
BEGIN
    CREATE UNIQUE INDEX UX_DicomTransmissionLogs_DeduplicationKey
        ON dbo.DicomTransmissionLogs (DeduplicationKey)
        WHERE DeduplicationKey IS NOT NULL AND IsDeleted = 0;
END;
