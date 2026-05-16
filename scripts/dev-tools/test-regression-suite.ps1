$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $root
$steps = @(
    @{ Name = "Cleanup before"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$root/test-cleanup-generated-data.ps1") },
    @{ Name = "Soft delete AUTO-REG before"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$root/test-soft-delete-auto-reg-patients.ps1") },
    @{ Name = "Real workflow"; Command = @("node", "$root/test_real_workflow.js") },
    @{ Name = "Reception"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$repoRoot/test-reception-full.ps1") },
    @{ Name = "IPD"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$repoRoot/test-ipd-flow.ps1") },
    @{ Name = "Surgery"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$root/test-surgery-flow.ps1") },
    @{ Name = "Print/LIS/Signing"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$root/test-print-lis-signing.ps1") },
    @{ Name = "Cleanup after"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$root/test-cleanup-generated-data.ps1") },
    @{ Name = "Soft delete AUTO-REG after"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$root/test-soft-delete-auto-reg-patients.ps1") },
    @{ Name = "AUTO-REG report after"; Command = @("powershell", "-ExecutionPolicy", "Bypass", "-File", "$root/test-report-auto-reg-dependencies.ps1") }
)

$results = @()

Write-Host "=== HIS REGRESSION SUITE ===" -ForegroundColor Cyan
Write-Host "Root: $root"

foreach ($step in $steps) {
    Write-Host ""
    Write-Host "=== RUN: $($step.Name) ===" -ForegroundColor Cyan
    $sw = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        Push-Location $root
        & $step.Command[0] $step.Command[1..($step.Command.Length - 1)]
        $exitCode = $LASTEXITCODE
    }
    catch {
        $exitCode = 1
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    finally {
        Pop-Location
        $sw.Stop()
    }

    $ok = ($exitCode -eq 0)
    $results += [pscustomobject]@{
        Name = $step.Name
        ExitCode = $exitCode
        Seconds = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        Status = if ($ok) { "PASS" } else { "FAIL" }
    }

    if ($ok) {
        Write-Host "=== PASS: $($step.Name) ($([math]::Round($sw.Elapsed.TotalSeconds, 1))s) ===" -ForegroundColor Green
    }
    else {
        Write-Host "=== FAIL: $($step.Name) exit=$exitCode ($([math]::Round($sw.Elapsed.TotalSeconds, 1))s) ===" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.ExitCode -ne 0 })
if ($failed.Count -gt 0) {
    exit 1
}

exit 0
