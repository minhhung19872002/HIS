-- Phase 2 Batch 1: Foundation Patches
-- Date: 2026-06-02
-- Idempotent: safe to run multiple times
-- Changes:
--   1. Patient: add BloodType, RhFactor
--   2. MedicalRecords: add InsuranceCoverageRate, InsuranceFiveYearContinuous, Referral fields
--   3. Prescriptions: add PaymentCategory

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- 1. Patient — BloodType + RhFactor (clinical safety: blood transfusion mismatch alert)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Patients') AND name = 'BloodType')
BEGIN
    ALTER TABLE Patients ADD BloodType NVARCHAR(10) NULL;
    PRINT 'Added Patients.BloodType';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Patients') AND name = 'RhFactor')
BEGIN
    ALTER TABLE Patients ADD RhFactor NVARCHAR(20) NULL;
    PRINT 'Added Patients.RhFactor';
END

-- 2. MedicalRecords — BHYT coverage + referral (required for BHXH XML 4210 export)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MedicalRecords') AND name = 'InsuranceCoverageRate')
BEGIN
    ALTER TABLE MedicalRecords ADD InsuranceCoverageRate INT NULL;
    PRINT 'Added MedicalRecords.InsuranceCoverageRate';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MedicalRecords') AND name = 'InsuranceFiveYearContinuous')
BEGIN
    ALTER TABLE MedicalRecords ADD InsuranceFiveYearContinuous BIT NOT NULL DEFAULT 0;
    PRINT 'Added MedicalRecords.InsuranceFiveYearContinuous';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MedicalRecords') AND name = 'ReferralFromFacilityCode')
BEGIN
    ALTER TABLE MedicalRecords ADD ReferralFromFacilityCode NVARCHAR(20) NULL;
    PRINT 'Added MedicalRecords.ReferralFromFacilityCode';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MedicalRecords') AND name = 'ReferralFromFacilityName')
BEGIN
    ALTER TABLE MedicalRecords ADD ReferralFromFacilityName NVARCHAR(200) NULL;
    PRINT 'Added MedicalRecords.ReferralFromFacilityName';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MedicalRecords') AND name = 'ReferralIcdCode')
BEGIN
    ALTER TABLE MedicalRecords ADD ReferralIcdCode NVARCHAR(20) NULL;
    PRINT 'Added MedicalRecords.ReferralIcdCode';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MedicalRecords') AND name = 'ReferralDate')
BEGIN
    ALTER TABLE MedicalRecords ADD ReferralDate DATETIME2 NULL;
    PRINT 'Added MedicalRecords.ReferralDate';
END

-- 3. Prescriptions — PaymentCategory (MQSoft: BHYT / Thu phí / Thuốc ngoài tabs)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Prescriptions') AND name = 'PaymentCategory')
BEGIN
    ALTER TABLE Prescriptions ADD PaymentCategory INT NOT NULL DEFAULT 0;
    PRINT 'Added Prescriptions.PaymentCategory';
END

COMMIT TRANSACTION;
PRINT 'Phase 2 Batch 1 migration completed successfully.';
GO
