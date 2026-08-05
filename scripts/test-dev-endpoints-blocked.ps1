# Chung minh cac endpoint DEV/seed KHONG the goi duoc ngoai moi truong Development.
#
# Vi sao dang: nhung endpoint nay deu [AllowAnonymous] va deu GHI du lieu that
# (tao DicomStudy gia, gan StudyInstanceUID that cua Orthanc vong tron cho nhieu benh nhan,
# doi ngay toan bo phieu, seed hang loat). Giua chung va du lieu benh nhan chi co DUY NHAT
# 1 attribute [DevelopmentOnly]. Neu attribute do hong, hoac ai do them endpoint dev moi ma
# quen gan, thi bat ky ai tren mang cung ghi duoc vao HSBA. Vi vay phai co bang chung chay that.
#
# Cach do: bat 1 tien trinh API thu hai o moi truong Staging (khong phai Development, va cung
# khong phai Production nen khong vuong guard bat buoc doi secret) roi ban that vao tung route.
#
# Moi route kiem 2 lop:
#   GET  -> phai 405  : route CO TON TAI (chan 404 gia do go sai duong dan, khien test "pass" oan)
#   POST -> phai 404  : filter da chan
#
# Chay:
#   powershell -ExecutionPolicy Bypass -File .\scripts\test-dev-endpoints-blocked.ps1

$ErrorActionPreference = "Continue"

$apiProject = Join-Path $PSScriptRoot "..\backend\src\HIS.API"
$stagingPort= 5107
$stagingUrl = "http://localhost:$stagingPort"

$pass = 0; $fail = 0
function Ok($m)   { $script:pass++; Write-Host "  PASS  $m" -ForegroundColor Green }
function Bad($m)  { $script:fail++; Write-Host "  FAIL  $m" -ForegroundColor Red }
function Step($m) { Write-Host ""; Write-Host "=== $m ===" -ForegroundColor Cyan }

# Route dev/seed duoc QUET TU SOURCE, khong go tay. Ly do: danh sach go tay chi chung minh
# duoc nhung route da biet; endpoint dev THEM MOI ma quen [DevelopmentOnly] se khong ai bat.
# Quet theo quy uoc dat ten (duong dan chua "/dev/" hoac nam duoi controller seed) nen mot
# endpoint dev moi tu dong lot vao bai test, va se FAIL neu khong duoc chan.
function Get-DevRoutes([string]$controllersDir) {
    $files = Get-ChildItem $controllersDir -Filter *.cs -File
    $classRoutes = @{}

    # Vong 1: lay route o cap class. Partial class co the tach nhieu file, chi 1 file khai bao Route.
    foreach ($f in $files) {
        $text = Get-Content $f.FullName -Raw
        if ($text -notmatch '\[Route\("([^"]+)"\)\]') { continue }
        $route = $Matches[1]
        if ($text -match 'class\s+(\w+Controller)\b') {
            $className = $Matches[1]
            if ($route -match '\[controller\]') {
                $route = $route -replace '\[controller\]', ($className -replace 'Controller$', '')
            }
            if (-not $classRoutes.ContainsKey($className)) { $classRoutes[$className] = $route }
        }
    }

    # Vong 2: ghep route cap action, giu lai cai mang dau hieu dev/seed.
    $found = @()
    foreach ($f in $files) {
        $text = Get-Content $f.FullName -Raw
        if ($text -notmatch 'class\s+(\w+Controller)\b') { continue }
        $className = $Matches[1]
        if (-not $classRoutes.ContainsKey($className)) { continue }
        $base = $classRoutes[$className].Trim('/')

        foreach ($m in [regex]::Matches($text, '\[Http(Post|Put|Delete|Patch)\("([^"]*)"\)\]')) {
            $sub  = $m.Groups[2].Value.Trim('/')
            $full = if ($sub) { "$base/$sub" } else { $base }
            if ($full -match '(^|/)dev(/|$)' -or $full -match '/populate(/|$)') { $found += $full }
        }
    }
    return ($found | Sort-Object -Unique)
}

$devRoutes = Get-DevRoutes (Join-Path $PSScriptRoot "..\backend\src\HIS.API\Controllers")

function Http([string]$url, [string]$method, $headers) {
    try {
        $r = Invoke-WebRequest -Uri $url -Method $method -Headers $headers -TimeoutSec 30 -UseBasicParsing
        return [int]$r.StatusCode
    } catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode.value__ }
        return -1
    }
}

$proc = $null
try {
    # ----------------------------------------------------------------------------------------
    Step "0. Build va bat API o moi truong Staging (cong $stagingPort)"
    if (Get-NetTCPConnection -LocalPort $stagingPort -State Listen -ErrorAction SilentlyContinue) {
        Bad "cong $stagingPort dang bi chiem, dong tien trinh do truoc khi chay"; exit 1
    }

    $build = & dotnet build $apiProject --nologo -v q 2>&1
    if ($LASTEXITCODE -ne 0) { Bad "build HIS.API that bai:`n$($build | Out-String)"; exit 1 }
    Ok "build HIS.API sach"

    $dll = Join-Path $apiProject "bin\Debug\net9.0\HIS.API.dll"
    if (-not (Test-Path $dll)) { Bad "khong tim thay $dll"; exit 1 }

    # MPPS SCP bi tat: tien trinh dev dang giu cong 11114, hai instance khong the cung bind.
    $env:ASPNETCORE_ENVIRONMENT = "Staging"
    $env:ASPNETCORE_URLS        = $stagingUrl
    $env:PACS__MPPS__Enabled    = "false"
    $log    = Join-Path $env:TEMP "his-staging-guard.log"
    $errLog = Join-Path $env:TEMP "his-staging-guard.err.log"
    # WorkingDirectory phai la thu muc bin: chay thang DLL thi ContentRoot = CWD, dat sai cho
    # thi ung dung khong doc duoc appsettings.json va chet vi "JWT Key not configured".
    $binDir = Split-Path $dll -Parent
    $proc = Start-Process -FilePath "dotnet" -ArgumentList "`"$dll`"" -PassThru -NoNewWindow `
            -WorkingDirectory $binDir -RedirectStandardOutput $log -RedirectStandardError $errLog

    $deadline = (Get-Date).AddMinutes(3); $up = $false
    while ((Get-Date) -lt $deadline) {
        if ((Http "$stagingUrl/health" "Get" $null) -eq 200) { $up = $true; break }
        Start-Sleep -Seconds 5
    }
    if (-not $up) {
        Bad "API Staging khong len duoc"
        Get-Content $errLog -Tail 20 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
        exit 1
    }
    Ok "API Staging da len tren $stagingUrl"

    # ----------------------------------------------------------------------------------------
    Step "1. Xac nhan day dung la moi truong khong phai Development"
    # Neu no van la Development thi ca bai test vo nghia, nen phai chot truoc.
    $envLine = (Get-Content $log -ErrorAction SilentlyContinue | Where-Object { $_ -match "Hosting environment" } | Select-Object -First 1)
    if ($envLine -match "Staging") { Ok "moi truong = Staging ($($envLine.Trim()))" }
    elseif ($envLine) { Bad "moi truong khong nhu mong doi: $($envLine.Trim())" }
    else { Ok "khong doc duoc dong Hosting environment trong log, se doi chieu gian tiep qua ket qua chan" }

    # ----------------------------------------------------------------------------------------
    Step "2. Ung dung phai con SONG (khong phai 404 tat ca)"
    $token = $null
    try {
        $lb = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
        $token = (Invoke-RestMethod -Uri "$stagingUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $lb -TimeoutSec 60).data.token
    } catch { }
    if ($token) { Ok "dang nhap duoc tren instance Staging (ung dung hoat dong binh thuong)" }
    else { Bad "khong login duoc tren Staging, khong the phan biet 'bi chan' voi 'app chet'"; exit 1 }
    $H = @{ Authorization = "Bearer $token" }

    $normal = Http "$stagingUrl/api/RISComplete/modalities" "Get" $H
    if ($normal -eq 200) { Ok "endpoint nghiep vu binh thuong van tra 200 tren Staging" }
    else { Bad "endpoint nghiep vu tra $normal tren Staging, moi truong nay dang hong" }

    # Doi chung: route bia dat phai 404 -> chung to 404 la co that, khong phai app tra bua
    $bogus = Http "$stagingUrl/api/RISComplete/dev/khong-ton-tai-$(Get-Random)" "Get" $H
    if ($bogus -eq 404) { Ok "route bia dat tra 404 (404 la tin hieu that)" }
    else { Bad "route bia dat tra $bogus thay vi 404" }

    # ----------------------------------------------------------------------------------------
    Step "3. Tung endpoint DEV: route co that, va bi chan"
    if ($devRoutes.Count -eq 0) { Bad "khong quet duoc route dev nao tu source, bo quet dang hong"; }
    else { Ok "quet tu source duoc $($devRoutes.Count) route dev/seed" }
    foreach ($route in $devRoutes) {
        $url = "$stagingUrl/$route"
        $getCode  = Http $url "Get"  $H
        $postCode = Http $url "Post" $H

        if ($getCode -ne 405) {
            Bad "$route : GET tra $getCode (mong doi 405). Route co the da doi ten -> bai test nay dang kiem nham"
            continue
        }
        if ($postCode -eq 404) { Ok "$route : route co that (405) va POST bi chan (404)" }
        else { Bad "$route : POST tra $postCode, KHONG bi chan ngoai Development" }
    }
}
finally {
    Step "4. Don dep"
    if ($proc -and -not $proc.HasExited) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Ok "da dung instance Staging"
    }
    Remove-Item Env:\ASPNETCORE_ENVIRONMENT, Env:\ASPNETCORE_URLS, Env:\PACS__MPPS__Enabled -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "================ KET QUA ================" -ForegroundColor Yellow
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red } else { Write-Host "  FAIL: 0" -ForegroundColor Green }
if ($fail -gt 0) { exit 1 } else { exit 0 }
