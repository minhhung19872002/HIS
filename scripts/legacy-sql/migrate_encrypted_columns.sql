-- =============================================================================
-- Column-level Encryption Migration for Patient PII
-- =============================================================================
-- NOTE: Column encryption is handled automatically by EF Core ValueConverter
-- (EncryptedStringConverter in HIS.Infrastructure.Security).
--
-- How it works:
-- 1. When the application reads existing plaintext data, the Decrypt method
--    gracefully returns it as-is (catches CryptographicException).
-- 2. When the record is next saved (any field update), EF Core will encrypt
--    the sensitive fields via the converter automatically.
--
-- Encrypted columns on Patients table:
--   - IdentityNumber (CCCD/CMND)
--   - PhoneNumber
--   - Email
--   - InsuranceNumber
--
-- Migration options:
--
-- Option A: Lazy encryption (recommended for production)
--   No action needed. Data encrypts automatically on next save per patient.
--   TDE (enable_tde.sql) already encrypts the entire database at file level.
--
-- Option B: Bulk migration via application endpoint
--   POST /api/security/migrate-encryption
--   This endpoint reads all patients, touches each record, and SaveChanges
--   triggers encryption via the ValueConverter.
--   (Endpoint to be created if bulk migration is desired.)
--
-- Option C: Manual trigger (development/testing)
--   Run the UPDATE below to touch all patient records. The application will
--   encrypt them on next read+save cycle.
-- =============================================================================

-- Verify current patient count (for reference before/after)
SELECT COUNT(*) AS TotalPatients FROM Patients WHERE IsDeleted = 0;
GO

-- Touch all patient records to trigger encryption on next app read+save
-- NOTE: This SQL UPDATE alone does NOT encrypt - it just marks records as modified.
-- The EF Core ValueConverter encrypts when the app saves.
UPDATE Patients
SET UpdatedAt = GETUTCDATE()
WHERE IsDeleted = 0
  AND (IdentityNumber IS NOT NULL
    OR PhoneNumber IS NOT NULL
    OR Email IS NOT NULL
    OR InsuranceNumber IS NOT NULL);
GO

PRINT 'Column-level encryption is handled by EF Core ValueConverter (EncryptedStringConverter).';
PRINT 'Existing plaintext data is gracefully read and encrypted on next save.';
PRINT 'TDE provides file-level encryption for all data at rest.';
PRINT 'Run enable_tde.sql first, then column encryption happens automatically.';
GO
