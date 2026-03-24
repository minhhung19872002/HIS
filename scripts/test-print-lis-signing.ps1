$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:5106"
$testMarker = "[AUTO-REG]"
$sqlServer = "localhost,1433"
$sqlDatabase = "HIS"
$sqlUser = "sa"
$sqlPassword = "HisDocker2024Pass#"

function Get-ResultItems {
    param([object]$Response)

    if ($null -eq $Response) { return @() }
    if ($Response -is [System.Array]) { return @($Response) }
    if ($Response.PSObject.Properties["data"]) { return Get-ResultItems -Response $Response.data }
    if ($Response.PSObject.Properties["items"]) { return @($Response.items) }
    if ($Response.PSObject.Properties["results"]) { return @($Response.results) }
    return @($Response)
}

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [object]$Body = $null
    )

    if ($null -ne $Body) {
        return Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 8)
    }

    return Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers
}

function Invoke-SqlText {
    param([string]$Query)

    $lines = & sqlcmd -S $sqlServer -U $sqlUser -P $sqlPassword -d $sqlDatabase -Q $Query -W -h -1
    return @($lines | Where-Object { $_ -and $_.Trim() -and $_.Trim() -notmatch '^-+$' } | ForEach-Object { $_.Trim() })
}

function New-LisSeedOrder {
    $patientId = (Invoke-SqlText "SET NOCOUNT ON; SELECT TOP 1 CONVERT(varchar(36), Id) FROM Patients WHERE IsDeleted = 0 ORDER BY CreatedAt DESC;") | Select-Object -First 1
    $departmentId = (Invoke-SqlText "SET NOCOUNT ON; SELECT TOP 1 CONVERT(varchar(36), Id) FROM Departments WHERE IsDeleted = 0 ORDER BY CreatedAt DESC;") | Select-Object -First 1
    $doctorId = (Invoke-SqlText "SET NOCOUNT ON; SELECT TOP 1 CONVERT(varchar(36), Id) FROM Users WHERE IsDeleted = 0 ORDER BY CreatedAt DESC;") | Select-Object -First 1

    if (-not $patientId -or -not $departmentId -or -not $doctorId) {
        Write-Host "  Seed refs => patient=$patientId dept=$departmentId doctor=$doctorId" -ForegroundColor Yellow
        throw "Cannot resolve LIS seed references in database."
    }

    $stamp = Get-Date -Format "yyyyMMddHHmmss"
    $orderId = [guid]::NewGuid().ToString()
    $item1 = [guid]::NewGuid().ToString()
    $item2 = [guid]::NewGuid().ToString()
    $orderCode = "LISAUTO$stamp"
    $barcode = "LIS$stamp"

    $query = @"
SET NOCOUNT ON;
INSERT INTO LabOrders (Id, OrderCode, PatientId, OrderDepartmentId, OrderDoctorId, Diagnosis, IcdCode, Status, IsPriority, IsEmergency, SampleBarcode, SampleType, Notes, OrderedAt, CreatedAt, IsDeleted)
VALUES ('$orderId', N'$orderCode', '$patientId', '$departmentId', '$doctorId', N'$testMarker Test tu dong LIS', N'Z00', 1, 0, 0, N'$barcode', N'BLOOD', N'$testMarker Auto regression seed', GETDATE(), GETDATE(), 0);

INSERT INTO LabOrderItems (Id, LabOrderId, TestCode, TestName, TestGroupName, SampleTypeName, Unit, ReferenceRange, NormalMin, NormalMax, CriticalLow, CriticalHigh, CreatedAt)
VALUES
('$item1', '$orderId', N'GLU', N'Glucose mau', N'Sinh hoa', N'Huyet thanh', N'mmol/L', N'3.9-6.1', 3.9, 6.1, 2.0, 25.0, GETDATE()),
('$item2', '$orderId', N'GOT', N'GOT (AST)', N'Sinh hoa', N'Huyet thanh', N'U/L', N'0-40', 0, 40, NULL, 200, GETDATE());
"@

    Invoke-SqlText $query | Out-Null
    return @{
        id = $orderId
        orderCode = $orderCode
    }
}

function Get-LisResultValue {
    param([string]$TestCode)

    switch ($TestCode) {
        "GLU" { return "5.2" }
        "GOT" { return "25" }
        "GPT" { return "22" }
        "CREATININ" { return "90" }
        "URE" { return "5.5" }
        "HBA1C" { return "5.8" }
        default { return "1.0" }
    }
}

function Test-BinaryEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [hashtable]$Headers
    )

    try {
        $resp = Invoke-WebRequest -Uri $Url -Headers $Headers -UseBasicParsing
        Write-Host "  [OK] $Name -> status=$($resp.StatusCode), bytes=$($resp.Content.Length)" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  [FAIL] $Name -> $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "=== LOGIN ===" -ForegroundColor Cyan
$login = Invoke-Json -Method Post -Url "$baseUrl/api/auth/login" -Headers @{} -Body @{
    username = "admin"
    password = "Admin@123"
}
$token = $login.data.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "Token OK: $($token.Substring(0,20))..."

Write-Host "`n=== RECEPTION PRINT ===" -ForegroundColor Cyan
$admissions = Get-ResultItems (Invoke-Json -Method Get -Url "$baseUrl/api/reception/admissions/today" -Headers $headers)
$admission = $admissions | Select-Object -First 1
if ($admission) {
    Test-BinaryEndpoint -Name "Patient card" -Url "$baseUrl/api/reception/print/patient-card/$($admission.patientId)" -Headers $headers | Out-Null
    Test-BinaryEndpoint -Name "Examination slip" -Url "$baseUrl/api/reception/print/examination-slip/$($admission.id)" -Headers $headers | Out-Null
    Test-BinaryEndpoint -Name "Service order slip" -Url "$baseUrl/api/reception/print/service-order-slip/$($admission.id)" -Headers $headers | Out-Null
} else {
    Write-Host "  [SKIP] No admission found for today" -ForegroundColor Yellow
}

Write-Host "`n=== LIS ===" -ForegroundColor Cyan
$today = (Get-Date).ToString("yyyy-MM-dd")
$pendingOrders = Get-ResultItems (Invoke-Json -Method Get -Url "$baseUrl/api/LISComplete/orders/pending?date=$today" -Headers $headers)
$orderCount = @($pendingOrders).Count
Write-Host "  Pending lab orders today: $orderCount"
$seededOrder = New-LisSeedOrder
Write-Host "  Seeded LIS order: $($seededOrder.orderCode)" -ForegroundColor Green

$pendingOrders = Get-ResultItems (Invoke-Json -Method Get -Url "$baseUrl/api/LISComplete/orders/pending?date=$today" -Headers $headers)
$targetOrder = $pendingOrders | Where-Object { $_.id -eq $seededOrder.id } | Select-Object -First 1

if ($null -eq $targetOrder) {
    throw "Seeded LIS order not returned by pending endpoint."
}

Write-Host "  Pending endpoint returned seeded order: $($targetOrder.orderCode) / $($targetOrder.patientName)" -ForegroundColor Green

$detail = Invoke-Json -Method Get -Url "$baseUrl/api/LISComplete/orders/$($seededOrder.id)" -Headers $headers
$testItems = @($detail.testItems)
Write-Host "  Test items: $($testItems.Count)"

foreach ($item in $testItems) {
    $value = Get-LisResultValue -TestCode $item.testCode
    Invoke-Json -Method Post -Url "$baseUrl/api/LISComplete/orders/enter-result" -Headers $headers -Body @{
        labTestItemId = $item.id
        result = $value
        notes = "auto"
    } | Out-Null
    Write-Host "    Result entered: $($item.testCode)=$value" -ForegroundColor Green
}

Invoke-Json -Method Post -Url "$baseUrl/api/LISComplete/orders/$($seededOrder.id)/preliminary-approve" -Headers $headers -Body @{
    technicianNote = "auto preliminary approve"
} | Out-Null
Write-Host "  Preliminary approve: OK" -ForegroundColor Green

Invoke-Json -Method Post -Url "$baseUrl/api/LISComplete/orders/$($seededOrder.id)/final-approve" -Headers $headers -Body @{
    doctorNote = "auto final approve"
} | Out-Null
Write-Host "  Final approve: OK" -ForegroundColor Green

Test-BinaryEndpoint -Name "LIS print result" -Url "$baseUrl/api/LISComplete/orders/$($seededOrder.id)/print" -Headers $headers | Out-Null

Write-Host "`n=== SIGNING ===" -ForegroundColor Cyan
$pendingDocs = Get-ResultItems (Invoke-Json -Method Get -Url "$baseUrl/api/digital-signature/pending" -Headers $headers)
Write-Host "  Pending signing docs: $(@($pendingDocs).Count)"
$stats = Invoke-Json -Method Get -Url "$baseUrl/api/central-signing/admin/statistics" -Headers $headers
Write-Host "  Central signing stats: tx=$($stats.totalTransactions), activeCert=$($stats.activeCertificates), activeUsers=$($stats.activeUsers)" -ForegroundColor Green

Write-Host "`n=== DONE ===" -ForegroundColor Green
