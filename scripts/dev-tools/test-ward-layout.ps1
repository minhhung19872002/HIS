$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5106/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== Test Ward Layout ===" -ForegroundColor Cyan
$departmentId = "7EEEFE81-095D-49B2-959F-2F2B69D0C39B"
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/ward-layout/$departmentId" -Headers $headers
    Write-Host "Ward Layout Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.ReadToEnd()
    }
}
