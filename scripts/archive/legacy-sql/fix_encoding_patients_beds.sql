-- Fix double-encoded UTF-8 Vietnamese text in Patients and Beds tables
-- BUG-001: IPD page shows corrupted names
-- Reference: scripts/fix_encoding.sql (same pattern for Departments/Rooms/Services/ICD)

-- ============================================
-- FIX PATIENTS (4 distinct corrupted names)
-- ============================================

-- "Nguy???n Th??? Lan" → "Nguyễn Thị Lan"
UPDATE Patients SET FullName = N'Nguyễn Thị Lan'
WHERE FullName LIKE N'Nguy%???n Th%??? Lan%' OR FullName = N'Nguy???n Th??? Lan';

-- "Tr???n V??n Minh" → "Trần Văn Minh"
UPDATE Patients SET FullName = N'Trần Văn Minh'
WHERE FullName LIKE N'Tr%???n V%?n Minh%' OR FullName = N'Tr???n V??n Minh';

-- "LÃª HoÃ ng CÆ°á»ng" → "Lê Hoàng Cường"
UPDATE Patients SET FullName = N'Lê Hoàng Cường'
WHERE FullName LIKE N'L%HoÃ%ng C%' OR FullName LIKE N'LÃª HoÃ%';

-- "Tr?n Van Test" → "Trần Văn Test"
UPDATE Patients SET FullName = N'Trần Văn Test'
WHERE FullName = N'Tr?n Van Test';

PRINT N'Fixed Patients.FullName encoding';

-- ============================================
-- FIX BEDS (6 records corrupted)
-- "GiÆ°á»ng" → "Giường"
-- ============================================

UPDATE Beds SET BedName = N'Giường 101-1' WHERE BedCode = 'G101-1';
UPDATE Beds SET BedName = N'Giường 101-2' WHERE BedCode = 'G101-2';
UPDATE Beds SET BedName = N'Giường 101-3' WHERE BedCode = 'G101-3';
UPDATE Beds SET BedName = N'Giường 102-1' WHERE BedCode = 'G102-1';
UPDATE Beds SET BedName = N'Giường 102-2' WHERE BedCode = 'G102-2';
UPDATE Beds SET BedName = N'Giường VIP 103' WHERE BedCode = 'G103-VIP';

PRINT N'Fixed Beds.BedName encoding';

-- ============================================
-- VERIFY
-- ============================================
SELECT 'Patients' AS TableName, COUNT(*) AS StillCorrupted
FROM Patients WHERE FullName LIKE '%???%' OR FullName LIKE '%Ã%' OR FullName LIKE '%Æ%'
UNION ALL
SELECT 'Beds', COUNT(*)
FROM Beds WHERE BedName LIKE '%Æ%' OR BedName LIKE '%á»%';

PRINT N'BUG-001 encoding fix completed!';
