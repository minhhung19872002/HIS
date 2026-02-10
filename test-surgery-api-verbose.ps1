# Test Surgery API - Verbose
$baseUrl = "http://localhost:5106"

# 1. Login to get token
Write-Host "=== 1. Login ===" -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token
Write-Host "Token received"

# 2. Create Surgery Request with verbose error
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
    $response = Invoke-WebRequest -Uri "$baseUrl/api/SurgeryComplete" -Method Post -Headers $headers -Body $surgeryBody -ContentType "application/json" -ErrorAction Stop
    Write-Host "SUCCESS! Status: $($response.StatusCode)" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
} catch {
    Write-Host "ERROR! Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red

    # Get response body from error
    $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $streamReader.ReadToEnd()
    $streamReader.Close()

    Write-Host "Response Body:" -ForegroundColor Yellow
    Write-Host $responseBody
}
