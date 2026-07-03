# ============================================================================
# NangCap25 - QR dong Vietcombank ket noi vien phi (Issue #358)
# Smoke + regression test toan dien. Yeu cau: backend chay localhost:5106,
# docker his-sqlserver. Chay: powershell -File scripts/test-nangcap25.ps1
# ============================================================================
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5106/api'
$results = @()
function Check($name, $cond, $detail) {
    $script:results += [pscustomobject]@{ Test=$name; OK=[bool]$cond; Detail="$detail" }
    if ($cond) { Write-Host "PASS  $name" -ForegroundColor Green } else { Write-Host "FAIL  $name : $detail" -ForegroundColor Red }
}
function Unwrap($r) { if ($null -ne $r -and $null -ne $r.PSObject.Properties['data'] -and $null -ne $r.PSObject.Properties['success']) { return $r.data } return $r }
function Sqlq($q) { return (docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'HisDocker2024Pass#' -d HIS -C -h -1 -Q "SET NOCOUNT ON; $q" 2>$null) }
function Sql1($q) { return "$((Sqlq $q | Where-Object { "$_".Trim() -ne '' } | Select-Object -First 1))".Trim() }
function GetHtml($url,$method='GET',$body=$null) {
    if ($method -eq 'POST') { $r = Invoke-WebRequest -Uri $url -Method Post -Headers $script:H -ContentType 'application/json' -Body $body -UseBasicParsing }
    else { $r = Invoke-WebRequest -Uri $url -Headers $script:H -UseBasicParsing }
    if ($r.Content -is [byte[]]) { return [System.Text.Encoding]::UTF8.GetString($r.Content) } else { return "$($r.Content)" }
}

# ---- Login ----
$login = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -ContentType 'application/json' -Body '{"username":"admin","password":"Admin@123"}'
$token = $login.data.token; if (-not $token) { $token = $login.token }
$H = @{ Authorization = "Bearer $token" }
Check 'login' ($null -ne $token) 'no token'

# ---- Migration 141 ----
Check 'migration-141-columns' ((Sql1 "SELECT CAST(COUNT(*) AS VARCHAR) FROM sys.columns WHERE object_id=OBJECT_ID('dbo.PaymentTransactions') AND name IN ('ReferenceType','ReferenceId','ReferenceData')") -eq '3') 'cols'
Check 'migration-141-table'   ((Sql1 "SELECT CAST(COUNT(*) AS VARCHAR) FROM sys.tables WHERE name='RefundDisbursements'") -eq '1') 'tbl'

$ptId = Sql1 "SELECT TOP 1 CAST(Id AS VARCHAR(36)) FROM Patients WHERE IsDeleted=0"

# ---- Regression 3 cong cu + VCB direct ----
$vn = Unwrap (Invoke-RestMethod -Uri "$base/payment/create-url" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ provider='vnpay'; patientId=$ptId; amount=120000; orderType='billing'; orderInfo='regr vnpay' } | ConvertTo-Json))
Check 'regress-vnpay' ($vn.paymentUrl -match 'vnpayment' -and $vn.qrCodeContent -match 'vnpayment') "$($vn.txnRef)"
$vcb = Unwrap (Invoke-RestMethod -Uri "$base/payment/create-url" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ provider='vcb'; patientId=$ptId; amount=95000; orderType='billing'; orderInfo='regr vcb' } | ConvertTo-Json))
Check 'regress-vcb-emvco' ($vcb.qrCodeContent -match '^000201.*6304[0-9A-F]{4}$' -and $vcb.paymentUrl -match 'vietqr.io') "$($vcb.txnRef)"
$banks = Unwrap (Invoke-RestMethod -Uri "$base/payment/bank/list" -Headers $H)
Check 'regress-bank-list' ($banks.Count -eq 5 -and ($banks | Where-Object { $_.bin -eq '970436' })) "count=$($banks.Count)"

# ---- QR dong 5 nguon + paid-hook ----
$srId = Sql1 "SELECT TOP 1 CAST(Id AS VARCHAR(36)) FROM ServiceRequests WHERE IsPaid=0 AND Status<>4 AND PatientAmount>0 AND IsDeleted=0 ORDER BY CreatedAt DESC"
if ($srId) {
    $r1 = Unwrap (Invoke-RestMethod -Uri "$base/payment/qr/dynamic" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ referenceType='service-request'; referenceId=$srId } | ConvertTo-Json))
    Check 'qr-service-request' ($r1.qrCodeContent -match '6304[0-9A-F]{4}$' -and $r1.provider -in @('vcb','vietcombank')) "$($r1.txnRef)"
    $r2 = Unwrap (Invoke-RestMethod -Uri "$base/payment/qr/dynamic" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ referenceType='service-request'; referenceId=$srId } | ConvertTo-Json))
    Check 'qr-sr-idempotent' ($r1.txnRef -eq $r2.txnRef) "$($r1.txnRef) vs $($r2.txnRef)"
    $null = Invoke-RestMethod -Uri "$base/payment/bank/confirm" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ transactionId=$r1.transactionId; note='smoke' } | ConvertTo-Json)
    Check 'paid-hook-service-request' ((Sql1 "SELECT CAST(IsPaid AS VARCHAR)+'|'+CAST(Status AS VARCHAR) FROM ServiceRequests WHERE Id='$srId'") -match '^1\|') 'IsPaid+Status'
}
$rxId = Sql1 "SELECT TOP 1 CAST(Id AS VARCHAR(36)) FROM Prescriptions WHERE (PatientAmount>0 OR TotalAmount>0) AND Status<>4 AND IsDeleted=0 ORDER BY CreatedAt DESC"
if ($rxId) {
    $rx = Unwrap (Invoke-RestMethod -Uri "$base/payment/qr/dynamic" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ referenceType='prescription'; referenceId=$rxId } | ConvertTo-Json))
    Check 'qr-prescription' ($rx.qrCodeContent -match '6304[0-9A-F]{4}$') "$($rx.txnRef)"
}
$mrId = Sql1 "SELECT TOP 1 CAST(Id AS VARCHAR(36)) FROM MedicalRecords WHERE IsDeleted=0 ORDER BY CreatedAt DESC"
if ($mrId) {
    $dep = Unwrap (Invoke-RestMethod -Uri "$base/payment/qr/dynamic" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ referenceType='deposit'; referenceId=$mrId; amount=50000 } | ConvertTo-Json))
    Check 'qr-deposit' ($dep.amount -eq 50000 -and $dep.qrCodeContent) "$($dep.txnRef)"
    $null = Invoke-RestMethod -Uri "$base/payment/bank/confirm" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ transactionId=$dep.transactionId; note='smoke dep' } | ConvertTo-Json)
    Check 'paid-hook-deposit-created' ([int](Sql1 "SELECT COUNT(*) FROM Deposits WHERE MedicalRecordId='$mrId' AND PaymentMethod=4 AND Amount=50000") -ge 1) 'Deposit tao'
}
# LUON seed retail-sale moi (unpaid) de test re-runnable, tranh dung sale da thanh toan
$rsId = Sql1 @"
DECLARE @pid UNIQUEIDENTIFIER=(SELECT TOP 1 Id FROM Patients WHERE IsDeleted=0);
DECLARE @uid UNIQUEIDENTIFIER=(SELECT TOP 1 Id FROM Users WHERE Username='admin');
DECLARE @rid UNIQUEIDENTIFIER=NEWID();
INSERT INTO RetailSales (Id,SaleCode,PatientId,TotalAmount,DiscountAmount,PaidAmount,PaymentMethod,Status,CashierId,CreatedAt,IsDeleted)
VALUES (@rid,'NT-SMK-'+RIGHT(CAST(@rid AS VARCHAR(36)),8),@pid,80000,0,0,'Cash','Draft',@uid,SYSUTCDATETIME(),0);
SELECT CAST(@rid AS VARCHAR(36));
"@
if ($rsId) {
    $rs = Unwrap (Invoke-RestMethod -Uri "$base/payment/qr/dynamic" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ referenceType='retail-sale'; referenceId=$rsId } | ConvertTo-Json))
    Check 'qr-retail-sale' ($rs.qrCodeContent -match '6304[0-9A-F]{4}$') "$($rs.txnRef)"
    $null = Invoke-RestMethod -Uri "$base/payment/bank/confirm" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ transactionId=$rs.transactionId; note='smoke rs' } | ConvertTo-Json)
    Check 'paid-hook-retail-sale' ((Sql1 "SELECT CAST(PaidAmount AS VARCHAR) FROM RetailSales WHERE Id='$rsId'") -match '^80000') 'PaidAmount'
}
# IsDeleted=0 de khop EF query-filter (tranh chon admission soft-deleted -> "khong ton tai")
$admOwe = Sql1 @"
SELECT TOP 1 CAST(a.Id AS VARCHAR(36)) FROM Admissions a
WHERE a.IsDeleted=0 AND (SELECT ISNULL(SUM(sr.PatientAmount),0) FROM ServiceRequests sr WHERE sr.MedicalRecordId=a.MedicalRecordId AND sr.Status<>4)
    - (SELECT ISNULL(SUM(r.FinalAmount),0) FROM Receipts r WHERE r.PatientId=a.PatientId AND r.ReceiptType=2 AND r.Status=1) > 0
ORDER BY a.CreatedAt DESC
"@
if ($admOwe) {
    $dis = Unwrap (Invoke-RestMethod -Uri "$base/payment/qr/dynamic" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ referenceType='discharge'; referenceId=$admOwe } | ConvertTo-Json))
    Check 'qr-discharge' ($dis.qrCodeContent -match '6304[0-9A-F]{4}$' -and $dis.amount -gt 0) "amt=$($dis.amount)"
}

# ---- Kiosk (I.8) ----
$kc = Sql1 "SELECT TOP 1 p.PatientCode FROM Patients p WHERE p.DateOfBirth IS NOT NULL AND EXISTS(SELECT 1 FROM MedicalRecords m JOIN ServiceRequests sr ON sr.MedicalRecordId=m.Id WHERE m.PatientId=p.Id AND sr.IsPaid=0 AND sr.PatientAmount>0 AND sr.Status<>4)"
if ($kc) {
    $kd = Sql1 "SELECT TOP 1 CONVERT(VARCHAR(10),DateOfBirth,23) FROM Patients WHERE PatientCode='$kc'"
    $k = Unwrap (Invoke-RestMethod -Uri "$base/payment/kiosk/qr" -Method Post -ContentType 'application/json' -Body (@{ patientCode=$kc; dateOfBirth=$kd } | ConvertTo-Json))
    Check 'kiosk-full-qr' ($k.totalAmount -gt 0 -and $k.qr.qrCodeContent -match '6304[0-9A-F]{4}$') "total=$($k.totalAmount)"
    $bad=$false; try { $null = Invoke-RestMethod -Uri "$base/payment/kiosk/qr" -Method Post -ContentType 'application/json' -Body (@{ patientCode=$kc; dateOfBirth='1900-01-01' } | ConvertTo-Json) } catch { $bad=$true }
    Check 'kiosk-reject-wrong-dob' $bad 'reject sai dob'
}

# ---- Regression: txn co BN xoa mem (soft-deleted patient) van confirm/getById duoc ----
# Bug goc: .Include(Patient) tren required-nav + Patient soft-delete -> EF an txn -> 500/404.
$srDel = Sql1 "SELECT TOP 1 CAST(sr.Id AS VARCHAR(36)) FROM ServiceRequests sr JOIN MedicalRecords m ON m.Id=sr.MedicalRecordId JOIN Patients p ON p.Id=m.PatientId WHERE sr.IsPaid=0 AND sr.Status<>4 AND sr.PatientAmount>0 AND sr.IsDeleted=0 AND p.IsDeleted=1 ORDER BY sr.CreatedAt DESC"
if ($srDel) {
    $qd = Unwrap (Invoke-RestMethod -Uri "$base/payment/qr/dynamic" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ referenceType='service-request'; referenceId=$srDel } | ConvertTo-Json))
    $tid = $qd.transactionId
    $got = $null; try { $got = Unwrap (Invoke-RestMethod -Uri "$base/payment/transactions/$tid" -Headers $H) } catch {}
    Check 'getbyid-softdeleted-patient' ($null -ne $got -and $got.txnRef) 'getById txn BN xoa mem'
    $cf = $null; try { $cf = Unwrap (Invoke-RestMethod -Uri "$base/payment/bank/confirm" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ transactionId=$tid; note='regr softdel' } | ConvertTo-Json)) } catch {}
    Check 'confirm-softdeleted-patient' ($null -ne $cf -and $cf.status -eq 1) 'confirm txn BN xoa mem (bug 500 cu)'
} else { Write-Host 'SKIP softdeleted-patient regression (khong co SR BN xoa mem)' -ForegroundColor Yellow }

# ---- Bao cao VI.1 + VI.2 ----
$from = (Get-Date).AddDays(-7).ToString('yyyy-MM-dd'); $to = (Get-Date).ToString('yyyy-MM-dd')
$fin = Unwrap (Invoke-RestMethod -Uri "$base/payment/reports/qr-finance?fromDate=$from&toDate=$to" -Headers $H)
Check 'report-qr-finance' ($null -ne $fin.byCreator) "count=$($fin.totalCount)"
$rec = Unwrap (Invoke-RestMethod -Uri "$base/payment/reports/bank-reconciliation?fromDate=$from&toDate=$to" -Headers $H)
Check 'report-bank-recon' ($null -ne $rec.PSObject.Properties['totalCount']) "total=$($rec.totalCount) matched=$($rec.matchedCount)"

# ---- Chi ho IV ----
$d1 = Unwrap (Invoke-RestMethod -Uri "$base/payment/disbursement" -Method Post -Headers $H -ContentType 'application/json' -Body (@{ patientId=$ptId; amount=25000; bankBin='970436'; bankName='Vietcombank'; accountNumber='0011001234567'; accountHolder='NGUYEN VAN SMOKE'; reason='smoke' } | ConvertTo-Json))
Check 'disburse-create' ($d1.disbursementCode -match '^CH-') "$($d1.disbursementCode)"
$d2 = Unwrap (Invoke-RestMethod -Uri "$base/payment/disbursement/$($d1.id)/execute" -Method Post -Headers $H -ContentType 'application/json' -Body '{}')
Check 'disburse-execute-mock' ($d2.status -eq 2 -and $d2.transferRef -match '^MOCK-') "ref=$($d2.transferRef)"
$ds = Unwrap (Invoke-RestMethod -Uri "$base/payment/disbursement?pageIndex=1&pageSize=10" -Headers $H)
Check 'disburse-search' ($ds.items.Count -ge 1) "items=$($ds.items.Count)"

# ---- 4 phieu in kem QR (decode UTF-8) ----
# SR co ExaminationId + patient hop le (print khong tra rong)
$srP = Sql1 "SELECT TOP 1 CAST(sr.Id AS VARCHAR(36)) FROM ServiceRequests sr JOIN MedicalRecords m ON m.Id=sr.MedicalRecordId JOIN Patients p ON p.Id=m.PatientId WHERE sr.IsPaid=0 AND sr.Status<>4 AND sr.PatientAmount>0 AND sr.IsDeleted=0 AND sr.ExaminationId IS NOT NULL AND p.IsDeleted=0 ORDER BY sr.CreatedAt DESC"
if ($srP) { $soHtml = GetHtml "$base/examination/service-orders/$srP/print"; Check 'print-service-order-qr' ($soHtml.Length -gt 100 -and $soHtml -match 'QUET MA QR') "len=$($soHtml.Length)" }
if ($rxId) { Check 'print-prescription-qr' ((GetHtml "$base/pdf/prescription/$rxId") -match 'QUET MA QR') 'QR' }
$ptSvc = Sql1 "SELECT TOP 1 CAST(m.PatientId AS VARCHAR(36)) FROM ServiceRequests sr JOIN MedicalRecords m ON m.Id=sr.MedicalRecordId WHERE sr.PatientAmount>0 AND sr.Status<>4 ORDER BY sr.CreatedAt DESC"
if ($ptSvc) { $htmlDep = GetHtml "$base/BillingComplete/print/deposit-by-service" 'POST' (@{ patientId=$ptSvc } | ConvertTo-Json); Check 'print-deposit-by-service' ($htmlDep -match 'TAM UNG') 'title' }
if ($admOwe) { Check 'print-billing-6556-qr' ((GetHtml "$base/inpatient/print-billing-statement/$admOwe") -match 'QUET MA QR') 'QR (owing)' }

# ---- Validation guards (HTTP status code robust) ----
function PostCode($url,$body) {
    try { $null = Invoke-RestMethod -Uri $url -Method Post -Headers $script:H -ContentType 'application/json' -Body $body; return 200 }
    catch {
        $r = $_.Exception.Response
        if ($r -and $r.StatusCode) { return [int]$r.StatusCode }
        return -1
    }
}
Check 'guard-invalid-source-400' ((PostCode "$base/payment/qr/dynamic" (@{ referenceType='service-request'; referenceId='00000000-0000-0000-0000-000000000000' } | ConvertTo-Json)) -eq 400) 'not-found source'
Check 'guard-bad-reftype-400'    ((PostCode "$base/payment/qr/dynamic" (@{ referenceType='bogus'; referenceId=$ptId } | ConvertTo-Json)) -eq 400) 'bad reftype'
Check 'guard-disburse-amount-400' ((PostCode "$base/payment/disbursement" (@{ patientId=$ptId; amount=0; bankBin='970436'; bankName='VCB'; accountNumber='1'; accountHolder='X' } | ConvertTo-Json)) -eq 400) 'amount<=0'
Check 'guard-retail-paid-400'    ($rsId -eq $null -or (PostCode "$base/payment/qr/dynamic" (@{ referenceType='retail-sale'; referenceId=(Sql1 "SELECT TOP 1 CAST(rs.Id AS VARCHAR(36)) FROM RetailSales rs JOIN PaymentTransactions pt ON pt.ReferenceId=rs.Id WHERE pt.ReferenceType='retail-sale' AND pt.Status=1") } | ConvertTo-Json)) -eq 400) 'already-paid -> 400 not 500'

Write-Host ""
Write-Host "===== SUMMARY ====="
$pass = ($results | Where-Object OK).Count; $fail = ($results | Where-Object { -not $_.OK }).Count
Write-Host "PASS: $pass  FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { $results | Where-Object { -not $_.OK } | Format-Table -AutoSize }
exit 0
