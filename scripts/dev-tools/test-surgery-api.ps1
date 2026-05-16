# Test Surgery API
$baseUrl = "http://localhost:5106"

# 1. Login to get token
Write-Host "=== 1. Login ===" -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token
Write-Host "Token received: $($token.Substring(0, 50))..."

# 2. Create Surgery Request
Write-Host ""
Write-Host "=== 2. Create Surgery Request ===" -ForegroundColor Cyan
$headers = @{
    Authorization = "Bearer $token"
}

$surgeryBody = @{
    surgeryType = 1
    surgeryClass = 2
    surgeryNature = 2
    preOperativeDiagnosis = "Test diagnosis from API"
    preOperativeIcdCode = "K35"
    surgeryServiceId = "00000000-0000-0000-0000-000000000000"
    anesthesiaType = 2
    surgeryMethod = "Test method from API"
    notes = "Test from PowerShell API call"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/SurgeryComplete" -Method Post -Headers $headers -Body $surgeryBody -ContentType "application/json"
    Write-Host "SUCCESS! Created surgery:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# 3. Get all surgeries to verify
Write-Host ""
Write-Host "=== 3. Get All Surgeries ===" -ForegroundColor Cyan
try {
    $surgeries = Invoke-RestMethod -Uri "$baseUrl/api/SurgeryComplete" -Method Get -Headers $headers
    Write-Host "Total surgeries: $($surgeries.totalCount)" -ForegroundColor Green
    foreach ($s in $surgeries.items) {
        Write-Host "  - $($s.surgeryCode): $($s.patientName) - $($s.preOperativeDiagnosis) - Status: $($s.statusName)"
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
