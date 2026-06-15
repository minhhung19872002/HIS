-- Migration 114: Add fingerprint fields to Patients (F11.2 reception fingerprint)
-- Additive only: ADD columns with IF NOT EXISTS guard.
-- Applied by ProductionSchemaRepairRunner on startup.

IF COL_LENGTH('Patients', 'FingerprintData') IS NULL
BEGIN
    ALTER TABLE Patients
        ADD FingerprintData NVARCHAR(MAX) NULL;
END

IF COL_LENGTH('Patients', 'FingerprintNotCollected') IS NULL
BEGIN
    ALTER TABLE Patients
        ADD FingerprintNotCollected BIT NOT NULL DEFAULT 0;
END
