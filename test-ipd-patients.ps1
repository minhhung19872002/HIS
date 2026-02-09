$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5106/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== Get IPD Patients ===" -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/patients" -Headers $headers
Write-Host "Response:" -ForegroundColor Yellow
$response | ConvertTo-Json -Depth 5

Write-Host "`n=== Get Bed Status ===" -ForegroundColor Cyan
$bedResponse = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/bed-status" -Headers $headers
Write-Host "Bed Status:" -ForegroundColor Yellow
$bedResponse | ConvertTo-Json -Depth 3
