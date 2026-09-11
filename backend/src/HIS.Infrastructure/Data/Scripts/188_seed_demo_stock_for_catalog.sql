-- =============================================================================
-- 188_seed_demo_stock_for_catalog.sql
-- Nhap kho DEMO cho danh muc thuoc moi (1508 dong tu migration 185).
--
-- Vi sao can: 185 nap danh muc thuoc that nhung KHONG kem ton kho, nen moi lan
-- duoc si bam "Phat don nay" deu bi chan voi "Khong du ton kho de phat thuoc X
-- (can 30.00, con 0)". Khong co ton thi khong test duoc bat ky luong duoc nao.
--
-- ★ DAY LA DU LIEU DEMO, KHONG PHAI NHAP KHO THAT.
--   Moi dong deu duoc danh dau SourceType = 'SEED-DEMO' + BatchNumber = 'SEED-DEMO'.
--   Xoa sach bang DUNG MOT cau lenh khi benh vien nhap kho that:
--       DELETE FROM InventoryItems WHERE SourceType = 'SEED-DEMO';
--
-- Hai lop chan de KHONG bao gio de len so lieu kho that:
--   (1) Chi nap cho thuoc CHUA he co dong ton kho nao (o bat ky kho nao).
--   (2) Idempotent theo (kho, thuoc, BatchNumber='SEED-DEMO').
--   => benh vien nhap kho that roi thi chay lai script nay cung khong cong them.
--
-- Cot dinh danh: ghi MedicineId, de ItemId NULL — dung y het nhanh nhap kho that
-- (WarehouseCompleteService.StockIn) va dung cot ma moi service kho deu doc.
-- =============================================================================

SET NOCOUNT ON;

DECLARE @WarehouseId uniqueidentifier =
    (SELECT TOP 1 Id FROM Warehouses WHERE WarehouseCode = 'KT01' AND IsActive = 1);

-- Khong co kho thuoc chinh thi bo qua, tuyet doi khong doan sang kho khac.
IF @WarehouseId IS NULL
BEGIN
    PRINT '188: khong tim thay kho KT01 dang hoat dong — bo qua seed ton kho demo.';
    RETURN;
END

DECLARE @Qty decimal(18,2) = 500;

INSERT INTO InventoryItems (
    Id, WarehouseId, ItemId, ItemType, MedicineId, SupplyId,
    BatchNumber, ExpiryDate, ManufactureDate,
    Quantity, ReservedQuantity, ImportPrice, UnitPrice,
    IsLocked, SourceType, SourceCode,
    CreatedAt, CreatedBy, IsDeleted
)
SELECT
    NEWID(), @WarehouseId, NULL, 'Medicine', m.Id, NULL,
    'SEED-DEMO',
    DATEADD(YEAR, 2, CAST(GETDATE() AS date)),   -- han dung 2 nam ke tu luc chay
    CAST(GETDATE() AS date),
    @Qty, 0, m.UnitPrice, m.UnitPrice,
    0, 'SEED-DEMO', 'SEED-DEMO-188',
    SYSUTCDATETIME(), NULL, 0
FROM Medicines m
WHERE m.IsActive = 1
  AND m.IsDeleted = 0
  -- (1) chi thuoc chua he co ton kho o BAT KY kho nao
  AND NOT EXISTS (
        SELECT 1 FROM InventoryItems i
        WHERE i.MedicineId = m.Id AND i.IsDeleted = 0
  )
  -- (2) idempotent: chay lai khong nhan doi
  AND NOT EXISTS (
        SELECT 1 FROM InventoryItems i2
        WHERE i2.MedicineId = m.Id
          AND i2.WarehouseId = @WarehouseId
          AND i2.BatchNumber = 'SEED-DEMO'
  );

PRINT CONCAT('188: da nap ton kho demo cho ', @@ROWCOUNT, ' thuoc vao kho KT01.');
GO
