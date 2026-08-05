-- Canonical DICOM provenance on DicomStudies.
-- Required before auto-send rules may filter on Source AE Title / department: without these
-- columns the filters cannot be evaluated and are rejected fail-closed.
-- Idempotent: safe for startup schema repair and repeated deployments.
-- Filtered indexes below require these SET options; sqlcmd does not enable them by default.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.DicomStudies', 'SourceAeTitle') IS NULL
    ALTER TABLE dbo.DicomStudies ADD SourceAeTitle nvarchar(16) NULL;

IF COL_LENGTH('dbo.DicomStudies', 'SourceOrigin') IS NULL
    ALTER TABLE dbo.DicomStudies ADD SourceOrigin nvarchar(24) NULL;

IF COL_LENGTH('dbo.DicomStudies', 'SourceIpAddress') IS NULL
    ALTER TABLE dbo.DicomStudies ADD SourceIpAddress nvarchar(64) NULL;

IF COL_LENGTH('dbo.DicomStudies', 'StationName') IS NULL
    ALTER TABLE dbo.DicomStudies ADD StationName nvarchar(32) NULL;

IF COL_LENGTH('dbo.DicomStudies', 'DepartmentCode') IS NULL
    ALTER TABLE dbo.DicomStudies ADD DepartmentCode nvarchar(32) NULL;

IF COL_LENGTH('dbo.DicomStudies', 'SourceResolvedAt') IS NULL
    ALTER TABLE dbo.DicomStudies ADD SourceResolvedAt datetime2 NULL;

GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_DicomStudies_SourceAeTitle'
      AND object_id = OBJECT_ID('dbo.DicomStudies'))
BEGIN
    CREATE INDEX IX_DicomStudies_SourceAeTitle
        ON dbo.DicomStudies (SourceAeTitle)
        WHERE SourceAeTitle IS NOT NULL AND IsDeleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_DicomStudies_DepartmentCode'
      AND object_id = OBJECT_ID('dbo.DicomStudies'))
BEGIN
    CREATE INDEX IX_DicomStudies_DepartmentCode
        ON dbo.DicomStudies (DepartmentCode)
        WHERE DepartmentCode IS NOT NULL AND IsDeleted = 0;
END;
