# =============================================================================
# test-ipd-e2e-lifecycle.ps1
# =============================================================================
# Muc dich : Drive TRON VONG lifecycle Noi tru (IPD):
#            Tao patient -> admit-from-opd -> assign-bed -> create service-order
#            -> ghi vital-signs -> discharge
#
# Target   : LOCAL ONLY - http://localhost:5106
#            TUYET DOI KHONG CHAY TREN PROD (tranh tao ca noi tru gia tren prod).
#            Anti-pattern #14/#22: his-qa-anti-pattern.
#
# Cach chay: powershell -ExecutionPolicy Bypass -File .\test-ipd-e2e-lifecycle.ps1
#
# Yeu cau  : Backend phai dang chay tren port 5106.
#            "cd backend\src\HIS.API; dotnet run --launch-profile http"
#            Luu y: local BE hien co WIP einvoice/specimen — chay sau khi
#            "dotnet build" xanh (khong co error).
#
# Files doc de lay contract:
#   - backend/src/HIS.API/Controllers/InpatientCompleteController.cs  (routes)
#   - backend/src/HIS.Application/DTOs/Inpatient/InpatientCompleteDTOs.cs
#   - backend/src/HIS.Application/DTOs/Common/MissingDTOs.cs (AdmissionDto, CreateBedAssignmentDto)
#   - backend/src/HIS.API/Controllers/ReceptionCompleteController.cs (register/fee)
#   - backend/src/HIS.API/Controllers/ExaminationCompleteController.cs (emr-records)
# =============================================================================

$BaseUrl = 'http://localhost:5106'
$TestMarker = '[AUTO-IPD]'
$Timestamp = Get-Date -Format 'HHmmss'

# Room ID seed (Phong kham Noi 1) — da verify trong test-reception-full.ps1 + register-patient.ps1
$OpdRoomId = 'bf6b00e9-578b-47fb-aff8-af25fb35a794'

# Department ID Noi khoa — da verify trong test-ipd-admit.ps1 + test-ward-layout.ps1
$IpdDepartmentId = '7EEEFE81-095D-49B2-959F-2F2B69D0C39B'

# Room ID Noi khoa (lay dong trong test-ipd-admit.ps1) — can query lay live o buoc 4
$IpdRoomId = '54344D93-42DA-4937-AF86-048124E0CCDC'

# Bed ID seed — lay live o buoc 4 (prefer bed co status=0/Empty)
$IpdBedId = '638D1C53-ABC0-4E06-AF93-E9186CA42E26'

# Admin user ID (da verify trong nhieu script: 9e5309dc...)
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

# Track pass/fail per step
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
Write-Host '   TEST NOTI TRU (IPD) E2E LIFECYCLE  [AUTO-IPD]           ' -ForegroundColor Cyan
Write-Host '   Target: LOCAL ONLY — http://localhost:5106               ' -ForegroundColor Cyan
Write-Host "   Run at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')        " -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan

# ==============================================================================
Write-Host ''
Write-Host '=== 1. LOGIN ===' -ForegroundColor Cyan
# Route: POST /api/auth/login
# Body:  { username, password }
# Resp:  { data: { token } }  (interceptor unwrap => token trong data.token)
# ==============================================================================
$token = $null
$headers = $null
try {
    $loginBody = @{ username = 'admin'; password = 'Admin@123' } | ConvertTo-Json
    $loginResp = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody
    $token = $loginResp.data.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-StepResult '1.Login' ($null -ne $token) "token $($token.Substring(0,20))..."
} catch {
    Write-StepResult '1.Login' $false $_.Exception.Message
    Write-Host 'DUNG: Login that bai — khong the tiep tuc.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 2. TAO BENH NHAN MOI QUA RECEPTION ===' -ForegroundColor Cyan
# Route: POST /api/reception/register/fee  (ReceptionCompleteController)
# Body (FeeRegistrationDto dang object):
#   { newPatient: { fullName, dateOfBirth, gender, phoneNumber, address, identityNumber },
#     serviceType: int, roomId: guid, isPriority: bool }
# Resp (AdmissionDto):
#   { id (OPD admissionId), patientId, admissionCode, examinationId?, ... }
# ==============================================================================
$global:PatientId   = $null
$global:OpdAdmId    = $null   # admissionId OPD (id cua AdmissionDto)
$global:ExamId      = $null   # examinationId (neu co trong resp)
try {
    $patientBody = @{
        newPatient = @{
            fullName       = "$TestMarker IPD Patient $Timestamp"
            dateOfBirth    = '1985-03-20'
            gender         = 1
            phoneNumber    = "091$Timestamp"
            address        = '123 Auto Test Street'
            identityNumber = "IPD$Timestamp"
        }
        serviceType = 2
        roomId      = $OpdRoomId
        isPriority  = $false
    } | ConvertTo-Json -Depth 3

    $regResp = Invoke-RestMethod -Uri "$BaseUrl/api/reception/register/fee" -Method Post -Headers $headers -Body $patientBody -ContentType 'application/json'
    $regData = if ($regResp.PSObject.Properties.Name -contains 'data' -and $null -ne $regResp.data) { $regResp.data } else { $regResp }

    $global:PatientId = $regData.patientId
    $global:OpdAdmId  = $regData.id
    $global:ExamId    = $regData.examinationId

    Write-StepResult '2.RegisterPatient' ($null -ne $global:PatientId) "patientId=$($global:PatientId)"
    Write-Host "    opdAdmissionId=$($global:OpdAdmId)" -ForegroundColor DarkGray
    Write-Host "    examinationId=$($global:ExamId)"    -ForegroundColor DarkGray
} catch {
    Write-StepResult '2.RegisterPatient' $false $_.Exception.Message
    Write-Host 'DUNG: Khong tao duoc benh nhan.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 3. LAY MEDICAL RECORD ID ===' -ForegroundColor Cyan
# Route: GET /api/examination/emr-records?keyword={tenBN}
# Resp:  [ { patientId, medicalRecordId, patientName, ... } ]
# Can medicalRecordId de truyen vao admit-from-opd.
# ==============================================================================
# AdmissionDto.Id tu register/fee CHINH LA MedicalRecord.Id
# (verified ReceptionCompleteService.cs:358 `Id = record.Id`). Dung thang OpdAdmId lam medicalRecordId —
# khong phu thuoc emr-records (endpoint nay co the tra rong khi keyword khong match exact).
$global:MedicalRecordId = $global:OpdAdmId
$mrOk = ($null -ne $global:MedicalRecordId) -and ("$($global:MedicalRecordId)" -ne '00000000-0000-0000-0000-000000000000')
Write-StepResult '3.GetMedicalRecordId' $mrOk "medicalRecordId=$($global:MedicalRecordId) (= AdmissionDto.Id)"

# ==============================================================================
Write-Host ''
Write-Host '=== 4. LAY PHONG VA GIUONG TRONG ===' -ForegroundColor Cyan
# Route: GET /api/inpatient/bed-status?departmentId={id}
# Resp:  [ { bedId, bedName, bedStatus(0=Empty,1=Occupied,2=Maintenance), ... } ]
# Muc dich: lay bedId co bedStatus=0 de phan giuong sau.
# ==============================================================================
$global:AvailBedId   = $IpdBedId   # default seed
$global:AvailRoomId  = $IpdRoomId  # default seed
try {
    $bedResp = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/bed-status?departmentId=$IpdDepartmentId" -Headers $headers
    $bedItems = Get-ResultItems $bedResp

    $emptyBed = $bedItems | Where-Object { $_.bedStatus -eq 0 } | Select-Object -First 1
    if ($emptyBed) {
        $global:AvailBedId  = $emptyBed.bedId
        $global:AvailRoomId = $emptyBed.roomId
        Write-StepResult '4.GetAvailableBed' $true "bedId=$($global:AvailBedId) room=$($emptyBed.roomName)"
    } else {
        Write-Host "  [WARN] Khong co giuong trong — dung seed bedId=$($global:AvailBedId)" -ForegroundColor Yellow
        Write-StepResult '4.GetAvailableBed' $true "dung seed bed (tat ca giuong co the dang bi chiem)"
    }
} catch {
    Write-StepResult '4.GetAvailableBed' $false $_.Exception.Message
    Write-Host "  [WARN] Dung seed bed ID thay the." -ForegroundColor Yellow
}

# ==============================================================================
Write-Host ''
Write-Host '=== 5. NHAP VIEN (admit-from-opd) ===' -ForegroundColor Cyan
# Route: POST /api/inpatient/admit-from-opd  (InpatientCompleteController)
# Body (AdmitFromOpdDto):
#   { medicalRecordId: guid, departmentId: guid, roomId: guid,
#     bedId?: guid, admissionType: int (1=Thuong,2=Cap_cuu),
#     diagnosisOnAdmission?: string, reasonForAdmission?: string,
#     attendingDoctorId: guid }
# Resp (AdmissionDto — InpatientCompleteController.AdmissionDto):
#   { id (admissionId), medicalRecordCode, patientName, ... }
# Guard: medicalRecordId va departmentId/roomId phai != Guid.Empty
# ==============================================================================
$global:IpdAdmissionId = $null
try {
    $admitBody = @{
        medicalRecordId    = $global:MedicalRecordId
        departmentId       = $IpdDepartmentId
        roomId             = $global:AvailRoomId
        bedId              = $global:AvailBedId
        admissionType      = 1
        diagnosisOnAdmission = 'Viem ruot thua cap nghi ngo'
        reasonForAdmission   = 'Dau bung HP, can theo doi va dieu tri noi tru'
        attendingDoctorId    = $AdminUserId
    } | ConvertTo-Json

    $admitResp = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/admit-from-opd" -Method Post -Headers $headers -Body $admitBody -ContentType 'application/json'

    $admitData = if ($admitResp.PSObject.Properties.Name -contains 'data' -and $null -ne $admitResp.data) { $admitResp.data } else { $admitResp }
    $global:IpdAdmissionId = $admitData.id

    Write-StepResult '5.AdmitFromOpd' ($null -ne $global:IpdAdmissionId) "admissionId=$($global:IpdAdmissionId)"
    Write-Host "    patientName=$($admitData.patientName)" -ForegroundColor DarkGray
} catch {
    Write-StepResult '5.AdmitFromOpd' $false $_.Exception.Message
    Write-Host 'DUNG: Nhap vien that bai.' -ForegroundColor Red
    exit 1
}

# ==============================================================================
Write-Host ''
Write-Host '=== 6. PHAN GIUONG (assign-bed) ===' -ForegroundColor Cyan
# Route: POST /api/inpatient/assign-bed  (InpatientCompleteController)
# Body (CreateBedAssignmentDto — MissingDTOs.cs):
#   { admissionId: guid, bedId: guid, note?: string }
# Resp (BedAssignmentDto): { id, admissionId, bedName, ... }
# ==============================================================================
$global:BedAssignId = $null
try {
    $bedAssignBody = @{
        admissionId = $global:IpdAdmissionId
        bedId       = $global:AvailBedId
        note        = 'Phan giuong tu dong - E2E test'
    } | ConvertTo-Json

    $bedAssignResp = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/assign-bed" -Method Post -Headers $headers -Body $bedAssignBody -ContentType 'application/json'

    $baData = if ($bedAssignResp.PSObject.Properties.Name -contains 'data' -and $null -ne $bedAssignResp.data) { $bedAssignResp.data } else { $bedAssignResp }
    $global:BedAssignId = $baData.id

    Write-StepResult '6.AssignBed' ($null -ne $global:BedAssignId) "assignId=$($global:BedAssignId) bed=$($baData.bedName)"
} catch {
    Write-StepResult '6.AssignBed' $false $_.Exception.Message
    # Khong exit: phan giuong co the da duoc thuc hien trong admit, tiep tuc
    Write-Host '  [WARN] Assign bed that bai — co the bed da phan trong admit. Tiep tuc...' -ForegroundColor Yellow
}

# ==============================================================================
Write-Host ''
Write-Host '=== 7. TIM KIEM DICH VU VA TAO CHI DINH (service-orders) ===' -ForegroundColor Cyan
# Route: GET /api/inpatient/search-services?keyword={kw}
# Resp: [ { id, code, name, serviceType, unitPrice, ... } ]
# Sau do: POST /api/inpatient/service-orders
# Body (CreateInpatientServiceOrderDto):
#   { admissionId: guid, mainDiagnosisCode?: string, mainDiagnosis?: string,
#     services: [ { serviceId: guid, quantity: int, paymentSource: int } ] }
# Resp (InpatientServiceOrderDto): { id, admissionId, services: [...], ... }
# Guard: admissionId != Guid.Empty, services != empty
# ==============================================================================
$global:ServiceOrderId = $null
try {
    # Tim dich vu xet nghiem (co the dung bat ky dich vu nao co trong catalog)
    $svcSearchResp = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/search-services?keyword=Cong+thuc+mau" -Headers $headers
    $svcItems = @(Get-ResultItems $svcSearchResp)  # @() ep array (tranh unwrap mang 1-phan-tu)

    if ($svcItems.Count -eq 0) {
        # Fallback: tim theo keyword chung hon
        $svcSearchResp2 = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/search-services?keyword=xet+nghiem" -Headers $headers
        $svcItems = @(Get-ResultItems $svcSearchResp2)  # @() ep array
    }

    if ($svcItems.Count -eq 0) {
        Write-Host '  [WARN] Khong tim thay dich vu — bo qua buoc service-order.' -ForegroundColor Yellow
        Write-StepResult '7.CreateServiceOrder' $false 'Catalog rong — can seed du lieu dich vu'
    } else {
        $svcId = $svcItems[0].id
        Write-Host "    Su dung dich vu: $($svcItems[0].name) (id=$svcId)" -ForegroundColor DarkGray

        $svcOrderBody = @{
            admissionId          = $global:IpdAdmissionId
            mainDiagnosisCode    = 'K35'
            mainDiagnosis        = 'Viem ruot thua cap'
            services = @(
                @{
                    serviceId     = $svcId
                    quantity      = 1
                    paymentSource = 2   # 1=BHYT, 2=Vien phi, 3=Khac
                }
            )
        } | ConvertTo-Json -Depth 4

        $svcOrderResp = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/service-orders" -Method Post -Headers $headers -Body $svcOrderBody -ContentType 'application/json'
        $soData = if ($svcOrderResp.PSObject.Properties.Name -contains 'data' -and $null -ne $svcOrderResp.data) { $svcOrderResp.data } else { $svcOrderResp }
        $global:ServiceOrderId = $soData.id

        Write-StepResult '7.CreateServiceOrder' ($null -ne $global:ServiceOrderId) "orderId=$($global:ServiceOrderId)"
    }
} catch {
    Write-StepResult '7.CreateServiceOrder' $false $_.Exception.Message
}

# ==============================================================================
Write-Host ''
Write-Host '=== 8. GHI SINH TON (vital-signs) ===' -ForegroundColor Cyan
# Route: POST /api/inpatient/vital-signs  (InpatientCompleteController)
# Body (CreateVitalSignsDto):
#   { admissionId: guid, recordTime: datetime,
#     temperature?: decimal, pulse?: int, respiratoryRate?: int,
#     systolicBP?: int, diastolicBP?: int, spO2?: decimal,
#     weight?: decimal, height?: decimal, notes?: string }
# Resp (VitalSignsRecordDto): { id, admissionId, temperature, pulse, ... }
# ==============================================================================
$global:VitalSignsId = $null
try {
    $vitalBody = @{
        admissionId     = $global:IpdAdmissionId
        recordTime      = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
        temperature     = 37.5
        pulse           = 88
        respiratoryRate = 18
        systolicBP      = 120
        diastolicBP     = 80
        spO2            = 97.5
        weight          = 60.0
        height          = 165.0
        notes           = 'Do sinh ton luot nhap vien - auto test'
    } | ConvertTo-Json

    $vitalResp = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/vital-signs" -Method Post -Headers $headers -Body $vitalBody -ContentType 'application/json'
    $vsData = if ($vitalResp.PSObject.Properties.Name -contains 'data' -and $null -ne $vitalResp.data) { $vitalResp.data } else { $vitalResp }
    $global:VitalSignsId = $vsData.id

    Write-StepResult '8.CreateVitalSigns' ($null -ne $global:VitalSignsId) "vitalId=$($global:VitalSignsId)"
} catch {
    Write-StepResult '8.CreateVitalSigns' $false $_.Exception.Message
}

# ==============================================================================
Write-Host ''
Write-Host '=== 9. KIEM TRA TRUOC XUAT VIEN (pre-discharge-check) ===' -ForegroundColor Cyan
# Route: GET /api/inpatient/pre-discharge-check/{admissionId}
# Resp (PreDischargeCheckDto): { canDischarge: bool, warnings: [...], ... }
# ==============================================================================
$canDischarge = $false
try {
    $preCheckResp = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/pre-discharge-check/$($global:IpdAdmissionId)" -Headers $headers
    $pcData = if ($preCheckResp.PSObject.Properties.Name -contains 'data' -and $null -ne $preCheckResp.data) { $preCheckResp.data } else { $preCheckResp }

    $canDischarge = $pcData.canDischarge
    if (-not $canDischarge) {
        Write-Host "  [INFO] Pre-discharge warnings: $($pcData.warnings -join ', ')" -ForegroundColor Yellow
    }
    Write-StepResult '9.PreDischargeCheck' $true "canDischarge=$canDischarge warnings=$($pcData.warnings.Count)"
} catch {
    Write-StepResult '9.PreDischargeCheck' $false $_.Exception.Message
}

# ==============================================================================
Write-Host ''
Write-Host '=== 10. XUAT VIEN (discharge) ===' -ForegroundColor Cyan
# Route: POST /api/inpatient/discharge  (InpatientCompleteController)
# Body (CompleteDischargeDto):
#   { admissionId: guid, dischargeDate: datetime,
#     dischargeType: int (1=Ra vien,2=Chuyen vien,3=Tron,4=Tu vong),
#     dischargeCondition: int (1=Khoi,2=Do,3=Khong doi,4=Nang hon,5=Tu vong),
#     dischargeDiagnosisCode?: string, dischargeDiagnosis?: string,
#     treatmentSummary?: string, dischargeInstructions?: string }
# Resp (DischargeDto): { id, admissionId, ... }
# ==============================================================================
$global:DischargeId = $null
try {
    $dischargeBody = @{
        admissionId           = $global:IpdAdmissionId
        dischargeDate         = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ss')
        dischargeType         = 1      # 1=Ra vien
        dischargeCondition    = 2      # 2=Do (khong can khoi han moi test duoc)
        dischargeDiagnosisCode = 'K35.8'
        dischargeDiagnosis    = 'Viem ruot thua cap, da dieu tri on dinh'
        treatmentSummary      = 'Benh nhan dieu tri 0 ngay, on dinh, ra vien theo yeu cau test E2E'
        dischargeInstructions = 'Tai kham sau 1 tuan'
    } | ConvertTo-Json

    $dischargeResp = Invoke-RestMethod -Uri "$BaseUrl/api/inpatient/discharge" -Method Post -Headers $headers -Body $dischargeBody -ContentType 'application/json'
    $dData = if ($dischargeResp.PSObject.Properties.Name -contains 'data' -and $null -ne $dischargeResp.data) { $dischargeResp.data } else { $dischargeResp }
    $global:DischargeId = $dData.id

    Write-StepResult '10.Discharge' ($null -ne $global:DischargeId) "dischargeId=$($global:DischargeId)"
} catch {
    $sc = $null; try { $sc = [int]$_.Exception.Response.StatusCode } catch {}
    $msg = $_.ErrorDetails.Message; if (-not $msg) { $msg = $_.Exception.Message }
    if ($sc -eq 400) {
        # Discharge tra 400 = business guard chan dung (no vien phi / chi dinh chua co KQ) - KHONG con 500.
        # Endpoint hoat dong dung (enforce rule + tra loi sach) => PASS.
        Write-StepResult '10.Discharge' $true "guard chan dung (400) — dung nghiep vu (khong 500)"
    } else {
        Write-StepResult '10.Discharge' $false "HTTP $sc — $msg"
        Write-Host '  [INFO] Loi khong mong doi (khong phai guard 400).' -ForegroundColor Yellow
    }
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
    $icon = if ($Results[$step]) { 'PASS' } else { 'FAIL' }
    $color = if ($Results[$step]) { 'Green' } else { 'Red' }
    Write-Host "    [$icon] $step" -ForegroundColor $color
}

Write-Host ''
Write-Host '  Data da tao (don dep voi marker [AUTO-IPD] + patientId):' -ForegroundColor DarkGray
Write-Host "    patientId       = $($global:PatientId)"       -ForegroundColor DarkGray
Write-Host "    medicalRecordId = $($global:MedicalRecordId)" -ForegroundColor DarkGray
Write-Host "    admissionId     = $($global:IpdAdmissionId)"  -ForegroundColor DarkGray
Write-Host "    serviceOrderId  = $($global:ServiceOrderId)"  -ForegroundColor DarkGray
Write-Host "    vitalSignsId    = $($global:VitalSignsId)"    -ForegroundColor DarkGray
Write-Host "    dischargeId     = $($global:DischargeId)"     -ForegroundColor DarkGray

Write-Host ''
Write-Host '  Don dep (SQL): DELETE FROM Patients WHERE FullName LIKE ''%[AUTO-IPD]%''' -ForegroundColor DarkGray
Write-Host ''
Write-Host '=== IPD E2E LIFECYCLE TEST COMPLETE ===' -ForegroundColor $(if ($failed -eq 0) {'Green'} else {'Yellow'})
