# #441 smoke ky so dot XML (client-side USB-token model).
# Gia lap plugin token bang 1 cert self-signed tao tai cho: private key KHONG gui len server,
# chi dung de ky; server chi nhan chu ky + cert cong khai roi verify.
# Chay: powershell -ExecutionPolicy Bypass -File .\scripts\test-insurance-signing-smoke.ps1

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:5106"
$pass = 0; $fail = 0
function Ok($m)  { $script:pass++; Write-Host "  PASS  $m" -ForegroundColor Green }
function Bad($m) { $script:fail++; Write-Host "  FAIL  $m" -ForegroundColor Red }

$lb = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
$tok = (Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $lb).data.token
$H = @{ Authorization = "Bearer $tok" }

Write-Host ""
Write-Host "=== 1. XUAT 1 DOT XML DE KY ===" -ForegroundColor Cyan
$cfg = @{
    month = 3; year = (Get-Date).Year
    includeXml1 = $true; includeXml2 = $true; includeXml3 = $true
    includeXml4 = $true; includeXml5 = $true; includeXml7 = $true
    validateBeforeExport = $false; compressOutput = $true
} | ConvertTo-Json
$r = Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/export" -Method Post -ContentType "application/json" -Headers $H -Body $cfg
$b = if ($r.data) { $r.data } else { $r }
if ($b.batchId) { Ok "dot $($b.batchCode) batchId=$($b.batchId)" } else { Bad "khong xuat duoc dot"; exit 1 }

Write-Host ""
Write-Host "=== 2. LAY PAYLOAD CAN KY ===" -ForegroundColor Cyan
$pl = Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/$($b.batchId)/sign-payload" -Headers $H
$pb = if ($pl.data) { $pl.data } else { $pl }
if ($pb.contentBase64 -and $pb.digestBase64) { Ok "nhan payload: file=$($pb.fileName) len=$($pb.contentBase64.Length) hash=$($pb.hashAlgorithm)" }
else { Bad "payload thieu contentBase64/digestBase64"; exit 1 }

$content = [Convert]::FromBase64String($pb.contentBase64)
$sha = [System.Security.Cryptography.SHA256]::Create().ComputeHash($content)
if ([Convert]::ToBase64String($sha) -eq $pb.digestBase64) { Ok "digest BE tra ve khop SHA-256 cua noi dung" }
else { Bad "digest KHONG khop -> client se ky nham du lieu" }

Write-Host ""
Write-Host "=== 3. GIA LAP TOKEN KY O CLIENT (private key khong roi may client) ===" -ForegroundColor Cyan
$cert = New-SelfSignedCertificate -Subject "CN=[AUTO-REG] Ke toan BHYT Smoke" -KeyAlgorithm RSA -KeyLength 2048 `
        -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddDays(2) -KeyExportPolicy Exportable
$rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
$sig = $rsa.SignData($content, [System.Security.Cryptography.HashAlgorithmName]::SHA256, [System.Security.Cryptography.RSASignaturePadding]::Pkcs1)
$certB64 = [Convert]::ToBase64String($cert.RawData)
Ok "da ky o client bang cert $($cert.Subject)"

Write-Host ""
Write-Host "=== 4. GUI CHU KY HOP LE -> PHAI DUOC CHAP NHAN ===" -ForegroundColor Cyan
try {
    $body = @{ signatureValue = [Convert]::ToBase64String($sig); certificateBase64 = $certB64; tokenSerial = "SMOKE-TOKEN-01"; caProvider = "SMOKE-CA" } | ConvertTo-Json
    $sr = Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/$($b.batchId)/signature" -Method Post -ContentType "application/json" -Headers $H -Body $body
    $sb = if ($sr.data) { $sr.data } else { $sr }
    if ($sb.success) { Ok "BE chap nhan chu ky, signatureId=$($sb.signatureId)" } else { Bad "BE tu choi chu ky hop le: $($sb.message)" }
} catch { Bad "loi gui chu ky hop le: $($_.Exception.Message)" }

Write-Host ""
Write-Host "=== 5. TRANG THAI DOT PHAI CHUYEN SANG 'DA KY SO' (Status=1) ===" -ForegroundColor Cyan
$q = "SET QUOTED_IDENTIFIER ON; SET NOCOUNT ON; SELECT Status FROM InsuranceXmlBatches WHERE Id='$($b.batchId)'; SELECT COUNT(*) FROM DocumentSignatures WHERE DocumentId='$($b.batchId)' AND DocumentType='InsuranceXmlBatch' AND Status=0;"
$rows = docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'HisDocker2024Pass#' -C -d HIS -Q $q -h -1 -W 2>&1
$nums = @($rows | Where-Object { $_ -match '^\d+$' })
if ($nums.Count -ge 2 -and $nums[0] -eq '1') { Ok "batch.Status=1 (da ky so)" } else { Bad "batch.Status=$($nums[0]) (ky vong 1)" }
if ($nums.Count -ge 2 -and $nums[1] -eq '1') { Ok "co dung 1 chu ky hieu luc trong DocumentSignatures" } else { Bad "so chu ky hieu luc=$($nums[1]) (ky vong 1)" }

Write-Host ""
Write-Host "=== 6. CHU KY GIA -> PHAI BI TU CHOI (day la diem song con) ===" -ForegroundColor Cyan
try {
    $fakeSig = [Convert]::ToBase64String((1..256 | ForEach-Object { [byte](Get-Random -Max 256) }))
    $body2 = @{ signatureValue = $fakeSig; certificateBase64 = $certB64; tokenSerial = "SMOKE-TOKEN-01" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/$($b.batchId)/signature" -Method Post -ContentType "application/json" -Headers $H -Body $body2 | Out-Null
    Bad "BE CHAP NHAN chu ky gia -> verify khong chay!"
} catch {
    Ok "BE tu choi chu ky gia (verify bang public key hoat dong)"
}

Write-Host ""
Write-Host "=== 7. KY NHAM DOT KHAC -> PHAI BI TU CHOI ===" -ForegroundColor Cyan
try {
    $cfg2 = @{ month = 4; year = (Get-Date).Year; includeXml1 = $true; includeXml2 = $true; includeXml3 = $true; includeXml4 = $true; includeXml5 = $true; includeXml7 = $true; validateBeforeExport = $false; compressOutput = $true } | ConvertTo-Json
    $r2 = Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/export" -Method Post -ContentType "application/json" -Headers $H -Body $cfg2
    $b2 = if ($r2.data) { $r2.data } else { $r2 }
    # gui chu ky cua DOT 1 cho DOT 2
    $body3 = @{ signatureValue = [Convert]::ToBase64String($sig); certificateBase64 = $certB64 } | ConvertTo-Json
    Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/$($b2.batchId)/signature" -Method Post -ContentType "application/json" -Headers $H -Body $body3 | Out-Null
    Bad "BE chap nhan chu ky cua dot KHAC -> khong rang buoc noi dung!"
} catch {
    Ok "BE tu choi chu ky cua dot khac (chu ky rang buoc dung noi dung dot)"
}

# Don cert smoke khoi store
Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== KET QUA ===" -ForegroundColor Cyan
Write-Host "  PASS = $pass" -ForegroundColor Green
Write-Host "  FAIL = $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
if ($fail -eq 0) { Write-Host "=== XML SIGNING SMOKE COMPLETE (0 FAIL) ===" -ForegroundColor Green }
else { Write-Host "=== XML SIGNING SMOKE CO $fail LOI ===" -ForegroundColor Red }
