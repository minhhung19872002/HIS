$ErrorActionPreference = "Stop"

$sqlServer = "localhost,1433"
$sqlDatabase = "HIS"
$sqlUser = "sa"
$sqlPassword = "HisDocker2024Pass#"

$query = @"
SET NOCOUNT ON;

DECLARE @sql nvarchar(max) = N'
DECLARE @AutoPatients TABLE (Id uniqueidentifier);
DECLARE @AutoMedicalRecords TABLE (Id uniqueidentifier);
DECLARE @AutoAdmissions TABLE (Id uniqueidentifier);
DECLARE @Results TABLE (
    ScopeName nvarchar(50),
    TableName sysname,
    ColumnName sysname,
    RefCount int
);

INSERT INTO @AutoPatients(Id)
SELECT Id
FROM Patients
WHERE CHARINDEX(''[AUTO-REG]'', FullName) = 1;

INSERT INTO @AutoMedicalRecords(Id)
SELECT Id
FROM MedicalRecords
WHERE PatientId IN (SELECT Id FROM @AutoPatients);

INSERT INTO @AutoAdmissions(Id)
SELECT Id
FROM Admissions
WHERE PatientId IN (SELECT Id FROM @AutoPatients);
';

SELECT @sql = @sql + N'
INSERT INTO @Results(ScopeName, TableName, ColumnName, RefCount)
SELECT N''PatientId'', N''' + TABLE_NAME + ''', N''PatientId'', COUNT(*)
FROM ' + QUOTENAME(TABLE_NAME) + N'
WHERE PatientId IN (SELECT Id FROM @AutoPatients)
HAVING COUNT(*) > 0;'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'PatientId'
  AND DATA_TYPE = 'uniqueidentifier'
  AND TABLE_NAME <> 'Patients';

SELECT @sql = @sql + N'
INSERT INTO @Results(ScopeName, TableName, ColumnName, RefCount)
SELECT N''MedicalRecordId'', N''' + TABLE_NAME + ''', N''MedicalRecordId'', COUNT(*)
FROM ' + QUOTENAME(TABLE_NAME) + N'
WHERE MedicalRecordId IN (SELECT Id FROM @AutoMedicalRecords)
HAVING COUNT(*) > 0;'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'MedicalRecordId'
  AND DATA_TYPE = 'uniqueidentifier'
  AND TABLE_NAME <> 'MedicalRecords';

SELECT @sql = @sql + N'
INSERT INTO @Results(ScopeName, TableName, ColumnName, RefCount)
SELECT N''AdmissionId'', N''' + TABLE_NAME + ''', N''AdmissionId'', COUNT(*)
FROM ' + QUOTENAME(TABLE_NAME) + N'
WHERE AdmissionId IN (SELECT Id FROM @AutoAdmissions)
HAVING COUNT(*) > 0;'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'AdmissionId'
  AND DATA_TYPE = 'uniqueidentifier'
  AND TABLE_NAME <> 'Admissions';

SET @sql = @sql + N'
SELECT ''AutoPatients'' AS Entity, COUNT(*) AS RefCount FROM @AutoPatients
UNION ALL
SELECT ''AutoMedicalRecords'', COUNT(*) FROM @AutoMedicalRecords
UNION ALL
SELECT ''AutoAdmissions'', COUNT(*) FROM @AutoAdmissions;

SELECT ScopeName, TableName, ColumnName, RefCount
FROM @Results
ORDER BY ScopeName, RefCount DESC, TableName;';

EXEC sp_executesql @sql;
"@

Write-Host "=== AUTO-REG DEPENDENCY REPORT ===" -ForegroundColor Cyan
$output = & sqlcmd -S $sqlServer -U $sqlUser -P $sqlPassword -d $sqlDatabase -Q $query -W -s "|" 2>&1
if ($LASTEXITCODE -ne 0) {
    $output | Write-Host
    exit $LASTEXITCODE
}

$output | Write-Host
