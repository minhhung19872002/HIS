$ErrorActionPreference = "Stop"

$sqlServer = "localhost,1433"
$sqlDatabase = "HIS"
$sqlUser = "sa"
$sqlPassword = "HisDocker2024Pass#"

$query = @"
SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;

DECLARE @sql nvarchar(max) = N'
DECLARE @AutoPatients TABLE (Id uniqueidentifier);
DECLARE @AutoMedicalRecords TABLE (Id uniqueidentifier);
DECLARE @AutoAdmissions TABLE (Id uniqueidentifier);
DECLARE @AutoExaminations TABLE (Id uniqueidentifier);
DECLARE @Touched TABLE (
    TableName sysname,
    ScopeName nvarchar(50),
    UpdatedCount int
);

INSERT INTO @AutoPatients(Id)
SELECT Id
FROM Patients
WHERE CHARINDEX(''[AUTO-REG]'', FullName) = 1
  AND ISNULL(IsDeleted, 0) = 0;

INSERT INTO @AutoMedicalRecords(Id)
SELECT Id
FROM MedicalRecords
WHERE PatientId IN (SELECT Id FROM @AutoPatients)
  AND ISNULL(IsDeleted, 0) = 0;

INSERT INTO @AutoAdmissions(Id)
SELECT Id
FROM Admissions
WHERE PatientId IN (SELECT Id FROM @AutoPatients)
  AND ISNULL(IsDeleted, 0) = 0;

INSERT INTO @AutoExaminations(Id)
SELECT Id
FROM Examinations
WHERE MedicalRecordId IN (SELECT Id FROM @AutoMedicalRecords)
  AND ISNULL(IsDeleted, 0) = 0;

UPDATE Patients
SET IsDeleted = 1
WHERE Id IN (SELECT Id FROM @AutoPatients)
  AND ISNULL(IsDeleted, 0) = 0;
INSERT INTO @Touched(TableName, ScopeName, UpdatedCount)
SELECT N''Patients'', N''Self'', @@ROWCOUNT;
';

SELECT @sql = @sql + N'
UPDATE ' + QUOTENAME(TABLE_NAME) + N'
SET IsDeleted = 1
WHERE ISNULL(IsDeleted, 0) = 0
  AND PatientId IN (SELECT Id FROM @AutoPatients);
INSERT INTO @Touched(TableName, ScopeName, UpdatedCount)
SELECT N''' + TABLE_NAME + ''', N''PatientId'', @@ROWCOUNT;'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'PatientId'
  AND DATA_TYPE = 'uniqueidentifier'
  AND TABLE_NAME IN (
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME = 'IsDeleted'
  );

SELECT @sql = @sql + N'
UPDATE ' + QUOTENAME(TABLE_NAME) + N'
SET IsDeleted = 1
WHERE ISNULL(IsDeleted, 0) = 0
  AND MedicalRecordId IN (SELECT Id FROM @AutoMedicalRecords);
INSERT INTO @Touched(TableName, ScopeName, UpdatedCount)
SELECT N''' + TABLE_NAME + ''', N''MedicalRecordId'', @@ROWCOUNT;'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'MedicalRecordId'
  AND DATA_TYPE = 'uniqueidentifier'
  AND TABLE_NAME IN (
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME = 'IsDeleted'
  );

SELECT @sql = @sql + N'
UPDATE ' + QUOTENAME(TABLE_NAME) + N'
SET IsDeleted = 1
WHERE ISNULL(IsDeleted, 0) = 0
  AND AdmissionId IN (SELECT Id FROM @AutoAdmissions);
INSERT INTO @Touched(TableName, ScopeName, UpdatedCount)
SELECT N''' + TABLE_NAME + ''', N''AdmissionId'', @@ROWCOUNT;'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'AdmissionId'
  AND DATA_TYPE = 'uniqueidentifier'
  AND TABLE_NAME IN (
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME = 'IsDeleted'
  );

SELECT @sql = @sql + N'
UPDATE ' + QUOTENAME(TABLE_NAME) + N'
SET IsDeleted = 1
WHERE ISNULL(IsDeleted, 0) = 0
  AND ExaminationId IN (SELECT Id FROM @AutoExaminations);
INSERT INTO @Touched(TableName, ScopeName, UpdatedCount)
SELECT N''' + TABLE_NAME + ''', N''ExaminationId'', @@ROWCOUNT;'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME = 'ExaminationId'
  AND DATA_TYPE = 'uniqueidentifier'
  AND TABLE_NAME IN (
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME = 'IsDeleted'
  );

SET @sql = @sql + N'
SELECT TableName, ScopeName, UpdatedCount
FROM @Touched
WHERE UpdatedCount > 0
ORDER BY ScopeName, UpdatedCount DESC, TableName;';

EXEC sp_executesql @sql;
"@

Write-Host "=== SOFT DELETE AUTO-REG PATIENT DATA ===" -ForegroundColor Cyan
$output = & sqlcmd -S $sqlServer -U $sqlUser -P $sqlPassword -d $sqlDatabase -Q $query -W -s "|" 2>&1
if ($LASTEXITCODE -ne 0) {
    $output | Write-Host
    exit $LASTEXITCODE
}

$output | Write-Host
