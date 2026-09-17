-- 211 (QA round 6, 2026-09-17): sửa dữ liệu + lược đồ phát hiện ở vòng 6.
--
-- 1. Phiếu lĩnh thuốc nội trú cũ (XKN…) không gắn đơn thuốc: hủy phát đơn không trả thuốc về kho.
--    Code đã sửa (mỗi đơn một phiếu có PrescriptionId); ở đây chỉ gắn lại các phiếu cũ KHỚP DUY NHẤT
--    một đơn (cùng thời điểm phát + cùng khoa). Phiếu không khớp đúng một đơn để nguyên cho người xem tay.
-- 2. SchoolHealthExams.GradeLevel là int trong DB nhưng entity là chuỗi ("Lớp 1-12") → gửi chữ là 500.
--    Chỉ đổi khi cột còn là int.
-- Số phiếu thu / tạm ứng trùng khi hai quầy cấp cùng lúc được chặn bằng applock trong code, KHÔNG bằng
-- unique index có filter: 204_billing_collect_all đã cố ý bỏ filtered index trên Receipts vì mọi phiên
-- sqlcmd (QUOTED_IDENTIFIER OFF) ghi vào bảng sẽ lỗi 1934. Nếu lỡ tạo ở bản nháp của 211 thì gỡ lại.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.DataFixMarkers', N'U') IS NULL
    CREATE TABLE dbo.DataFixMarkers (
        Name      NVARCHAR(200)  NOT NULL CONSTRAINT PK_DataFixMarkers PRIMARY KEY,
        AppliedAt DATETIME2      NOT NULL CONSTRAINT DF_DataFixMarkers_AppliedAt DEFAULT SYSUTCDATETIME(),
        Note      NVARCHAR(4000) NULL
    );
GO

IF NOT EXISTS (SELECT 1 FROM dbo.DataFixMarkers WHERE Name = N'211_qa_r6_xkn_relink')
BEGIN
    UPDATE e SET
        e.PrescriptionId  = p.Id,
        e.MedicalRecordId = p.MedicalRecordId,
        e.PatientId       = mr.PatientId
    FROM dbo.ExportReceipts e
    JOIN dbo.Prescriptions p
      ON p.PrescriptionType = 2 AND p.DispensedAt = e.ReceiptDate AND p.DepartmentId = e.ToDepartmentId
    JOIN dbo.MedicalRecords mr ON mr.Id = p.MedicalRecordId
    WHERE e.ExportType = 2 AND e.PrescriptionId IS NULL AND e.ReceiptCode LIKE N'XKN%' AND e.IsDeleted = 0
      AND (SELECT COUNT(*) FROM dbo.Prescriptions p2
           WHERE p2.PrescriptionType = 2 AND p2.DispensedAt = e.ReceiptDate
             AND p2.DepartmentId = e.ToDepartmentId) = 1;

    INSERT INTO dbo.DataFixMarkers (Name, Note)
    VALUES (N'211_qa_r6_xkn_relink', N'relinked=' + CAST(@@ROWCOUNT AS NVARCHAR(10)));
END
GO

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_NAME = N'SchoolHealthExams' AND COLUMN_NAME = N'GradeLevel' AND DATA_TYPE = N'int')
    ALTER TABLE dbo.SchoolHealthExams ALTER COLUMN GradeLevel NVARCHAR(20) NULL;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Deposits_ReceiptNumber' AND object_id = OBJECT_ID(N'dbo.Deposits'))
    DROP INDEX UX_Deposits_ReceiptNumber ON dbo.Deposits;
GO
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Receipts_ReceiptCode' AND object_id = OBJECT_ID(N'dbo.Receipts'))
    DROP INDEX UX_Receipts_ReceiptCode ON dbo.Receipts;
GO
