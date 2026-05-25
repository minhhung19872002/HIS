# Run a SQL script against the HIS database via docker container `his-sqlserver`.
# Usage:
#   .\run-migration.ps1 -ScriptPath scripts\create_billing_tables.sql
#   .\run-migration.ps1 -ScriptPath scripts\seed_data.sql -Database HIS

param(
    [Parameter(Mandatory=$true)]
    [string]$ScriptPath,

    [string]$Container = "his-sqlserver",
    [string]$Database  = "HIS",
    [string]$User      = "sa",
    [string]$Password  = "HisDocker2024Pass#"
)

if (-not (Test-Path $ScriptPath)) {
    Write-Host "Script not found: $ScriptPath" -ForegroundColor Red
    exit 1
}

# Verify container is running
$running = docker ps --filter "name=$Container" --format "{{.Names}}"
if (-not $running) {
    Write-Host "Container '$Container' is not running. Start it with: docker compose up -d" -ForegroundColor Red
    exit 1
}

$absPath = (Resolve-Path $ScriptPath).Path
$fileName = Split-Path $absPath -Leaf

Write-Host "=== Running $fileName against [$Database] in [$Container] ===" -ForegroundColor Cyan

# Copy script into container then execute via mssql-tools18 sqlcmd
docker cp $absPath "${Container}:/tmp/$fileName"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to copy script into container" -ForegroundColor Red
    exit 1
}

# Note: container path is /opt/mssql-tools18/bin/sqlcmd (NOT /opt/mssql-tools/...)
docker exec $Container /opt/mssql-tools18/bin/sqlcmd `
    -S localhost `
    -U $User `
    -P $Password `
    -d $Database `
    -C `
    -i "/tmp/$fileName"

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== SUCCESS: $fileName executed ===" -ForegroundColor Green
} else {
    Write-Host "=== FAILED with exit code $LASTEXITCODE ===" -ForegroundColor Red
    exit $LASTEXITCODE
}
