-- 168: Lịch sử CHUYỂN KHOA nội trú (#218 / T3).
--
-- `DepartmentTransferDto` vốn đã nhận bốn trường bàn giao lâm sàng — TransferReason,
-- DiagnosisOnTransfer, TreatmentSummary, ReceivingDoctorId — nhưng `TransferDepartmentAsync`
-- không đọc trường nào và không có bảng nào chứa chúng. Đo được ở
-- evidence/cross/t3/t3_transfer_department.json: dò 22 cột chữ của Admissions + MedicalRecords,
-- không cột nào giữ lại chuỗi bàn giao. Tức là bác sĩ viết tóm tắt điều trị lúc bàn giao xong nó
-- mất hẳn, mà API vẫn trả 200.
--
-- Bảng này giữ lại phần bàn giao đó, đồng thời cho biết một lượt nội trú đã đi qua những khoa nào.
-- Idempotent: chỉ tạo nếu chưa có. CreatedBy/UpdatedBy nvarchar → không cần ValueConverter.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DepartmentTransfers')
BEGIN
    CREATE TABLE DepartmentTransfers (
        Id                  uniqueidentifier NOT NULL CONSTRAINT PK_DepartmentTransfers PRIMARY KEY,
        AdmissionId         uniqueidentifier NOT NULL,

        FromDepartmentId    uniqueidentifier NOT NULL,
        FromRoomId          uniqueidentifier NULL,
        FromBedId           uniqueidentifier NULL,

        ToDepartmentId      uniqueidentifier NOT NULL,
        ToRoomId            uniqueidentifier NULL,
        ToBedId             uniqueidentifier NULL,

        TransferredAt       datetime2        NOT NULL,
        ReceivingDoctorId   uniqueidentifier NULL,

        TransferReason      nvarchar(max)    NULL,
        DiagnosisOnTransfer nvarchar(max)    NULL,
        TreatmentSummary    nvarchar(max)    NULL,

        CreatedAt           datetime2        NOT NULL,
        CreatedBy           nvarchar(max)    NULL,
        UpdatedAt           datetime2        NULL,
        UpdatedBy           nvarchar(max)    NULL,
        IsDeleted           bit              NOT NULL CONSTRAINT DF_DepartmentTransfers_IsDeleted DEFAULT (0)
    );
    CREATE INDEX IX_DepartmentTransfers_AdmissionId ON DepartmentTransfers(AdmissionId);
END
