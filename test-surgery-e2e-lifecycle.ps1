# =============================================================================
# test-surgery-e2e-lifecycle.ps1
# =============================================================================
# Muc dich : Drive TRON VONG lifecycle Phau thuat thu thuat (PTTT):
#            Dam bao co dich vu PT trong catalog ->
#            Tao patient -> Tao surgery request -> approve -> schedule
#            -> check-in -> start -> complete
#
# Target   : LOCAL ONLY - http://localhost:5106
#            TUYET DOI KHONG CHAY TREN PROD (tranh tao ca mo gia tren prod).
#            Anti-pattern #14/#22: his-qa-anti-pattern.
#
# Cach chay: powershell -ExecutionPolicy Bypass -File .\test-surgery-e2e-lifecycle.ps1
#
# Yeu cau  : Backend phai dang chay tren port 5106.
#            "cd backend\src\HIS.API; dotnet run --launch-profile http"
#            Luu y: local BE hien co WIP einvoice/specimen — chay sau khi
#            "dotnet build" xanh (khong co error).
#
# Files doc de lay contract:
#   - backend/src/HIS.API/Controllers/SurgeryCompleteController.cs  (routes)
#   - backend/src/HIS.Application/DTOs/Surgery/SurgeryCompleteDTOs.cs
#     (CreateSurgeryRequestDto, ScheduleSurgeryDto, StartSurgeryDto, CompleteSurgeryDto)
#   - backend/src/HIS.API/Controllers/ReceptionCompleteController.cs (register/fee)
#   - backend/src/HIS.API/Controllers/ExaminationCompleteController.cs (emr-records)
#   - Scripts tham khao: scripts/dev-tools/test-surgery-flow-complete.ps1
# =============================================================================

$BaseUrl    = 'http://localhost:5106'
$TestMarker = '[AUTO-SURG]'
$Timestamp  = Get-Date -Format 'HHmmss'

# OPD room ID seed (Phong kham Noi 1) — da verify trong test-reception-full.ps1
$OpdRoomId = 'bf6b00e9-578b-47fb-aff8-af25fb35a794'

# Admin user ID — da verify trong scripts/dev-tools/test-surgery-flow-complete.ps1
$AdminUserId = '9e5309dc-ecf9-4d48-9a09-224cd15347b1'

# ---- helper ------------------------------------------------------------------

function Get-ResultItems($response) {
    if ($null -eq $response) { return @() }
    if ($response -is [System.Array]) { return $response }
    if ($response.PSObject.Properties.Name -contains 'data'  -and $null -ne $response.data)  { return $response.data  }
    if ($response.PSObject.Properties.Name -contains 'items' -and $null -ne $response.items) { return $response.items }
    if ($response.PSObject.Properties.Name -contains 'value' -and $null -ne $response.value) { return $response.value }
    return @($response)
}

$Results = [ordered]@{}
function Write-StepResult([string]$Step, [bool]$Pass, [string]$Detail = '') {
    $Results[$Step] = $Pass
    if ($Pass) {
        Write-Host "  [PASS] $Step$(if($Detail){" — $Detail"})" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $Step$(if($Detail){" — $Detail"})" -ForegroundColor Red
    }
}

# ==============================================================================
Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '   TEST PHAU THUAT THU THUAT (PTTT) E2E LIFECYCLE          ' -ForegroundColor Cyan
Write-Host '   Target: LOCAL ONLY — http://localhost:5106               ' -ForegroundColor Cyan
Write-Host "   Run at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')        " -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

# ==============================================================================
Write-Host ''
Write-Host '=== 1. LOGIN ===' -ForegroundColor Cyan
# Route: POST /api/auth/login
# Body:  { username, password }
# Resp:  { data: { token } }
# ==============================================================================
$token   = $null
$headers = $null
try {
    $loginBody = @{ username = 'admin'; password = 'Admin@123' } | ConvertTo-Json
    $loginResp = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
    $token   = $loginResp.data.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-StepResult '1.Login' ($null -ne $token) "token $($token.Substring(0,20))..."
} catch {
    Write-StepResult '1.Login' $false $_.Exception.Message
    Write-Host 'DUNG: Login that bai.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 2. LAY PHONG MO ===' -ForegroundColor Cyan
# Route: GET /api/SurgeryComplete/operating-rooms?status={}&roomType={}
# Resp: [ { id, code, name, status (0=Trong,1=Dang_dung,2=Bao_tri), ... } ]
# ==============================================================================
$global:OperatingRoomId = $null
$global:OperatingRoomName = ''
try {
    $roomResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete/operating-rooms" -Headers $headers
    $roomItems = Get-ResultItems $roomResp

    # Prefer room co status=0 (Trong)
    $emptyRoom = $roomItems | Where-Object { $_.status -eq 0 } | Select-Object -First 1
    if (-not $emptyRoom) {
        # Fallback: lay phong dau tien bat ke status
        $emptyRoom = $roomItems | Select-Object -First 1
    }

    if ($emptyRoom) {
        $global:OperatingRoomId   = $emptyRoom.id
        $global:OperatingRoomName = $emptyRoom.name
        Write-StepResult '2.GetOperatingRoom' $true "roomId=$($global:OperatingRoomId) name=$($global:OperatingRoomName)"
    } else {
        Write-StepResult '2.GetOperatingRoom' $false 'Khong co phong mo nao trong catalog'
        Write-Host 'DUNG: Can it nhat 1 phong mo.' -ForegroundColor Red
        exit 1
    }
} catch {
    Write-StepResult '2.GetOperatingRoom' $false $_.Exception.Message
    Write-Host 'DUNG: Khong lay duoc phong mo.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 3. TIM DICH VU PTTT TRONG CATALOG ===' -ForegroundColor Cyan
# Route: GET /api/SurgeryComplete/services/search?keyword={kw}&serviceType={int}
# Resp: [ { id, code, name, unitPrice, serviceType, ... } ]
# Script PHAI dung serviceId that tu catalog — khong duoc bịa GUID.
# Neu catalog rong, bao loi ro rang.
# ==============================================================================
$global:SurgeryServiceId = $null
$global:SurgeryServiceName = ''

$surgeryKeywords = @('phau thuat', 'cat', 'mo', 'thủ thuật', 'noi soi', 'surgery')

foreach ($kw in $surgeryKeywords) {
    if ($null -ne $global:SurgeryServiceId) { break }
    try {
        $encodedKw = [System.Uri]::EscapeDataString($kw)
        $svcResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete/services/search?keyword=$encodedKw" -Headers $headers
        $svcItems = @(Get-ResultItems $svcResp)  # @() ep array (Get-ResultItems unwrap mang 1-phan-tu thanh scalar)
        if ($svcItems.Count -gt 0) {
            $global:SurgeryServiceId   = $svcItems[0].id
            $global:SurgeryServiceName = $svcItems[0].name
            Write-Host "    Tim thay voi keyword '$kw': $($global:SurgeryServiceName) (id=$($global:SurgeryServiceId))" -ForegroundColor DarkGray
        }
    } catch {
        # Tiep tuc thu keyword khac
    }
}

if ($null -ne $global:SurgeryServiceId) {
    Write-StepResult '3.FindSurgeryService' $true "serviceId=$($global:SurgeryServiceId) name=$($global:SurgeryServiceName)"
} else {
    Write-StepResult '3.FindSurgeryService' $false 'Catalog dich vu PTTT rong — can seed Services voi ServiceType=5 (PTTT)'
    Write-Host ''
    Write-Host '  === HUONG DAN SEED DICH VU PTTT (ServiceType=5) ===' -ForegroundColor Yellow
    Write-Host '  Chay SQL tren local DB (cot that: ServiceCode/ServiceName):' -ForegroundColor Yellow
    Write-Host "  INSERT INTO Services (Id, ServiceCode, ServiceName, ServiceType, UnitPrice, InsurancePrice, ServicePrice, IsActive, IsDeleted, CreatedAt)" -ForegroundColor Yellow
    Write-Host "  VALUES (NEWID(), 'PT-CAT-RUOT-THUA', 'Phau thuat cat ruot thua noi soi', 5, 5000000, 0, 5000000, 1, 0, GETUTCDATE())" -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'DUNG: Khong co dich vu PTTT. Seed truoc roi chay lai.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 4. TAO BENH NHAN + LAY MEDICAL RECORD ID ===' -ForegroundColor Cyan
# Route: POST /api/reception/register/fee  (ReceptionCompleteController)
# Body:  { newPatient: {...}, serviceType, roomId, isPriority }
# Sau do: GET /api/examination/emr-records?keyword={ten} -> lay medicalRecordId
# ==============================================================================
$global:PatientId       = $null
$global:MedicalRecordId = $null
try {
    $patientBody = @{
        newPatient = @{
            fullName       = "$TestMarker Surgery Patient $Timestamp"
            dateOfBirth    = '1978-07-10'
            gender         = 1
            phoneNumber    = "092$Timestamp"
            address        = '456 Surgery Test Street'
            identityNumber = "SRG$Timestamp"
        }
        serviceType = 2
        roomId      = $OpdRoomId
        isPriority  = $false
    } | ConvertTo-Json -Depth 3

    $regResp = Invoke-RestMethod -Uri "$BaseUrl/api/reception/register/fee" -Method Post -Headers $headers -Body $patientBody -ContentType 'application/json'
    $regData = if ($regResp.PSObject.Properties.Name -contains 'data' -and $null -ne $regResp.data) { $regResp.data } else { $regResp }

    $global:PatientId = $regData.patientId
    Write-Host "    patientId=$($global:PatientId)" -ForegroundColor DarkGray

    # AdmissionDto.Id tu register/fee CHINH LA MedicalRecord.Id (verified ReceptionCompleteService.cs:358).
    $global:MedicalRecordId = $regData.id

    Write-StepResult '4.CreatePatient' ($null -ne $global:MedicalRecordId) "patientId=$($global:PatientId) medicalRecordId=$($global:MedicalRecordId)"
} catch {
    Write-StepResult '4.CreatePatient' $false $_.Exception.Message
    Write-Host 'DUNG: Khong tao duoc benh nhan hoac khong lay duoc medicalRecordId.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 5. TAO YEU CAU PTTT (surgery request) ===' -ForegroundColor Cyan
# Route: POST /api/SurgeryComplete  HOAC  POST /api/SurgeryComplete/requests
#        (SurgeryCompleteController — co 2 [HttpPost] tren cung method)
# Body (CreateSurgeryRequestDto):
#   { medicalRecordId: guid, surgeryServiceId: guid,
#     surgeryType: int (1=Phau_thuat, 2=Thu_thuat),
#     surgeryClass: int (1=Dac_biet, 2=Loai1, 3=Loai2, 4=Loai3),
#     surgeryNature: int (1=Cap_cuu, 2=Chuong_trinh),
#     anesthesiaType: int (1=Gay_me, 2=Gay_te, 3=Te_tai_cho, 4=Khong_vo_cam),
#     preOperativeDiagnosis?: string, preOperativeIcdCode?: string,
#     surgeryMethod?: string, scheduledDate?: datetime, operatingRoomId?: guid,
#     teamMembers?: [ { staffId, role, feePercent } ] }
# Resp (SurgeryDto): { id, surgeryCode, status (1=Cho_duyet), ... }
# ==============================================================================
$global:SurgeryId = $null
try {
    $surgeryBody = @{
        medicalRecordId      = $global:MedicalRecordId
        surgeryServiceId     = $global:SurgeryServiceId
        surgeryType          = 1     # 1=Phau thuat
        surgeryClass         = 2     # 2=Loai 1
        surgeryNature        = 2     # 2=Chuong trinh
        anesthesiaType       = 1     # 1=Gay me toan than
        preOperativeDiagnosis = 'Viem ruot thua cap'
        preOperativeIcdCode  = 'K35'
        surgeryMethod        = 'Noi soi cat ruot thua'
        scheduledDate        = (Get-Date).AddHours(3).ToString('yyyy-MM-ddTHH:mm:ss')
        operatingRoomId      = $global:OperatingRoomId
        notes                = 'Tao tu dong - E2E test PTTT'
        teamMembers          = @(
            @{ staffId = $AdminUserId; role = 1; feePercent = 40 }   # 1=PT vien chinh
        )
    } | ConvertTo-Json -Depth 5

    # Dung route POST /api/SurgeryComplete (map vao /requests theo [HttpPost] dual attribute)
    $surgResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete" -Method Post -Headers $headers -Body $surgeryBody -ContentType 'application/json'
    $sData = if ($surgResp.PSObject.Properties.Name -contains 'data' -and $null -ne $surgResp.data) { $surgResp.data } else { $surgResp }

    $global:SurgeryId = $sData.id
    Write-StepResult '5.CreateSurgeryRequest' ($null -ne $global:SurgeryId) "surgeryId=$($global:SurgeryId) code=$($sData.surgeryCode) status=$($sData.statusName)"
} catch {
    Write-StepResult '5.CreateSurgeryRequest' $false $_.Exception.Message
    Write-Host 'DUNG: Khong tao duoc yeu cau PTTT.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 6. DUYET MO (approve) ===' -ForegroundColor Cyan
# Route: POST /api/SurgeryComplete/approve
# Body (ApproveSurgeryDto):
#   { surgeryId: guid, isApproved: bool,
#     scheduledDate?: datetime, operatingRoomId?: guid, notes?: string }
# Resp (SurgeryDto): { id, status (2=Da_duyet), approvedAt, ... }
# ==============================================================================
try {
    $approveBody = @{
        surgeryId       = $global:SurgeryId
        isApproved      = $true
        scheduledDate   = (Get-Date).AddHours(3).ToString('yyyy-MM-ddTHH:mm:ss')
        operatingRoomId = $global:OperatingRoomId
        notes           = 'Da hoi chan, duyet mo - E2E test'
    } | ConvertTo-Json

    $approveResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete/approve" -Method Post -Headers $headers -Body $approveBody -ContentType 'application/json'
    $apData = if ($approveResp.PSObject.Properties.Name -contains 'data' -and $null -ne $approveResp.data) { $approveResp.data } else { $approveResp }

    Write-StepResult '6.ApproveSurgery' ($apData.id -eq $global:SurgeryId) "status=$($apData.statusName) approvedAt=$($apData.approvedAt)"
} catch {
    Write-StepResult '6.ApproveSurgery' $false $_.Exception.Message
}

# ==============================================================================
Write-Host ''
Write-Host '=== 7. LEN LICH MO (schedule) ===' -ForegroundColor Cyan
# Route: POST /api/SurgeryComplete/schedule
# Body (ScheduleSurgeryDto):
#   { surgeryId: guid, scheduledDate: datetime, operatingRoomId: guid,
#     estimatedDurationMinutes: int,
#     teamMembers?: [ { staffId, role, feePercent } ] }
# Resp (SurgeryDto): { id, scheduledDate, operatingRoomName, status (2=Da_duyet), ... }
# ==============================================================================
try {
    $schedBody = @{
        surgeryId                = $global:SurgeryId
        scheduledDate            = (Get-Date).AddHours(3).ToString('yyyy-MM-ddTHH:mm:ss')
        operatingRoomId          = $global:OperatingRoomId
        estimatedDurationMinutes = 90
        teamMembers = @(
            @{ staffId = $AdminUserId; role = 1; feePercent = 40 }   # PT vien chinh
            @{ staffId = $AdminUserId; role = 4; feePercent = 20 }   # BS gay me
        )
    } | ConvertTo-Json -Depth 5

    $schedResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete/schedule" -Method Post -Headers $headers -Body $schedBody -ContentType 'application/json'
    $scData = if ($schedResp.PSObject.Properties.Name -contains 'data' -and $null -ne $schedResp.data) { $schedResp.data } else { $schedResp }

    Write-StepResult '7.ScheduleSurgery' ($scData.id -eq $global:SurgeryId) "scheduledDate=$($scData.scheduledDate) room=$($scData.operatingRoomName)"
} catch {
    Write-StepResult '7.ScheduleSurgery' $false $_.Exception.Message
}

# ==============================================================================
Write-Host ''
Write-Host '=== 8. TIEP NHAN BENH NHAN VAO PHONG MO (check-in) ===' -ForegroundColor Cyan
# Route: POST /api/SurgeryComplete/check-in
# Body (SurgeryCheckInDto):
#   { surgeryId: guid, checkInTime: datetime, operatingRoomId: guid, notes?: string }
# Resp (SurgeryDto): { id, status, ... }
# ==============================================================================
try {
    $checkInBody = @{
        surgeryId       = $global:SurgeryId
        checkInTime     = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
        operatingRoomId = $global:OperatingRoomId
        notes           = 'BN da kiem tra danh tinh va ho so - auto test'
    } | ConvertTo-Json

    $ciResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete/check-in" -Method Post -Headers $headers -Body $checkInBody -ContentType 'application/json'
    $ciData = if ($ciResp.PSObject.Properties.Name -contains 'data' -and $null -ne $ciResp.data) { $ciResp.data } else { $ciResp }

    Write-StepResult '8.CheckIn' ($ciData.id -eq $global:SurgeryId) "status=$($ciData.statusName)"
} catch {
    Write-StepResult '8.CheckIn' $false $_.Exception.Message
    # Khong exit — check-in co the optional tuy workflow, tiep tuc start
    Write-Host '  [INFO] Check-in that bai — tiep tuc start.' -ForegroundColor Yellow
}

# ==============================================================================
Write-Host ''
Write-Host '=== 9. BAT DAU CA MO (start) ===' -ForegroundColor Cyan
# Route: POST /api/SurgeryComplete/start
# Body (StartSurgeryDto):
#   { surgeryId: guid, startTime: datetime,
#     teamMembers?: [ { staffId, role, feePercent } ] }
# Resp (SurgeryDto): { id, startTime, status (3=Dang_thuc_hien), ... }
# ==============================================================================
$global:SurgeryStartTime = (Get-Date)
try {
    $startBody = @{
        surgeryId = $global:SurgeryId
        startTime = $global:SurgeryStartTime.ToString('yyyy-MM-ddTHH:mm:ss')
        teamMembers = @(
            @{ staffId = $AdminUserId; role = 1; feePercent = 40 }
            @{ staffId = $AdminUserId; role = 4; feePercent = 20 }
        )
    } | ConvertTo-Json -Depth 5

    $startResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete/start" -Method Post -Headers $headers -Body $startBody -ContentType 'application/json'
    $stData = if ($startResp.PSObject.Properties.Name -contains 'data' -and $null -ne $startResp.data) { $startResp.data } else { $startResp }

    Write-StepResult '9.StartSurgery' ($stData.id -eq $global:SurgeryId) "startTime=$($stData.startTime) status=$($stData.statusName)"
} catch {
    Write-StepResult '9.StartSurgery' $false $_.Exception.Message
    Write-Host 'DUNG: Khong bat dau duoc ca mo.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 10. KET THUC CA MO (complete) ===' -ForegroundColor Cyan
# Route: POST /api/SurgeryComplete/complete
# Body (CompleteSurgeryDto):
#   { surgeryId: guid, endTime: datetime,
#     postOperativeDiagnosis?: string, postOperativeIcdCode?: string,
#     description?: string, conclusion?: string, complications?: string }
# Resp (SurgeryDto): { id, endTime, durationMinutes, status (4=Hoan_thanh), ... }
# ==============================================================================
$global:SurgeryCompleted = $false
try {
    $endTime = $global:SurgeryStartTime.AddMinutes(90)
    $completeBody = @{
        surgeryId               = $global:SurgeryId
        endTime                 = $endTime.ToString('yyyy-MM-ddTHH:mm:ss')
        postOperativeDiagnosis  = 'Viem ruot thua cap, da cat bo thanh cong'
        postOperativeIcdCode    = 'K35.8'
        description             = 'Noi soi cat ruot thua. 3 lo trocar. Ruot thua viem do. Da cat va may bung.'
        conclusion              = 'Phau thuat thanh cong, benh nhan tinh, chuyen phong hoi tinh'
        complications           = ''
    } | ConvertTo-Json

    $complResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete/complete" -Method Post -Headers $headers -Body $completeBody -ContentType 'application/json'
    $cData = if ($complResp.PSObject.Properties.Name -contains 'data' -and $null -ne $complResp.data) { $complResp.data } else { $complResp }

    $global:SurgeryCompleted = ($cData.id -eq $global:SurgeryId)
    Write-StepResult '10.CompleteSurgery' $global:SurgeryCompleted "endTime=$($cData.endTime) duration=$($cData.durationMinutes)min status=$($cData.statusName)"
} catch {
    Write-StepResult '10.CompleteSurgery' $false $_.Exception.Message
}

# ==============================================================================
Write-Host ''
Write-Host '=== 11. XAC NHAN TRANG THAI CUOI (GET surgery detail) ===' -ForegroundColor Cyan
# Route: GET /api/SurgeryComplete/{id}
# Resp (SurgeryDto): { id, surgeryCode, status, patientName, totalCost, ... }
# ==============================================================================
try {
    $detailResp = Invoke-RestMethod -Uri "$BaseUrl/api/SurgeryComplete/$($global:SurgeryId)" -Headers $headers
    $dData = if ($detailResp.PSObject.Properties.Name -contains 'data' -and $null -ne $detailResp.data) { $detailResp.data } else { $detailResp }

    $finalStatus = $dData.status   # 4=Hoan_thanh
    Write-StepResult '11.VerifyFinalState' ($dData.id -eq $global:SurgeryId) "status=$($dData.statusName)(=$finalStatus) totalCost=$($dData.totalCost)"
} catch {
    Write-StepResult '11.VerifyFinalState' $false $_.Exception.Message
}

# ==============================================================================
Write-Host ''
Write-Host '=== TONG KET ===' -ForegroundColor Cyan

$passed = 0; $failed = 0
foreach ($step in $Results.Keys) {
    if ($Results[$step]) { $passed++ } else { $failed++ }
}

Write-Host ''
Write-Host "  Ket qua: $passed PASS / $failed FAIL" -ForegroundColor $(if ($failed -eq 0) {'Green'} else {'Yellow'})
Write-Host ''
Write-Host '  Chi tiet tung buoc:' -ForegroundColor White
foreach ($step in $Results.Keys) {
    $icon  = if ($Results[$step]) { 'PASS' } else { 'FAIL' }
    $color = if ($Results[$step]) { 'Green' } else { 'Red' }
    Write-Host "    [$icon] $step" -ForegroundColor $color
}

Write-Host ''
Write-Host '  Data da tao (don dep voi marker [AUTO-SURG] + surgeryId):' -ForegroundColor DarkGray
Write-Host "    patientId       = $($global:PatientId)"       -ForegroundColor DarkGray
Write-Host "    medicalRecordId = $($global:MedicalRecordId)" -ForegroundColor DarkGray
Write-Host "    surgeryServiceId= $($global:SurgeryServiceId) ($($global:SurgeryServiceName))" -ForegroundColor DarkGray
Write-Host "    surgeryId       = $($global:SurgeryId)"       -ForegroundColor DarkGray

Write-Host ''
Write-Host '  Don dep (SQL): DELETE FROM Patients WHERE FullName LIKE ''%[AUTO-SURG]%''' -ForegroundColor DarkGray
Write-Host ''
Write-Host '=== SURGERY E2E LIFECYCLE TEST COMPLETE ===' -ForegroundColor $(if ($failed -eq 0) {'Green'} else {'Yellow'})
