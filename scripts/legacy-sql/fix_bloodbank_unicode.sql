-- Fix unicode escape sequences in BloodProductTypes and BloodBags tables
-- BUG-020: API returns \u00e1 instead of actual Vietnamese characters

-- ======================== BloodProductTypes ========================
UPDATE BloodProductTypes SET
    Name = N'Máu toàn phần (Whole Blood)',
    Description = N'Máu toàn phần lấy từ người hiến máu'
WHERE Id = 'A0000001-0001-0001-0001-000000000001';

UPDATE BloodProductTypes SET
    Name = N'Khối hồng cầu (Red Blood Cells)',
    Description = N'Hồng cầu tách từ máu toàn phần'
WHERE Id = 'A0000001-0001-0001-0001-000000000002';

UPDATE BloodProductTypes SET
    Name = N'Huyết tương tươi đông lạnh (FFP)',
    Description = N'Huyết tương tươi được đông lạnh nhanh'
WHERE Id = 'A0000001-0001-0001-0001-000000000003';

UPDATE BloodProductTypes SET
    Name = N'Tiểu cầu (Platelet)',
    Description = N'Tiểu cầu tách từ máu toàn phần hoặc gạn'
WHERE Id = 'A0000001-0001-0001-0001-000000000004';

UPDATE BloodProductTypes SET
    Name = N'Tủa lạnh (Cryoprecipitate)',
    Description = N'Tủa lạnh chứa yếu tố đông máu'
WHERE Id = 'A0000001-0001-0001-0001-000000000005';

-- ======================== BloodBags - StorageLocation ========================
UPDATE BloodBags SET StorageLocation = N'Tủ lạnh 1 - Ngăn A' WHERE BagCode = 'BB-2026-0001';
UPDATE BloodBags SET StorageLocation = N'Tủ lạnh 1 - Ngăn B' WHERE BagCode = 'BB-2026-0002';
UPDATE BloodBags SET StorageLocation = N'Tủ lạnh 1 - Ngăn A' WHERE BagCode = 'BB-2026-0003';
UPDATE BloodBags SET StorageLocation = N'Tủ đông lạnh 1 - Ngăn C' WHERE BagCode = 'BB-2026-0004';
UPDATE BloodBags SET StorageLocation = N'Tủ lạnh 2 - Ngăn A' WHERE BagCode = 'BB-2026-0005';
UPDATE BloodBags SET StorageLocation = N'Tủ lạnh 2 - Ngăn B' WHERE BagCode = 'BB-2026-0006';
UPDATE BloodBags SET StorageLocation = N'Tủ lạnh 2 - Ngăn C' WHERE BagCode = 'BB-2026-0007';
UPDATE BloodBags SET StorageLocation = N'Tủ lạnh 3 - Ngăn A' WHERE BagCode = 'BB-2026-0008';
UPDATE BloodBags SET StorageLocation = N'Tủ điều nhiệt - Ngăn A' WHERE BagCode = 'BB-2026-0009';
UPDATE BloodBags SET StorageLocation = N'Tủ đông lạnh 2 - Ngăn A' WHERE BagCode = 'BB-2026-0010';

PRINT 'Fixed unicode escapes in BloodProductTypes and BloodBags';
