# Test script template for HIS API module: <MODULE_NAME>
# Usage: powershell -ExecutionPolicy Bypass -File .\test-<module>.ps1
# Prereq: backend running at http://localhost:5106

$baseUrl = "http://localhost:5106"
$testMarker = "[AUTO-<MODULE>]"

# === Helper: normalize HIS API response wrappers (data | items | value | array) ===
function Get-ResultItems($response) {
    if ($null -eq $response) { return @() }
    if ($response -is [System.Array]) { return $response }
    if ($response.PSObject.Properties.Name -contains "data" -and $null -ne $response.data) { return $response.data }
    if ($response.PSObject.Properties.Name -contains "items" -and $null -ne $response.items) { return $response.items }
    if ($response.PSObject.Properties.Name -contains "value" -and $null -ne $response.value) { return $response.value }
    return @($response)
}

# === 1. LOGIN ===
Write-Host "=== 1. LOGIN ===" -ForegroundColor Cyan
$loginBody = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.data.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "Got token: $($token.Substring(0,20))..." -ForegroundColor Green
} catch {
    Write-Host "Login FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# === 2. <STEP NAME> ===
Write-Host ""
Write-Host "=== 2. <STEP NAME> ===" -ForegroundColor Cyan
try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/api/<module>/<endpoint>" -Headers $headers
    $items = Get-ResultItems $resp
    Write-Host "Found $($items.Count) records" -ForegroundColor Green
    $items | Select-Object -First 3 | ForEach-Object { Write-Host "  - $($_.<displayField>)" }
    # Save first ID for next step:
    if ($items.Count -gt 0) { $global:firstId = $items[0].id }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# === 3. <CREATE STEP> (POST with body) ===
Write-Host ""
Write-Host "=== 3. <CREATE STEP> ===" -ForegroundColor Cyan
$timestamp = Get-Date -Format "HHmmss"
$body = @{
    # Build DTO body matching backend expected shape
    field1 = "$testMarker Item $timestamp"
    field2 = 1
    # Nested object example:
    # nested = @{ subField = "value" }
} | ConvertTo-Json -Depth 5

try {
    $resp = Invoke-RestMethod -Uri "$baseUrl/api/<module>/<create-endpoint>" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    $data = if ($resp.PSObject.Properties.Name -contains "data" -and $null -ne $resp.data) { $resp.data } else { $resp }
    Write-Host "SUCCESS: created Id=$($data.id)" -ForegroundColor Green
    $global:createdId = $data.id
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed }
}

# === N. <FINAL STEP> ===
# ... add more steps following the same try/catch + Get-ResultItems pattern ...

Write-Host ""
Write-Host "=== <MODULE_NAME> TEST COMPLETE ===" -ForegroundColor Green
