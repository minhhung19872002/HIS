-- 216 (QA round 11, 2026-09-25).
-- QA-R11 (inpatient-surgery): 3 nullable link columns so the surgery service-order / blood-order
-- endpoints and the inpatient specialty-consult endpoints can persist for real (they were stubs).
-- Idempotent: each ALTER only runs when the column is missing. Index creation goes through EXEC so
-- the batch compiles even when the column does not exist yet (deferred name resolution).
-- Plain (non-filtered) indexes: a filtered index needs QUOTED_IDENTIFIER ON, which sqlcmd -i does not guarantee.

IF COL_LENGTH('ServiceRequests', 'SurgeryRequestId') IS NULL
BEGIN
    ALTER TABLE ServiceRequests ADD SurgeryRequestId uniqueidentifier NULL;
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ServiceRequests_SurgeryRequestId' AND object_id = OBJECT_ID('ServiceRequests'))
BEGIN
    EXEC(N'CREATE INDEX IX_ServiceRequests_SurgeryRequestId ON ServiceRequests(SurgeryRequestId)');
END

IF COL_LENGTH('BloodRequests', 'SurgeryRequestId') IS NULL
BEGIN
    ALTER TABLE BloodRequests ADD SurgeryRequestId uniqueidentifier NULL;
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_BloodRequests_SurgeryRequestId' AND object_id = OBJECT_ID('BloodRequests'))
BEGIN
    EXEC(N'CREATE INDEX IX_BloodRequests_SurgeryRequestId ON BloodRequests(SurgeryRequestId)');
END

IF COL_LENGTH('InpatientConsultations', 'SpecialtyDepartmentId') IS NULL
BEGIN
    ALTER TABLE InpatientConsultations ADD SpecialtyDepartmentId uniqueidentifier NULL;
END
