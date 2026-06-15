-- 107_ris_exam_group.sql
-- Add ExamGroupName column to RadiologyRequests for KSK group filtering (F2.6 #136)
-- Idempotent: safe to run multiple times

IF COL_LENGTH('dbo.RadiologyRequests', 'ExamGroupName') IS NULL
BEGIN
    ALTER TABLE dbo.RadiologyRequests
        ADD ExamGroupName NVARCHAR(200) NULL;

    PRINT 'Added column: RadiologyRequests.ExamGroupName';
END
ELSE
BEGIN
    PRINT 'Column RadiologyRequests.ExamGroupName already exists, skipping.';
END
