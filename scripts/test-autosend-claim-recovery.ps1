# Test thu hoi claim auto-send bi ket khi replica chet giua chung.
#
# Boi canh: auto-send gianh quyen gui bang chi muc duy nhat tren DeduplicationKey. Neu 1 replica
# gianh duoc claim (Status='sending') roi CHET truoc khi gui xong - restart pod, kill process,
# mat dien - thi hang do nam lai vinh vien:
#   - kiem tra alreadySent thay Status='sending' nen bo qua study do mai mai;
#   - chi muc duy nhat chan insert lai;
#   - hang van la 'sending' chu khong phai 'failed', nen khong hien len bao cao loi.
# Ket qua: anh KHONG BAO GIO toi PACS dich va KHONG AI BIET. Day la loi im lang, nguy hiem hon
# loi bao do.
#
# Ban sua: ReleaseStaleClaimsAsync chay dau moi vong quet, tra claim qua han ve 'failed' +
# DeduplicationKey=NULL de duong retry binh thuong nhan lai.
#
# Test dung 3 hang de tach bach 3 hanh vi:
#   A claim auto QUA HAN   -> PHAI duoc tra
#   B claim auto CON MOI   -> PHAI giu nguyen (khong duoc cuop claim cua ca DANG gui that)
#   C gui tay qua han      -> PHAI giu nguyen (khong co claim, khong thuoc pham vi)
#
# Chay:
#   powershell -ExecutionPolicy Bypass -File .\scripts\test-autosend-claim-recovery.ps1

$ErrorActionPreference = "Continue"

$baseUrl = "http://localhost:5106"
$saPass  = if ($env:MSSQL_SA_PASSWORD) { $env:MSSQL_SA_PASSWORD } else { "HisDocker2024Pass#" }

$pass = 0; $fail = 0
function Ok($m)   { $script:pass++; Write-Host "  PASS  $m" -ForegroundColor Green }
function Bad($m)  { $script:fail++; Write-Host "  FAIL  $m" -ForegroundColor Red }
function Step($m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }

function Sql([string]$query) {
    $out = docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $saPass -C -d HIS -h -1 -W `
           -Q "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; $query" 2>&1
    return @($out | Where-Object { "$_".Trim() -ne "" })
}

$serverId = [guid]::NewGuid().ToString()
$ruleId   = [guid]::NewGuid().ToString()
$ruleN    = $ruleId -replace "-", ""
$logStale = [guid]::NewGuid().ToString()
$logFresh = [guid]::NewGuid().ToString()
$logManual= [guid]::NewGuid().ToString()
$uidStale = "1.2.826.0.1.3680043.9.7777.$(Get-Random -Maximum 999999)"
$uidFresh = "1.2.826.0.1.3680043.9.7778.$(Get-Random -Maximum 999999)"
$uidManual= "1.2.826.0.1.3680043.9.7779.$(Get-Random -Maximum 999999)"

try {
    # ----------------------------------------------------------------------------------------
    Step "0. Tien dieu kien"
    try {
        $lb = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
        $token = (Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $lb -TimeoutSec 60).data.token
    } catch { Bad "khong login duoc HIS API: $($_.Exception.Message)"; exit 1 }
    if (-not $token) { Bad "login khong tra ve token"; exit 1 }
    $H = @{ Authorization = "Bearer $token" }
    Ok "dang nhap HIS API"

    $timeout = 30  # PACS:AutoSend:ClaimTimeoutMinutes mac dinh

    # ----------------------------------------------------------------------------------------
    Step "1. Dung du lieu: rule + server de INACTIVE de khong gui that"
    # Rule inactive: vong quet chinh bo qua, nen bai test chi do dung phan tra claim.
    # Nhung rule van phai TON TAI vi DicomTransmissionLogs.AutoSendRuleId co khoa ngoai.
    Sql @"
INSERT INTO RemotePacsServers (Id, Name, AeTitle, Host, Port, Description, IsActive, CreatedAt, IsDeleted, CallingAeTitle, UseTls, UseStorageCommitment, TimeoutSeconds)
VALUES ('$serverId', N'[AUTO-TEST] claim recovery', 'TEST_PACS', 'his-orthanc-peer', 4242, N'test', 0, GETUTCDATE(), 0, 'HIS_PACS', 0, 0, 30);
INSERT INTO DicomAutoSendRules (Id, RuleName, DestinationServerId, EncryptBeforeSend, TriggerType, Priority, IsActive, TimesTriggered, CreatedAt, IsDeleted)
VALUES ('$ruleId', N'[AUTO-TEST] claim recovery', '$serverId', 0, 'on_arrival', 999, 0, 0, GETUTCDATE(), 0);
"@ | Out-Null
    $ruleOk = (Sql "SELECT COUNT(*) FROM DicomAutoSendRules WHERE Id = '$ruleId';") | Select-Object -First 1
    if ("$ruleOk".Trim() -eq "1") { Ok "da tao rule + server test (inactive)" } else { Bad "khong tao duoc rule test"; exit 1 }

    # ----------------------------------------------------------------------------------------
    Step "2. Gia lap 3 tinh huong"
    $staleMinutes = $timeout + 90
    Sql @"
INSERT INTO DicomTransmissionLogs (Id, StudyInstanceUid, AutoSendRuleId, DestinationServerId, DestinationName, TriggerType, InstanceCount, TotalBytes, WasEncrypted, Status, StartedAt, DurationMs, CreatedAt, IsDeleted, DeduplicationKey, RetryCount)
VALUES ('$logStale', '$uidStale', '$ruleId', '$serverId', N'[AUTO-TEST]', 'auto', 0, 0, 0, 'sending', DATEADD(MINUTE, -$staleMinutes, GETUTCDATE()), 0, GETUTCDATE(), 0, '${ruleN}:${uidStale}', 0);
INSERT INTO DicomTransmissionLogs (Id, StudyInstanceUid, AutoSendRuleId, DestinationServerId, DestinationName, TriggerType, InstanceCount, TotalBytes, WasEncrypted, Status, StartedAt, DurationMs, CreatedAt, IsDeleted, DeduplicationKey, RetryCount)
VALUES ('$logFresh', '$uidFresh', '$ruleId', '$serverId', N'[AUTO-TEST]', 'auto', 0, 0, 0, 'sending', DATEADD(MINUTE, -1, GETUTCDATE()), 0, GETUTCDATE(), 0, '${ruleN}:${uidFresh}', 0);
INSERT INTO DicomTransmissionLogs (Id, StudyInstanceUid, AutoSendRuleId, DestinationServerId, DestinationName, TriggerType, InstanceCount, TotalBytes, WasEncrypted, Status, StartedAt, DurationMs, CreatedAt, IsDeleted, DeduplicationKey, RetryCount)
VALUES ('$logManual', '$uidManual', NULL, '$serverId', N'[AUTO-TEST]', 'manual', 0, 0, 0, 'sending', DATEADD(MINUTE, -$staleMinutes, GETUTCDATE()), 0, GETUTCDATE(), 0, NULL, 0);
"@ | Out-Null

    $before = (Sql "SELECT COUNT(*) FROM DicomTransmissionLogs WHERE Id IN ('$logStale','$logFresh','$logManual') AND Status = 'sending';") | Select-Object -First 1
    if ("$before".Trim() -eq "3") { Ok "3 hang deu dang o trang thai 'sending' truoc khi quet" }
    else { Bad "trang thai ban dau sai: chi co $before hang 'sending'"; exit 1 }

    # ----------------------------------------------------------------------------------------
    Step "3. Chay 1 vong quet auto-send"
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/dicom-autosend/trigger-check" -Method Post -Headers $H -TimeoutSec 300 | Out-Null
        Ok "da chay trigger-check"
    } catch { Bad "trigger-check loi: $($_.Exception.Message)"; }

    # ----------------------------------------------------------------------------------------
    Step "4. A - claim auto QUA HAN phai duoc tra ve de thu lai"
    $a = (Sql "SELECT Status + '|' + CASE WHEN DeduplicationKey IS NULL THEN 'null' ELSE 'set' END + '|' + CASE WHEN NextRetryAt IS NULL THEN 'no' ELSE 'yes' END + '|' + CASE WHEN CompletedAt IS NULL THEN 'no' ELSE 'yes' END + '|' + CASE WHEN ErrorMessage IS NULL THEN 'no' ELSE 'yes' END FROM DicomTransmissionLogs WHERE Id = '$logStale';") | Select-Object -First 1
    if (-not $a) { Bad "khong doc duoc hang A" }
    else {
        $p = $a -split "\|"
        if ($p[0] -eq "failed") { Ok "A: Status chuyen 'sending' -> 'failed' (hien len bao cao loi, khong con im lang)" }
        else { Bad "A: Status = '$($p[0])', mong doi 'failed' - claim ket van chua duoc tra" }
        if ($p[1] -eq "null") { Ok "A: DeduplicationKey da duoc tra (chi muc duy nhat cho phep insert lai)" }
        else { Bad "A: DeduplicationKey van con giu, study nay se khong bao gio gui lai duoc" }
        if ($p[2] -eq "yes") { Ok "A: co NextRetryAt nen du dieu kien thu lai" } else { Bad "A: khong co NextRetryAt" }
        if ($p[3] -eq "yes") { Ok "A: co CompletedAt" } else { Bad "A: khong co CompletedAt" }
        if ($p[4] -eq "yes") { Ok "A: co ErrorMessage giai thich ly do" } else { Bad "A: khong ghi ly do, van hanh se khong hieu chuyen gi" }
    }

    # ----------------------------------------------------------------------------------------
    Step "5. B - claim auto CON MOI khong duoc dung toi"
    # Neu cuop claim cua ca dang gui that thi se sinh ra ban gui TRUNG len PACS dich.
    $b = (Sql "SELECT Status + '|' + CASE WHEN DeduplicationKey IS NULL THEN 'null' ELSE 'set' END FROM DicomTransmissionLogs WHERE Id = '$logFresh';") | Select-Object -First 1
    $pb = $b -split "\|"
    if ($pb[0] -eq "sending" -and $pb[1] -eq "set") { Ok "B: giu nguyen 'sending' + con claim (khong cuop ca dang gui that)" }
    else { Bad "B: bi doi thanh '$($pb[0])' / key=$($pb[1]) - se gay gui trung" }

    # ----------------------------------------------------------------------------------------
    Step "6. C - ban ghi gui TAY qua han khong thuoc pham vi"
    $c = (Sql "SELECT Status FROM DicomTransmissionLogs WHERE Id = '$logManual';") | Select-Object -First 1
    if ("$c".Trim() -eq "sending") { Ok "C: ban ghi gui tay giu nguyen (khong co claim de tra)" }
    else { Bad "C: ban ghi gui tay bi doi thanh '$c'" }
}
finally {
    Step "7. Don dep"
    Sql "DELETE FROM DicomTransmissionLogs WHERE Id IN ('$logStale','$logFresh','$logManual'); DELETE FROM DicomAutoSendRules WHERE Id = '$ruleId'; DELETE FROM RemotePacsServers WHERE Id = '$serverId';" | Out-Null
    $left = (Sql "SELECT COUNT(*) FROM DicomTransmissionLogs WHERE Id IN ('$logStale','$logFresh','$logManual');") | Select-Object -First 1
    if ("$left".Trim() -eq "0") { Ok "da xoa het du lieu test" } else { Bad "con $left hang test sot lai" }
}

Write-Host ""
Write-Host "================ KET QUA ================" -ForegroundColor Yellow
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red } else { Write-Host "  FAIL: 0" -ForegroundColor Green }
if ($fail -gt 0) { exit 1 } else { exit 0 }
