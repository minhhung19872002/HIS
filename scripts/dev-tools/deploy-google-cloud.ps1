[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [string]$Region = "asia-southeast1",
    [string]$Network = "default",
    [string]$Subnet = "default",
    [string]$ArtifactRepository = "his",
    [string]$ServiceName = "his-api",
    [string]$SqlInstanceName = "his-sql",
    [string]$DatabaseName = "HIS",
    [string]$SqlDatabaseVersion = "SQLSERVER_2022_STANDARD",
    [int]$SqlCpu = 1,
    [string]$SqlMemory = "3840MB",
    [string]$AllocatedRangeName = "google-managed-services-default",
    [string]$BucketName,
    [string]$BackupFile = "",
    [string]$ImageTag,

    [Parameter(Mandatory = $true)]
    [string]$FrontendOrigins,

    [Parameter(Mandatory = $true)]
    [string]$JwtKey,

    [Parameter(Mandatory = $true)]
    [string]$SqlPassword,

    [switch]$SkipPrivateServiceAccess,
    [switch]$SkipSqlImport,
    [switch]$SkipCloudRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}
$script:GCloudCommand = $null

function Resolve-GCloudCommand {
    $fallbacks = @(
        (Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"),
        "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        "C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
    )

    foreach ($fallback in $fallbacks) {
        if (Test-Path -LiteralPath $fallback) {
            return $fallback
        }
    }

    $command = Get-Command gcloud -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw "Missing required command 'gcloud'. Install it first."
}

function Invoke-GCloud {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)

    Write-Host ">>> gcloud $($Args -join ' ')" -ForegroundColor Cyan
    & $script:GCloudCommand @Args
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud command failed: gcloud $($Args -join ' ')"
    }
}

function Get-GCloudText {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $script:GCloudCommand @Args 2>$null
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($LASTEXITCODE -ne 0) {
        return ""
    }

    return ($output | Out-String).Trim()
}

function Get-GCloudJson {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)

    $output = & $script:GCloudCommand @Args
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud command failed: gcloud $($Args -join ' ')"
    }

    $text = ($output | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    return $text | ConvertFrom-Json
}

function Ensure-ArtifactRepository {
    $existing = Get-GCloudText artifacts repositories describe $ArtifactRepository --location=$Region --project=$ProjectId "--format=value(name)"
    if ($existing) {
        return
    }

    Invoke-GCloud artifacts repositories create $ArtifactRepository `
        --project=$ProjectId `
        --location=$Region `
        --repository-format=docker `
        --description="HIS backend images"
}

function Ensure-PrivateServiceAccess {
    if ($SkipPrivateServiceAccess) {
        Write-Host "Skipping private services access setup." -ForegroundColor Yellow
        return
    }

    $range = Get-GCloudText compute addresses describe $AllocatedRangeName --global --project=$ProjectId "--format=value(name)"
    if (-not $range) {
        Invoke-GCloud compute addresses create $AllocatedRangeName `
            --project=$ProjectId `
            --global `
            --prefix-length=16 `
            --purpose=VPC_PEERING `
            --network=$Network
    }

    $peerings = @(Get-GCloudJson services vpc-peerings list --project=$ProjectId --network=$Network --service=servicenetworking.googleapis.com --format=json)
    $hasPeering = $false

    foreach ($peering in $peerings) {
        if ($null -eq $peering) {
            continue
        }

        $hasRangesProperty = $peering.PSObject.Properties.Name -contains "reservedPeeringRanges"
        if ($hasRangesProperty -and $null -ne $peering.reservedPeeringRanges -and $peering.reservedPeeringRanges -contains $AllocatedRangeName) {
            $hasPeering = $true
            break
        }
    }

    if (-not $hasPeering) {
        Invoke-GCloud services vpc-peerings connect `
            --project=$ProjectId `
            --network=$Network `
            --service=servicenetworking.googleapis.com `
            --ranges=$AllocatedRangeName
    }
}

function Ensure-SqlInstance {
    $existing = Get-GCloudText sql instances describe $SqlInstanceName --project=$ProjectId "--format=value(name)"
    if ($existing) {
        return
    }

    Invoke-GCloud sql instances create $SqlInstanceName `
        --project=$ProjectId `
        --database-version=$SqlDatabaseVersion `
        --edition=ENTERPRISE `
        --region=$Region `
        --cpu=$SqlCpu `
        --memory=$SqlMemory `
        --root-password=$SqlPassword `
        --network=projects/$ProjectId/global/networks/$Network `
        --no-assign-ip `
        --enforce-new-sql-network-architecture
}

function Ensure-SqlPassword {
    Invoke-GCloud sql users set-password sqlserver `
        --project=$ProjectId `
        --instance=$SqlInstanceName `
        --password=$SqlPassword
}

function Ensure-Bucket {
    $existing = Get-GCloudText storage buckets describe "gs://$BucketName" --project=$ProjectId "--format=value(name)"
    if ($existing) {
        return
    }

    Invoke-GCloud storage buckets create "gs://$BucketName" --project=$ProjectId --location=$Region
}

function Import-Backup {
    if ($SkipSqlImport) {
        Write-Host "Skipping SQL import." -ForegroundColor Yellow
        return
    }

    if (-not (Test-Path -LiteralPath $BackupFile)) {
        throw "Backup file not found at '$BackupFile'."
    }

    Ensure-Bucket

    $backupName = [System.IO.Path]::GetFileName($BackupFile)
    $backupObject = "gs://$BucketName/$backupName"

    Invoke-GCloud storage cp $BackupFile $backupObject --project=$ProjectId

    $instance = Get-GCloudJson sql instances describe $SqlInstanceName --project=$ProjectId --format=json
    $serviceAccountEmail = $instance.serviceAccountEmailAddress
    if (-not $serviceAccountEmail) {
        throw "Cloud SQL service account email was not found."
    }

    Invoke-GCloud storage buckets add-iam-policy-binding "gs://$BucketName" `
        --project=$ProjectId `
        --member="serviceAccount:$serviceAccountEmail" `
        --role=roles/storage.objectViewer

    Invoke-GCloud sql import bak $SqlInstanceName $backupObject `
        --project=$ProjectId `
        --database=$DatabaseName `
        --quiet
}

function Build-Image {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $imageUri = "$Region-docker.pkg.dev/$ProjectId/$ArtifactRepository/${ServiceName}:$ImageTag"
    Push-Location $RepoRoot
    try {
        $null = Invoke-GCloud builds submit backend `
            --project=$ProjectId `
            --config=backend/cloudbuild.yaml `
            --substitutions="_IMAGE_URI=$imageUri"
    }
    finally {
        Pop-Location
    }

    return [string]$imageUri
}

function Get-PrivateSqlIp {
    $instance = Get-GCloudJson sql instances describe $SqlInstanceName --project=$ProjectId --format=json
    $privateIp = @($instance.ipAddresses | Where-Object { $_.type -eq "PRIVATE" } | Select-Object -First 1 -ExpandProperty ipAddress)
    if (-not $privateIp) {
        throw "No private IP found on Cloud SQL instance '$SqlInstanceName'."
    }

    return $privateIp
}

function Deploy-CloudRun {
    param(
        [Parameter(Mandatory = $true)][string]$ImageUri,
        [Parameter(Mandatory = $true)][string]$SqlPrivateIp,
        [Parameter(Mandatory = $true)][string]$RepoRoot
    )

    if ($SkipCloudRun) {
        Write-Host "Skipping Cloud Run deployment." -ForegroundColor Yellow
        return ""
    }

    $connectionString = "Server=tcp:$SqlPrivateIp,1433;Database=$DatabaseName;User ID=sqlserver;Password=$SqlPassword;Encrypt=False;TrustServerCertificate=True;MultipleActiveResultSets=true;Connection Timeout=30;"

    $envFile = Join-Path $env:TEMP ("his-cloudrun-env-{0}.yaml" -f ([System.Guid]::NewGuid().ToString("N")))
    $envVars = [ordered]@{
        ASPNETCORE_ENVIRONMENT             = "Production"
        ConnectionStrings__DefaultConnection = $connectionString
        CorsOriginsCsv                    = $FrontendOrigins
        Jwt__Key                          = $JwtKey
        Jwt__Issuer                       = "HIS.API"
        Jwt__Audience                     = "HIS.Client"
        PACS__Enabled                     = "false"
        HL7__Enabled                      = "false"
        BhxhGateway__UseMock              = "true"
    }

    $yamlLines = foreach ($entry in $envVars.GetEnumerator()) {
        $escapedValue = ($entry.Value.ToString()).Replace("'", "''")
        "{0}: '{1}'" -f $entry.Key, $escapedValue
    }
    Set-Content -LiteralPath $envFile -Value $yamlLines -Encoding UTF8

    $startupProbe = "--startup-probe=httpGet.path=/health/ready,httpGet.port=8080,initialDelaySeconds=10,periodSeconds=10,timeoutSeconds=5,failureThreshold=18"

    try {
        Push-Location $RepoRoot
        try {
            Invoke-GCloud run deploy $ServiceName `
                --project=$ProjectId `
                --region=$Region `
                --image=$ImageUri `
                --allow-unauthenticated `
                --port=8080 `
                --cpu=1 `
                --memory=2Gi `
                --concurrency=80 `
                --timeout=300 `
                --min-instances=0 `
                --max-instances=2 `
                --network=$Network `
                --subnet=$Subnet `
                --vpc-egress=private-ranges-only `
                --env-vars-file=$envFile `
                $startupProbe
        }
        finally {
            Pop-Location
        }
    }
    finally {
        Remove-Item -LiteralPath $envFile -ErrorAction SilentlyContinue
    }

    return (Get-GCloudText run services describe $ServiceName --project=$ProjectId --region=$Region "--format=value(status.url)")
}

$script:GCloudCommand = Resolve-GCloudCommand

$activeAccount = Get-GCloudText auth list "--filter=status:ACTIVE" "--format=value(account)"

if (-not $activeAccount) {
    throw "No active gcloud account found. Run 'gcloud auth login' and 'gcloud config set project $ProjectId' first."
}

if ($JwtKey.Length -lt 32) {
    throw "JwtKey must be at least 32 characters."
}

if (-not $BucketName) {
    $BucketName = "$ProjectId-his-backups"
}

if (-not $ImageTag) {
    $ImageTag = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if ([string]::IsNullOrWhiteSpace($BackupFile)) {
    $BackupFile = Join-Path $repoRoot "backup\HIS.bak"
}

Invoke-GCloud config set project $ProjectId
Invoke-GCloud config set run/region $Region

Invoke-GCloud services enable `
    run.googleapis.com `
    sqladmin.googleapis.com `
    artifactregistry.googleapis.com `
    cloudbuild.googleapis.com `
    compute.googleapis.com `
    servicenetworking.googleapis.com `
    secretmanager.googleapis.com

Ensure-ArtifactRepository
Ensure-PrivateServiceAccess
Ensure-SqlInstance
Ensure-SqlPassword
Import-Backup

$imageUri = Build-Image -RepoRoot $repoRoot
$sqlPrivateIp = Get-PrivateSqlIp
$serviceUrl = Deploy-CloudRun -ImageUri $imageUri -SqlPrivateIp $sqlPrivateIp -RepoRoot $repoRoot

Write-Host ""
Write-Host "Deployment summary" -ForegroundColor Green
Write-Host "Project:        $ProjectId"
Write-Host "Region:         $Region"
Write-Host "Cloud SQL:      $SqlInstanceName"
Write-Host "Cloud SQL IP:   $sqlPrivateIp"
Write-Host "Image:          $imageUri"
if ($serviceUrl) {
    Write-Host "Cloud Run URL:  $serviceUrl"
}

if ($serviceUrl) {
    Write-Host ""
    Write-Host "Set these Vercel environment variables:" -ForegroundColor Green
    Write-Host "HIS_BACKEND_URL=$serviceUrl"
    Write-Host "VITE_REALTIME_URL=$serviceUrl"
    Write-Host "Leave VITE_API_URL unset if you want Vercel to keep proxying /api."
}
