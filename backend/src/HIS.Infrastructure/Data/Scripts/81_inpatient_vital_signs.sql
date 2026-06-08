-- 78: Bảng dấu hiệu sinh tồn nội trú (audit luồng nghiệp vụ 2026-06-06 #3).
-- Trước đây CreateVitalSignsAsync/GetVitalSignsChartAsync là stub in-memory → dữ liệu mất.
-- Idempotent: chỉ tạo nếu chưa có.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InpatientVitalSigns')
BEGIN
    CREATE TABLE InpatientVitalSigns (
        Id              uniqueidentifier NOT NULL CONSTRAINT PK_InpatientVitalSigns PRIMARY KEY,
        AdmissionId     uniqueidentifier NOT NULL,
        RecordTime      datetime2        NOT NULL,
        Temperature     decimal(18,2)    NULL,
        Pulse           int              NULL,
        RespiratoryRate int              NULL,
        SystolicBP      int              NULL,
        DiastolicBP     int              NULL,
        SpO2            decimal(18,2)    NULL,
        Weight          decimal(18,2)    NULL,
        Height          decimal(18,2)    NULL,
        Notes           nvarchar(max)    NULL,
        RecordedBy      uniqueidentifier NOT NULL,
        CreatedAt       datetime2        NOT NULL,
        CreatedBy       nvarchar(max)    NULL,
        UpdatedAt       datetime2        NULL,
        UpdatedBy       nvarchar(max)    NULL,
        IsDeleted       bit              NOT NULL CONSTRAINT DF_InpatientVitalSigns_IsDeleted DEFAULT (0)
    );
    CREATE INDEX IX_InpatientVitalSigns_AdmissionId ON InpatientVitalSigns(AdmissionId);
END
