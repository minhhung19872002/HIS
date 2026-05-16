# Quick smoke test for HIS reception register endpoint
# Usage: powershell -ExecutionPolicy Bypass -File .\test-reception-register-quick.ps1
# Prereq: backend running at http://localhost:5106
# Goal: verify POST /api/reception/register/fee end-to-end (login -> pick room -> register -> verify search)

$baseUrl = "http://localhost:5106"
$testMarker = "[AUTO-RECEPT]"

# === Helper: normalize HIS API response wrappers (data | items | value | array) ===
function Get-ResultItems($response) {
    if ($null -eq $response) { return @() }
    if ($response -is [System.Array]) { return $response }
    if ($response.PSObject.Properties.Name -contains "data" -and $null -ne $response.data) { return $response.data }
    if ($response.PSObject.Properties.Name -contains "items" -and $null -ne $response.items) { return $response.items }
    if ($response.PSObject.Properties.Name -contains "value" -and $null -ne $response.value) { return $response.value }
    return @($response)
}

# === 1. LOGIN ===
Write-Host "=== 1. LOGIN ===" -ForegroundColor Cyan
$loginBody = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.data.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "Got token: $($token.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "Login FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# === 2. PICK A ROOM (Lay phong kham dau tien tu rooms overview) ===
# Tranh hard-code GUID: query rooms overview va lay phong active dau tien.
Write-Host ""
Write-Host "=== 2. PICK A ROOM ===" -ForegroundColor Cyan
try {
    $rooms = Invoke-RestMethod -Uri "$baseUrl/api/reception/rooms/overview" -Headers $headers
    $roomItems = Get-ResultItems $rooms
    if ($roomItems.Count -eq 0) {
        Write-Host "No rooms returned - cannot continue without a roomId" -ForegroundColor Red
        exit 1
    }
    $firstRoom = $roomItems | Select-Object -First 1
    $global:targetRoomId = $firstRoom.roomId
    if (-not $global:targetRoomId) { $global:targetRoomId = $firstRoom.id }
    Write-Host "Using room: $($firstRoom.roomName) ($global:targetRoomId)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# === 3. REGISTER NEW PATIENT (Dang ky vien phi - endpoint chinh) ===
Write-Host ""
Write-Host "=== 3. REGISTER NEW PATIENT ===" -ForegroundColor Cyan
$timestamp = Get-Date -Format "HHmmss"
$identityNumber = "099" + (Get-Date -Format "ddHHmmss") + (Get-Random -Minimum 100 -Maximum 999)
$registerBody = @{
    newPatient = @{
        fullName       = "$testMarker Quick $timestamp"
        dateOfBirth    = "1990-05-15"
        gender         = 1
        phoneNumber    = "0912345" + $timestamp.Substring(0,3)
        address        = "123 Quick Test Street"
        identityNumber = $identityNumber
    }
    serviceType = 2   # 2 = Vien phi (out-of-pocket); 1 = BHYT
    roomId      = $global:targetRoomId
    isPriority  = $false
} | ConvertTo-Json -Depth 5

try {
    $regResponse = Invoke-RestMethod -Uri "$baseUrl/api/reception/register/fee" -Method Post -Headers $headers -Body $registerBody -ContentType "application/json"
    $regData = if ($regResponse.PSObject.Properties.Name -contains "data" -and $null -ne $regResponse.data) { $regResponse.data } else { $regResponse }
    Write-Host "SUCCESS: Patient registered" -ForegroundColor Green
    Write-Host "  Patient ID:      $($regData.patientId)"
    Write-Host "  Admission ID:    $($regData.id)"
    Write-Host "  Admission Code:  $($regData.admissionCode)"
    $global:newPatientId   = $regData.patientId
    $global:newAdmissionId = $regData.id
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed }
    exit 1
}

# === 4. VERIFY: SEARCH FOR THE NEW PATIENT (Tim kiem - xac nhan da ghi DB) ===
Write-Host ""
Write-Host "=== 4. VERIFY VIA SEARCH ===" -ForegroundColor Cyan
try {
    $search = Invoke-RestMethod -Uri "$baseUrl/api/reception/patients/search?keyword=Quick" -Headers $headers
    $hits = Get-ResultItems $search
    $matched = $hits | Where-Object { $_.id -eq $global:newPatientId -or $_.patientId -eq $global:newPatientId }
    if ($matched) {
        Write-Host "VERIFIED: new patient found in search results" -ForegroundColor Green
    } else {
        Write-Host "WARN: registered Id $global:newPatientId NOT in $($hits.Count) search results" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== RECEPTION REGISTER QUICK TEST COMPLETE ===" -ForegroundColor Green
Write-Host "Cleanup hint: DELETE FROM Patients WHERE FullName LIKE '%[AUTO-RECEPT]%'" -ForegroundColor DarkGray
