# =====================================================================
# test-newborn.ps1 — API regression module So sinh noi tru (#6 / #54).
# Chay voi backend local http://localhost:5106 (login admin/Admin@123).
# Bao gom: create, sinh doi (twins), get-list, validate APGAR/can nang (400),
#          update, discharge (status=2), cleanup.
# =====================================================================
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5106'
$script:pass = 0; $script:fail = 0; $script:failed = @()

function Assert-True($name, $cond, $detail) {
    if ($cond) { $script:pass++; Write-Host "PASS  $name" -ForegroundColor Green }
    else { $script:fail++; $script:failed += $name; Write-Host "FAIL  $name  $detail" -ForegroundColor Red }
}
function Get-Status($scriptBlock) {
    try { & $scriptBlock | Out-Null; return 200 }
    catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { return [int]$_.Exception.Response.StatusCode }
        return -1
    }
}

# ---- Login ----
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body '{"username":"admin","password":"Admin@123"}'
$token = $login.data.token
Assert-True 'login admin' ($null -ne $token) 'no token'
$h = @{ Authorization = "Bearer $token" }

# ---- Lay 1 mother admission (lan nhap vien noi tru bat ky) ----
$pat = Invoke-RestMethod -Method Get -Uri "$base/api/inpatient/patients?pageSize=1" -Headers $h
$mother = $pat.data.items[0].admissionId
Assert-True 'co mother admission de test' ($null -ne $mother) 'khong tim thay admission'

function New-BabyBody($gender, $weight, $apgar1, $delivery) {
    @{ motherAdmissionId = $mother; birthDate = '2026-06-15'; birthTime = '08:30:00';
       gender = $gender; birthWeight = $weight; birthLength = 50; headCircumference = 34;
       apgarScore1Min = $apgar1; apgarScore5Min = 9; deliveryMethod = $delivery } | ConvertTo-Json
}

Write-Host "`n=== A. Tao ho so be + sinh doi ===" -ForegroundColor Cyan
$b1 = Invoke-RestMethod -Method Post -Uri "$base/api/inpatient/$mother/newborns" -Headers $h -ContentType 'application/json' -Body (New-BabyBody 1 3200 8 'Sinh thuong')
Assert-True 'tao be 1' ($null -ne $b1.data.id) 'no id'
$b2 = Invoke-RestMethod -Method Post -Uri "$base/api/inpatient/$mother/newborns" -Headers $h -ContentType 'application/json' -Body (New-BabyBody 2 3000 9 'Sinh mo')
Assert-True 'tao be 2 (sinh doi)' ($null -ne $b2.data.id) 'no id'

Write-Host "`n=== B. GET list (sinh doi = 2 be cung me) ===" -ForegroundColor Cyan
$list = Invoke-RestMethod -Method Get -Uri "$base/api/inpatient/$mother/newborns" -Headers $h
Assert-True 'GET tra >=2 be' ($list.data.Count -ge 2) "count=$($list.data.Count)"

Write-Host "`n=== C. Validate APGAR 0-10 + can nang > 0 (BE phai tra 400) ===" -ForegroundColor Cyan
$st1 = Get-Status { Invoke-RestMethod -Method Post -Uri "$base/api/inpatient/$mother/newborns" -Headers $h -ContentType 'application/json' -Body (New-BabyBody 1 3200 11 'x') }
Assert-True 'APGAR=11 -> 400' ($st1 -eq 400) "got $st1"
$st2 = Get-Status { Invoke-RestMethod -Method Post -Uri "$base/api/inpatient/$mother/newborns" -Headers $h -ContentType 'application/json' -Body (New-BabyBody 1 0 8 'x') }
Assert-True 'can nang=0 -> 400' ($st2 -eq 400) "got $st2"

Write-Host "`n=== D. Update + Discharge ===" -ForegroundColor Cyan
$upBody = @{ id = $b1.data.id; motherAdmissionId = $mother; birthDate = '2026-06-15'; birthTime = '08:30:00';
             gender = 1; birthWeight = 3300; birthLength = 50; headCircumference = 34;
             apgarScore1Min = 8; apgarScore5Min = 9 } | ConvertTo-Json
$st3 = Get-Status { Invoke-RestMethod -Method Put -Uri "$base/api/inpatient/newborns/$($b1.data.id)" -Headers $h -ContentType 'application/json' -Body $upBody }
Assert-True 'update be1 -> 200' ($st3 -eq 200) "got $st3"
$st4 = Get-Status { Invoke-RestMethod -Method Put -Uri "$base/api/inpatient/newborns/$($b1.data.id)/discharge" -Headers $h -ContentType 'application/json' -Body '{"dischargeDate":"2026-06-17T10:00:00"}' }
Assert-True 'discharge be1 -> 200' ($st4 -eq 200) "got $st4"
$after = Invoke-RestMethod -Method Get -Uri "$base/api/inpatient/$mother/newborns" -Headers $h
$d1 = $after.data | Where-Object { $_.id -eq $b1.data.id }
Assert-True 'be1 status=2 (da xuat)' ($d1.status -eq 2) "status=$($d1.status)"
Assert-True 'be1 weight cap nhat=3300' ($d1.birthWeight -eq 3300) "weight=$($d1.birthWeight)"

Write-Host "`n=== E. Authz: GET khong token -> 401 ===" -ForegroundColor Cyan
$st5 = Get-Status { Invoke-RestMethod -Method Get -Uri "$base/api/inpatient/$mother/newborns" }
Assert-True 'GET newborns no-token -> 401' ($st5 -eq 401) "got $st5"

Write-Host "`n=== Cleanup (xoa mem be test) ===" -ForegroundColor Cyan
foreach ($id in @($b1.data.id, $b2.data.id)) {
    # khong co DELETE endpoint (mo hinh nhe) -> de lai be test hoac don qua SQL neu can.
    Write-Host "  (luu y: be test id=$id giu lai; don qua SQL neu moi truong sach can thiet)"
}

Write-Host "`n================ KET QUA ================" -ForegroundColor Cyan
Write-Host "PASS=$script:pass  FAIL=$script:fail" -ForegroundColor $(if ($script:fail -eq 0) { 'Green' } else { 'Red' })
if ($script:fail -gt 0) { Write-Host ("FAILED: " + ($script:failed -join ', ')) -ForegroundColor Red; exit 1 }
