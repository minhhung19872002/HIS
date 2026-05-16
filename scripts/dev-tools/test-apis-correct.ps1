$baseUrl = "http://localhost:5106"
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body (ConvertTo-Json @{username='admin';password='Admin@123'}) -ContentType 'application/json'
$token = $loginResponse.data.token
$headers = @{Authorization = "Bearer $token"}
$roomId = "bf6b00e9-578b-47fb-aff8-af25fb35a794"

Write-Host "=== COMPREHENSIVE API TEST ===" -ForegroundColor Green

# Reception
Write-Host "`n--- RECEPTION ---" -ForegroundColor Yellow
Write-Host "1. /api/reception/rooms/overview" -ForegroundColor Cyan
$r = Invoke-RestMethod -Uri "$baseUrl/api/reception/rooms/overview" -Headers $headers
Write-Host "   OK: $($r.data.Count) rooms"

Write-Host "2. /api/reception/admissions/today" -ForegroundColor Cyan
$r = Invoke-RestMethod -Uri "$baseUrl/api/reception/admissions/today" -Headers $headers
Write-Host "   OK: $($r.data.Count) admissions"

# OPD/Examination
Write-Host "`n--- EXAMINATION/OPD ---" -ForegroundColor Yellow
Write-Host "3. /api/examination/room/{roomId}/patients" -ForegroundColor Cyan
try { $r = Invoke-RestMethod -Uri "$baseUrl/api/examination/room/$roomId/patients" -Headers $headers; Write-Host "   OK: $($r.data.Count) patients" } catch { Write-Host "   Error" -ForegroundColor Red }

Write-Host "4. /api/examination/waiting-room/{roomId}" -ForegroundColor Cyan
try { $r = Invoke-RestMethod -Uri "$baseUrl/api/examination/waiting-room/$roomId" -Headers $headers; Write-Host "   OK: $($r.data.Count) waiting" } catch { Write-Host "   Error" -ForegroundColor Red }

# Billing  
Write-Host "`n--- BILLING ---" -ForegroundColor Yellow
Write-Host "5. /api/BillingComplete/patients/search" -ForegroundColor Cyan
try { $r = Invoke-RestMethod -Uri "$baseUrl/api/BillingComplete/patients/search?keyword=Test" -Headers $headers; Write-Host "   OK: Found patients" } catch { Write-Host "   Error" -ForegroundColor Red }

Write-Host "6. /api/BillingComplete/cash-books" -ForegroundColor Cyan
try { $r = Invoke-RestMethod -Uri "$baseUrl/api/BillingComplete/cash-books" -Headers $headers; Write-Host "   OK: $($r.data.Count) cash books" } catch { Write-Host "   Error" -ForegroundColor Red }

# IPD
Write-Host "`n--- INPATIENT ---" -ForegroundColor Yellow
Write-Host "7. /api/inpatient/patients" -ForegroundColor Cyan
try { $r = Invoke-RestMethod -Uri "$baseUrl/api/inpatient/patients" -Headers $headers; Write-Host "   OK: $($r.data.Count) patients" } catch { Write-Host "   Error" -ForegroundColor Red }

# Surgery
Write-Host "`n--- SURGERY ---" -ForegroundColor Yellow
Write-Host "8. /api/SurgeryComplete/operating-rooms" -ForegroundColor Cyan
try { $r = Invoke-RestMethod -Uri "$baseUrl/api/SurgeryComplete/operating-rooms" -Headers $headers; Write-Host "   OK: $($r.data.Count) rooms" } catch { Write-Host "   Error" -ForegroundColor Red }

Write-Host "9. /api/SurgeryComplete/services/search" -ForegroundColor Cyan
try { $r = Invoke-RestMethod -Uri "$baseUrl/api/SurgeryComplete/services/search?keyword=phau" -Headers $headers; Write-Host "   OK: $($r.data.Count) services" } catch { Write-Host "   Error" -ForegroundColor Red }

Write-Host "`n=== TESTS COMPLETE ===" -ForegroundColor Green
