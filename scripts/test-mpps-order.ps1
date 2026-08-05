# Test vong CDHA day du, tu chi dinh trong HIS den trang thai ca chup duoc MPPS cap nhat.
#
# Day la manh con thieu sau test-modality-sim.ps1: o do MPPS moi co bang chung TANG GIAO THUC
# (SCP tu choi AE la). Con o day phai chung minh MPPS gan duoc vao ORDER THAT:
# MppsProcessor tim ca chup theo AccessionNumber, nen phai co chi dinh that trong DB thi moi
# biet N-CREATE/N-SET co that su chuyen trang thai nghiep vu hay khong.
#
# Luong: tao chi dinh -> khai bao may -> gui MWL -> may gia lap doc MWL, chup, ban MPPS
#        -> doi chieu trang thai trong SQL + anh tren archive -> don sach.
#
# Chuan bi:
#   docker compose up -d orthanc sqlserver redis
#   cd backend/src/HIS.API && dotnet run --launch-profile http
# Chay:
#   powershell -ExecutionPolicy Bypass -File .\scripts\test-mpps-order.ps1

$ErrorActionPreference = "Continue"

$baseUrl    = "http://localhost:5106"
$localRest  = "http://127.0.0.1:8043"
$simAet     = "SIM_CR01"
$imageCount = 3
$simProject = Join-Path $PSScriptRoot "..\tools\ModalitySimulator\ModalitySimulator.csproj"
$pacsUser   = if ($env:PACS_USERNAME) { $env:PACS_USERNAME } else { "his-api" }
$pacsPass   = if ($env:PACS_PASSWORD) { $env:PACS_PASSWORD } else { "HisPacsLocal-2026!Change" }
$saPass     = if ($env:MSSQL_SA_PASSWORD) { $env:MSSQL_SA_PASSWORD } else { "HisDocker2024Pass#" }

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

function Sql([string]$query) {
    # QUOTED_IDENTIFIER ON la bat buoc: sqlcmd -Q mac dinh OFF, va DELETE tren bang co
    # filtered index se fail voi Msg 1934 neu thieu.
    $out = docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $saPass -C -d HIS -h -1 -W `
           -Q "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; $query" 2>&1
    return @($out | Where-Object { "$_".Trim() -ne "" })
}

function Sim([string[]]$simArgs) {
    $out = & dotnet run --project $simProject --no-build -- @simArgs 2>&1
    return @{ Output = ($out | Out-String); Code = $LASTEXITCODE }
}

function Read-HttpError($err) {
    try { return (New-Object IO.StreamReader($err.Exception.Response.GetResponseStream())).ReadToEnd() }
    catch { return $err.Exception.Message }
}

# state can don o cuoi, khai bao truoc de finally-style cleanup luon chay duoc
$requestId = $null; $modalityId = $null; $studyUid = $null; $accession = $null

# --------------------------------------------------------------------------------------------
Step "0. Tien dieu kien"
try { $sys = Orthanc "system"; Ok "his-orthanc song: AET=$($sys.DicomAet)" }
catch { Bad "khong goi duoc his-orthanc: $($_.Exception.Message)"; exit 1 }

$build = & dotnet build $simProject --nologo -v q 2>&1
if ($LASTEXITCODE -ne 0) { Bad "build ModalitySimulator that bai:`n$($build | Out-String)"; exit 1 }
Ok "build ModalitySimulator sach"

try {
    $lb = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
    $token = (Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $lb -TimeoutSec 60).data.token
} catch { Bad "khong login duoc: $($_.Exception.Message)"; exit 1 }
if (-not $token) { Bad "login khong tra ve token"; exit 1 }
$H = @{ Authorization = "Bearer $token" }
Ok "dang nhap HIS API"

# --------------------------------------------------------------------------------------------
Step "1. Tao chi dinh CDHA moi tu 1 phieu goc co san"
$parentId = (Sql "SELECT TOP 1 CAST(Id AS NVARCHAR(50)) FROM RadiologyRequests WHERE IsDeleted = 0 ORDER BY CreatedAt DESC;") | Select-Object -First 1
if (-not $parentId) { Bad "DB khong co phieu CDHA nao de lam phieu goc"; exit 1 }
$serviceId = (Sql "SELECT TOP 1 CAST(s.Id AS NVARCHAR(50)) FROM Services s INNER JOIN RadiologyRequests r ON r.ServiceId = s.Id WHERE s.IsActive = 1;") | Select-Object -First 1
if (-not $serviceId) { Bad "khong tim duoc dich vu CDHA dang hoat dong"; exit 1 }

try {
    $addOn = @{ parentRequestId = $parentId; serviceIds = @($serviceId)
                reason = "[AUTO-TEST] kiem thu MPPS gan order"; withContrast = $false } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/api/radiology-ops/add-on" -Method Post -ContentType "application/json" -Headers $H -Body $addOn -TimeoutSec 60
    $rb = if ($r.data) { $r.data } else { $r }
    $requestId = $rb.created[0].id
} catch { Bad "khong tao duoc chi dinh: $(Read-HttpError $_)"; exit 1 }
if (-not $requestId) { Bad "API khong tra ve id chi dinh moi"; exit 1 }
Ok "da tao chi dinh $requestId (phieu goc $parentId)"

# --------------------------------------------------------------------------------------------
Step "2. Khai bao may chup trong RIS"
$roomId = (Sql "SELECT TOP 1 CAST(Id AS NVARCHAR(50)) FROM Rooms WHERE IsDeleted = 0;") | Select-Object -First 1
try {
    $mod = @{ code = "SIMCR01"; name = "[AUTO-TEST] May X quang gia lap"; modalityType = "XRay"
              manufacturer = "Simulator"; model = "SIM"; aeTitle = $simAet
              ipAddress = "127.0.0.1"; port = 11112; roomId = $roomId
              supportsWorklist = $true; supportsMPPS = $true; isActive = $true } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/modalities" -Method Post -ContentType "application/json" -Headers $H -Body $mod -TimeoutSec 60
    $rb = if ($r.data) { $r.data } else { $r }
    $modalityId = $rb.id
} catch { Bad "khong tao duoc modality: $(Read-HttpError $_)"; exit 1 }
if (-not $modalityId) { Bad "API khong tra ve id modality"; exit 1 }
Ok "modality $simAet id=$modalityId (SupportsWorklist + SupportsMPPS)"

# --------------------------------------------------------------------------------------------
Step "3. Gui worklist tu HIS sang PACS"
try {
    $wl = @{ modalityId = $modalityId; orderIds = @($requestId) } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/modalities/worklist/send" -Method Post -ContentType "application/json" -Headers $H -Body $wl -TimeoutSec 120
    $rb = if ($r.data) { $r.data } else { $r }
    if ($rb.success -and [int]$rb.sentCount -eq 1) { Ok "HIS bao da gui 1 lich chup" }
    else { Bad "gui worklist that bai: sent=$($rb.sentCount) failed=$($rb.failedCount) errors=$($rb.errors -join '; ')" }
} catch { Bad "loi gui worklist: $(Read-HttpError $_)" }

$examRow = (Sql "SELECT TOP 1 ISNULL(AccessionNumber,'') + '|' + CAST(Status AS NVARCHAR(10)) + '|' + ISNULL(MppsStatus,'-') FROM RadiologyExams WHERE RadiologyRequestId = '$requestId' AND IsDeleted = 0;") | Select-Object -First 1
if (-not $examRow) { Bad "HIS khong tao ca chup cho chi dinh nay"; }
else {
    $parts = $examRow -split "\|"
    $accession = $parts[0]
    if ($accession) { Ok "ca chup co AccessionNumber=$accession, Status=$($parts[1]), MppsStatus=$($parts[2])" }
    else { Bad "ca chup khong co AccessionNumber, MPPS se khong khop duoc" }
    if ($parts[1] -eq "0") { Ok "truoc khi chup: Status=0 (chua thuc hien)" }
    else { Bad "truoc khi chup Status=$($parts[1]), mong doi 0" }
}
if (-not $accession) { exit 1 }

# --------------------------------------------------------------------------------------------
Step "4. May gia lap doc lich chup bang MWL C-FIND"
$modOrthanc = @{ AET = $simAet; Host = "host.docker.internal"; Port = 11112
                 AllowEcho = $true; AllowStore = $true; AllowFind = $true } | ConvertTo-Json
try { Orthanc "modalities/$simAet" "Put" $modOrthanc | Out-Null } catch { Bad "khong khai bao duoc AE tren Orthanc: $($_.Exception.Message)"; }

$r = Sim @("worklist", "--calling-aet", $simAet)
if ($r.Code -eq 0 -and $r.Output -match [regex]::Escape($accession)) { Ok "may doc duoc lich chup HIS vua gui (accession $accession)" }
else { Bad "MWL C-FIND khong thay lich chup vua gui: $($r.Output)" }

# --------------------------------------------------------------------------------------------
Step "5. Chup: MPPS IN PROGRESS -> C-STORE -> MPPS COMPLETED"
$r = Sim @("acquire", "--accession", $accession, "--images", "$imageCount", "--calling-aet", $simAet)
if ($r.Code -eq 0) {
    Ok "vong chup hoan tat khong loi"
    if ($r.Output -match "MPPS N-CREATE IN PROGRESS accepted") { Ok "RIS chap nhan N-CREATE IN PROGRESS" }
    else { Bad "khong thay xac nhan N-CREATE trong output" }
    if ($r.Output -match "MPPS N-SET COMPLETED accepted") { Ok "RIS chap nhan N-SET COMPLETED" }
    else { Bad "khong thay xac nhan N-SET trong output" }
    if ($r.Output -match "StudyInstanceUID\s+(\S+)") { $studyUid = $Matches[1]; Ok "StudyInstanceUID cua ca chup: $studyUid" }
    else { Bad "khong doc duoc StudyInstanceUID tu output" }
} else { Bad "acquire that bai: $($r.Output)" }

# --------------------------------------------------------------------------------------------
Step "6. Trang thai nghiep vu trong HIS phai chuyen theo MPPS"
$after = (Sql "SELECT TOP 1 CAST(e.Status AS NVARCHAR(10)) + '|' + ISNULL(e.MppsStatus,'-') + '|' + CASE WHEN e.StartTime IS NULL THEN 'no' ELSE 'yes' END + '|' + CASE WHEN e.EndTime IS NULL THEN 'no' ELSE 'yes' END + '|' + CAST(r.Status AS NVARCHAR(10)) + '|' + ISNULL(e.MppsInstanceUid,'-') FROM RadiologyExams e INNER JOIN RadiologyRequests r ON r.Id = e.RadiologyRequestId WHERE e.RadiologyRequestId = '$requestId' AND e.IsDeleted = 0;") | Select-Object -First 1
if (-not $after) { Bad "khong doc duoc trang thai ca chup sau khi chup" }
else {
    $a = $after -split "\|"
    if ($a[1] -eq "COMPLETED") { Ok "MppsStatus = COMPLETED" } else { Bad "MppsStatus = '$($a[1])', mong doi COMPLETED" }
    if ($a[0] -eq "2") { Ok "Status ca chup = 2 (da thuc hien)" } else { Bad "Status ca chup = $($a[0]), mong doi 2" }
    # StartTime chi duoc gan o nhanh IN PROGRESS -> co StartTime nghia la N-CREATE da that su duoc ap dung,
    # khong phai chi co N-SET cuoi cung ghi de.
    if ($a[2] -eq "yes") { Ok "StartTime da duoc ghi (chung to N-CREATE IN PROGRESS da ap dung, khong bi N-SET nuot)" }
    else { Bad "StartTime rong: N-CREATE khong tac dong den ca chup" }
    if ($a[3] -eq "yes") { Ok "EndTime da duoc ghi tu N-SET COMPLETED" } else { Bad "EndTime rong" }
    if ([int]$a[4] -ge 3) { Ok "phieu chi dinh chuyen Status=$($a[4]) (>=3)" } else { Bad "phieu chi dinh van Status=$($a[4]), mong doi >=3" }
    if ($a[5] -ne "-") { Ok "MppsInstanceUid da luu lam bang chung: $($a[5])" } else { Bad "khong luu MppsInstanceUid" }
}

# --------------------------------------------------------------------------------------------
Step "7. Anh phai co that tren archive, dung ca chup"
if ($studyUid) {
    try {
        $found = Orthanc "tools/find" "Post" (@{ Level = "Study"; Query = @{ StudyInstanceUID = $studyUid } } | ConvertTo-Json)
        if ($found.Count -eq 0) { Bad "archive khong co study $studyUid" }
        else {
            $st = Orthanc "studies/$($found[0])/statistics"
            if ([int]$st.CountInstances -eq $imageCount) { Ok "archive co du $imageCount instance" }
            else { Bad "archive co $($st.CountInstances)/$imageCount instance" }
            $sd = Orthanc "studies/$($found[0])"
            if ($sd.MainDicomTags.AccessionNumber -eq $accession) { Ok "anh mang dung AccessionNumber cua ca chup" }
            else { Bad "anh mang accession '$($sd.MainDicomTags.AccessionNumber)', mong doi '$accession'" }
            $inst = Orthanc "studies/$($found[0])/instances"
            $aet = try { Orthanc "instances/$($inst[0].ID)/metadata/RemoteAET" } catch { "" }
            if ($aet -eq $simAet) { Ok "provenance RemoteAET=$simAet" } else { Bad "provenance RemoteAET='$aet'" }
        }
    } catch { Bad "loi kiem tra archive: $($_.Exception.Message)" }
}

# --------------------------------------------------------------------------------------------
Step "8. Don dep"
if ($studyUid) {
    try {
        $found = Orthanc "tools/find" "Post" (@{ Level = "Study"; Query = @{ StudyInstanceUID = $studyUid } } | ConvertTo-Json)
        foreach ($id in $found) { Orthanc "studies/$id" "Delete" | Out-Null }
        Ok "da xoa study test khoi archive"
    } catch { Bad "khong xoa duoc study test: $($_.Exception.Message)" }
    Sql "DELETE FROM DicomStudies WHERE StudyInstanceUid = '$studyUid';" | Out-Null
}
try {
    $wlItems = Orthanc "worklists"
    foreach ($w in $wlItems) { Orthanc "worklists/$($w.ID)" "Delete" | Out-Null }
    Ok "da xoa lich chup test khoi PACS"
} catch { Bad "khong xoa duoc MWL: $($_.Exception.Message)" }
try { Orthanc "modalities/$simAet" "Delete" | Out-Null } catch { }
if ($modalityId) {
    try { Invoke-RestMethod -Uri "$baseUrl/api/RISComplete/modalities/$modalityId" -Method Delete -Headers $H -TimeoutSec 60 | Out-Null; Ok "da xoa modality test khoi RIS" }
    catch { Bad "khong xoa duoc modality test: $(Read-HttpError $_)" }
    # API chi soft-delete (IsDeleted=1) nen hang test se tich lai moi lan chay. Hang soft-delete
    # da vo hai voi MPPS (IsKnownMppsAeAsync loc IsDeleted/IsActive) nhung van phai don sach.
    Sql "DELETE FROM RadiologyModalities WHERE AETitle = '$simAet' AND IsDeleted = 1;" | Out-Null
    $leftMod = (Sql "SELECT COUNT(*) FROM RadiologyModalities WHERE AETitle = '$simAet';") | Select-Object -First 1
    if ("$leftMod".Trim() -eq "0") { Ok "khong con hang modality test nao trong DB" }
    else { Bad "con $leftMod hang modality test trong DB" }
}
if ($requestId) {
    Sql "DELETE FROM RadiologyExams WHERE RadiologyRequestId = '$requestId'; DELETE FROM RadiologyRequests WHERE Id = '$requestId';" | Out-Null
    $left = (Sql "SELECT COUNT(*) FROM RadiologyRequests WHERE Id = '$requestId';") | Select-Object -First 1
    if ("$left".Trim() -eq "0") { Ok "da xoa chi dinh + ca chup test khoi DB" } else { Bad "chi dinh test con sot lai trong DB" }
}

Write-Host ""
Write-Host "================ KET QUA ================" -ForegroundColor Yellow
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red } else { Write-Host "  FAIL: 0" -ForegroundColor Green }
if ($fail -gt 0) { exit 1 } else { exit 0 }
