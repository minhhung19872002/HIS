$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5106/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== 1. Get IPD Patients List ===" -ForegroundColor Cyan
try {
    $patients = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/patients" -Headers $headers
    Write-Host "Found $($patients.Count) inpatients:" -ForegroundColor Green
    $patients | ForEach-Object { Write-Host "- $($_.patientName) ($($_.patientCode)) - Status: $($_.status)" }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 2. Get Bed Status ===" -ForegroundColor Cyan
try {
    $beds = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/bed-status" -Headers $headers
    Write-Host "Found $($beds.Count) beds:" -ForegroundColor Green
    $beds | ForEach-Object {
        $statusText = switch ($_.status) { 0 { "Available" } 1 { "Occupied" } 2 { "Maintenance" } default { "Unknown" } }
        Write-Host "- $($_.bedName): $statusText $(if($_.patientName) { "- Patient: $($_.patientName)" })"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 3. Get Department Ward Layout ===" -ForegroundColor Cyan
try {
    $layout = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/ward-layout/7EEEFE81-095D-49B2-959F-2F2B69D0C39B" -Headers $headers
    $layout | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 4. Get Patient Detail ===" -ForegroundColor Cyan
try {
    # Use the admission ID from the previous test
    $admissionId = "4d90fd83-face-4e2e-9781-cfe372543f10"
    $detail = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/patients/$admissionId" -Headers $headers
    Write-Host "Patient Detail:" -ForegroundColor Green
    $detail | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
