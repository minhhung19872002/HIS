# =====================================================================
# test-doithu-gap.ps1 — API regression cho cac endpoint goi bu gap doi thu
# (Dot 1+2+3 + wave defer). Chay voi backend local http://localhost:5106.
# Bao gom: smoke GET, round-trip write an toan, authz (401/anonymous), rate-limit.
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
$bogusGuid = '00000000-0000-0000-0000-000000000001'

# =====================================================================
Write-Host "`n=== A. SMOKE GET endpoint moi (can 200) ===" -ForegroundColor Cyan
$gets = @(
    @{ n = 'D2 P7 sample-collection appointments'; u = "$base/api/sample-collection/appointments" },
    @{ n = 'Wave sample-receive accepted (VnTime)'; u = "$base/api/sample-receive/accepted" },
    @{ n = 'D2 P8 ris pttt mappings';              u = "$base/api/ris-catalog/pttt-service-mappings" },
    @{ n = 'D2 P10 office-supply returns';         u = "$base/api/office-supply/returns" },
    @{ n = 'D2 P10 asset stocktakes';              u = "$base/api/asset-management/stocktakes" },
    @{ n = 'D3 user-settings lab-roles';           u = "$base/api/user-settings/lab-roles" },
    @{ n = 'D3 signing pending + signerRole';      u = "$base/api/signing-workflow/pending?signerRole=BacSi" },
    @{ n = 'D3 pharmacy expiry on-login';          u = "$base/api/pharmacy/expiry-alerts/on-login" },
    @{ n = 'D2 P6 inpatient diagnosis (empty ok)'; u = "$base/api/inpatient/diagnosis/$bogusGuid" },
    @{ n = 'D1 booking-management bookings';       u = "$base/api/booking-management/bookings" },
    @{ n = 'D3 receipt-book list';                 u = "$base/api/receipt-book?page=1&pageSize=3" },
    @{ n = 'D3 employee union tab';                u = "$base/api/employee-profile/9e5309dc-ecf9-4d48-9a09-224cd15347b1/union" }
)
foreach ($g in $gets) {
    $code = Get-Status { Invoke-WebRequest -Uri $g.u -Headers $h -UseBasicParsing -TimeoutSec 20 }
    Assert-True $g.n ($code -eq 200) "got $code"
}

# =====================================================================
Write-Host "`n=== B. WRITE round-trip an toan ===" -ForegroundColor Cyan

# B1. check-batch PTTT (POST, body array)
$code = Get-Status { Invoke-WebRequest -Method Post -Uri "$base/api/ris-catalog/pttt-service-mappings/check-batch" -Headers $h -ContentType 'application/json' -Body "[`"$bogusGuid`"]" -UseBasicParsing -TimeoutSec 20 }
Assert-True 'Wave check-batch PTTT (POST)' ($code -eq 200) "got $code"

# B2. cancel-receive voi orderId bogus -> 4xx (KHONG 200, KHONG 500-crash route)
$code = Get-Status { Invoke-WebRequest -Method Post -Uri "$base/api/sample-receive/cancel-receive" -Headers $h -ContentType 'application/json' -Body "{`"labOrderId`":`"$bogusGuid`"}" -UseBasicParsing -TimeoutSec 20 }
Assert-True 'D2 P7 cancel-receive bogus -> 4xx/404' ($code -ge 400 -and $code -lt 500) "got $code"

# B3. booking update voi code khong ton tai -> loi co kiem soat (route ton tai, != 404-route)
$code = Get-Status { Invoke-WebRequest -Method Put -Uri "$base/api/booking-management/bookings/BK-KHONGTONTAI" -Headers $h -ContentType 'application/json' -Body '{"appointmentDate":"2026-06-10T08:00:00"}' -UseBasicParsing -TimeoutSec 20 }
Assert-True 'D1 booking update bogus -> 4xx/5xx (route ok)' ($code -ge 400) "got $code"

# B4. office-supply recall voi id bogus -> 4xx
$code = Get-Status { Invoke-WebRequest -Method Post -Uri "$base/api/office-supply/requests/$bogusGuid/recall" -Headers $h -ContentType 'application/json' -Body '{}' -UseBasicParsing -TimeoutSec 20 }
Assert-True 'D2 P10 office-supply recall bogus -> 4xx' ($code -ge 400 -and $code -lt 500) "got $code"

# B5. asset stocktake CREATE -> GET round-trip that (DTO: Title + StocktakeDate)
try {
    $stBody = '{"title":"Kiem ke API test","stocktakeDate":"' + (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') + '","departmentId":null,"notes":"test-doithu-gap.ps1","items":[]}'
    $st = Invoke-RestMethod -Method Post -Uri "$base/api/asset-management/stocktakes" -Headers $h -ContentType 'application/json' -Body $stBody
    $stId = $st.data.id
    Assert-True 'D2 P10 stocktake create' ($null -ne $stId) 'no id returned'
    if ($stId) {
        $detail = Invoke-RestMethod -Uri "$base/api/asset-management/stocktakes/$stId" -Headers $h
        Assert-True 'D2 P10 stocktake get-by-id' ($detail.data.id -eq $stId) 'id mismatch'
    }
} catch { Assert-True 'D2 P10 stocktake create' $false $_.Exception.Message }

# B6. e-invoice export voi id bogus -> loi co kiem soat (route PUT BillingComplete/e-invoices)
$code = Get-Status { Invoke-WebRequest -Method Put -Uri "$base/api/BillingComplete/e-invoices/$bogusGuid/export" -Headers $h -ContentType 'application/json' -Body '{}' -UseBasicParsing -TimeoutSec 20 }
Assert-True 'D1 einvoice export bogus -> 4xx/5xx co kiem soat' ($code -ge 400) "got $code"

# =====================================================================
Write-Host "`n=== C. PUBLIC EMR LOOKUP (anonymous + privacy) ===" -ForegroundColor Cyan

# C1. lookup anonymous (KHONG token) -> 200 + thong diep trung lap
try {
    $lk = Invoke-RestMethod -Method Post -Uri "$base/api/public-emr/lookup" -ContentType 'application/json' -Body '{"identityNumber":"000000000099","dateOfBirth":"1990-01-01"}'
    $inner = if ($lk.PSObject.Properties.Name -contains 'data' -and $lk.data) { $lk.data } else { $lk }
    Assert-True 'D1 public-emr lookup anonymous 200' ($inner.success -eq $true) 'success != true'
    # Semantic check (khong phu thuoc dau tieng Viet trong file .ps1):
    # khong khop -> khong token, khong documents, co message — khong lo CCCD ton tai hay khong
    $neutral = ($null -eq $inner.token) -and (@($inner.documents).Count -eq 0) -and ($inner.message.Length -gt 10)
    Assert-True 'D1 lookup thong diep trung lap (khong lo CCCD)' $neutral "token=$($inner.token) docs=$(@($inner.documents).Count)"
} catch { Assert-True 'D1 public-emr lookup anonymous 200' $false $_.Exception.Message }

# C2. download voi token bogus -> 404 (khong lo noi dung)
$code = Get-Status { Invoke-WebRequest -Uri "$base/api/public-emr/document/$bogusGuid/pdf?token=bogus" -UseBasicParsing -TimeoutSec 20 }
Assert-True 'D1 public-emr download token bogus -> 404' ($code -eq 404) "got $code"

# =====================================================================
Write-Host "`n=== D. AUTHZ: khong token -> 401 ===" -ForegroundColor Cyan
$protected = @(
    @{ n = 'authz sample-receive accepted'; u = "$base/api/sample-receive/accepted" },
    @{ n = 'authz user-settings lab-roles'; u = "$base/api/user-settings/lab-roles" },
    @{ n = 'authz asset stocktakes';        u = "$base/api/asset-management/stocktakes" },
    @{ n = 'authz office-supply returns';   u = "$base/api/office-supply/returns" },
    @{ n = 'authz booking bookings';        u = "$base/api/booking-management/bookings" }
)
foreach ($p in $protected) {
    $code = Get-Status { Invoke-WebRequest -Uri $p.u -UseBasicParsing -TimeoutSec 20 }
    Assert-True $p.n ($code -eq 401) "got $code (can 401)"
}

# =====================================================================
Write-Host "`n=== KET QUA ===" -ForegroundColor Cyan
Write-Host "PASS: $script:pass  FAIL: $script:fail"
if ($script:fail -gt 0) { Write-Host ("Failed: " + ($script:failed -join ' | ')) -ForegroundColor Red; exit 1 }
exit 0
