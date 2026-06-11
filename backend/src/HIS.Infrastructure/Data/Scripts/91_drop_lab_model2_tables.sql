-- ============================================================
-- #14e (2026-06-11, user duyệt): GỠ 3 bảng model 2 CLS đã chết
--   LabResults · LabRequestItems · LabRequests
-- Nguồn-sự-thật KQ XN = ServiceRequests/ServiceRequestDetails (+Parameters R1).
-- Dữ liệu trong 3 bảng này CHỈ do seed/demo tạo (khảo sát P0 2026-06-08 + verify 2026-06-11).
-- LƯU Ý: LabOrders/LabOrderItems (model 3 — module LIS raw-SQL) GIỮ NGUYÊN (gỡ ở #14e-B sau khi rewrite module).
-- Idempotent: chạy lại không lỗi.
-- ============================================================

-- 1. Drop mọi FK từ bảng KHÁC trỏ vào 3 bảng sắp gỡ (động — không bịa tên constraint)
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id))
    + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id))
    + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';' + CHAR(10)
FROM sys.foreign_keys fk
WHERE OBJECT_NAME(fk.referenced_object_id) IN ('LabRequests', 'LabRequestItems', 'LabResults');
IF @sql <> N''
BEGIN
    EXEC sp_executesql @sql;
    PRINT 'Dropped inbound FKs referencing model-2 lab tables';
END
GO

-- 2. Drop 3 bảng theo thứ tự con → cha
IF OBJECT_ID('dbo.LabResults', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[LabResults];
    PRINT 'Dropped table LabResults';
END
GO
IF OBJECT_ID('dbo.LabRequestItems', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[LabRequestItems];
    PRINT 'Dropped table LabRequestItems';
END
GO
IF OBJECT_ID('dbo.LabRequests', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[LabRequests];
    PRINT 'Dropped table LabRequests';
END
GO

PRINT '91_drop_lab_model2_tables completed';
