# Register patient for testing
$baseUrl = "http://localhost:5106"

# 1. Login
Write-Host "=== 1. Login ===" -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token
Write-Host "Got token"

$headers = @{
    Authorization = "Bearer $token"
}

# 2. Register patient using /register/fee endpoint
Write-Host ""
Write-Host "=== 2. Register Patient ===" -ForegroundColor Cyan
$timestamp = Get-Date -Format "HHmmss"

$patientBody = @{
    newPatient = @{
        fullName = "Test Patient $timestamp"
        dateOfBirth = "1990-05-15"
        gender = 1
        phoneNumber = "0912345678"
        address = "123 Test Street, District 1"
        identityNumber = "012345678901"
    }
    serviceType = 2  # Vien phi
    roomId = "bf6b00e9-578b-47fb-aff8-af25fb35a794"  # Phong kham Noi 1
    isPriority = $false
} | ConvertTo-Json -Depth 3

Write-Host "Request body:"
Write-Host $patientBody

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/reception/register/fee" -Method Post -Headers $headers -Body $patientBody -ContentType "application/json"
    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host ""
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"

    $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $responseBody = $streamReader.ReadToEnd()
    $streamReader.Close()

    Write-Host "Response: $responseBody"
}
