# Full API Test Script for HIS System
$baseUrl = "http://localhost:5106"

# Login
Write-Host "=== LOGIN ===" -ForegroundColor Green
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body (ConvertTo-Json @{username='admin';password='Admin@123'}) -ContentType 'application/json'
$token = $loginResponse.data.token
$headers = @{Authorization = "Bearer $token"}
Write-Host "Token received"

# Reception APIs
Write-Host "`n=== RECEPTION APIs ===" -ForegroundColor Yellow

Write-Host "1. GET /api/reception/rooms/overview" -ForegroundColor Cyan
$rooms = Invoke-RestMethod -Uri "$baseUrl/api/reception/rooms/overview" -Headers $headers
Write-Host "   Found $($rooms.data.Count) rooms" -ForegroundColor White

Write-Host "2. GET /api/reception/admissions/today" -ForegroundColor Cyan
$admissions = Invoke-RestMethod -Uri "$baseUrl/api/reception/admissions/today" -Headers $headers
Write-Host "   Found $($admissions.data.Count) admissions today" -ForegroundColor White

Write-Host "3. POST /api/reception/register/fee" -ForegroundColor Cyan
$ts = Get-Date -Format 'HHmmss'
$body = @{
    newPatient = @{
        fullName = "Test API $ts"
        dateOfBirth = '1985-03-15'
        gender = 1
        phoneNumber = '0901234567'
        address = 'Test Address'
    }
    serviceType = 2
    roomId = 'bf6b00e9-578b-47fb-aff8-af25fb35a794'
    isPriority = $false
} | ConvertTo-Json -Depth 3
$reg = Invoke-RestMethod -Uri "$baseUrl/api/reception/register/fee" -Method Post -Headers $headers -Body $body -ContentType 'application/json'
if ($reg.success) { Write-Host "   SUCCESS: Patient registered" -ForegroundColor Green }
$mrId = $reg.data.medicalRecordId

# OPD/Examination APIs
Write-Host "`n=== EXAMINATION/OPD APIs ===" -ForegroundColor Yellow

Write-Host "4. GET /api/examination/rooms/overview" -ForegroundColor Cyan
try {
    $opdRooms = Invoke-RestMethod -Uri "$baseUrl/api/examination/rooms/overview" -Headers $headers
    Write-Host "   Found $($opdRooms.data.Count) rooms" -ForegroundColor White
} catch { Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "5. GET /api/examination/rooms/{roomId}/patients" -ForegroundColor Cyan
try {
    $opdPatients = Invoke-RestMethod -Uri "$baseUrl/api/examination/rooms/bf6b00e9-578b-47fb-aff8-af25fb35a794/patients" -Headers $headers
    Write-Host "   Found $($opdPatients.data.Count) patients" -ForegroundColor White
} catch { Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red }

# IPD APIs
Write-Host "`n=== IPD APIs ===" -ForegroundColor Yellow

Write-Host "6. GET /api/inpatient/patients" -ForegroundColor Cyan
try {
    $ipd = Invoke-RestMethod -Uri "$baseUrl/api/inpatient/patients" -Headers $headers
    Write-Host "   Found $($ipd.data.Count) inpatients" -ForegroundColor White
} catch { Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "7. GET /api/inpatient/departments" -ForegroundColor Cyan
try {
    $depts = Invoke-RestMethod -Uri "$baseUrl/api/inpatient/departments" -Headers $headers
    Write-Host "   Found $($depts.data.Count) departments" -ForegroundColor White
} catch { Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red }

# Billing APIs
Write-Host "`n=== BILLING APIs ===" -ForegroundColor Yellow

Write-Host "8. GET /api/billing/unpaid" -ForegroundColor Cyan
try {
    $unpaid = Invoke-RestMethod -Uri "$baseUrl/api/billing/unpaid" -Headers $headers
    Write-Host "   Found $($unpaid.data.Count) unpaid items" -ForegroundColor White
} catch { Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red }

# Surgery APIs
Write-Host "`n=== SURGERY APIs ===" -ForegroundColor Yellow

Write-Host "9. GET /api/SurgeryComplete/surgeries" -ForegroundColor Cyan
try {
    $surg = Invoke-RestMethod -Uri "$baseUrl/api/SurgeryComplete/surgeries" -Headers $headers
    Write-Host "   Found $($surg.data.Count) surgeries" -ForegroundColor White
} catch { Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "10. GET /api/SurgeryComplete/operating-rooms" -ForegroundColor Cyan
try {
    $or = Invoke-RestMethod -Uri "$baseUrl/api/SurgeryComplete/operating-rooms" -Headers $headers
    Write-Host "   Found $($or.data.Count) operating rooms" -ForegroundColor White
} catch { Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "`n=== ALL API TESTS COMPLETE ===" -ForegroundColor Green
