-- ============================================================
-- #14e-B (2026-06-11, user duyệt): GỠ 2 bảng model 3 CLS
--   LabOrderItems · LabOrders
-- Module LIS v2 đã rewrite sang model 1 (ServiceRequests/ServiceRequestDetails
-- + ServiceRequestDetailParameters) — xem plan-14eB-lis-model3.md.
-- Dữ liệu 2 bảng này là seed/demo cũ (không có INSERT nghiệp vụ — verify 2026-06-11).
-- Idempotent: chạy lại không lỗi.
-- ============================================================

-- 1. Drop mọi FK từ bảng khác trỏ vào 2 bảng sắp gỡ (động)
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fk.parent_object_id))
    + N'.' + QUOTENAME(OBJECT_NAME(fk.parent_object_id))
    + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';' + CHAR(10)
FROM sys.foreign_keys fk
WHERE OBJECT_NAME(fk.referenced_object_id) IN ('LabOrders', 'LabOrderItems');
IF @sql <> N''
BEGIN
    EXEC sp_executesql @sql;
    PRINT 'Dropped inbound FKs referencing model-3 lab tables';
END
GO

-- 2. Drop 2 bảng theo thứ tự con → cha
IF OBJECT_ID('dbo.LabOrderItems', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[LabOrderItems];
    PRINT 'Dropped table LabOrderItems';
END
GO
IF OBJECT_ID('dbo.LabOrders', 'U') IS NOT NULL
BEGIN
    DROP TABLE [dbo].[LabOrders];
    PRINT 'Dropped table LabOrders';
END
GO

PRINT '92_drop_lab_model3_tables completed';
