# #369 [AUTHZ-3] Pilot smoke: quan he dieu tri (treatment relationship) 2 bac si.
# Chay: powershell -ExecutionPolicy Bypass -File .\scripts\test-authz3-pilot-smoke.ps1
# Yeu cau: backend local chay voi Auth__TreatmentRelationshipEnabled=true
#
# Kich ban: BS-A la bac si cua luot kham X. BS-B khong co quan he dieu tri.
#   -> BS-A doc duoc ho so cua BN (200)
#   -> BS-B bi tu choi (401/403)
# Ca 2 deu co ScopeType='OWN' (neu ORG/BRANCH/DEPT thi guard mien tru theo thiet ke).

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:5106"
$pass = 0; $fail = 0
function Ok($m)  { $script:pass++; Write-Host "  PASS  $m" -ForegroundColor Green }
function Bad($m) { $script:fail++; Write-Host "  FAIL  $m" -ForegroundColor Red }

function Login($u, $p) {
    $b = @{ username = $u; password = $p } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $b
    return $r.data.token
}

Write-Host ""
Write-Host "=== 0. CHUAN BI (admin + role DOCTOR) ===" -ForegroundColor Cyan
$adminTok = Login "admin" "Admin@123"
$H = @{ Authorization = "Bearer $adminTok" }
Ok "login admin"

$roles = Invoke-RestMethod -Uri "$baseUrl/api/admin/roles" -Headers $H
$rl = if ($roles.data) { $roles.data } else { $roles }
$doctorRole = $rl | Where-Object { $_.code -eq "DOCTOR" } | Select-Object -First 1
if ($doctorRole) { Ok "tim thay role DOCTOR id=$($doctorRole.id)" } else { Bad "khong tim thay role DOCTOR"; exit 1 }

$stamp = Get-Date -Format "HHmmss"
$pw = "Doctor@12345"

function New-Doctor($suffix) {
    $dto = @{
        username = "smokebs$suffix$stamp"
        fullName = "[AUTO-REG] BS Smoke $suffix"
        roleIds  = @($doctorRole.id)
        roleAssignments = @(@{ roleId = $doctorRole.id; scopeType = "OWN"; grantReason = "AUTHZ-3 pilot smoke" })
        initialPassword = $pw
    } | ConvertTo-Json -Depth 5
    $r = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Method Post -ContentType "application/json" -Headers $H -Body $dto
    if ($r.data) { return $r.data } else { return $r }
}

Write-Host ""
Write-Host "=== 1. TAO 2 BAC SI SCOPE 'OWN' ===" -ForegroundColor Cyan
$docA = New-Doctor "a"
$docB = New-Doctor "b"
if ($docA.id -and $docB.id) { Ok "tao BS-A=$($docA.username) BS-B=$($docB.username)" } else { Bad "khong tao duoc bac si"; exit 1 }

Write-Host ""
Write-Host "=== 2. GAN BS-A LAM BAC SI CUA 1 LUOT KHAM ===" -ForegroundColor Cyan
# QUOTED_IDENTIFIER ON bat buoc: bang co filtered index (loi 1934 neu thieu)
$sql = "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; UPDATE TOP(1) Examinations SET DoctorId='$($docA.id)' WHERE DoctorId IS NOT NULL; SELECT TOP 1 CONVERT(varchar(36),e.Id), CONVERT(varchar(36),mr.PatientId) FROM Examinations e JOIN MedicalRecords mr ON mr.Id=e.MedicalRecordId WHERE e.DoctorId='$($docA.id)';"
$out = docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'HisDocker2024Pass#' -C -d HIS -Q $sql -h -1 -W 2>&1
$line = ($out | Where-Object { $_ -match '^[0-9A-Fa-f\-]{36}\s' } | Select-Object -First 1)
if (-not $line) { Bad "khong gan duoc luot kham cho BS-A. Output: $out"; exit 1 }
$parts = $line -split '\s+'
$examId = $parts[0]; $patientId = $parts[1]
Ok "luot kham $examId (BN $patientId) nay thuoc BS-A"

Write-Host ""
Write-Host "=== 3. BS-A DOC HO SO -> PHAI DUOC (co quan he dieu tri) ===" -ForegroundColor Cyan
try {
    $tokA = Login $docA.username $pw
    $r = Invoke-RestMethod -Uri "$baseUrl/api/examination/$examId/medical-record" -Headers @{ Authorization = "Bearer $tokA" }
    Ok "BS-A doc duoc ho so (200)"
} catch {
    Bad "BS-A BI CHAN (khong dung): $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== 4. BS-B DOC HO SO -> PHAI BI TU CHOI (khong co quan he) ===" -ForegroundColor Cyan
try {
    $tokB = Login $docB.username $pw
    Invoke-RestMethod -Uri "$baseUrl/api/examination/$examId/medical-record" -Headers @{ Authorization = "Bearer $tokB" } | Out-Null
    Bad "BS-B DOC DUOC ho so BN khong phai cua minh -> GUARD KHONG CHAY"
} catch {
    $code = $null
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
    if ($code -eq 403) {
        Ok "BS-B bi tu choi dung chuan HTTP 403 (Acceptance #369)"
    } elseif ($code -eq 401 -or $code -eq 500) {
        Bad "BS-B bi chan nhung SAI status: HTTP $code (Acceptance #369 yeu cau 403)"
    } else {
        Bad "BS-B bi loi khac (HTTP $code): $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "=== KET QUA ===" -ForegroundColor Cyan
Write-Host "  PASS = $pass" -ForegroundColor Green
Write-Host "  FAIL = $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
if ($fail -eq 0) { Write-Host "=== AUTHZ-3 PILOT SMOKE COMPLETE (0 FAIL) ===" -ForegroundColor Green }
else { Write-Host "=== AUTHZ-3 PILOT SMOKE CO $fail LOI ===" -ForegroundColor Red }
