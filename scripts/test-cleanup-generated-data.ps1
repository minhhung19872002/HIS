$ErrorActionPreference = "Stop"

$sqlServer = "localhost,1433"
$sqlDatabase = "HIS"
$sqlUser = "sa"
$sqlPassword = "HisDocker2024Pass#"
$today = Get-Date -Format "yyyyMMdd"

$query = @"
SET NOCOUNT ON;

DECLARE @DeletedLabItems TABLE (Id uniqueidentifier);
DECLARE @DeletedLabOrders TABLE (Id uniqueidentifier);
DECLARE @DeletedSchedules TABLE (Id uniqueidentifier);
DECLARE @DeletedRecords TABLE (Id uniqueidentifier);
DECLARE @DeletedRequests TABLE (Id uniqueidentifier);
DECLARE @DeletedTeamMembers TABLE (Id uniqueidentifier);
DECLARE @AutoPatients TABLE (Id uniqueidentifier);
DECLARE @AutoAdmissions TABLE (Id uniqueidentifier);
DECLARE @AutoMedicalRecords TABLE (Id uniqueidentifier);

DELETE FROM LabOrderItems
OUTPUT deleted.Id INTO @DeletedLabItems(Id)
WHERE LabOrderId IN (
    SELECT Id FROM LabOrders WHERE OrderCode LIKE 'LISAUTO%'
);

DELETE FROM LabOrders
OUTPUT deleted.Id INTO @DeletedLabOrders(Id)
WHERE OrderCode LIKE 'LISAUTO%';

DELETE stm
OUTPUT deleted.Id INTO @DeletedTeamMembers(Id)
FROM SurgeryTeamMembers stm
INNER JOIN SurgeryRecords sr ON stm.SurgeryRecordId = sr.Id
INNER JOIN SurgerySchedules ss ON sr.SurgeryScheduleId = ss.Id
INNER JOIN SurgeryRequests rq ON ss.SurgeryRequestId = rq.Id
WHERE rq.RequestCode LIKE 'PT$today%' AND (rq.PreOpDiagnosis = N'Test Appendicitis' OR CHARINDEX('[AUTO-REG]', rq.PreOpDiagnosis) = 1);

DELETE sr
OUTPUT deleted.Id INTO @DeletedRecords(Id)
FROM SurgeryRecords sr
INNER JOIN SurgerySchedules ss ON sr.SurgeryScheduleId = ss.Id
INNER JOIN SurgeryRequests rq ON ss.SurgeryRequestId = rq.Id
WHERE rq.RequestCode LIKE 'PT$today%' AND (rq.PreOpDiagnosis = N'Test Appendicitis' OR CHARINDEX('[AUTO-REG]', rq.PreOpDiagnosis) = 1);

DELETE ss
OUTPUT deleted.Id INTO @DeletedSchedules(Id)
FROM SurgerySchedules ss
INNER JOIN SurgeryRequests rq ON ss.SurgeryRequestId = rq.Id
WHERE rq.RequestCode LIKE 'PT$today%' AND (rq.PreOpDiagnosis = N'Test Appendicitis' OR CHARINDEX('[AUTO-REG]', rq.PreOpDiagnosis) = 1);

DELETE FROM SurgeryRequests
OUTPUT deleted.Id INTO @DeletedRequests(Id)
WHERE RequestCode LIKE 'PT$today%' AND (PreOpDiagnosis = N'Test Appendicitis' OR CHARINDEX('[AUTO-REG]', PreOpDiagnosis) = 1);

INSERT INTO @AutoPatients(Id)
SELECT Id FROM Patients WHERE CHARINDEX('[AUTO-REG]', FullName) = 1;

INSERT INTO @AutoAdmissions(Id)
SELECT Id FROM Admissions WHERE PatientId IN (SELECT Id FROM @AutoPatients);

INSERT INTO @AutoMedicalRecords(Id)
SELECT Id FROM MedicalRecords WHERE PatientId IN (SELECT Id FROM @AutoPatients);

SELECT 'LabOrderItems' AS [Entity], COUNT(*) AS [DeletedCount] FROM @DeletedLabItems
UNION ALL
SELECT 'LabOrders', COUNT(*) FROM @DeletedLabOrders
UNION ALL
SELECT 'SurgeryTeamMembers', COUNT(*) FROM @DeletedTeamMembers
UNION ALL
SELECT 'SurgeryRecords', COUNT(*) FROM @DeletedRecords
UNION ALL
SELECT 'SurgerySchedules', COUNT(*) FROM @DeletedSchedules
UNION ALL
SELECT 'SurgeryRequests', COUNT(*) FROM @DeletedRequests
UNION ALL
SELECT 'AutoPatientsReport', COUNT(*) FROM @AutoPatients
UNION ALL
SELECT 'AutoAdmissionsReport', COUNT(*) FROM @AutoAdmissions
UNION ALL
SELECT 'AutoMedicalRecordsReport', COUNT(*) FROM @AutoMedicalRecords;
"@

Write-Host "=== CLEANUP GENERATED TEST DATA ===" -ForegroundColor Cyan
$output = & sqlcmd -S $sqlServer -U $sqlUser -P $sqlPassword -d $sqlDatabase -Q $query -W -s "|" 2>&1
if ($LASTEXITCODE -ne 0) {
    $output | Write-Host
    exit $LASTEXITCODE
}

$output | Write-Host
