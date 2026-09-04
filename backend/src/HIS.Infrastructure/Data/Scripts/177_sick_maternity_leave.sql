-- 177: bảng GIẤY NGHỈ ỐM và GIẤY NGHỈ THAI SẢN (#218 / T3, nhóm B).
--
-- `CreateSickLeaveAsync` và `CreateMaternityLeaveAsync` trước đây là hàm rỗng: trả về một DTO với
-- `Id = Guid.NewGuid()` rồi thôi, không ghi dòng nào. Người dùng cấp giấy, giao diện báo thành công,
-- và bệnh viện **không giữ lại bản ghi nào** về tờ giấy vừa cấp. Đo được ở
-- evidence/cross/t3/t3_write_stub_sweep.py (khảo sát) và t3_leave_certificates.py (bài đo).
--
-- Đây là giấy tờ để người bệnh **hưởng chế độ BHXH** (mẫu C65-HD theo TT 56/2017). Không có bản ghi
-- thì cơ sở khám chữa bệnh không tra cứu lại được đã cấp cho ai, bao nhiêu ngày, và không đối chiếu
-- được khi cơ quan BHXH hỏi.
--
-- Hai điểm thiết kế đáng nói:
--
-- 1. **Chụp lại chẩn đoán tại thời điểm cấp** (`DiagnosisCode` / `DiagnosisName`) thay vì đọc động
--    từ lượt khám. Giấy đã cấp là một tuyên bố đóng băng tại một thời điểm; nếu sau đó bác sĩ sửa
--    chẩn đoán của lượt khám thì tờ giấy đã phát ra tay người bệnh không được đổi theo. Đây đúng bài
--    học của §27 và §33 trong đợt này.
-- 2. **`CertificateNumber` duy nhất** — đó là số cơ quan BHXH dùng để định danh tờ giấy.
--
-- Idempotent (IF NOT EXISTS), theo đúng quy ước migration của dự án.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SickLeaves')
BEGIN
    CREATE TABLE SickLeaves (
        Id                uniqueidentifier NOT NULL PRIMARY KEY,
        CertificateNumber nvarchar(50)     NOT NULL,
        ExaminationId     uniqueidentifier NOT NULL,
        MedicalRecordId   uniqueidentifier NULL,
        PatientId         uniqueidentifier NOT NULL,
        Days              int              NOT NULL,
        FromDate          datetime2        NOT NULL,
        ToDate            datetime2        NOT NULL,
        Reason            nvarchar(1000)   NULL,
        -- Chẩn đoán CHỤP LẠI lúc cấp, không đọc động từ lượt khám.
        DiagnosisCode     nvarchar(20)     NULL,
        DiagnosisName     nvarchar(500)    NULL,
        InsuranceNumber   nvarchar(50)     NULL,
        Workplace         nvarchar(500)    NULL,
        IssuedByDoctorId  uniqueidentifier NULL,
        IssuedAt          datetime2        NOT NULL,
        CreatedAt         datetime2        NOT NULL,
        CreatedBy         nvarchar(100)    NULL,
        UpdatedAt         datetime2        NULL,
        UpdatedBy         nvarchar(100)    NULL,
        IsDeleted         bit              NOT NULL DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_SickLeaves_CertificateNumber')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'SickLeaves')
BEGIN
    CREATE UNIQUE INDEX UX_SickLeaves_CertificateNumber
        ON SickLeaves(CertificateNumber) WHERE IsDeleted = 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SickLeaves_ExaminationId')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'SickLeaves')
BEGIN
    CREATE INDEX IX_SickLeaves_ExaminationId ON SickLeaves(ExaminationId);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MaternityLeaves')
BEGIN
    CREATE TABLE MaternityLeaves (
        Id                uniqueidentifier NOT NULL PRIMARY KEY,
        CertificateNumber nvarchar(50)     NOT NULL,
        ExaminationId     uniqueidentifier NOT NULL,
        MedicalRecordId   uniqueidentifier NULL,
        PatientId         uniqueidentifier NOT NULL,
        Days              int              NOT NULL,
        FromDate          datetime2        NOT NULL,
        ToDate            datetime2        NOT NULL,
        GestationalWeeks  int              NULL,
        Reason            nvarchar(1000)   NULL,
        DiagnosisCode     nvarchar(20)     NULL,
        DiagnosisName     nvarchar(500)    NULL,
        InsuranceNumber   nvarchar(50)     NULL,
        Workplace         nvarchar(500)    NULL,
        IssuedByDoctorId  uniqueidentifier NULL,
        IssuedAt          datetime2        NOT NULL,
        CreatedAt         datetime2        NOT NULL,
        CreatedBy         nvarchar(100)    NULL,
        UpdatedAt         datetime2        NULL,
        UpdatedBy         nvarchar(100)    NULL,
        IsDeleted         bit              NOT NULL DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_MaternityLeaves_CertificateNumber')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'MaternityLeaves')
BEGIN
    CREATE UNIQUE INDEX UX_MaternityLeaves_CertificateNumber
        ON MaternityLeaves(CertificateNumber) WHERE IsDeleted = 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MaternityLeaves_ExaminationId')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'MaternityLeaves')
BEGIN
    CREATE INDEX IX_MaternityLeaves_ExaminationId ON MaternityLeaves(ExaminationId);
END
GO
