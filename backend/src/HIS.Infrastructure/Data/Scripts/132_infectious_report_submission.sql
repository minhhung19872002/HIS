-- Migration 132: InfectiousReportSubmissions (#156 — ca bệnh truyền nhiễm đã gửi báo cáo Sở Y tế)
-- Idempotent: tạo bảng nếu chưa có. Applied by ProductionSchemaRepairRunner on startup.

IF OBJECT_ID('InfectiousReportSubmissions', 'U') IS NULL
BEGIN
    CREATE TABLE InfectiousReportSubmissions (
        Id            UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        ExaminationId UNIQUEIDENTIFIER NOT NULL,
        SubmittedAt   DATETIME2        NOT NULL,
        CreatedAt     DATETIME2        NOT NULL,
        CreatedBy     NVARCHAR(450)    NULL,
        UpdatedAt     DATETIME2        NULL,
        UpdatedBy     NVARCHAR(450)    NULL,
        IsDeleted     BIT              NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_InfectiousReportSubmissions_ExaminationId ON InfectiousReportSubmissions(ExaminationId);
END
