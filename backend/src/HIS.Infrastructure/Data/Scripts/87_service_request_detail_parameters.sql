-- 87: Bảng chỉ số con KQ XN per-parameter (R1 conformance 2026-06-09).
-- Gắn ServiceRequestDetail (model 1). SRD.Result (chuỗi) giữ nguyên — bảng này thuần additive.
-- Idempotent.

IF OBJECT_ID('ServiceRequestDetailParameters', 'U') IS NULL
BEGIN
    CREATE TABLE ServiceRequestDetailParameters (
        Id                     uniqueidentifier NOT NULL CONSTRAINT PK_SRDParameters PRIMARY KEY,
        ServiceRequestDetailId uniqueidentifier NOT NULL,
        ParameterCode          nvarchar(50)     NOT NULL CONSTRAINT DF_SRDParam_Code DEFAULT (''),
        ParameterName          nvarchar(200)    NOT NULL CONSTRAINT DF_SRDParam_Name DEFAULT (''),
        Value                  nvarchar(100)    NULL,
        NumericValue           decimal(18,4)    NULL,
        Unit                   nvarchar(50)     NULL,
        ReferenceMin           decimal(18,4)    NULL,
        ReferenceMax           decimal(18,4)    NULL,
        ReferenceRange         nvarchar(100)    NULL,
        Flag                   nvarchar(4)      NULL,   -- N/H/L/HH/LL
        SequenceNumber         int              NOT NULL CONSTRAINT DF_SRDParam_Seq DEFAULT (0),
        CreatedAt              datetime2        NOT NULL,
        CreatedBy              nvarchar(450)    NULL,
        UpdatedAt              datetime2        NULL,
        UpdatedBy              nvarchar(450)    NULL,
        IsDeleted              bit              NOT NULL CONSTRAINT DF_SRDParam_IsDeleted DEFAULT (0)
    );
END

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_SRDParam_ServiceRequestDetail')
AND OBJECT_ID('ServiceRequestDetailParameters', 'U') IS NOT NULL
AND OBJECT_ID('ServiceRequestDetails', 'U') IS NOT NULL
BEGIN
    ALTER TABLE ServiceRequestDetailParameters
        ADD CONSTRAINT FK_SRDParam_ServiceRequestDetail
        FOREIGN KEY (ServiceRequestDetailId) REFERENCES ServiceRequestDetails(Id);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SRDParam_DetailId' AND object_id = OBJECT_ID('ServiceRequestDetailParameters'))
AND OBJECT_ID('ServiceRequestDetailParameters', 'U') IS NOT NULL
BEGIN
    CREATE INDEX IX_SRDParam_DetailId ON ServiceRequestDetailParameters(ServiceRequestDetailId);
END
