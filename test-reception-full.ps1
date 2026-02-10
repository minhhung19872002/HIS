# Full Reception Module Test Script
$baseUrl = "http://localhost:5106"

# 1. Login and get token
Write-Host "=== 1. LOGIN ===" -ForegroundColor Cyan
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body (@{username="admin";password="Admin@123"} | ConvertTo-Json) -ContentType "application/json"
$token = $loginResponse.data.token
$headers = @{Authorization = "Bearer $token"}
Write-Host "Got token: $($token.Substring(0,20))..."

# 2. Get rooms overview (Dieu phoi benh nhan vao phong kham)
Write-Host ""
Write-Host "=== 2. ROOMS OVERVIEW (Dieu phoi benh nhan) ===" -ForegroundColor Cyan
try {
    $rooms = Invoke-RestMethod -Uri "$baseUrl/api/reception/rooms/overview" -Headers $headers
    Write-Host "Rooms data:" -ForegroundColor Green
    $rooms.data | ForEach-Object { Write-Host "  - $($_.roomName): $($_.waitingCount) cho" }
} catch { Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red }

# 3. Register new patient (Dang ky vien phi)
Write-Host ""
Write-Host "=== 3. REGISTER NEW PATIENT (Dang ky vien phi) ===" -ForegroundColor Cyan
$timestamp = Get-Date -Format "HHmmss"
$patientBody = @{
    newPatient = @{
        fullName = "Test API Patient $timestamp"
        dateOfBirth = "1990-05-15"
        gender = 1
        phoneNumber = "0912345678"
        address = "123 Test Street"
        identityNumber = "012345$timestamp"
    }
    serviceType = 2
    roomId = "bf6b00e9-578b-47fb-aff8-af25fb35a794"
    isPriority = $false
} | ConvertTo-Json -Depth 3

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/api/reception/register/fee" -Method Post -Headers $headers -Body $patientBody -ContentType "application/json"
    Write-Host "SUCCESS: Patient registered" -ForegroundColor Green
    Write-Host "Patient ID: $($regResponse.data.patientId)"
    Write-Host "Medical Record: $($regResponse.data.medicalRecordId)"
    $global:newPatientId = $regResponse.data.patientId
    $global:newMRId = $regResponse.data.medicalRecordId
} catch { Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red }

# 4. Search patient (Tim kiem benh nhan)
Write-Host ""
Write-Host "=== 4. SEARCH PATIENT ===" -ForegroundColor Cyan
try {
    $search = Invoke-RestMethod -Uri "$baseUrl/api/reception/patients?keyword=Test" -Headers $headers
    Write-Host "Found $($search.data.Count) patients" -ForegroundColor Green
} catch { Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red }

# 5. Get waiting queue (He thong xep hang)
Write-Host ""
Write-Host "=== 5. WAITING QUEUE (Xep hang) ===" -ForegroundColor Cyan
try {
    $queue = Invoke-RestMethod -Uri "$baseUrl/api/reception/rooms/bf6b00e9-578b-47fb-aff8-af25fb35a794/patients?status=waiting" -Headers $headers
    Write-Host "Waiting patients: $($queue.data.Count)" -ForegroundColor Green
} catch { Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red }

# 6. Get today statistics (Thong ke)
Write-Host ""
Write-Host "=== 6. TODAY STATISTICS ===" -ForegroundColor Cyan
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/api/reception/statistics/today" -Headers $headers
    Write-Host "Total registered: $($stats.data.totalRegistered)" -ForegroundColor Green
    Write-Host "Total waiting: $($stats.data.totalWaiting)"
    Write-Host "Total examined: $($stats.data.totalExamined)"
} catch { Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red }

Write-Host ""
Write-Host "=== RECEPTION MODULE TEST COMPLETE ===" -ForegroundColor Green
