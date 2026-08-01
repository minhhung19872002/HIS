# Smoke API cho batch #433 / #434 / #435 / #438 (goal-sweep 2026-08-02)
# Chay: powershell -ExecutionPolicy Bypass -File .\scripts\test-goal-sweep-smoke.ps1
# Yeu cau: backend chay o localhost:5106 (docker his-sqlserver da len)

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:5106"
$pass = 0; $fail = 0; $skip = 0

function Get-ResultItems($response) {
    if ($null -eq $response) { return @() }
    if ($response -is [System.Array]) { return $response }
    if ($response.PSObject.Properties.Name -contains "data" -and $null -ne $response.data) { return $response.data }
    if ($response.PSObject.Properties.Name -contains "items" -and $null -ne $response.items) { return $response.items }
    if ($response.PSObject.Properties.Name -contains "value" -and $null -ne $response.value) { return $response.value }
    return @($response)
}

function Ok($msg)   { $script:pass++; Write-Host "  PASS  $msg" -ForegroundColor Green }
function Bad($msg)  { $script:fail++; Write-Host "  FAIL  $msg" -ForegroundColor Red }
function Skip($msg) { $script:skip++; Write-Host "  SKIP  $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "=== 0. LOGIN (dang nhap admin) ===" -ForegroundColor Cyan
$loginBody = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.data.token
    if (-not $token) { $token = $loginResponse.token }
    $headers = @{ Authorization = "Bearer $token" }
    Ok "login admin, token len=$($token.Length)"
} catch {
    Bad "login: $($_.Exception.Message)"
    Write-Host "=== ABORT: khong login duoc ===" -ForegroundColor Red
    exit 1
}

# ============================================================================
Write-Host ""
Write-Host "=== 1. #438 DOI CHIEU THUOC (medication reconciliation) ===" -ForegroundColor Cyan
try {
    $from = (Get-Date).AddDays(-3650).ToString("yyyy-MM-dd")
    $to   = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
    $rec = Invoke-RestMethod -Uri "$baseUrl/api/pharmacy/reconciliation?fromDate=$from&toDate=$to" -Headers $headers
    $body = if ($rec.PSObject.Properties.Name -contains "data" -and $null -ne $rec.data) { $rec.data } else { $rec }

    if ($null -ne $body.summary) { Ok "response co 'summary'" } else { Bad "response THIEU 'summary'" }
    if ($null -ne $body.rows)    { Ok "response co 'rows' (count=$($body.rows.Count))" } else { Bad "response THIEU 'rows'" }

    $s = $body.summary
    $keys = @("medicalRecordCount","notDispensedCount","noOrderCount","overDispensedCount","fieldDriftCount","cabinetIssueCount")
    $missing = $keys | Where-Object { -not ($s.PSObject.Properties.Name -contains $_) }
    if ($missing.Count -eq 0) { Ok "summary du 6 field: $($keys -join ', ')" } else { Bad "summary thieu: $($missing -join ', ')" }

    Write-Host "        summary = HSBA:$($s.medicalRecordCount) chuaCap:$($s.notDispensedCount) khongYLenh:$($s.noOrderCount) capVuot:$($s.overDispensedCount) lechDL:$($s.fieldDriftCount) tuTruc:$($s.cabinetIssueCount)" -ForegroundColor Gray

    # Kiem tra tinh nhat quan: tong so dong = tong cac loai
    $sumTypes = $s.notDispensedCount + $s.noOrderCount + $s.overDispensedCount + $s.fieldDriftCount + $s.cabinetIssueCount
    if ($body.rows.Count -eq $sumTypes) { Ok "rows.Count ($($body.rows.Count)) == tong 5 loai ($sumTypes)" }
    else { Bad "rows.Count ($($body.rows.Count)) != tong 5 loai ($sumTypes)" }

    # Neu co du lieu: kiem tra shape + gia tri hop le cua tung dong
    if ($body.rows.Count -gt 0) {
        $valid = @("NOT_DISPENSED","NO_ORDER","OVER_DISPENSED","FIELD_DRIFT","CABINET_ISSUE")
        $badType = $body.rows | Where-Object { $valid -notcontains $_.discrepancyType } | Select-Object -First 1
        if ($null -eq $badType) { Ok "moi dong co discrepancyType hop le" } else { Bad "discrepancyType la: $($badType.discrepancyType)" }

        $badVar = $body.rows | Where-Object {
            $_.discrepancyType -ne "FIELD_DRIFT" -and
            [math]::Abs(($_.dispensedQuantity - $_.orderedQuantity) - $_.variance) -gt 0.0001
        } | Select-Object -First 1
        if ($null -eq $badVar) { Ok "variance == dispensed - ordered (tru FIELD_DRIFT)" }
        else { Bad "variance sai o dong medicineId=$($badVar.medicineId)" }

        $r0 = $body.rows[0]
        Write-Host "        vi du dong 1: $($r0.discrepancyType) | BN=$($r0.patientName) | thuoc=$($r0.medicineName) | ylenh=$($r0.orderedQuantity) capphat=$($r0.dispensedQuantity)" -ForegroundColor Gray
        # Dung lai cho buoc #433 (benh nhan noi tru that, chac chan co du lieu lam sang)
        $global:smokePatientId = ($body.rows | Where-Object { $_.patientId } | Select-Object -First 1).patientId

        # Doi chieu chinh xac 1 dong voi DTO: FIELD_DRIFT phai co recordedDispensedQuantity != dispensedQuantity
        $drift = $body.rows | Where-Object { $_.discrepancyType -eq "FIELD_DRIFT" } | Select-Object -First 1
        if ($drift) {
            if ($drift.recordedDispensedQuantity -ne $drift.dispensedQuantity) {
                Ok "FIELD_DRIFT dung dinh nghia: cot DispensedQuantity=$($drift.recordedDispensedQuantity) != tong phieu xuat=$($drift.dispensedQuantity)"
            } else { Bad "FIELD_DRIFT nhung 2 gia tri bang nhau -> logic sai" }
        } else { Skip "seed khong co dong FIELD_DRIFT de verify" }
    } else {
        Skip "seed local khong co du lieu noi tru -> khong verify duoc noi dung dong (contract da verify)"
    }

    # Loc theo HSBA khong ton tai -> phai tra rong, khong 500
    $empty = Invoke-RestMethod -Uri "$baseUrl/api/pharmacy/reconciliation?medicalRecordId=00000000-0000-0000-0000-000000000001" -Headers $headers
    $eb = if ($empty.PSObject.Properties.Name -contains "data" -and $null -ne $empty.data) { $empty.data } else { $empty }
    if ($eb.rows.Count -eq 0) { Ok "loc HSBA khong ton tai -> rows rong (khong 500)" } else { Bad "loc HSBA ma van co $($eb.rows.Count) dong" }
} catch {
    Bad "#438 reconciliation: $($_.Exception.Message)"
}

# ============================================================================
Write-Host ""
Write-Host "=== 2. #435 LOYALTY POINTS + COMMISSION (nha thuoc BV) ===" -ForegroundColor Cyan
$testMarker = "[AUTO-REG]"
$stamp = Get-Date -Format "HHmmss"
try {
    # Tao khach hang test
    $cust = @{ fullName = "$testMarker KH Smoke $stamp"; phone = "0900$stamp"; customerType = 1 } | ConvertTo-Json
    $c = Invoke-RestMethod -Uri "$baseUrl/api/hospital-pharmacy/customers" -Method Post -ContentType "application/json" -Headers $headers -Body $cust
    $cb = if ($c.PSObject.Properties.Name -contains "data" -and $null -ne $c.data) { $c.data } else { $c }
    $custId = $cb.id
    if ($custId) { Ok "tao khach hang test id=$custId (diem ban dau=$($cb.totalPoints))" } else { Bad "khong lay duoc customerId"; throw "no cust" }

    # Cong diem
    $addBody = @{ customerId = $custId; points = 50; description = "$testMarker smoke add" } | ConvertTo-Json
    $add = Invoke-RestMethod -Uri "$baseUrl/api/hospital-pharmacy/customers/add-points" -Method Post -ContentType "application/json" -Headers $headers -Body $addBody
    $ab = if ($add.PSObject.Properties.Name -contains "data" -and $null -ne $add.data) { $add.data } else { $add }
    if ($ab.points -eq 50 -and $ab.transactionType -eq 1) { Ok "cong 50 diem -> transactionType=1 (Earn)" } else { Bad "cong diem tra ve sai: points=$($ab.points) type=$($ab.transactionType)" }

    $after = Invoke-RestMethod -Uri "$baseUrl/api/hospital-pharmacy/customers/$custId" -Headers $headers
    $afb = if ($after.PSObject.Properties.Name -contains "data" -and $null -ne $after.data) { $after.data } else { $after }
    if ($afb.totalPoints -eq 50) { Ok "totalPoints sau cong = 50" } else { Bad "totalPoints = $($afb.totalPoints), ky vong 50" }

    # Doi diem hop le
    $redBody = @{ customerId = $custId; points = 20; description = "$testMarker smoke redeem" } | ConvertTo-Json
    $red = Invoke-RestMethod -Uri "$baseUrl/api/hospital-pharmacy/customers/redeem-points" -Method Post -ContentType "application/json" -Headers $headers -Body $redBody
    $rb = if ($red.PSObject.Properties.Name -contains "data" -and $null -ne $red.data) { $red.data } else { $red }
    if ($rb.transactionType -eq 2) { Ok "doi 20 diem -> transactionType=2 (Redeem)" } else { Bad "doi diem type=$($rb.transactionType), ky vong 2" }

    $after2 = Invoke-RestMethod -Uri "$baseUrl/api/hospital-pharmacy/customers/$custId" -Headers $headers
    $af2 = if ($after2.PSObject.Properties.Name -contains "data" -and $null -ne $after2.data) { $after2.data } else { $after2 }
    if ($af2.totalPoints -eq 30) { Ok "totalPoints sau doi = 30 (50-20)" } else { Bad "totalPoints = $($af2.totalPoints), ky vong 30" }

    # Doi qua so diem -> BE phai chan (guard FE la mirror)
    $overBody = @{ customerId = $custId; points = 9999; description = "$testMarker smoke over-redeem" } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "$baseUrl/api/hospital-pharmacy/customers/redeem-points" -Method Post -ContentType "application/json" -Headers $headers -Body $overBody | Out-Null
        Bad "doi 9999 diem KHONG bi chan (BE cho qua!)"
    } catch {
        Ok "doi vuot so diem bi BE chan (dung ky vong guard FE mirror)"
    }

    # Them hoa hong thu cong -> kiem tra cong thuc CommissionAmount = SaleAmount * Rate / 100
    $commBody = @{ doctorName = "$testMarker BS Smoke"; saleDate = (Get-Date).ToString("yyyy-MM-dd"); medicineName = "Paracetamol"; quantity = 10; saleAmount = 200000; commissionRate = 7 } | ConvertTo-Json
    $comm = Invoke-RestMethod -Uri "$baseUrl/api/hospital-pharmacy/commissions" -Method Post -ContentType "application/json" -Headers $headers -Body $commBody
    $cmb = if ($comm.PSObject.Properties.Name -contains "data" -and $null -ne $comm.data) { $comm.data } else { $comm }
    if ($cmb.commissionAmount -eq 14000) { Ok "hoa hong = 14000 (200000 * 7 / 100) - khop cong thuc hien tren FE" }
    else { Bad "commissionAmount = $($cmb.commissionAmount), ky vong 14000" }
} catch {
    Bad "#435: $($_.Exception.Message)"
}

# ============================================================================
Write-Host ""
Write-Host "=== 3. #434 XML PREVIEW + VALIDATION GATE (BHYT QD4210) ===" -ForegroundColor Cyan
try {
    $cfg = @{
        month = (Get-Date).Month; year = (Get-Date).Year
        includeXml1 = $true; includeXml2 = $true; includeXml3 = $true
        includeXml4 = $true; includeXml5 = $true; includeXml7 = $true
        validateBeforeExport = $true; compressOutput = $true
    } | ConvertTo-Json
    $pv = Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/preview" -Method Post -ContentType "application/json" -Headers $headers -Body $cfg
    $pb = if ($pv.PSObject.Properties.Name -contains "data" -and $null -ne $pv.data) { $pv.data } else { $pv }

    foreach ($f in @("totalRecords","totalCostAmount","totalInsuranceAmount","totalPatientAmount","tables","validationErrors","hasBlockingErrors")) {
        if ($pb.PSObject.Properties.Name -contains $f) { Ok "preview co field '$f'" } else { Bad "preview THIEU field '$f' (FE dang doc field nay)" }
    }
    Write-Host "        preview: hoso=$($pb.totalRecords) bang=$($pb.tables.Count) loi=$($pb.validationErrors.Count) blocking=$($pb.hasBlockingErrors)" -ForegroundColor Gray

    # Lay danh sach khoa cho bo loc (FE tai dung endpoint nay)
    $dept = Invoke-RestMethod -Uri "$baseUrl/api/insurance/reports/by-department?month=$((Get-Date).Month)&year=$((Get-Date).Year)" -Headers $headers
    $db = Get-ResultItems $dept
    Ok "reports/by-department tra ve $($db.Count) khoa (nguon cho bo loc khoa)"

    # Preview co loc khoa -> khong duoc 500
    if ($db.Count -gt 0 -and $db[0].departmentId) {
        $cfg2 = @{
            month = (Get-Date).Month; year = (Get-Date).Year; departmentId = $db[0].departmentId
            includeXml1 = $true; includeXml2 = $true; includeXml3 = $true
            includeXml4 = $true; includeXml5 = $true; includeXml7 = $true
            validateBeforeExport = $true; compressOutput = $true
        } | ConvertTo-Json
        Invoke-RestMethod -Uri "$baseUrl/api/insurance/xml/preview" -Method Post -ContentType "application/json" -Headers $headers -Body $cfg2 | Out-Null
        Ok "preview co departmentId chay duoc (bo loc khoa hop le)"
    } else {
        Skip "seed khong co khoa phat sinh BHYT -> chua verify duoc preview kem departmentId"
    }
} catch {
    Bad "#434: $($_.Exception.Message)"
}

# ============================================================================
Write-Host ""
Write-Host "=== 4. #433 CDS ENDPOINTS (ho tro quyet dinh lam sang) ===" -ForegroundColor Cyan
try {
    $req = @{ symptoms = @("sot","ho"); signs = @("hong do"); age = 30; gender = 1; temperature = 38.5; pulse = 95; spO2 = 97 } | ConvertTo-Json
    $sug = Invoke-RestMethod -Uri "$baseUrl/api/cds/suggest-diagnoses" -Method Post -ContentType "application/json" -Headers $headers -Body $req
    $sb = Get-ResultItems $sug
    Ok "suggest-diagnoses tra ve $($sb.Count) goi y"
    if ($sb.Count -gt 0) {
        $f = $sb[0]
        $need = @("icdCode","icdName","confidence","confidenceLevel","isCommonInDepartment")
        $miss = $need | Where-Object { -not ($f.PSObject.Properties.Name -contains $_) }
        if ($miss.Count -eq 0) { Ok "goi y du field FE dang render: $($need -join ', ')" } else { Bad "goi y thieu field: $($miss -join ', ')" }
        Write-Host "        vi du: $($f.icdCode) - $($f.icdName) ($([math]::Round($f.confidence * 100))%)" -ForegroundColor Gray
    } else {
        Skip "khong co goi y (phu thuoc du lieu ICD/trieu chung seed) - contract van dung"
    }

    $ews = Invoke-RestMethod -Uri "$baseUrl/api/cds/early-warning-score" -Method Post -ContentType "application/json" -Headers $headers -Body (@{ pulse = 130; respiratoryRate = 25; temperature = 39; spO2 = 91 } | ConvertTo-Json)
    $eb = if ($ews.PSObject.Properties.Name -contains "data" -and $null -ne $ews.data) { $ews.data } else { $ews }
    if ($null -ne $eb.totalScore -and $eb.riskLevel) { Ok "early-warning-score: diem=$($eb.totalScore) muc=$($eb.riskLevel)" }
    else { Bad "early-warning-score thieu totalScore/riskLevel" }

    # Alerts theo benh nhan that: lay patientId tu ket qua doi chieu (#438) - benh nhan noi tru co don thuoc
    if ($global:smokePatientId) {
        $al = Invoke-RestMethod -Uri "$baseUrl/api/cds/alerts/$($global:smokePatientId)" -Headers $headers
        $alb = Get-ResultItems $al
        Ok "cds/alerts/{patientId} tra ve $($alb.Count) canh bao (benh nhan that, khong loi)"
        if ($alb.Count -gt 0) {
            $a0 = $alb[0]
            $needA = @("alertType","severity","title","message")
            $missA = $needA | Where-Object { -not ($a0.PSObject.Properties.Name -contains $_) }
            if ($missA.Count -eq 0) { Ok "canh bao du field FE render: $($needA -join ', ')" } else { Bad "canh bao thieu field: $($missA -join ', ')" }
            Write-Host "        vi du: [$($a0.severity)] $($a0.title)" -ForegroundColor Gray
        }
    } else {
        Skip "khong co patientId tu buoc #438 -> bo qua cds/alerts"
    }
} catch {
    Bad "#433: $($_.Exception.Message)"
}

# ============================================================================
Write-Host ""
Write-Host "=== KET QUA ===" -ForegroundColor Cyan
Write-Host "  PASS = $pass" -ForegroundColor Green
Write-Host "  FAIL = $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  SKIP = $skip" -ForegroundColor Yellow
Write-Host ""
if ($fail -eq 0) { Write-Host "=== GOAL-SWEEP SMOKE COMPLETE (0 FAIL) ===" -ForegroundColor Green }
else { Write-Host "=== GOAL-SWEEP SMOKE CO $fail LOI ===" -ForegroundColor Red }
