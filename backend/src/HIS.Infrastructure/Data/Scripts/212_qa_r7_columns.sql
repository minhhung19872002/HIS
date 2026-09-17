-- 212 (QA round 7, 2026-09-17): cột mới cho các chỗ vòng 6 để mở.
--
-- 1. SurgeryRequests.SurgeryServiceId — dịch vụ PTTT chọn lúc tạo phiếu mổ (trước đây bị bỏ → ca mổ không tính tiền).
-- 2. Receipts.RefundApprovedBy/RefundApprovedAt — người/giờ duyệt phiếu hoàn (trước chỉ ghi trong Note).
-- Tất cả đều nullable, idempotent; entity đọc các cột này nên script phải chạy trước khi app truy vấn.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.SurgeryRequests', 'SurgeryServiceId') IS NULL
BEGIN
    ALTER TABLE SurgeryRequests ADD SurgeryServiceId uniqueidentifier NULL;
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_SurgeryRequests_Services_SurgeryServiceId')
BEGIN
    ALTER TABLE SurgeryRequests WITH CHECK ADD CONSTRAINT FK_SurgeryRequests_Services_SurgeryServiceId
        FOREIGN KEY (SurgeryServiceId) REFERENCES Services(Id);
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SurgeryRequests_SurgeryServiceId' AND object_id = OBJECT_ID('dbo.SurgeryRequests'))
BEGIN
    CREATE INDEX IX_SurgeryRequests_SurgeryServiceId ON SurgeryRequests(SurgeryServiceId);
END
GO

IF COL_LENGTH('dbo.Receipts', 'RefundApprovedBy') IS NULL
    ALTER TABLE dbo.Receipts ADD RefundApprovedBy UNIQUEIDENTIFIER NULL;
GO
IF COL_LENGTH('dbo.Receipts', 'RefundApprovedAt') IS NULL
    ALTER TABLE dbo.Receipts ADD RefundApprovedAt DATETIME2 NULL;
GO

-- 3. MedicalStaffs.DateOfBirth/Gender — form nhân sự gửi nhưng không có cột (MedicalHRServiceImpl đọc/ghi bằng SQL
--    thô qua ExtendedWorkflowSqlGuard nên chạy được cả trước lẫn sau khi có cột).
IF COL_LENGTH('dbo.MedicalStaffs', 'DateOfBirth') IS NULL
    ALTER TABLE dbo.MedicalStaffs ADD DateOfBirth DATE NULL;
GO
IF COL_LENGTH('dbo.MedicalStaffs', 'Gender') IS NULL
    ALTER TABLE dbo.MedicalStaffs ADD Gender NVARCHAR(20) NULL;
GO
