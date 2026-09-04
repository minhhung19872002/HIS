-- 178: số chuyển tuyến + bảng yêu cầu SAO CHỤP hồ sơ, và tách lý do từ chối chuyển tuyến ra khỏi
-- hướng dẫn sau xuất viện (#218 / T3, nhóm B).
--
-- Ba việc trong một migration vì cùng thuộc module kế hoạch tổng hợp hồ sơ:
--
-- 1. `Discharges.TransferNumber` — `AssignTransferNumberAsync` (cấp số chuyển tuyến) trước đây là
--    hàm rỗng: `await Task.CompletedTask` rồi trả DTO. Mà "hồ sơ chuyển tuyến" trong hệ thống chính
--    là dòng `Discharges` có `DischargeType = 2`, và bảng đó **không có ô nào để giữ số chuyển
--    tuyến**. Cấp số xong không lưu được ở đâu.
--
-- 2. `Discharges.TransferRejectReason` — `ApproveTransferAsync` khi TỪ CHỐI ghi lý do vào
--    `DischargeInstructions`, tức **hướng dẫn sau xuất viện cho người bệnh**. Đây là lần thứ tư
--    trong đợt gặp đúng hình dạng "lý do ghi đè nội dung lâm sàng" (§27 kết luận khám, §30 ghi chú
--    phiếu mổ, §23 tóm tắt ra viện). Tách ra ô riêng.
--
-- 3. `RecordCopyRequests` — `CreateRecordCopyAsync` (yêu cầu sao chụp hồ sơ bệnh án) cũng là hàm
--    rỗng, và **chưa có bảng nào**. Sao chụp hồ sơ là việc phải lưu vết theo TT 46/2018: ai xin,
--    mục đích gì, bao nhiêu bản, ai duyệt.
--
-- Idempotent theo quy ước dự án. Có chỉ mục lọc (WHERE IsDeleted = 0) nên cần QUOTED_IDENTIFIER ON.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.Discharges', 'TransferNumber') IS NULL
BEGIN
    ALTER TABLE Discharges ADD TransferNumber nvarchar(50) NULL;
END
GO

IF COL_LENGTH('dbo.Discharges', 'TransferNumberAssignedAt') IS NULL
BEGIN
    ALTER TABLE Discharges ADD TransferNumberAssignedAt datetime2 NULL;
END
GO

IF COL_LENGTH('dbo.Discharges', 'TransferRejectReason') IS NULL
BEGIN
    ALTER TABLE Discharges ADD TransferRejectReason nvarchar(1000) NULL;
END
GO

-- 2b. `Discharges.TransferStatus` — duyệt chuyển tuyến thôi ghi đè KẾT CỤC ĐIỀU TRỊ của người bệnh.
--
--     `DischargeCondition` được entity định nghĩa rõ là tình trạng người bệnh lúc ra viện:
--     1 khỏi · 2 đỡ · 3 không thay đổi · 4 nặng hơn · 5 tử vong. Và nó được đọc ở đúng nghĩa đó
--     bởi các báo cáo bệnh viện:
--
--         HospitalReportService.Part2.cs:426-430        đếm Khỏi/Đỡ/Không đổi/Nặng hơn/Tử vong
--         SystemCompleteService.M16.Statistics.cs:113   RecoveredCount/ImprovedCount/DeathCount
--         SystemCompleteService.M16.Statistics.cs:417   `DischargeCondition == 5` = số ca TỬ VONG
--         ReportingCompleteService.Part2.cs:356         đếm ca nặng lên
--         PdfGenerationService.cs:329                   in ra giấy tờ
--
--     Nhưng `ApproveTransferAsync` lại mượn chính cột ấy làm trạng thái duyệt hồ sơ:
--
--         discharge.DischargeCondition = dto.Approve ? 1 : 2;
--
--     tức **duyệt một phiếu chuyển tuyến thì ghi kết cục người bệnh thành "Khỏi"**, từ chối thì
--     thành "Đỡ" — vào đúng con số bệnh viện báo lên cơ quan quản lý. Chiều đọc ngược cũng sai:
--     `GetTransfersAsync` diễn giải cột lâm sàng này thành trạng thái hồ sơ, nên người bệnh
--     chuyển tuyến có kết cục tử vong (5) hoặc nặng hơn (4) hiện trên màn chuyển tuyến thành
--     "Hoàn thành". Và `GetStatsAsync` đếm `DischargeCondition == 0` là "chờ duyệt", trong khi 0
--     còn không nằm trong dải lâm sàng 1..5.
--
--     Lần thứ năm của khuôn "mượn cột trạng thái của tính năng khác", và là lần đắt nhất vì nó
--     làm sai số liệu tử vong/khỏi bệnh. Tách cột.
IF COL_LENGTH('dbo.Discharges', 'TransferStatus') IS NULL
BEGIN
    -- 0 chờ duyệt · 1 đã duyệt · 2 từ chối · 3 hoàn thành. NULL = chưa vào luồng duyệt chuyển tuyến.
    ALTER TABLE Discharges ADD TransferStatus int NULL;
    ALTER TABLE Discharges ADD TransferApprovedAt datetime2 NULL;
    ALTER TABLE Discharges ADD TransferApprovedById uniqueidentifier NULL;
END
GO

-- Chuyển dữ liệu cũ sang cột mới, và trả `DischargeCondition` về đúng nghĩa lâm sàng ở những
-- dòng đã bị luồng duyệt chuyển tuyến ghi đè. Chỉ đụng phiếu CHUYỂN TUYẾN (DischargeType = 2) —
-- phiếu ra viện thường không bao giờ đi qua `ApproveTransferAsync` nên không được phép sửa.
--
-- Giá trị 0 thì chắc chắn là của luồng duyệt (0 không nằm trong dải lâm sàng 1..5) ⇒ chuyển sang
-- TransferStatus rồi trả DischargeCondition về NULL-nghĩa-chưa-ghi, biểu diễn bằng 3 "không thay
-- đổi" — trung tính, không tự nhận người bệnh đã khỏi và cũng không khai tử ai.
-- Giá trị 1/2 thì KHÔNG suy đoán được: có thể là kết cục lâm sàng thật (khỏi/đỡ), cũng có thể là
-- dấu vết của lỗi này. Cố ý KHÔNG sửa — sửa mò một con số lâm sàng còn tệ hơn để nguyên. Chỉ
-- điền TransferStatus để màn hình thôi đọc nhầm cột.
IF COL_LENGTH('dbo.Discharges', 'TransferStatus') IS NOT NULL
BEGIN
    UPDATE Discharges SET TransferStatus = 0, DischargeCondition = 3
    WHERE DischargeType = 2 AND TransferStatus IS NULL AND DischargeCondition = 0;

    UPDATE Discharges SET TransferStatus = DischargeCondition
    WHERE DischargeType = 2 AND TransferStatus IS NULL AND DischargeCondition IN (1, 2);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RecordCopyRequests')
BEGIN
    CREATE TABLE RecordCopyRequests (
        Id              uniqueidentifier NOT NULL PRIMARY KEY,
        CopyCode        nvarchar(50)     NOT NULL,
        MedicalRecordId uniqueidentifier NOT NULL,
        Requester       nvarchar(200)    NULL,
        Purpose         nvarchar(1000)   NULL,
        CopyCount       int              NOT NULL DEFAULT 1,
        RequestDate     datetime2        NOT NULL,
        RequestedById   uniqueidentifier NULL,
        -- 0 chờ xử lý · 1 đã duyệt · 2 đã giao bản sao · 3 từ chối
        Status          int              NOT NULL DEFAULT 0,
        RejectReason    nvarchar(1000)   NULL,
        HandedOverAt    datetime2        NULL,
        CreatedAt       datetime2        NOT NULL,
        CreatedBy       nvarchar(100)    NULL,
        UpdatedAt       datetime2        NULL,
        UpdatedBy       nvarchar(100)    NULL,
        IsDeleted       bit              NOT NULL DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_RecordCopyRequests_CopyCode')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'RecordCopyRequests')
BEGIN
    CREATE UNIQUE INDEX UX_RecordCopyRequests_CopyCode
        ON RecordCopyRequests(CopyCode) WHERE IsDeleted = 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RecordCopyRequests_MedicalRecordId')
   AND EXISTS (SELECT * FROM sys.tables WHERE name = 'RecordCopyRequests')
BEGIN
    CREATE INDEX IX_RecordCopyRequests_MedicalRecordId
        ON RecordCopyRequests(MedicalRecordId);
END
GO

-- 4. Bàn giao hồ sơ có cột trạng thái RIÊNG, thôi mượn `MedicalRecordArchives.Status`.
--
--    `Status` của bảng lưu trữ đang bị hai tính năng đọc theo hai bộ nghĩa xung đột:
--
--        giá trị │ kho lưu trữ (MedicalRecordArchiveService) │ màn bàn giao (GetHandoverStatusName)
--        ────────┼───────────────────────────────────────────┼──────────────────────────────────────
--           0    │ chờ lưu                                   │ nháp
--           1    │ đã lưu                                    │ đã gửi
--           2    │ ĐANG MƯỢN                                 │ ĐÃ DUYỆT
--           3    │ (không dùng)                              │ từ chối
--
--    Hậu quả có thật ngay hôm nay, chưa cần vá gì: hồ sơ đang cho mượn (`Status = 2`) hiện trên
--    màn bàn giao thành "Đã duyệt", và `GetStatsAsync` đếm nó vào `completedHandovers`.
--    Và đây là cái bẫy: nếu cứ theo chú thích DTO mà cho `ApproveHandoverAsync` ghi `Status = 2`
--    thì mỗi lần duyệt bàn giao sẽ **đánh dấu hồ sơ thành đang-cho-mượn**, hỏng luôn luồng mượn/trả.
--
--    Đây là lần thứ tư trong đợt gặp hình dạng "mượn cột trạng thái của tính năng khác"
--    (§13 `Deposits.Status`, §21 `Admissions.Status`, §33). Cách chữa vẫn thế: tách cột.
IF COL_LENGTH('dbo.MedicalRecordArchives', 'HandoverStatus') IS NULL
BEGIN
    -- 0 nháp · 1 đã gửi · 2 đã duyệt · 3 từ chối. NULL = chưa vào luồng bàn giao.
    ALTER TABLE MedicalRecordArchives ADD HandoverStatus int NULL;
END
GO

IF COL_LENGTH('dbo.MedicalRecordArchives', 'HandoverSubmittedAt') IS NULL
BEGIN
    ALTER TABLE MedicalRecordArchives ADD HandoverSubmittedAt datetime2 NULL;
    ALTER TABLE MedicalRecordArchives ADD HandoverSubmittedById uniqueidentifier NULL;
    ALTER TABLE MedicalRecordArchives ADD HandoverApprovedAt datetime2 NULL;
    ALTER TABLE MedicalRecordArchives ADD HandoverApprovedById uniqueidentifier NULL;
    ALTER TABLE MedicalRecordArchives ADD HandoverNote nvarchar(1000) NULL;
    ALTER TABLE MedicalRecordArchives ADD HandoverRejectReason nvarchar(1000) NULL;
END
GO
