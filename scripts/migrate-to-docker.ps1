# ===========================================
# HIS - Migrate SQL Server to Docker
# ===========================================

param(
    [string]$LocalServer = "localhost\DOTNET",
    [string]$Database = "HIS",
    [string]$BackupPath = "C:\Source\HIS\backup"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HIS - SQL Server Migration to Docker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker Desktop
Write-Host "[1/6] Checking Docker Desktop..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "Docker Desktop is running." -ForegroundColor Green

# Step 2: Create backup folder
Write-Host ""
Write-Host "[2/6] Creating backup folder..." -ForegroundColor Yellow
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
}
Write-Host "Backup folder: $BackupPath" -ForegroundColor Green

# Step 3: Backup local database
Write-Host ""
Write-Host "[3/6] Backing up local database..." -ForegroundColor Yellow
$backupFile = "$BackupPath\HIS_$(Get-Date -Format 'yyyyMMdd_HHmmss').bak"

$backupQuery = @"
BACKUP DATABASE [$Database]
TO DISK = N'$backupFile'
WITH FORMAT, INIT,
NAME = N'HIS-Full Database Backup',
SKIP, NOREWIND, NOUNLOAD, STATS = 10
"@

try {
    Invoke-Sqlcmd -ServerInstance $LocalServer -Query $backupQuery -TrustServerCertificate
    Write-Host "Backup created: $backupFile" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to backup database!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Use SQL Server Management Studio to backup manually" -ForegroundColor Yellow
    Write-Host "  1. Right-click database HIS -> Tasks -> Back Up..." -ForegroundColor Yellow
    Write-Host "  2. Save to: $BackupPath" -ForegroundColor Yellow
    exit 1
}

# Step 4: Start Docker containers
Write-Host ""
Write-Host "[4/6] Starting Docker containers..." -ForegroundColor Yellow
Set-Location "C:\Source\HIS"
docker-compose up -d

Write-Host "Waiting for SQL Server to be ready (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Check if SQL Server is ready
$maxRetries = 10
$retryCount = 0
do {
    $result = docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HIS@Docker2024!" -C -Q "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SQL Server is ready!" -ForegroundColor Green
        break
    }
    $retryCount++
    Write-Host "Waiting for SQL Server... ($retryCount/$maxRetries)" -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} while ($retryCount -lt $maxRetries)

if ($retryCount -eq $maxRetries) {
    Write-Host "ERROR: SQL Server failed to start!" -ForegroundColor Red
    exit 1
}

# Step 5: Copy backup file to container
Write-Host ""
Write-Host "[5/6] Copying backup to Docker container..." -ForegroundColor Yellow
docker cp $backupFile his-sqlserver:/var/opt/mssql/backup/HIS.bak
Write-Host "Backup copied to container." -ForegroundColor Green

# Step 6: Restore database in Docker
Write-Host ""
Write-Host "[6/6] Restoring database in Docker..." -ForegroundColor Yellow

$restoreQuery = @"
USE master;
GO

-- Drop existing database if exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'HIS')
BEGIN
    ALTER DATABASE HIS SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HIS;
END
GO

-- Create backup directory
EXEC xp_create_subdir N'/var/opt/mssql/backup';
GO

-- Restore database with move
RESTORE DATABASE [HIS]
FROM DISK = N'/var/opt/mssql/backup/HIS.bak'
WITH FILE = 1,
MOVE N'HIS' TO N'/var/opt/mssql/data/HIS.mdf',
MOVE N'HIS_log' TO N'/var/opt/mssql/data/HIS_log.ldf',
NOUNLOAD, REPLACE, STATS = 10;
GO

-- Set database to multi-user
ALTER DATABASE HIS SET MULTI_USER;
GO

PRINT 'Database restored successfully!';
GO
"@

$restoreQuery | Out-File -FilePath "$BackupPath\restore.sql" -Encoding UTF8

docker cp "$BackupPath\restore.sql" his-sqlserver:/var/opt/mssql/backup/restore.sql
docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HIS@Docker2024!" -C -i /var/opt/mssql/backup/restore.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Migration completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Docker SQL Server connection:" -ForegroundColor Cyan
    Write-Host "  Server: localhost,1433" -ForegroundColor White
    Write-Host "  User: sa" -ForegroundColor White
    Write-Host "  Password: HIS@Docker2024!" -ForegroundColor White
    Write-Host "  Database: HIS" -ForegroundColor White
    Write-Host ""
    Write-Host "To run API with Docker:" -ForegroundColor Cyan
    Write-Host "  cd C:\Source\HIS\backend\src\HIS.API" -ForegroundColor White
    Write-Host "  dotnet run --environment Docker" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host "ERROR: Failed to restore database!" -ForegroundColor Red
    Write-Host "Check logs: docker logs his-sqlserver" -ForegroundColor Yellow
}
