-- =============================================================================
-- 189_backfill_prescription_warehouse.sql
-- Va kho xuat cho don thuoc CHUA phat.
--
-- Hai di chung tu loi combobox kho o man ke don (loc WarehouseType == 2 = KHO VAT TU
-- thay vi kho thuoc):
--   (a) 611/806 don co WarehouseId NULL  -> quay cap phat nem "chua duoc gan kho xuat".
--   (b) 17 don tro vao KHO VAT TU        -> neu phat duoc thi tru ton nham kho.
--
-- ★ CHI dung toi don CHUA phat (Status 5-Nhap, 0-Cho duyet, 1-Da duyet).
--   Don da CAP PHAT (2) / CAP MOT PHAN (6) / HOAN TRA (3) TUYET DOI khong sua: thuoc
--   da roi kho that theo kho cu, doi WarehouseId bay gio la lam lech so sach xuat-nhap-ton.
--   Don da HUY (4) cung khong can.
--
-- Idempotent: chay lai chi con 0 dong thoa dieu kien.
-- =============================================================================

SET NOCOUNT ON;

DECLARE @WarehouseId uniqueidentifier =
    (SELECT TOP 1 Id FROM Warehouses
     WHERE IsActive = 1 AND WarehouseType IN (1, 4)   -- 1-Kho thuoc, 4-Nha thuoc
     ORDER BY CASE WHEN WarehouseCode = 'KT01' THEN 0 ELSE 1 END, WarehouseName);

IF @WarehouseId IS NULL
BEGIN
    PRINT '189: khong co kho thuoc/nha thuoc nao dang hoat dong — bo qua.';
    RETURN;
END

-- (a) don chua gan kho
UPDATE p SET p.WarehouseId = @WarehouseId, p.UpdatedAt = SYSUTCDATETIME()
FROM Prescriptions p
WHERE p.WarehouseId IS NULL
  AND p.Status IN (5, 0, 1);
PRINT CONCAT('189 (a): da gan kho cho ', @@ROWCOUNT, ' don thieu kho xuat.');

-- (b) don tro nham sang kho KHONG phai kho cap phat thuoc (vat tu / hoa chat / tu truc)
UPDATE p SET p.WarehouseId = @WarehouseId, p.UpdatedAt = SYSUTCDATETIME()
FROM Prescriptions p
JOIN Warehouses w ON w.Id = p.WarehouseId
WHERE w.WarehouseType NOT IN (1, 4)
  AND p.Status IN (5, 0, 1);
PRINT CONCAT('189 (b): da chuyen ', @@ROWCOUNT, ' don tu kho sai loai sang kho cap phat thuoc.');
GO
