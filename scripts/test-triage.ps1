# test-triage.ps1 — #63: kiểm thử phân tầng triage cấp cứu
# Login admin → tạo phiên lưu (observation) có triageLevel → đổi mức → assert.
$ErrorActionPreference = "Stop"
$base = "http://localhost:5106"

$login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType "application/json" `
  -Body '{"username":"admin","password":"Admin@123"}'
$token = $login.data.token
$h = @{ Authorization = "Bearer $token" }

Write-Host "== 1. Tao phien luu observation voi triageLevel=3 =="
# Cần patientId hợp lệ — lấy 1 BN bất kỳ
$patients = Invoke-RestMethod -Uri "$base/api/reception/patients/search?keyword=" -Headers $h
$pid = $patients.data[0].id
$createBody = @{ patientId = $pid; chiefComplaint = "Test triage"; triageLevel = 3 } | ConvertTo-Json
$stay = Invoke-RestMethod -Uri "$base/api/observation" -Method Post -Headers $h -ContentType "application/json" -Body $createBody
$stayId = $stay.data.id
Write-Host "  Created stay $stayId triage=$($stay.data.triageLevel)"

Write-Host "== 2. Nang muc triage 3 -> 1 (hoi suc) =="
$upd = Invoke-RestMethod -Uri "$base/api/observation/$stayId/triage" -Method Put -Headers $h -ContentType "application/json" -Body '{"triageLevel":1}'
if ($upd.data.triageLevel -eq 1) { Write-Host "  PASS: triage updated to 1" -ForegroundColor Green }
else { Write-Host "  FAIL: triage = $($upd.data.triageLevel)" -ForegroundColor Red }

Write-Host "== 3. Validate muc ngoai 1-5 -> expect 400 =="
try {
  Invoke-RestMethod -Uri "$base/api/observation/$stayId/triage" -Method Put -Headers $h -ContentType "application/json" -Body '{"triageLevel":9}'
  Write-Host "  FAIL: khong chan muc 9" -ForegroundColor Red
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 400) { Write-Host "  PASS: chan muc khong hop le (400)" -ForegroundColor Green }
  else { Write-Host "  FAIL: status $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red }
}
Write-Host "Done."
