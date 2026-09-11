-- =============================================================================
-- 193_dedupe_medicines_and_fill_ingredient.sql
-- (a) Go 2 cap thuoc TRUNG (cung mot thuoc, hai ma, HAI GIA khac nhau)
-- (b) Dien hoat chat cho 6 duoc lieu YHCT dang de trong
--
-- (a) Trung ma khac gia -> bac si chon nham la BN tra sai tien:
--       IBU400  Ibuprofen 400mg  1.500d  ton   386   <- go
--       IBUP400 Ibuprofen 400mg  1.200d  ton 2.338   <- giu (ton nhieu hon)
--       LORAT10 Loratadine 10mg  2.500d  ton   379   <- go
--       LORA10  Loratadine 10mg  1.500d  ton 3.297   <- giu
--     Da kiem: ca 4 ma CHUA TUNG duoc ke trong bat ky don nao (0 PrescriptionDetails)
--     -> go khong lam hong don cu nao.
--
--     ★ Chi dat IsActive = 0, KHONG xoa: dong ton kho cua ma bi go van con nguyen
--     trong DB de doi chieu so sach, va bat lai duoc bang mot cau UPDATE neu can.
--     Ma bi go se khong con hien o o tim thuoc khi ke don.
--
-- (b) PrescriptionSafetyGuard khop di ung theo TEN THUOC hoac HOAT CHAT. 6 duoc lieu
--     YHCT de trong hoat chat -> mat mot nua kha nang bat di ung. Dien chinh ten duoc
--     lieu lam hoat chat (dung cach di ung duoc ghi nhan trong thuc te).
--     KHONG tu dien ten Latin/duoc dien: do la du lieu lam sang, de duoc si bo sung.
--
-- Idempotent: chi dung toi dong con dung trang thai cu.
-- =============================================================================

SET QUOTED_IDENTIFIER ON;
SET NOCOUNT ON;

-- (a) go ban trung
UPDATE Medicines
SET IsActive = 0, UpdatedAt = SYSUTCDATETIME()
WHERE MedicineCode IN ('IBU400', 'LORAT10')
  AND IsActive = 1
  AND NOT EXISTS (SELECT 1 FROM PrescriptionDetails d WHERE d.MedicineId = Medicines.Id);
PRINT CONCAT('193 (a): da go ', @@ROWCOUNT, ' ma thuoc trung.');

-- (b) dien hoat chat cho duoc lieu YHCT
UPDATE Medicines
SET ActiveIngredient = MedicineName, UpdatedAt = SYSUTCDATETIME()
WHERE MedicineCode IN ('DL001','DL002','DL003','DL004','DL005','DL006')
  AND (ActiveIngredient IS NULL OR LTRIM(RTRIM(ActiveIngredient)) = '');
PRINT CONCAT('193 (b): da dien hoat chat cho ', @@ROWCOUNT, ' duoc lieu YHCT.');
GO
