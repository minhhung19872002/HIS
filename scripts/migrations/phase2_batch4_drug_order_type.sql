-- Phase 2 Batch 4: Inpatient Drug Order Type
-- Date: 2026-06-02
-- Idempotent: safe to run multiple times
-- Changes:
--   1. Prescriptions: add DrugOrderType (1-Regular, 2-EmergencyCabinet, 3-Return)

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Prescriptions') AND name = 'DrugOrderType')
BEGIN
    ALTER TABLE Prescriptions ADD DrugOrderType INT NOT NULL DEFAULT 0;
    PRINT 'Added Prescriptions.DrugOrderType';

    -- Backfill: existing inpatient prescriptions = Regular (1)
    UPDATE Prescriptions SET DrugOrderType = 1 WHERE PrescriptionType = 2 AND DrugOrderType = 0;
    PRINT 'Backfilled inpatient prescriptions to DrugOrderType=1 (Regular)';
END

COMMIT TRANSACTION;
PRINT 'Phase 2 Batch 4 migration completed successfully.';
GO
