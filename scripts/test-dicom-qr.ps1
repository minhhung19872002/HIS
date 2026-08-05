# Test chap nhan Query/Retrieve (Study Root C-FIND + C-MOVE/C-GET) voi 1 PACS remote THAT.
#
# Vi sao can script nay: roadmap docs/pacs/HOSPITAL_GRADE_ROADMAP.md Phase 1 con treo dong
# "Query/Retrieve acceptance tests". Code da co (DicomPacsGateway.QueryStudiesAsync /
# RetrieveStudyAsync) nhung chua co bang chung chay that. Mot Orthanc khong the tu chung minh
# Q/R voi chinh no: C-MOVE phai roi khoi node va quay ve qua 1 peer doc lap.
#
# Topology:
#   his-orthanc      (HIS_PACS,  REST 8043) = PACS noi bo cua benh vien
#   his-orthanc-peer (TEST_PACS, REST 8044) = dong vai PACS tuyen tren / phong kham lien ket
#   HIS API :5106 goi Q/R qua /api/RISComplete/dicom/remote-servers/{id}/query|retrieve
#
# Chuan bi:
#   docker compose up -d orthanc
#   docker compose --profile dicom-test up -d orthanc-peer
#   cd backend/src/HIS.API && dotnet run --launch-profile http
# Chay:
#   powershell -ExecutionPolicy Bypass -File .\scripts\test-dicom-qr.ps1

$ErrorActionPreference = "Continue"

$baseUrl        = "http://localhost:5106"
$localRest      = "http://127.0.0.1:8043"     # his-orthanc REST (loopback-only)
$peerRest       = "http://127.0.0.1:8044"     # his-orthanc-peer REST
$peerDicomHost  = "his-orthanc-peer"          # ten container: his-orthanc goi peer trong docker network
$peerDicomPort  = 4242
$peerAet        = "TEST_PACS"
$localAet       = "HIS_PACS"
$localDicomHost = "his-orthanc"
$localDicomPort = 4242
$peerEndpoint   = "$peerDicomHost" + ":" + $peerDicomPort
$localEndpoint  = "$localDicomHost" + ":" + $localDicomPort
$pacsUser       = if ($env:PACS_USERNAME) { $env:PACS_USERNAME } else { "his-api" }
$pacsPass       = if ($env:PACS_PASSWORD) { $env:PACS_PASSWORD } else { "HisPacsLocal-2026!Change" }
$sampleDir      = Join-Path $PSScriptRoot "..\deploy\pacs\sample-dicom\extracted\viewer-testdata-master\dcm\acrin"
$seedCount      = 5

$pass = 0; $fail = 0
function Ok($m)   { $script:pass++; Write-Host "  PASS  $m" -ForegroundColor Green }
function Bad($m)  { $script:fail++; Write-Host "  FAIL  $m" -ForegroundColor Red }
function Step($m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }

$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pacsUser + ":" + $pacsPass))
$OH    = @{ Authorization = "Basic $basic" }

function Orthanc([string]$root, [string]$path, [string]$method = "Get", $body = $null, [string]$contentType = "application/json") {
    $p = @{ Uri = "$root/$path"; Method = $method; Headers = $OH; TimeoutSec = 120 }
    if ($null -ne $body) { $p.Body = $body; $p.ContentType = $contentType }
    return Invoke-RestMethod @p
}

function Find-LocalStudy([string]$uid) {
    $q = @{ Level = "Study"; Query = @{ StudyInstanceUID = $uid } } | ConvertTo-Json
    return Orthanc $localRest "tools/find" "Post" $q
}

# Kiem chung DOC LAP tren his-orthanc, khong tin ket qua API tra ve
function Assert-LocalStudy([string]$uid, [int]$expected, [string]$label) {
    try {
        $found = Find-LocalStudy $uid
        if ($found.Count -eq 0) { Bad "$label : his-orthanc KHONG co study $uid (API bao thanh cong nhung anh khong ve)"; return }
        $st = Orthanc $localRest "studies/$($found[0])/statistics"
        if ([int]$st.CountInstances -eq $expected) { Ok "$label : his-orthanc co du $expected instance (xac minh truc tiep tren archive)" }
        else { Bad "$label : his-orthanc chi co $($st.CountInstances)/$expected instance" }
    } catch { Bad "$label : loi kiem tra local: $($_.Exception.Message)" }
}

function Remove-LocalStudy([string]$uid) {
    try {
        $found = Find-LocalStudy $uid
        foreach ($id in $found) { Orthanc $localRest "studies/$id" "Delete" | Out-Null }
    } catch { }
}

function Read-HttpError($err) {
    try { return (New-Object IO.StreamReader($err.Exception.Response.GetResponseStream())).ReadToEnd() }
    catch { return $err.Exception.Message }
}

# --------------------------------------------------------------------------------------------
Step "0. Tien dieu kien: 2 node PACS + API"
try {
    $localSys = Orthanc $localRest "system"
    Ok "his-orthanc song: AET=$($localSys.DicomAet) ver=$($localSys.Version)"
} catch { Bad "khong goi duoc his-orthanc REST $localRest : $($_.Exception.Message)"; exit 1 }

try {
    $peerSys = Orthanc $peerRest "system"
    Ok "peer song: AET=$($peerSys.DicomAet) ver=$($peerSys.Version)"
} catch {
    Bad "khong goi duoc peer REST $peerRest. Chay: docker compose --profile dicom-test up -d orthanc-peer"
    exit 1
}
if ($peerSys.DicomAet -ne $peerAet) { Bad "peer AET la '$($peerSys.DicomAet)', mong doi '$peerAet'"; exit 1 }

if (-not (Test-Path $sampleDir)) { Bad "khong tim thay DICOM mau: $sampleDir"; exit 1 }
$samples = Get-ChildItem $sampleDir -Filter *.dcm | Select-Object -First $seedCount
if ($samples.Count -lt 2) { Bad "can it nhat 2 file DICOM mau de test study nhieu instance"; exit 1 }

$token = $null
try {
    $lb = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
    $token = (Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $lb -TimeoutSec 60).data.token
} catch { Bad "khong login duoc HIS API $baseUrl : $($_.Exception.Message)"; exit 1 }
if (-not $token) { Bad "login khong tra ve token"; exit 1 }
$H = @{ Authorization = "Bearer $token" }
Ok "dang nhap HIS API thanh cong"

# --------------------------------------------------------------------------------------------
Step "1. Nap 1 study nhieu instance vao PEER (dong vai PACS tuyen tren)"
$peerStudyOrthancId = $null
foreach ($f in $samples) {
    $bytes = [IO.File]::ReadAllBytes($f.FullName)
    try {
        $up = Orthanc $peerRest "instances" "Post" $bytes "application/dicom"
        $peerStudyOrthancId = $up.ParentStudy
    } catch { Bad "upload $($f.Name) len peer that bai: $($_.Exception.Message)"; exit 1 }
}
if (-not $peerStudyOrthancId) { Bad "peer khong tra ve ParentStudy"; exit 1 }

$peerStudy     = Orthanc $peerRest "studies/$peerStudyOrthancId"
$studyUid      = $peerStudy.MainDicomTags.StudyInstanceUID
$patientId     = $peerStudy.PatientMainDicomTags.PatientID
$peerStats     = Orthanc $peerRest "studies/$peerStudyOrthancId/statistics"
$peerInstances = [int]$peerStats.CountInstances
if ($peerInstances -lt 2) { Bad "study tren peer chi co $peerInstances instance, khong du de test dem instance"; exit 1 }
Ok "peer giu study $studyUid (PatientID=$patientId, $peerInstances instance)"

# Study nay PHAI chua ton tai o local, neu khong phep dem instance sau C-MOVE vo nghia.
$preExisting = $null
try {
    $found = Find-LocalStudy $studyUid
    if ($found.Count -gt 0) { $preExisting = $found[0] }
} catch { }
if ($preExisting) {
    Bad "study $studyUid da co san tren his-orthanc. Don sach truoc khi test: DELETE /studies/$preExisting"
    exit 1
}
Ok "his-orthanc chua co study nay (dieu kien can de do ket qua retrieve)"

# --------------------------------------------------------------------------------------------
Step "2. Khai bao duong ve cho C-MOVE tren peer"
# C-MOVE: his-orthanc gui yeu cau, peer phai TU MO association nguoc lai va C-STORE vao HIS_PACS.
# Neu peer khong biet HIS_PACS o dau thi C-MOVE that bai. Day dung la loi cau hinh hay gap that te.
try {
    $mod = @{
        AET = $localAet; Host = $localDicomHost; Port = $localDicomPort
        AllowFind = $true; AllowGet = $true; AllowMove = $true; AllowStore = $true; AllowEcho = $true
    } | ConvertTo-Json
    Orthanc $peerRest "modalities/$localAet" "Put" $mod | Out-Null
    Ok "peer da biet $localAet tai $localEndpoint"
} catch { Bad "khong dang ky duoc modality $localAet tren peer: $($_.Exception.Message)"; exit 1 }

try {
    Orthanc $peerRest "modalities/$localAet/echo" "Post" "{}" | Out-Null
    Ok "C-ECHO tu peer ve $localAet thanh cong (duong ve thong)"
} catch { Bad "C-ECHO tu peer ve $localAet that bai, C-MOVE se khong ve duoc: $($_.Exception.Message)" }

# --------------------------------------------------------------------------------------------
Step "3. Khai bao PACS remote trong HIS"
$serverId = $null
try {
    $dto = @{
        name = "[AUTO-TEST] Peer QR"; aeTitle = $peerAet; host = $peerDicomHost; port = $peerDicomPort
        callingAeTitle = $localAet; useTls = $false; useStorageCommitment = $false
        timeoutSeconds = 60; description = "Tao boi scripts/test-dicom-qr.ps1"; isActive = $true
    } | ConvertTo-Json
    $saved = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/dicom/remote-servers" -Method Post `
             -ContentType "application/json" -Headers $H -Body $dto -TimeoutSec 60
    $sb = if ($saved.data) { $saved.data } else { $saved }
    $serverId = $sb.id
} catch { Bad "khong tao duoc remote PACS server: $(Read-HttpError $_)"; exit 1 }
if (-not $serverId) { Bad "API khong tra ve id cua remote server"; exit 1 }
Ok "remote PACS server id=$serverId (AET=$peerAet tai $peerEndpoint)"

# --------------------------------------------------------------------------------------------
Step "4. Study Root C-FIND qua HIS"
try {
    $q = @{ patientId = $patientId; maxResults = 50 } | ConvertTo-Json
    $qr = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/dicom/remote-servers/$serverId/query" -Method Post `
          -ContentType "application/json" -Headers $H -Body $q -TimeoutSec 120
    $qb = if ($qr.data) { $qr.data } else { $qr }
    if (-not $qb.success) { Bad "C-FIND that bai: $($qb.errorMessage)" }
    else {
        $hit = $qb.studies | Where-Object { $_.studyInstanceUid -eq $studyUid }
        if ($hit) {
            Ok "C-FIND tra ve dung study $studyUid (PatientID=$($hit.patientId))"
            if ([int]$hit.numberOfStudyRelatedInstances -eq $peerInstances) {
                Ok "so instance trong ket qua C-FIND khop peer ($peerInstances)"
            } else {
                Bad "NumberOfStudyRelatedInstances=$($hit.numberOfStudyRelatedInstances), peer co $peerInstances"
            }
        } else { Bad "C-FIND thanh cong nhung khong thay study $studyUid trong $($qb.studies.Count) ket qua" }
    }
} catch { Bad "loi goi C-FIND: $(Read-HttpError $_)" }

# C-FIND theo StudyInstanceUID: duong hep, la buoc retrieve dung ben trong
try {
    $q2 = @{ studyInstanceUid = $studyUid; maxResults = 10 } | ConvertTo-Json
    $qr2 = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/dicom/remote-servers/$serverId/query" -Method Post `
           -ContentType "application/json" -Headers $H -Body $q2 -TimeoutSec 120
    $qb2 = if ($qr2.data) { $qr2.data } else { $qr2 }
    if ($qb2.success -and ($qb2.studies | Where-Object { $_.studyInstanceUid -eq $studyUid })) {
        Ok "C-FIND theo StudyInstanceUID tra ve dung study"
    } else { Bad "C-FIND theo StudyInstanceUID khong tra ve study: $($qb2.errorMessage)" }
} catch { Bad "loi C-FIND theo StudyInstanceUID: $(Read-HttpError $_)" }

# Am tinh: PatientID khong ton tai phai la "thanh cong, 0 ket qua", KHONG duoc bia study
try {
    $q3 = @{ patientId = "KHONGTONTAI$(Get-Random)"; maxResults = 10 } | ConvertTo-Json
    $qr3 = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/dicom/remote-servers/$serverId/query" -Method Post `
           -ContentType "application/json" -Headers $H -Body $q3 -TimeoutSec 120
    $qb3 = if ($qr3.data) { $qr3.data } else { $qr3 }
    if ($qb3.success -and $qb3.studies.Count -eq 0) { Ok "C-FIND PatientID khong ton tai tra ve 0 ket qua (khong bia du lieu)" }
    else { Bad "C-FIND PatientID khong ton tai tra ve $($qb3.studies.Count) ket qua" }
} catch { Bad "loi C-FIND am tinh: $(Read-HttpError $_)" }

# --------------------------------------------------------------------------------------------
Step "5. C-MOVE: keo study tu peer ve HIS"
try {
    $rb = @{ studyInstanceUid = $studyUid; retrieveMethod = "C-MOVE" } | ConvertTo-Json
    $rr = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/dicom/remote-servers/$serverId/retrieve" -Method Post `
          -ContentType "application/json" -Headers $H -Body $rb -TimeoutSec 900
    $rbody = if ($rr.data) { $rr.data } else { $rr }
    if ($rbody.success) {
        Ok "C-MOVE bao thanh cong: $($rbody.instanceCount) instance / $($rbody.totalBytes) byte"
        if ([int]$rbody.instanceCount -eq $peerInstances) { Ok "so instance API bao khop peer ($peerInstances)" }
        else { Bad "API bao $($rbody.instanceCount) instance, peer co $peerInstances" }
    } else { Bad "C-MOVE that bai: $($rbody.errorMessage)" }
} catch { Bad "C-MOVE loi: $(Read-HttpError $_)" }
Assert-LocalStudy $studyUid $peerInstances "C-MOVE"

# --------------------------------------------------------------------------------------------
Step "6. C-GET: xoa ban local roi keo lai bang duong khac"
Remove-LocalStudy $studyUid
Start-Sleep -Seconds 1
try {
    $rb = @{ studyInstanceUid = $studyUid; retrieveMethod = "C-GET" } | ConvertTo-Json
    $rr = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/dicom/remote-servers/$serverId/retrieve" -Method Post `
          -ContentType "application/json" -Headers $H -Body $rb -TimeoutSec 900
    $rbody = if ($rr.data) { $rr.data } else { $rr }
    if ($rbody.success) { Ok "C-GET bao thanh cong: $($rbody.instanceCount) instance" }
    else { Bad "C-GET that bai: $($rbody.errorMessage)" }
} catch { Bad "C-GET loi: $(Read-HttpError $_)" }
Assert-LocalStudy $studyUid $peerInstances "C-GET"

# --------------------------------------------------------------------------------------------
Step "7. Am tinh: retrieve study khong ton tai PHAI bao loi that"
try {
    $bogus = "1.2.826.0.1.3680043.9.9999.$(Get-Random).$(Get-Random)"
    $rb = @{ studyInstanceUid = $bogus; retrieveMethod = "C-MOVE" } | ConvertTo-Json
    $rr = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/dicom/remote-servers/$serverId/retrieve" -Method Post `
          -ContentType "application/json" -Headers $H -Body $rb -TimeoutSec 300
    $rbody = if ($rr.data) { $rr.data } else { $rr }
    if ($rbody.success) { Bad "retrieve UID khong ton tai lai bao THANH CONG, vi pham quy tac khong bia ket qua" }
    else { Ok "retrieve UID khong ton tai bi tu choi: $($rbody.errorMessage)" }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 502) { Ok "retrieve UID khong ton tai tra ve HTTP 502 kem loi that" }
    else { Bad "retrieve UID khong ton tai loi ngoai du kien: $(Read-HttpError $_)" }
}

# --------------------------------------------------------------------------------------------
Step "8. Don dep"
Remove-LocalStudy $studyUid
try { Orthanc $peerRest "studies/$peerStudyOrthancId" "Delete" | Out-Null; Ok "da xoa study tren peer" } catch { Bad "khong xoa duoc study tren peer: $($_.Exception.Message)" }
try { Orthanc $peerRest "modalities/$localAet" "Delete" | Out-Null; Ok "da xoa modality $localAet tren peer" } catch { }
if ($serverId) {
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/dicom/remote-servers/$serverId" -Method Delete -Headers $H -TimeoutSec 60 | Out-Null
        Ok "da xoa remote PACS server test"
    } catch { Bad "khong xoa duoc remote server $serverId : $(Read-HttpError $_)" }
}

Write-Host ""
Write-Host "================ KET QUA ================" -ForegroundColor Yellow
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red } else { Write-Host "  FAIL: 0" -ForegroundColor Green }
if ($fail -gt 0) { exit 1 } else { exit 0 }
