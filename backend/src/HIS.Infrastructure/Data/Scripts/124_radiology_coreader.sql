-- 124_radiology_coreader.sql
-- Module RIS dong doc (#139): tao bang RadiologyReportCoReaders
-- Idempotent: bao boc toan bo trong IF OBJECT_ID IS NULL

IF OBJECT_ID(N'dbo.RadiologyReportCoReaders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RadiologyReportCoReaders (
        Id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        -- Soft-ref sang RadiologyReports (khong FK cuong de tranh cascade)
        RadiologyReportId   UNIQUEIDENTIFIER NOT NULL,
        ReaderId            UNIQUEIDENTIFIER NOT NULL,
        ReaderName          NVARCHAR(256)    NULL,
        -- CoReader | Consultant | Supervisor
        Role                NVARCHAR(100)    NULL,
        Opinion             NVARCHAR(MAX)    NULL,
        -- copy-from workflow: Guid cua report nguon
        CopiedFromReportId  UNIQUEIDENTIFIER NULL,
        -- Audit cols: NVARCHAR(450) NULL (tranh ValueConverter Guid/String)
        CreatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(450)    NULL,
        UpdatedAt           DATETIME2        NULL,
        UpdatedBy           NVARCHAR(450)    NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_RadiologyReportCoReaders PRIMARY KEY (Id)
    );

    CREATE INDEX IX_RadiologyReportCoReaders_ReportId
        ON dbo.RadiologyReportCoReaders (RadiologyReportId)
        WHERE IsDeleted = 0;
END
