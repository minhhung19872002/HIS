$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5106/api/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.token
Write-Host "Got token: $($token.Substring(0, 50))..."

$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Test Admit from OPD ===" -ForegroundColor Cyan
$admitBody = @{
    medicalRecordId = "206EB65C-677B-4CAD-B1C1-DAE503B1D51C"
    departmentId = "7EEEFE81-095D-49B2-959F-2F2B69D0C39B"
    roomId = "54344D93-42DA-4937-AF86-048124E0CCDC"
    bedId = "638D1C53-ABC0-4E06-AF93-E9186CA42E26"
    admissionType = 3
    diagnosisOnAdmission = "Nghi viem ruot thua cap"
    reasonForAdmission = "Dau bung du doi, can theo doi va phau thuat"
    attendingDoctorId = "9e5309dc-ecf9-4d48-9a09-224cd15347b1"
} | ConvertTo-Json

Write-Host "Request body:"
$admitBody

try {
    $result = Invoke-RestMethod -Uri "http://localhost:5106/api/inpatient/admit-from-opd" -Method POST -Headers $headers -Body $admitBody
    Write-Host "`nAdmission created successfully!" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 5
} catch {
    Write-Host "`nError: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.ReadToEnd()
    }
}
