-- =============================================================
-- Migration 50: PTTT in OPD/CĐHA Workflow (G-09, G-33)
-- Ensure SurgeryRequests.ExaminationId column exists (entity had it,
-- but DB column may be absent on older installs).
-- Idempotent: COL_LENGTH IS NULL guard.
-- =============================================================

-- ---------------------------------------------------------------
-- SurgeryRequests: add ExaminationId FK to Examinations if missing
-- ---------------------------------------------------------------
IF COL_LENGTH('SurgeryRequests', 'ExaminationId') IS NULL
BEGIN
    ALTER TABLE SurgeryRequests
        ADD ExaminationId UNIQUEIDENTIFIER NULL;
    PRINT 'SurgeryRequests.ExaminationId added.';
END

-- Add index for OPD workflow query (filter surgeries by examination)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('SurgeryRequests')
      AND name = 'IX_SurgeryRequests_ExaminationId'
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_SurgeryRequests_ExaminationId
        ON SurgeryRequests (ExaminationId)
        WHERE ExaminationId IS NOT NULL;
    PRINT 'Index IX_SurgeryRequests_ExaminationId created.';
END
