# HIS Docker Start Script
# Usage: .\scripts\docker-start.ps1

Write-Host "=== HIS Docker Environment ===" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Docker containers..." -ForegroundColor Yellow

# Go to project root
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

# Start containers
docker-compose up -d

Write-Host ""
Write-Host "Waiting for SQL Server to be ready..." -ForegroundColor Yellow

# Wait for SQL Server to be ready
$maxAttempts = 30
$attempt = 0
$ready = $false

while (-not $ready -and $attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray

    $result = docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HIS@Docker2024!" -C -Q "SELECT 1" 2>$null

    if ($LASTEXITCODE -eq 0) {
        $ready = $true
    } else {
        Start-Sleep -Seconds 2
    }
}

if ($ready) {
    Write-Host "SQL Server is ready!" -ForegroundColor Green

    # Run init script
    Write-Host "Running database initialization..." -ForegroundColor Yellow
    docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HIS@Docker2024!" -C -i /docker-entrypoint-initdb.d/01-create-database.sql

    Write-Host ""
    Write-Host "=== Services Ready ===" -ForegroundColor Green
    Write-Host "  SQL Server:  localhost:1433" -ForegroundColor White
    Write-Host "  Orthanc Web: http://localhost:8042 (admin/orthanc)" -ForegroundColor White
    Write-Host "  DICOM Port:  localhost:4242" -ForegroundColor White
    Write-Host "  Redis:       localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "To run EF migrations:" -ForegroundColor Cyan
    Write-Host "  cd backend/src/HIS.API" -ForegroundColor Gray
    Write-Host "  dotnet ef database update" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To start the API:" -ForegroundColor Cyan
    Write-Host "  cd backend/src/HIS.API" -ForegroundColor Gray
    Write-Host "  set ASPNETCORE_ENVIRONMENT=Docker" -ForegroundColor Gray
    Write-Host "  dotnet run" -ForegroundColor Gray
} else {
    Write-Host "SQL Server failed to start. Check docker logs:" -ForegroundColor Red
    Write-Host "  docker logs his-sqlserver" -ForegroundColor Gray
}
