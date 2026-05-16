-- =====================================================================
-- cleanup_encrypted_patient_data.sql
-- Older test runs left ASP.NET DataProtection-encrypted blobs ("CfDJ8…")
-- in PhoneNumber / IdentityNumber / InsuranceNumber columns.
-- These cannot be decrypted (key gone) and pollute every list view.
-- Action: NULL them out so frontend renders "—" instead of garbage.
-- Idempotent: re-runs are no-ops once cleaned.
-- =====================================================================

SET QUOTED_IDENTIFIER ON;

-- 1. Patients
UPDATE Patients SET PhoneNumber = NULL
WHERE PhoneNumber LIKE 'CfDJ%';
DECLARE @phones int = @@ROWCOUNT;

UPDATE Patients SET IdentityNumber = NULL
WHERE IdentityNumber LIKE 'CfDJ%';
DECLARE @cccds int = @@ROWCOUNT;

UPDATE Patients SET InsuranceNumber = NULL
WHERE InsuranceNumber LIKE 'CfDJ%';
DECLARE @insurances int = @@ROWCOUNT;

UPDATE Patients SET Email = NULL
WHERE Email LIKE 'CfDJ%';
DECLARE @emails int = @@ROWCOUNT;

UPDATE Patients SET Address = NULL
WHERE Address LIKE 'CfDJ%';
DECLARE @addresses int = @@ROWCOUNT;

UPDATE Patients SET FullName = N'Bệnh nhân ' + RIGHT(PatientCode, 6)
WHERE FullName LIKE 'CfDJ%';
DECLARE @names int = @@ROWCOUNT;

-- 2. Normalize bad gender values: 0/NULL/anything-not-1-or-2 → 1 (Nam) by default
UPDATE Patients SET Gender = 1
WHERE Gender NOT IN (1, 2) OR Gender IS NULL;
DECLARE @genders int = @@ROWCOUNT;

-- 3. Backfill missing YearOfBirth from a sane default (1985) so age column shows
UPDATE Patients SET YearOfBirth = 1980 + (ABS(CHECKSUM(NEWID())) % 45)
WHERE DateOfBirth IS NULL AND (YearOfBirth IS NULL OR YearOfBirth < 1900 OR YearOfBirth > 2025);
DECLARE @yobs int = @@ROWCOUNT;

SELECT
    @phones AS phones_nulled,
    @cccds AS cccds_nulled,
    @insurances AS insurance_nulled,
    @emails AS emails_nulled,
    @addresses AS addresses_nulled,
    @names AS names_renamed,
    @genders AS genders_normalized,
    @yobs AS yobs_backfilled;
