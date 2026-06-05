-- 59_missing_entity_columns.sql
-- Heal schema drift: entity properties added in earlier commits (B1.7 reception
-- referral/insurance fields, K5 archive quick-borrow, patient blood type) were
-- never backed by a migration script. Discovered 2026-06-05 during runtime smoke
-- test (SqlException: Invalid column name ...). Idempotent — safe on any env.

-- Patients: blood type info (entity Patient.cs)
IF COL_LENGTH('Patients', 'BloodType') IS NULL
    ALTER TABLE Patients ADD BloodType NVARCHAR(10) NULL;
IF COL_LENGTH('Patients', 'RhFactor') IS NULL
    ALTER TABLE Patients ADD RhFactor NVARCHAR(20) NULL;

-- MedicalRecords: BHYT coverage + referral (chuyển tuyến) fields (entity MedicalRecord.cs)
IF COL_LENGTH('MedicalRecords', 'InsuranceCoverageRate') IS NULL
    ALTER TABLE MedicalRecords ADD InsuranceCoverageRate INT NULL;
IF COL_LENGTH('MedicalRecords', 'InsuranceFiveYearContinuous') IS NULL
    ALTER TABLE MedicalRecords ADD InsuranceFiveYearContinuous BIT NOT NULL CONSTRAINT DF_MedicalRecords_Ins5Y DEFAULT 0;
IF COL_LENGTH('MedicalRecords', 'ReferralFromFacilityCode') IS NULL
    ALTER TABLE MedicalRecords ADD ReferralFromFacilityCode NVARCHAR(50) NULL;
IF COL_LENGTH('MedicalRecords', 'ReferralFromFacilityName') IS NULL
    ALTER TABLE MedicalRecords ADD ReferralFromFacilityName NVARCHAR(255) NULL;
IF COL_LENGTH('MedicalRecords', 'ReferralIcdCode') IS NULL
    ALTER TABLE MedicalRecords ADD ReferralIcdCode NVARCHAR(20) NULL;
IF COL_LENGTH('MedicalRecords', 'ReferralDate') IS NULL
    ALTER TABLE MedicalRecords ADD ReferralDate DATETIME2 NULL;

-- MedicalRecordArchives: K5 quick borrow/return fields (entity MedicalRecordArchive)
IF COL_LENGTH('MedicalRecordArchives', 'IsOnLoan') IS NULL
    ALTER TABLE MedicalRecordArchives ADD IsOnLoan BIT NOT NULL CONSTRAINT DF_MedicalRecordArchives_IsOnLoan DEFAULT 0;
IF COL_LENGTH('MedicalRecordArchives', 'BorrowedByUserId') IS NULL
    ALTER TABLE MedicalRecordArchives ADD BorrowedByUserId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('MedicalRecordArchives', 'BorrowedAt') IS NULL
    ALTER TABLE MedicalRecordArchives ADD BorrowedAt DATETIME2 NULL;
IF COL_LENGTH('MedicalRecordArchives', 'ReturnedAt') IS NULL
    ALTER TABLE MedicalRecordArchives ADD ReturnedAt DATETIME2 NULL;
IF COL_LENGTH('MedicalRecordArchives', 'BorrowReason') IS NULL
    ALTER TABLE MedicalRecordArchives ADD BorrowReason NVARCHAR(500) NULL;
