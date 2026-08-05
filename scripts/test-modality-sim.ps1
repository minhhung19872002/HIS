# Test vong chup bang may gia lap (tools/ModalitySimulator) tren association DICOM THAT.
#
# Phu cac muc Phase 1: C-ECHO (ca chieu bi tu choi lan chieu duoc chap nhan), MWL C-FIND,
# C-STORE + xac minh provenance tren archive, va hanh vi fail-closed cua MPPS SCP.
#
# Chuan bi:
#   docker compose up -d orthanc sqlserver redis
#   cd backend/src/HIS.API && dotnet run --launch-profile http
# Chay:
#   powershell -ExecutionPolicy Bypass -File .\scripts\test-modality-sim.ps1

$ErrorActionPreference = "Continue"

$localRest = "http://127.0.0.1:8043"
$simAet    = "SIM_CR01"
$pacsAet   = "HIS_PACS"
$imageCount= 4
$simProject= Join-Path $PSScriptRoot "..\tools\ModalitySimulator\ModalitySimulator.csproj"
$pacsUser  = if ($env:PACS_USERNAME) { $env:PACS_USERNAME } else { "his-api" }
$pacsPass  = if ($env:PACS_PASSWORD) { $env:PACS_PASSWORD } else { "HisPacsLocal-2026!Change" }

$pass = 0; $fail = 0
function Ok($m)   { $script:pass++; Write-Host "  PASS  $m" -ForegroundColor Green }
function Bad($m)  { $script:fail++; Write-Host "  FAIL  $m" -ForegroundColor Red }
function Step($m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }

$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pacsUser + ":" + $pacsPass))
$OH    = @{ Authorization = "Basic $basic" }

function Orthanc([string]$path, [string]$method = "Get", $body = $null, [string]$contentType = "application/json") {
    $p = @{ Uri = "$localRest/$path"; Method = $method; Headers = $OH; TimeoutSec = 120 }
    if ($null -ne $body) { $p.Body = $body; $p.ContentType = $contentType }
    return Invoke-RestMethod @p
}

function Sim([string[]]$simArgs) {
    $out = & dotnet run --project $simProject --no-build -- @simArgs 2>&1
    return @{ Output = ($out | Out-String); Code = $LASTEXITCODE }
}

# --------------------------------------------------------------------------------------------
Step "0. Tien dieu kien"
try { $sys = Orthanc "system"; Ok "his-orthanc song: AET=$($sys.DicomAet) ver=$($sys.Version)" }
catch { Bad "khong goi duoc his-orthanc REST $localRest : $($_.Exception.Message)"; exit 1 }

$build = & dotnet build $simProject --nologo -v q 2>&1
if ($LASTEXITCODE -ne 0) { Bad "build ModalitySimulator that bai:`n$($build | Out-String)"; exit 1 }
Ok "build ModalitySimulator sach"

# Dam bao AE chua duoc khai bao truoc khi test chieu am tinh
try { Orthanc "modalities/$simAet" "Delete" | Out-Null } catch { }

# --------------------------------------------------------------------------------------------
Step "1. C-ECHO tu AE CHUA khai bao PHAI bi tu choi"
$r = Sim @("echo", "--calling-aet", $simAet)
if ($r.Code -ne 0) { Ok "bi tu choi dung nhu cau hinh hardening (DicomAlwaysAllowEcho=false)" }
else { Bad "AE la ma van C-ECHO duoc: archive dang mo hon cau hinh mong doi" }

# --------------------------------------------------------------------------------------------
Step "2. Khai bao AE may chup roi C-ECHO lai"
$mod = @{ AET = $simAet; Host = "host.docker.internal"; Port = 11112
          AllowEcho = $true; AllowStore = $true; AllowFind = $true } | ConvertTo-Json
try { Orthanc "modalities/$simAet" "Put" $mod | Out-Null; Ok "da khai bao modality $simAet" }
catch { Bad "khong khai bao duoc modality: $($_.Exception.Message)"; exit 1 }

$r = Sim @("echo", "--calling-aet", $simAet)
if ($r.Code -eq 0) { Ok "C-ECHO thanh cong sau khi khai bao" }
else { Bad "C-ECHO van that bai sau khi khai bao: $($r.Output)" }

# --------------------------------------------------------------------------------------------
Step "3. Tao lich chup (MWL) va truy van bang C-FIND"
$accession = "SIM" + (Get-Date -Format "yyMMddHHmmss")
$studyUid  = "1.2.826.0.1.3680043.9.7133." + (Get-Random -Maximum 999999) + "." + (Get-Random -Maximum 999999)
$mwl = @{ Tags = @{
    PatientID = "SIMPAT001"; PatientName = "NGUYEN^VAN SIM"; PatientBirthDate = "19800101"; PatientSex = "M"
    AccessionNumber = $accession; RequestedProcedureID = "RP001"
    RequestedProcedureDescription = "CHUP X QUANG NGUC THANG"; StudyInstanceUID = $studyUid
    ScheduledProcedureStepSequence = @(@{
        ScheduledStationAETitle = $simAet
        ScheduledProcedureStepStartDate = (Get-Date -Format "yyyyMMdd")
        ScheduledProcedureStepStartTime = (Get-Date -Format "HHmmss")
        Modality = "CR"; ScheduledProcedureStepID = "RP001"
        ScheduledProcedureStepDescription = "CHUP X QUANG NGUC THANG" })
} } | ConvertTo-Json -Depth 6
try { Orthanc "worklists/create" "Post" $mwl | Out-Null; Ok "da tao lich chup accession=$accession" }
catch { Bad "khong tao duoc MWL: $($_.Exception.Message)"; exit 1 }

$r = Sim @("worklist", "--modality", "CR", "--calling-aet", $simAet)
if ($r.Code -eq 0 -and $r.Output -match [regex]::Escape($accession)) { Ok "MWL C-FIND tra ve dung ca da dat lich" }
else { Bad "MWL C-FIND khong tra ve ca vua tao: $($r.Output)" }
if ($r.Output -match "CHUP X QUANG NGUC THANG") { Ok "mo ta thu thuat giu nguyen qua duong DICOM" }
else { Bad "mo ta thu thuat bi mat/hong khi qua DICOM" }

# --------------------------------------------------------------------------------------------
Step "4. Chup va gui anh (C-STORE), bo qua MPPS de tach bach duong luu tru"
$r = Sim @("acquire", "--accession", $accession, "--images", "$imageCount", "--no-mpps", "--calling-aet", $simAet)
if ($r.Code -eq 0) { Ok "simulator bao da gui $imageCount instance" }
else { Bad "acquire that bai: $($r.Output)" }

# --------------------------------------------------------------------------------------------
Step "5. Xac minh TREN ARCHIVE, khong tin bao cao cua simulator"
$studyOrthancId = $null
try {
    $found = Orthanc "tools/find" "Post" (@{ Level = "Study"; Query = @{ StudyInstanceUID = $studyUid } } | ConvertTo-Json)
    if ($found.Count -gt 0) { $studyOrthancId = $found[0] }
} catch { }

if (-not $studyOrthancId) { Bad "archive khong co study $studyUid" }
else {
    Ok "archive giu dung StudyInstanceUID da dat lich (anh gan duoc vao chi dinh)"
    $st = Orthanc "studies/$studyOrthancId/statistics"
    if ([int]$st.CountInstances -eq $imageCount) { Ok "du $imageCount instance tren archive" }
    else { Bad "archive chi co $($st.CountInstances)/$imageCount instance" }

    $sd = Orthanc "studies/$studyOrthancId"
    if ($sd.MainDicomTags.AccessionNumber -eq $accession) { Ok "AccessionNumber khop lich chup" }
    else { Bad "AccessionNumber tren anh la '$($sd.MainDicomTags.AccessionNumber)', mong doi '$accession'" }

    $inst = Orthanc "studies/$studyOrthancId/instances"
    $origin = try { Orthanc "instances/$($inst[0].ID)/metadata/Origin" } catch { "" }
    $aet    = try { Orthanc "instances/$($inst[0].ID)/metadata/RemoteAET" } catch { "" }
    if ($origin -eq "DicomProtocol") { Ok "provenance Origin=DicomProtocol (den qua association that, khong phai upload REST)" }
    else { Bad "provenance Origin='$origin', mong doi DicomProtocol" }
    if ($aet -eq $simAet) { Ok "provenance RemoteAET=$simAet (bo loc auto-send theo AE dua vao truong nay)" }
    else { Bad "provenance RemoteAET='$aet', mong doi $simAet" }
}

# --------------------------------------------------------------------------------------------
Step "6. MPPS tu AE chua dang ky trong RIS PHAI bi tu choi"
$r = Sim @("acquire", "--accession", $accession, "--images", "1", "--calling-aet", $simAet)
if ($r.Code -ne 0 -and $r.Output -match "CallingAENotRecognized") {
    Ok "MPPS SCP tu choi AE la (fail-closed dung)"
} elseif ($r.Code -ne 0) {
    Ok "MPPS bi tu choi: $(($r.Output -split "`n" | Where-Object { $_ -match 'FAILED' } | Select-Object -First 1).Trim())"
} else {
    Bad "MPPS chap nhan AE chua dang ky trong RIS: sai, phai fail-closed"
}

# --------------------------------------------------------------------------------------------
Step "7. Don dep"
try {
    $found = Orthanc "tools/find" "Post" (@{ Level = "Study"; Query = @{ StudyInstanceUID = $studyUid } } | ConvertTo-Json)
    foreach ($id in $found) { Orthanc "studies/$id" "Delete" | Out-Null }
    Ok "da xoa study test khoi archive"
} catch { Bad "khong xoa duoc study test: $($_.Exception.Message)" }

try {
    $wl = Orthanc "worklists"
    foreach ($w in $wl) { if ($w.Tags.AccessionNumber -eq $accession -or $wl.Count -eq 1) { Orthanc "worklists/$($w.ID)" "Delete" | Out-Null } }
    Ok "da xoa lich chup test"
} catch { Bad "khong xoa duoc MWL test: $($_.Exception.Message)" }

try { Orthanc "modalities/$simAet" "Delete" | Out-Null; Ok "da xoa modality $simAet" } catch { }

Write-Host ""
Write-Host "================ KET QUA ================" -ForegroundColor Yellow
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red } else { Write-Host "  FAIL: 0" -ForegroundColor Green }
if ($fail -gt 0) { exit 1 } else { exit 0 }
