# Show real data in the system
$baseUrl = "http://localhost:5106"
$login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body (ConvertTo-Json @{username='admin';password='Admin@123'}) -ContentType 'application/json'
$headers = @{Authorization = "Bearer $($login.data.token)"}

Write-Host "=== DATA THUC TE TRONG HE THONG ===" -ForegroundColor Green

Write-Host "`n--- BENH NHAN DANG KY HOM NAY ---" -ForegroundColor Yellow
$admissions = Invoke-RestMethod -Uri "$baseUrl/api/reception/admissions/today" -Headers $headers
$admissions.data | Format-Table -Property patientCode, patientName, roomName -AutoSize
Write-Host "TONG: $($admissions.data.Count) benh nhan" -ForegroundColor Cyan

Write-Host "`n--- BENH NHAN CHO KHAM (PHONG NOI 1) ---" -ForegroundColor Yellow
$patients = Invoke-RestMethod -Uri "$baseUrl/api/examination/room/bf6b00e9-578b-47fb-aff8-af25fb35a794/patients" -Headers $headers
$patients.data | Format-Table -Property patientCode, patientName, status -AutoSize
Write-Host "TONG: $($patients.data.Count) benh nhan" -ForegroundColor Cyan

Write-Host "`n--- PHONG MO ---" -ForegroundColor Yellow
$or = Invoke-RestMethod -Uri "$baseUrl/api/SurgeryComplete/operating-rooms" -Headers $headers
$or.data | Format-Table -Property name, status -AutoSize

Write-Host "`n=== HUONG DAN XEM TREN BROWSER ===" -ForegroundColor Green
Write-Host "Mo browser tai: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  - http://localhost:3001/reception : Xem benh nhan da dang ky"
Write-Host "  - http://localhost:3001/opd       : Xem benh nhan cho kham (chon phong)"
Write-Host "  - http://localhost:3001/surgery   : Xem yeu cau phau thuat"
Write-Host "  - http://localhost:3001/billing   : Xem thanh toan"
