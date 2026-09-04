-- 182: nộp tạm ứng thu tại khoa về quỹ, và chỗ để giữ thông số kỹ thuật của xét nghiệm (#218 / T3).
--
-- ─────────────────────────────────────────────────────────────────────────────────────────────
-- 1. `DepartmentDepositBatches` + `Deposits.HandoverBatchId`
--
--    `CreateDepartmentDepositAsync` ĐỌC thật (tra khoa, tra các phiếu tạm ứng, cộng tổng tiền) rồi
--    **không ghi gì**: sinh mã biên lai `TUK{yyyyMMddHHmmssfff}` và trả DTO. Điều dưỡng nộp tiền tạm
--    ứng thu tại khoa về quỹ bệnh viện, phần mềm in ra mã biên lai, và **không dòng nào ghi lại rằng
--    số tiền ấy đã được nộp**. Hệ quả: nộp lại đúng những phiếu ấy lần nữa vẫn được, và khi đối chiếu
--    quỹ thì không tra ra ai nộp cái gì lúc nào.
--
--    KHÔNG mượn `Deposits.Status` làm dấu đã-nộp. Cột đó đang có **lệch nghĩa đã biết mà cố ý chưa
--    sửa** (giá trị 3 được đường ghi đặt là "đã tiêu hết" nhưng mọi báo cáo đọc là "đã hoàn tiền" —
--    xem `StatusConstants.DepositStatus`). Thêm một nghĩa thứ ba vào đó là lặp lại đúng hình dạng đã
--    làm hỏng số liệu tử vong ở migration 178.
--
-- 2. Cột kỹ thuật của xét nghiệm trên `Services`
--
--    `SaveLabTestAsync` là `return new LabTestCatalogDto { Code = dto.Code, Name = dto.Name };` —
--    danh mục xét nghiệm không lưu được. Đường đọc `GetLabTestCatalogAsync` lấy từ `Services` với
--    `ServiceType = 2`, nên bảng đã có. Nhưng `SaveLabTestDto` mang theo `EnglishName`, `ResultType`,
--    `ResultOptions`, `DecimalPlaces`, `SampleType`, `TubeType` mà `Services` **không có ô nào để
--    giữ**. Lưu rồi im lặng bỏ mất mấy trường ấy thì đúng vào họ lỗi mà cả đợt này đang chữa: người
--    dùng nhập, phần mềm báo xong, dữ liệu không đến đâu.
--
--    Đây là thông số quyết định cách nhập và hiển thị kết quả: `ResultType`/`DecimalPlaces` quyết
--    định kết quả là số hay chữ và làm tròn mấy chữ số; `SampleType`/`TubeType` là loại bệnh phẩm và
--    ống lấy máu in trên nhãn dán.
-- ─────────────────────────────────────────────────────────────────────────────────────────────
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DepartmentDepositBatches')
BEGIN
    CREATE TABLE DepartmentDepositBatches (
        Id             uniqueidentifier NOT NULL PRIMARY KEY,
        ReceiptCode    nvarchar(50)     NOT NULL,
        DepartmentId   uniqueidentifier NOT NULL,
        SubmittedById  uniqueidentifier NULL,
        SubmittedAt    datetime2        NOT NULL,
        DepositCount   int              NOT NULL DEFAULT 0,
        TotalAmount    decimal(18,2)    NOT NULL DEFAULT 0,
        ReceivedById   uniqueidentifier NULL,
        ReceivedAt     datetime2        NULL,
        Note           nvarchar(500)    NULL,
        CreatedAt      datetime2        NOT NULL,
        CreatedBy      nvarchar(100)    NULL,
        UpdatedAt      datetime2        NULL,
        UpdatedBy      nvarchar(100)    NULL,
        IsDeleted      bit              NOT NULL DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_DepartmentDepositBatches_Code')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'DepartmentDepositBatches')
BEGIN
    CREATE UNIQUE INDEX UX_DepartmentDepositBatches_Code
        ON DepartmentDepositBatches(ReceiptCode) WHERE IsDeleted = 0;
END
GO

IF COL_LENGTH('dbo.Deposits', 'HandoverBatchId') IS NULL
BEGIN
    ALTER TABLE Deposits ADD HandoverBatchId uniqueidentifier NULL;
    ALTER TABLE Deposits ADD HandoverAt datetime2 NULL;
END
GO

IF COL_LENGTH('dbo.Services', 'ResultType') IS NULL
BEGIN
    ALTER TABLE Services ADD EnglishName nvarchar(300) NULL;
    -- 'Numeric' · 'Text' · 'Selection' — quyết định cách nhập và hiển thị kết quả.
    ALTER TABLE Services ADD ResultType nvarchar(20) NULL;
    ALTER TABLE Services ADD ResultOptions nvarchar(1000) NULL;
    ALTER TABLE Services ADD DecimalPlaces int NULL;
    -- Loại bệnh phẩm và loại ống lấy máu — in trên nhãn dán ống.
    ALTER TABLE Services ADD SampleType nvarchar(100) NULL;
    ALTER TABLE Services ADD TubeType nvarchar(100) NULL;
END
GO
