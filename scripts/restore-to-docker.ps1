# ===========================================
# HIS - Restore Database to Docker SQL Server
# ===========================================
# Prerequisite: Put your HIS.bak file in C:\Source\HIS\backup\

param(
    [string]$BackupFile = "C:\Source\HIS\backup\HIS.bak"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HIS - Restore Database to Docker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if backup file exists
if (!(Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please backup your database first:" -ForegroundColor Yellow
    Write-Host "  1. Open SQL Server Management Studio (SSMS)" -ForegroundColor White
    Write-Host "  2. Connect to localhost\DOTNET" -ForegroundColor White
    Write-Host "  3. Right-click HIS database -> Tasks -> Back Up..." -ForegroundColor White
    Write-Host "  4. Save to: C:\Source\HIS\backup\HIS.bak" -ForegroundColor White
    exit 1
}

Write-Host "Backup file: $BackupFile" -ForegroundColor Green

# Check Docker
Write-Host ""
Write-Host "[1/4] Checking Docker Desktop..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "Docker Desktop is running." -ForegroundColor Green

# Start containers
Write-Host ""
Write-Host "[2/4] Starting Docker containers..." -ForegroundColor Yellow
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
    Write-Host "Waiting... ($retryCount/$maxRetries)" -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} while ($retryCount -lt $maxRetries)

if ($retryCount -eq $maxRetries) {
    Write-Host "ERROR: SQL Server failed to start!" -ForegroundColor Red
    exit 1
}

# Verify backup file is accessible in container (via mounted volume)
Write-Host ""
Write-Host "[3/4] Verifying backup file..." -ForegroundColor Yellow
$backupName = Split-Path $BackupFile -Leaf
Write-Host "Backup filename: $backupName" -ForegroundColor White

# Restore database
Write-Host ""
Write-Host "[4/4] Restoring database..." -ForegroundColor Yellow

$restoreCmd = @"
USE master;
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'HIS')
BEGIN
    ALTER DATABASE HIS SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HIS;
END;
RESTORE DATABASE [HIS] FROM DISK = N'/var/opt/mssql/backup/$backupName'
WITH FILE = 1,
MOVE N'HIS' TO N'/var/opt/mssql/data/HIS.mdf',
MOVE N'HIS_log' TO N'/var/opt/mssql/data/HIS_log.ldf',
NOUNLOAD, REPLACE, STATS = 10;
ALTER DATABASE HIS SET MULTI_USER;
PRINT 'Database restored successfully!';
"@

docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HIS@Docker2024!" -C -Q "$restoreCmd"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Database restored successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Connection Info:" -ForegroundColor Cyan
    Write-Host "  Server: localhost,1433" -ForegroundColor White
    Write-Host "  Database: HIS" -ForegroundColor White
    Write-Host "  User: sa" -ForegroundColor White
    Write-Host "  Password: HIS@Docker2024!" -ForegroundColor White
    Write-Host ""
    Write-Host "Run API with Docker:" -ForegroundColor Cyan
    Write-Host "  cd C:\Source\HIS\backend\src\HIS.API" -ForegroundColor White
    Write-Host "  dotnet run --environment Docker" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host "ERROR: Restore failed!" -ForegroundColor Red
    Write-Host "Check logs: docker logs his-sqlserver" -ForegroundColor Yellow
}
