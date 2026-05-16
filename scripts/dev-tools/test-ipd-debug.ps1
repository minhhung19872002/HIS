$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5106/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== 1. Get IPD Patients List (RAW) ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/patients" -Headers $headers
    Write-Host "Response type: $($response.GetType().Name)" -ForegroundColor Yellow
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== 2. Get Bed Status (RAW) ===" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/bed-status" -Headers $headers
    Write-Host "Response type: $($response.GetType().Name)" -ForegroundColor Yellow
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
