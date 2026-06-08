# Temp smoke test for new endpoints (Phase 2-4) - not committed
$token = Get-Content "$env:TEMP\his_token.txt" -Raw
$h = @{ Authorization = "Bearer $token" }
$base = 'http://localhost:5106/api'

function Test-Get($name, $url) {
  try {
    $r = Invoke-WebRequest -Uri $url -Headers $h -UseBasicParsing -TimeoutSec 15
    "OK   $($r.StatusCode)  $name"
  } catch {
    $code = 'ERR'
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $code = [int]$_.Exception.Response.StatusCode }
    "FAIL $code  $name  ($url)"
  }
}

Test-Get 'G-19 microbiology cultures v2'      "$base/LISComplete/microbiology/cultures/v2"
Test-Get 'G-18 analyzer inbox'                "$base/LISComplete/inbox?status=0"
Test-Get 'G-18 analyzers list'                "$base/LISComplete/analyzers"
Test-Get 'G-31 key-images'                    "$base/RISComplete/key-images?studyInstanceUID=SMOKE.TEST.1"
Test-Get 'G-32 annotations'                   "$base/RISComplete/annotations?sopInstanceUID=SMOKE.TEST.1"
Test-Get 'G-22 lis-catalog tests'             "$base/lis-catalog/tests"
Test-Get 'G-34 ris icd-templates'             "$base/ris-catalog/icd-templates"
Test-Get 'G-27 pharmacy approvals'            "$base/pharmacy-approval?page=1&pageSize=5"
Test-Get 'G-41 payroll periods'               "$base/admin-modules/payroll/periods"
Test-Get 'G-42 hr-decisions'                  "$base/admin-modules/hr-decisions"
Test-Get 'G-44 official-documents'            "$base/admin-modules/official-documents"
Test-Get 'G-44 official-documents KPI'        "$base/admin-modules/official-documents/kpi/overdue"
Test-Get 'G-40 archives list'                 "$base/archives/archived"
Test-Get 'G-45 payment transactions'          "$base/payment/transactions?page=1&pageSize=5"
Test-Get 'G-39 portal visits (no data ok)'    "$base/portal/visits?patientId=00000000-0000-0000-0000-000000000001"
Test-Get 'G-36 RIS rooms (call patient dep)'  "$base/RISComplete/rooms"
Test-Get 'Abbreviations (F2)'                 "$base/abbreviation?scope=0"
