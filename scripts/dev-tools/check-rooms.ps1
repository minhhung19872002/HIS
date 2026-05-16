# Check rooms API
$baseUrl = "http://localhost:5106"

# 1. Login
$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.token

$headers = @{
    Authorization = "Bearer $token"
}

# 2. Get rooms with full response
Write-Host "=== Rooms Overview ===" -ForegroundColor Cyan
$roomsResponse = Invoke-RestMethod -Uri "$baseUrl/api/reception/rooms/overview" -Headers $headers
Write-Host "Full response:"
$roomsResponse | ConvertTo-Json -Depth 5

# 3. Get rooms list
Write-Host ""
Write-Host "=== Examination Rooms ===" -ForegroundColor Cyan
try {
    $examRooms = Invoke-RestMethod -Uri "$baseUrl/api/catalog/examination-rooms" -Headers $headers
    Write-Host "Examination rooms:"
    $examRooms | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Error getting examination rooms: $($_.Exception.Message)"
}

# 4. Check what endpoints exist
Write-Host ""
Write-Host "=== Try other room endpoints ===" -ForegroundColor Cyan
$endpoints = @(
    "/api/catalog/rooms",
    "/api/rooms",
    "/api/reception/rooms"
)
foreach ($ep in $endpoints) {
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl$ep" -Headers $headers
        Write-Host "$ep : Success"
        $result | ConvertTo-Json -Depth 2
    } catch {
        Write-Host "$ep : $($_.Exception.Response.StatusCode.value__)"
    }
}
