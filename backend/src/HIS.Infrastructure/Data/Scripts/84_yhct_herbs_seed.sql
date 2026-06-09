-- 84: Seed dược liệu YHCT (F6 — thuốc bắc → viện phí + trừ kho 2026-06-09).
-- Cung cấp danh mục vị thuốc (Medicine.MedicineType=2) + tồn kho để màn YHCT kê đơn structured,
-- sinh Prescription tính phí per-vị và trừ kho FEFO. Idempotent theo MedicineCode (chạy mỗi startup an toàn).

DECLARE @now datetime2 = SYSDATETIME();
DECLARE @exp datetime2 = DATEADD(year, 2, @now);

-- 6 vị thuốc bắc thông dụng (GUID cố định để re-run idempotent). Giá đồng/gram (admin chỉnh sau).
INSERT INTO Medicines (Id, MedicineCode, MedicineName, MedicineType, Unit, UnitPrice, ServicePrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
SELECT CAST(v.gid AS uniqueidentifier), v.code, v.name, 2, N'g', v.price, v.price, 0, 1, @now, 0
FROM (VALUES
    ('DL001', N'Cam thảo',    800,  'd1c70001-0000-0000-0000-000000000001'),
    ('DL002', N'Đương quy',   1200, 'd1c70001-0000-0000-0000-000000000002'),
    ('DL003', N'Hoàng kỳ',    1000, 'd1c70001-0000-0000-0000-000000000003'),
    ('DL004', N'Bạch truật',  900,  'd1c70001-0000-0000-0000-000000000004'),
    ('DL005', N'Phục linh',   1100, 'd1c70001-0000-0000-0000-000000000005'),
    ('DL006', N'Sinh khương', 600,  'd1c70001-0000-0000-0000-000000000006')
) v(code, name, price, gid)
WHERE NOT EXISTS (SELECT 1 FROM Medicines m WHERE m.MedicineCode = v.code);

-- Tồn kho cho mỗi vị vào kho thuốc chính (WarehouseType=1). Idempotent: chỉ thêm nếu vị đó chưa có tồn ở kho này.
DECLARE @wh uniqueidentifier = (SELECT TOP 1 Id FROM Warehouses WHERE WarehouseType = 1 AND IsDeleted = 0 ORDER BY CreatedAt);
IF @wh IS NOT NULL
INSERT INTO InventoryItems (Id, WarehouseId, MedicineId, ItemType, BatchNumber, ExpiryDate, Quantity, ReservedQuantity, UnitPrice, ImportPrice, IsLocked, CreatedAt, IsDeleted)
SELECT NEWID(), @wh, m.Id, N'Medicine', N'YHCT-L01', @exp, 10000, 0, m.UnitPrice, m.UnitPrice, 0, @now, 0
FROM Medicines m
WHERE m.MedicineType = 2 AND m.MedicineCode LIKE 'DL%'
  AND NOT EXISTS (SELECT 1 FROM InventoryItems i WHERE i.MedicineId = m.Id AND i.WarehouseId = @wh AND i.IsDeleted = 0);
