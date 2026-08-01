# #441 smoke: persist dot xuat XML + download dung dot + submit khong bao thanh cong gia.
# Chay: powershell -ExecutionPolicy Bypass -File .\scripts\test-insurance-batch-smoke.ps1

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:5106"
$pass = 0; $fail = 0
function Ok($m)  { $script:pass++; Write-Host "  PASS  $m" -ForegroundColor Green }
function Bad($m) { $script:fail++; Write-Host "  FAIL  $m" -ForegroundColor Red }

$lb = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
$tok = (Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $lb).data.token
$H = @{ Authorization = "Bearer $tok" }

function New-Config($month) {
    return @{
        month = $month; year = (Get-Date).Year
        includeXml1 = $true; includeXml2 = $true; includeXml3 = $true
        includeXml4 = $true; includeXml5 = $true; includeXml7 = $true
        validateBeforeExport = $false; compressOutput = $true
    } | ConvertTo-Json
}

Write-Host ""
Write-Host "=== 1. XUAT XML 2 DOT LIEN TIEP ===" -ForegroundColor Cyan
$r1 = Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/export" -Method Post -ContentType "application/json" -Headers $H -Body (New-Config 1)
$b1 = if ($r1.data) { $r1.data } else { $r1 }
Start-Sleep -Seconds 2
$r2 = Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/export" -Method Post -ContentType "application/json" -Headers $H -Body (New-Config 2)
$b2 = if ($r2.data) { $r2.data } else { $r2 }

if ($b1.batchId -and $b2.batchId -and $b1.batchId -ne $b2.batchId) {
    Ok "2 dot co BatchId khac nhau: $($b1.batchCode) / $($b2.batchCode)"
} else { Bad "BatchId trung hoac rong: '$($b1.batchId)' '$($b2.batchId)'"; }

Write-Host ""
Write-Host "=== 2. BATCH DUOC LUU DB (truoc day Guid.NewGuid() vut di) ===" -ForegroundColor Cyan
$q = "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; SELECT CONVERT(varchar(36),Id), BatchCode, FilePath FROM InsuranceXmlBatches WHERE Id IN ('$($b1.batchId)','$($b2.batchId)');"
$rows = docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'HisDocker2024Pass#' -C -d HIS -Q $q -h -1 -W 2>&1
$hit = ($rows | Where-Object { $_ -match '^[0-9A-Fa-f\-]{36}\s' }).Count
if ($hit -eq 2) { Ok "ca 2 dot deu co ban ghi trong InsuranceXmlBatches" }
else { Bad "chi tim thay $hit/2 ban ghi trong DB" }

Write-Host ""
Write-Host "=== 3. DOWNLOAD DUNG DOT (khong lay 'thu muc moi nhat') ===" -ForegroundColor Cyan
try {
    $tmp1 = "$env:TEMP\batch1.zip"; $tmp2 = "$env:TEMP\batch2.zip"
    Invoke-WebRequest -Uri "$baseUrl/api/insurance/xml/download/$($b1.batchId)" -Headers $H -OutFile $tmp1 | Out-Null
    Invoke-WebRequest -Uri "$baseUrl/api/insurance/xml/download/$($b2.batchId)" -Headers $H -OutFile $tmp2 | Out-Null
    $h1 = (Get-FileHash $tmp1 -Algorithm SHA256).Hash
    $h2 = (Get-FileHash $tmp2 -Algorithm SHA256).Hash
    $s1 = (Get-Item $tmp1).Length; $s2 = (Get-Item $tmp2).Length
    if ($s1 -gt 0 -and $s2 -gt 0) { Ok "tai duoc ca 2 dot ($s1 / $s2 bytes)" } else { Bad "file zip rong ($s1 / $s2)" }
    # 2 dot khac thang -> noi dung file khac nhau (ten file chua period) -> hash phai khac
    if ($h1 -ne $h2) { Ok "2 dot tra ve NOI DUNG KHAC NHAU -> download tra dung batchId" }
    else { Bad "2 dot tra ve file GIONG HET -> van dang lay 'thu muc moi nhat'" }
} catch { Bad "download loi: $($_.Exception.Message)" }

Write-Host ""
Write-Host "=== 4. SUBMIT BATCH KHONG TON TAI -> PHAI BAO LOI RO, KHONG TXN GIA ===" -ForegroundColor Cyan
try {
    $body = @{ batchId = "00000000-0000-0000-0000-0000000000ff"; username = "x"; password = "y"; certificatePath = ""; testMode = $true } | ConvertTo-Json
    $sr = Invoke-RestMethod -Uri "$baseUrl/api/insurance/submit" -Method Post -ContentType "application/json" -Headers $H -Body $body
    $sb = if ($sr.data) { $sr.data } else { $sr }
    if ($sb.success -eq $false) { Ok "submit tra Success=false: '$($sb.message)'" }
    else { Bad "submit bao THANH CONG voi batch khong ton tai (thanh cong gia!)" }
    if (-not $sb.transactionId) { Ok "khong cap TransactionId gia" } else { Bad "van cap TransactionId=$($sb.transactionId)" }
} catch {
    Ok "submit batch khong ton tai bi tu choi o tang HTTP ($($_.Exception.Message))"
}

Write-Host ""
Write-Host "=== KET QUA ===" -ForegroundColor Cyan
Write-Host "  PASS = $pass" -ForegroundColor Green
Write-Host "  FAIL = $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
if ($fail -eq 0) { Write-Host "=== INSURANCE BATCH SMOKE COMPLETE (0 FAIL) ===" -ForegroundColor Green }
else { Write-Host "=== INSURANCE BATCH SMOKE CO $fail LOI ===" -ForegroundColor Red }
