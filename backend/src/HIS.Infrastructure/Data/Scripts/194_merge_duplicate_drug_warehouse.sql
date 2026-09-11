-- =============================================================================
-- 194_merge_duplicate_drug_warehouse.sql
-- Gop kho thuoc TRUNG: KHO-THUOC-01 -> KT01, roi dong kho trung lai.
--
-- Migration 190 truoc do moi chi DOI TEN cho de phan biet, chua gop, vi gop ton kho
-- la thay doi so sach that. Nguoi dung da xac nhan lam.
--
-- Hien trang KHO-THUOC-01: 13 dong ton, deu co SO LO that (L202603-001..013) va
-- han dung 20/09/2027 -> la phieu nhap kho hop le, KHONG phai rac.
--
-- ★ CHUYEN nguyen ven, KHONG xoa va KHONG cong don:
--   - Doi WarehouseId cua tung dong sang KT01, GIU nguyen SoLo / HanDung / So luong
--     -> tong ton toan he thong KHONG doi mot don vi nao, va van truy nguyen duoc
--        theo lo khi kiem ke.
--   - KHONG cong so luong vao dong san co cua KT01: ton kho quan ly THEO LO, gop lo
--     khac nhau vao mot dong la mat vet han dung -> khong con biet lo nao sap het han.
--   - Ghi dau vet vao SourceCode de biet dong nay tu dau toi va hoan lai duoc.
--
-- Sau khi chuyen het, dat KHO-THUOC-01 IsActive = 0: kho da RONG nen tat khong lam
-- bien mat ton kho nao khoi bao cao (khac voi tat khi con hang).
--
-- Idempotent: lan hai khong con dong nao thoa dieu kien.
-- =============================================================================

SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

DECLARE @src uniqueidentifier = (SELECT Id FROM Warehouses WHERE WarehouseCode = 'KHO-THUOC-01');
DECLARE @dst uniqueidentifier = (SELECT Id FROM Warehouses WHERE WarehouseCode = 'KT01' AND IsActive = 1);

IF @src IS NULL OR @dst IS NULL
BEGIN
    PRINT '194: thieu kho nguon hoac kho dich — bo qua.';
    RETURN;
END

DECLARE @before decimal(18,2) = (SELECT ISNULL(SUM(Quantity),0) FROM InventoryItems WHERE IsDeleted = 0);

UPDATE InventoryItems
SET WarehouseId = @dst,
    SourceCode  = LEFT(ISNULL(SourceCode,'') + ' [gop tu KHO-THUOC-01]', 200),
    UpdatedAt   = SYSUTCDATETIME()
WHERE WarehouseId = @src AND IsDeleted = 0;
PRINT CONCAT('194: da chuyen ', @@ROWCOUNT, ' dong ton tu KHO-THUOC-01 sang KT01.');

DECLARE @after decimal(18,2) = (SELECT ISNULL(SUM(Quantity),0) FROM InventoryItems WHERE IsDeleted = 0);
IF @before <> @after
BEGIN
    -- Chuyen kho khong duoc lam thay doi tong ton. Lech = co loi logic -> dung ngay.
    -- RAISERROR chi nhan int/varchar cho %d/%s (decimal gay Msg 2748) -> ep sang varchar.
    DECLARE @msg nvarchar(300) = CONCAT('194: LECH TON KHO sau khi gop (truoc=',
        CAST(@before AS varchar(40)), ', sau=', CAST(@after AS varchar(40)), ') — dung lai.');
    RAISERROR(@msg, 16, 1);
    RETURN;
END
PRINT CONCAT('194: tong ton truoc/sau = ', CAST(@before AS VARCHAR), ' / ', CAST(@after AS VARCHAR), ' — khop.');

-- Kho da rong thi moi dong lai
IF NOT EXISTS (SELECT 1 FROM InventoryItems WHERE WarehouseId = @src AND IsDeleted = 0)
BEGIN
    UPDATE Warehouses
    SET IsActive = 0,
        WarehouseName = N'Kho thuốc chính (đã gộp vào KT01)',
        UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @src AND IsActive = 1;
    PRINT CONCAT('194: da dong ', @@ROWCOUNT, ' kho trung (da rong).');
END
GO
