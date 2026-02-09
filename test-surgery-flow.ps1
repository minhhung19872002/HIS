$TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjllNTMwOWRjLWVjZjktNGQ0OC05YTA5LTIyNGNkMTUzNDdiMSIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL25hbWUiOiJhZG1pbiIsImZ1bGxOYW1lIjoiQWRtaW5pc3RyYXRvciIsImVtcGxveWVlQ29kZSI6IiIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlF1w6HCusKjbiB0csOhwrvigLkgaMOhwrvigKEgdGjDocK74oCYbmciLCJwZXJtaXNzaW9uIjpbIkFETUlOX1JFUE9SVCIsIlJFQ0VQVElPTl9FRElUIiwiT1BEX09SREVSIiwiQklMTElOR19SRUZVTkQiLCJMQUJfVklFVyIsIk9QRF9QUkVTQ1JJQkUiLCJSRUNFUFRJT05fQ1JFQVRFIiwiT1BEX0VYQU1JTkUiLCJCSUxMSU5HX1ZJRVciLCJMQUJfUkVTVUxUIiwiQURNSU5fVVNFUiIsIkFETUlOX0NBVEFMT0ciLCJPUERfVklFVyIsIklQRF9BRE1JVCIsIlBIQVJNQUNZX0lNUE9SVCIsIklQRF9ESVNDSEFSR0UiLCJCSUxMSU5HX0NPTExFQ1QiLCJJUERfVklFVyIsIlJFQ0VQVElPTl9ERUxFVEUiLCJSRUNFUFRJT05fVklFVyIsIlBIQVJNQUNZX0RJU1BFTlNFIiwiUEhBUk1BQ1lfVklFVyJdLCJleHAiOjE3NzAzNjg5NDQsImlzcyI6IkhJUy5BUEkiLCJhdWQiOiJISVMuQ2xpZW50In0.beXLkCqjyXkecqTTjCf3hl9KPB3UKSoaACdoWL83wKI"

$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}

Write-Host "=== Test Surgery Flow ==="

# Step 1: Get existing surgeries
Write-Host "`n=== 1. Get Surgeries List ===" -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "http://localhost:5106/api/SurgeryComplete?page=1&pageSize=5" -Headers $headers -Method Get
Write-Host "Found $($response.totalCount) surgeries"
$response.items | ForEach-Object { Write-Host "- $($_.surgeryCode): $($_.patientName) - $($_.statusName)" }

# Step 2: Get Operating Rooms
Write-Host "`n=== 2. Get Operating Rooms ===" -ForegroundColor Cyan
$rooms = Invoke-RestMethod -Uri "http://localhost:5106/api/SurgeryComplete/operating-rooms" -Headers $headers -Method Get
$rooms | ForEach-Object { Write-Host "- $($_.code): $($_.name) - $($_.statusName)" }

# Step 3: Create new surgery request
Write-Host "`n=== 3. Create Surgery Request ===" -ForegroundColor Cyan
$createDto = @{
    medicalRecordId = [Guid]::NewGuid().ToString()
    surgeryServiceId = [Guid]::NewGuid().ToString()
    surgeryType = 1
    surgeryClass = 2
    surgeryNature = 2
    preOperativeDiagnosis = "Test Appendicitis"
    preOperativeIcdCode = "K35"
    anesthesiaType = 2
} | ConvertTo-Json

try {
    $newSurgery = Invoke-RestMethod -Uri "http://localhost:5106/api/SurgeryComplete" -Headers $headers -Method Post -Body $createDto
    Write-Host "Created surgery: $($newSurgery.surgeryCode)" -ForegroundColor Green
    $surgeryId = $newSurgery.id
} catch {
    Write-Host "Error creating surgery: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.ErrorDetails.Message
}

# Step 4: Approve surgery (use existing pending surgery)
Write-Host "`n=== 4. Approve Surgery ===" -ForegroundColor Cyan
$pendingSurgery = $response.items | Where-Object { $_.status -eq 0 } | Select-Object -First 1
if ($pendingSurgery) {
    $approveDto = @{
        surgeryId = $pendingSurgery.id
        isApproved = $true
        scheduledDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddT08:00:00")
        operatingRoomId = $rooms[0].id
    } | ConvertTo-Json

    try {
        $approved = Invoke-RestMethod -Uri "http://localhost:5106/api/SurgeryComplete/approve" -Headers $headers -Method Post -Body $approveDto
        Write-Host "Approved surgery: $($approved.surgeryCode) - New status: $($approved.statusName)" -ForegroundColor Green
    } catch {
        Write-Host "Error approving surgery: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "No pending surgery to approve" -ForegroundColor Yellow
}

# Step 5: Schedule surgery
Write-Host "`n=== 5. Schedule Surgery ===" -ForegroundColor Cyan
$approvedSurgery = $response.items | Where-Object { $_.status -eq 1 } | Select-Object -First 1
if ($approvedSurgery) {
    $scheduleDto = @{
        surgeryId = $approvedSurgery.id
        scheduledDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddT09:00:00")
        operatingRoomId = $rooms[0].id
        estimatedDurationMinutes = 120
    } | ConvertTo-Json

    try {
        $scheduled = Invoke-RestMethod -Uri "http://localhost:5106/api/SurgeryComplete/schedule" -Headers $headers -Method Post -Body $scheduleDto
        Write-Host "Scheduled surgery: $($scheduled.surgeryCode) at $($scheduled.scheduledDate)" -ForegroundColor Green
    } catch {
        Write-Host "Error scheduling surgery: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "No approved surgery to schedule" -ForegroundColor Yellow
}

# Step 6: Start surgery
Write-Host "`n=== 6. Start Surgery ===" -ForegroundColor Cyan
$scheduledSurgery = $response.items | Where-Object { $_.status -eq 2 } | Select-Object -First 1
if ($scheduledSurgery) {
    $startDto = @{
        surgeryId = $scheduledSurgery.id
        startTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    } | ConvertTo-Json

    try {
        $started = Invoke-RestMethod -Uri "http://localhost:5106/api/SurgeryComplete/start" -Headers $headers -Method Post -Body $startDto
        Write-Host "Started surgery: $($started.surgeryCode) - New status: $($started.statusName)" -ForegroundColor Green
    } catch {
        Write-Host "Error starting surgery: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "No scheduled surgery to start" -ForegroundColor Yellow
}

# Step 7: Complete surgery
Write-Host "`n=== 7. Complete Surgery ===" -ForegroundColor Cyan
$inProgressSurgery = $response.items | Where-Object { $_.status -eq 3 } | Select-Object -First 1
if ($inProgressSurgery) {
    $completeDto = @{
        surgeryId = $inProgressSurgery.id
        endTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        postOperativeDiagnosis = "Post-op diagnosis: Appendicitis removed successfully"
        postOperativeIcdCode = "K35.8"
        conclusion = "Surgery completed successfully"
    } | ConvertTo-Json

    try {
        $completed = Invoke-RestMethod -Uri "http://localhost:5106/api/SurgeryComplete/complete" -Headers $headers -Method Post -Body $completeDto
        Write-Host "Completed surgery: $($completed.surgeryCode) - New status: $($completed.statusName)" -ForegroundColor Green
    } catch {
        Write-Host "Error completing surgery: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "No in-progress surgery to complete" -ForegroundColor Yellow
}

Write-Host "`n=== Surgery Flow Test Completed ===" -ForegroundColor Green
