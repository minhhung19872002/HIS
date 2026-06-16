-- 130_payer_change_log.sql
-- Bảng audit mỗi lần đổi đối tượng thanh toán (BHYT / Viện phí / Dịch vụ).
-- Chống gian lận tiền: ghi vết From→To + chênh lệch tiền BN.
-- Idempotent: dùng IF NOT EXISTS / COL_LENGTH guards.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PayerChangeLogs')
BEGIN
    CREATE TABLE PayerChangeLogs (
        Id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID() PRIMARY KEY,
        -- FK hồ sơ bệnh án (nullable vì per-line có thể chưa biết record trực tiếp)
        MedicalRecordId UNIQUEIDENTIFIER NULL,
        -- FK dòng dịch vụ CLS/PTTT
        ServiceRequestDetailId UNIQUEIDENTIFIER NULL,
        -- FK dòng thuốc/VTYT
        PrescriptionDetailId   UNIQUEIDENTIFIER NULL,
        -- "record" | "service_line" | "drug_line"
        ChangeScope     NVARCHAR(30)  NOT NULL DEFAULT 'record',
        -- Đối tượng trước khi đổi (0=mixed/không xác định, 1=BHYT, 2=ViệnPhí, 3=DịchVụ, 4=KhámSK)
        FromObjectType  INT          NOT NULL,
        -- Đối tượng sau khi đổi
        ToObjectType    INT          NOT NULL,
        -- Lý do bắt buộc khi gọi API
        Reason          NVARCHAR(450) NULL,
        -- User thực hiện (không nullable — lấy từ JWT)
        ChangedBy       UNIQUEIDENTIFIER NOT NULL,
        -- Tiền BN trước khi đổi
        OldPatientAmount DECIMAL(18,2) NULL,
        -- Tiền BN sau khi đổi
        NewPatientAmount DECIMAL(18,2) NULL,
        -- Số dòng bị ảnh hưởng
        AffectedLineCount INT NOT NULL DEFAULT 1,
        -- BaseEntity audit columns
        CreatedAt       DATETIME2    NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy       NVARCHAR(450) NULL,
        UpdatedAt       DATETIME2    NULL,
        UpdatedBy       NVARCHAR(450) NULL,
        IsDeleted       BIT          NOT NULL DEFAULT 0
    );

    -- Index tra cứu lịch sử theo hồ sơ bệnh án
    CREATE INDEX IX_PayerChangeLogs_MedicalRecordId ON PayerChangeLogs (MedicalRecordId)
        WHERE MedicalRecordId IS NOT NULL;

    -- Index tra cứu theo user thực hiện (audit security)
    CREATE INDEX IX_PayerChangeLogs_ChangedBy ON PayerChangeLogs (ChangedBy);

    -- Index tra cứu theo dòng dịch vụ
    CREATE INDEX IX_PayerChangeLogs_ServiceRequestDetailId ON PayerChangeLogs (ServiceRequestDetailId)
        WHERE ServiceRequestDetailId IS NOT NULL;

    -- Index tra cứu theo dòng thuốc
    CREATE INDEX IX_PayerChangeLogs_PrescriptionDetailId ON PayerChangeLogs (PrescriptionDetailId)
        WHERE PrescriptionDetailId IS NOT NULL;

    PRINT '130_payer_change_log: Table PayerChangeLogs created.';
END
ELSE
BEGIN
    PRINT '130_payer_change_log: Table PayerChangeLogs already exists — skipped.';
END
