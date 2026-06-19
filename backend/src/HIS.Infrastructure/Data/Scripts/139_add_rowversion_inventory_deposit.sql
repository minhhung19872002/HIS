-- 139: #188 — thêm cột optimistic-concurrency token (rowversion) cho InventoryItems + Deposits.
-- Mục đích: chống oversell tồn kho + double-use số dư tạm ứng khi 2 thao tác ghi ĐỒNG THỜI lên cùng 1 dòng.
--   rowversion do SQL Server tự sinh/tự tăng mỗi UPDATE; EF Core (IsRowVersion) tự đưa vào mệnh đề WHERE khi UPDATE
--   → nếu dòng đã bị thao tác khác đổi từ lúc đọc, UPDATE khớp 0 dòng ⇒ DbUpdateConcurrencyException ⇒ DomainExceptionFilter trả 409.
-- An toàn: cột rowversion là ADDITIVE, SQL Server tự điền giá trị cho mọi dòng hiện có (không cần backfill). 1 bảng chỉ 1 cột rowversion.
-- Idempotent: chỉ ADD nếu CHƯA có cột.
IF OBJECT_ID('dbo.InventoryItems','U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InventoryItems') AND name = 'RowVersion')
BEGIN
    ALTER TABLE dbo.InventoryItems ADD RowVersion rowversion NOT NULL;
    PRINT N'#188: added RowVersion to dbo.InventoryItems';
END
GO

IF OBJECT_ID('dbo.Deposits','U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Deposits') AND name = 'RowVersion')
BEGIN
    ALTER TABLE dbo.Deposits ADD RowVersion rowversion NOT NULL;
    PRINT N'#188: added RowVersion to dbo.Deposits';
END
GO

IF OBJECT_ID('dbo.InvoiceSummaries','U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.InvoiceSummaries') AND name = 'RowVersion')
BEGIN
    ALTER TABLE dbo.InvoiceSummaries ADD RowVersion rowversion NOT NULL;
    PRINT N'#188: added RowVersion to dbo.InvoiceSummaries';
END
GO
