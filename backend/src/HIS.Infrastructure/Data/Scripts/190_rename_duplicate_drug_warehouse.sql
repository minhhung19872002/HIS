-- =============================================================================
-- 190_rename_duplicate_drug_warehouse.sql
-- Hai kho TRUNG TEN "Kho thuoc chinh" lam combobox chon kho o man ke don hien hai
-- dong doc len y het nhau:
--     KT01          | Kho thuoc chinh | ton 928.664 | 1539 dong | 709 don tro toi
--     KHO-THUOC-01  | Kho thuoc chinh | ton   3.872 |   13 dong |   0 don tro toi
--
-- ★ CHI DOI TEN. KHONG xoa kho, KHONG tat kho, KHONG chuyen ton kho.
--   - Xoa/tat kho -> 3.872 don vi ton bien khoi bao cao va khoi tong ton hien o
--     man ke don. Do la doi SO LIEU KHO, khong phai viec cua mot script doi ten.
--   - Gop ton tu kho nay sang KT01 la mot lan CHUYEN KHO that: phai co phieu
--     chuyen kho, nguoi duyet, va vet kiem toan -> dung chuc nang chuyen kho cua
--     duoc si, khong lam bang UPDATE thang.
--   Ten moi noi ro tinh trang de duoc si biet can xu ly, va bac si khong chon nham.
--
-- Idempotent: chi doi dong con dang mang ten cu.
-- =============================================================================

-- Bang Warehouses co index doi QUOTED_IDENTIFIER ON. sqlcmd mac dinh OFF (khac .NET
-- SqlClient mac dinh ON) -> khong dat tuong minh thi UPDATE gay Msg 1934 khi chay bang sqlcmd.
SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

UPDATE Warehouses
SET WarehouseName = N'Kho thuốc chính (bản trùng — chờ dược sĩ gộp)',
    UpdatedAt = SYSUTCDATETIME()
WHERE WarehouseCode = 'KHO-THUOC-01'
  AND WarehouseName = N'Kho thuốc chính';

PRINT CONCAT('190: da doi ten ', @@ROWCOUNT, ' kho trung ten.');
GO
