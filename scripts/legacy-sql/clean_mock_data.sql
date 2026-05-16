-- Clean up mock/seed data that was inserted via SQL (not through API workflow)
-- Keep: master data (departments, rooms, services, medicines, ICD codes, users, warehouses, suppliers, beds)
-- Remove: transaction data created by SQL INSERT (prescriptions, admissions, payments, etc. with hardcoded GUIDs)

-- ============================================
-- REMOVE MOCK PRESCRIPTIONS (from seed_all_modules.sql)
-- Keep prescriptions created via API (they have proper relationships)
-- ============================================
DELETE FROM PrescriptionDetails WHERE PrescriptionId IN (
    SELECT Id FROM Prescriptions WHERE Id LIKE 'A1%'
);
DELETE FROM Prescriptions WHERE Id LIKE 'A1%';

-- ============================================
-- REMOVE MOCK ADMISSIONS (from seed_all_modules.sql)
-- ============================================
DELETE FROM BedAssignments WHERE AdmissionId IN (
    SELECT Id FROM Admissions WHERE Id LIKE 'A2%'
);
DELETE FROM Admissions WHERE Id LIKE 'A2%';

-- ============================================
-- REMOVE MOCK INSURANCE CLAIMS (from seed_all_modules.sql)
-- ============================================
DELETE FROM InsuranceClaimDetails WHERE ClaimId IN (
    SELECT Id FROM InsuranceClaims WHERE Id LIKE 'A4%'
);
DELETE FROM InsuranceClaims WHERE Id LIKE 'A4%';

-- ============================================
-- REMOVE MOCK IMPORT/EXPORT RECEIPTS (from seed_all_modules.sql)
-- ============================================
DELETE FROM ImportReceiptDetails WHERE ImportReceiptId IN (
    SELECT Id FROM ImportReceipts WHERE Id LIKE 'A5%'
);
DELETE FROM ImportReceipts WHERE Id LIKE 'A5%';

DELETE FROM ExportReceiptDetails WHERE ExportReceiptId IN (
    SELECT Id FROM ExportReceipts WHERE Id LIKE 'A6%'
);
DELETE FROM ExportReceipts WHERE Id LIKE 'A6%';

-- ============================================
-- REMOVE MOCK BLOOD BANK DATA (from seed_all_modules.sql)
-- ============================================
DELETE FROM BloodOrderItems WHERE OrderId IN (
    SELECT Id FROM BloodOrders WHERE Id LIKE 'A8%'
);
DELETE FROM BloodOrders WHERE Id LIKE 'A8%';
DELETE FROM BloodBags WHERE Id LIKE 'A7%';

-- ============================================
-- REMOVE MOCK EXAMINATIONS (from seed_all_modules.sql)
-- Keep examinations created via API
-- ============================================
DELETE FROM Examinations WHERE Id LIKE 'A9%';

-- ============================================
-- REMOVE MOCK PAYMENTS (from seed_all_modules.sql)
-- ============================================
DELETE FROM Payments WHERE Id LIKE 'A3%';

PRINT N'Mock data cleaned up! Master data and API-created records preserved.';
