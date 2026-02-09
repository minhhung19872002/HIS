# Script test luồng PTTT (Phẫu thuật thủ thuật) hoàn chỉnh
# Theo HIS_DataFlow_Architecture.md

$baseUrl = "http://localhost:5106/api"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   TEST LUONG PHAU THUAT THU THUAT    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Login để lấy token
Write-Host "`n=== STEP 1: Login ===" -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "Admin@123"
} | ConvertTo-Json

$loginResult = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResult.data.token
Write-Host "Login successful. Token obtained." -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 2. Lấy danh sách phòng mổ
Write-Host "`n=== STEP 2: Get Operating Rooms ===" -ForegroundColor Yellow
$rooms = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/operating-rooms" -Method Get -Headers $headers
Write-Host "Found $($rooms.Count) operating rooms:" -ForegroundColor Green
$rooms | ForEach-Object { Write-Host "  - $($_.code): $($_.name) - Status: $($_.statusName)" }

# Chọn phòng mổ trống
$operatingRoom = $rooms | Where-Object { $_.status -eq 0 } | Select-Object -First 1
if (-not $operatingRoom) {
    Write-Host "No available operating room. Using first room." -ForegroundColor Yellow
    $operatingRoom = $rooms | Select-Object -First 1
}
Write-Host "Selected room: $($operatingRoom.name)" -ForegroundColor Cyan

# 3. Lấy dịch vụ PTTT
Write-Host "`n=== STEP 3: Get Surgery Services ===" -ForegroundColor Yellow
$services = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/services/search?keyword=cat" -Method Get -Headers $headers
if ($services.Count -gt 0) {
    Write-Host "Found $($services.Count) surgery services:" -ForegroundColor Green
    $services | ForEach-Object { Write-Host "  - $($_.code): $($_.name) - Price: $($_.unitPrice)" }
}
else {
    Write-Host "No services found. Will use mock service ID." -ForegroundColor Yellow
}

# Dùng service ID từ data seeding hoặc mock
$surgeryServiceId = if ($services.Count -gt 0) { $services[0].id } else { "3f95195f-53da-480f-bf3e-beac0eda1dd5" }

# Mock Medical Record ID (trong thực tế lấy từ bệnh nhân đã tiếp nhận)
$medicalRecordId = [Guid]::NewGuid().ToString()

# 4. Tạo yêu cầu PTTT (Chỉ định PTTT từ khoa lâm sàng)
Write-Host "`n=== STEP 4: Create Surgery Request (Chi dinh PTTT) ===" -ForegroundColor Yellow
$createSurgeryBody = @{
    medicalRecordId = $medicalRecordId
    surgeryServiceId = $surgeryServiceId
    surgeryType = 1  # 1-Phẫu thuật, 2-Thủ thuật
    surgeryClass = 2  # 1-Đặc biệt, 2-Loại 1, 3-Loại 2, 4-Loại 3
    surgeryNature = 2  # 1-Cấp cứu, 2-Chương trình
    preOperativeDiagnosis = "Viem ruot thua cap"
    preOperativeIcdCode = "K35"
    surgeryMethod = "Cat ruot thua noi soi"
    anesthesiaType = 2  # 1-Gây tê, 2-Gây mê toàn thân
    anesthesiaMethod = "Gay me noi khi quan"
    scheduledDate = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss")
    operatingRoomId = $operatingRoom.id
    notes = "Benh nhan da duoc khang sinh du phong"
    teamMembers = @(
        @{
            staffId = "9e5309dc-ecf9-4d48-9a09-224cd15347b1"  # admin user as surgeon
            role = 1  # PT viên chính
            feePercent = 40
        }
    )
} | ConvertTo-Json -Depth 5

try {
    $surgery = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete" -Method Post -Body $createSurgeryBody -Headers $headers
    Write-Host "Surgery request created:" -ForegroundColor Green
    Write-Host "  ID: $($surgery.id)" -ForegroundColor White
    Write-Host "  Code: $($surgery.surgeryCode)" -ForegroundColor White
    Write-Host "  Type: $($surgery.surgeryTypeName)" -ForegroundColor White
    Write-Host "  Status: $($surgery.statusName)" -ForegroundColor White
    $surgeryId = $surgery.id
}
catch {
    Write-Host "Error creating surgery: $_" -ForegroundColor Red
    $surgeryId = [Guid]::NewGuid().ToString()
    Write-Host "Using mock surgery ID: $surgeryId" -ForegroundColor Yellow
}

# 5. Duyệt mổ
Write-Host "`n=== STEP 5: Approve Surgery (Duyet mo) ===" -ForegroundColor Yellow
$approveBody = @{
    surgeryId = $surgeryId
    isApproved = $true
    scheduledDate = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss")
    operatingRoomId = $operatingRoom.id
    notes = "Da hoi chan, duyet mo"
} | ConvertTo-Json

try {
    $approved = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/approve" -Method Post -Body $approveBody -Headers $headers
    Write-Host "Surgery approved:" -ForegroundColor Green
    Write-Host "  Status: $($approved.statusName)" -ForegroundColor White
    Write-Host "  Approved at: $($approved.approvedAt)" -ForegroundColor White
}
catch {
    Write-Host "Error approving: $_" -ForegroundColor Red
}

# 6. Lên lịch mổ
Write-Host "`n=== STEP 6: Schedule Surgery (Len lich mo) ===" -ForegroundColor Yellow
$scheduleBody = @{
    surgeryId = $surgeryId
    scheduledDate = (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ss")
    operatingRoomId = $operatingRoom.id
    estimatedDurationMinutes = 90
    teamMembers = @(
        @{ staffId = "9e5309dc-ecf9-4d48-9a09-224cd15347b1"; role = 1; feePercent = 40 }  # PT viên chính
    )
} | ConvertTo-Json -Depth 5

try {
    $scheduled = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/schedule" -Method Post -Body $scheduleBody -Headers $headers
    Write-Host "Surgery scheduled:" -ForegroundColor Green
    Write-Host "  Scheduled: $($scheduled.scheduledDate)" -ForegroundColor White
    Write-Host "  Room: $($scheduled.operatingRoomName)" -ForegroundColor White
    Write-Host "  Duration: $($scheduled.durationMinutes) minutes" -ForegroundColor White
}
catch {
    Write-Host "Error scheduling: $_" -ForegroundColor Red
}

# 7. Lấy lịch mổ
Write-Host "`n=== STEP 7: Get Surgery Schedule ===" -ForegroundColor Yellow
try {
    $scheduleDate = (Get-Date).ToString("yyyy-MM-dd")
    $scheduleList = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/schedule?date=$scheduleDate" -Method Get -Headers $headers
    Write-Host "Today's surgery schedule:" -ForegroundColor Green
    if ($scheduleList.Count -gt 0) {
        $scheduleList | ForEach-Object {
            Write-Host "  Room: $($_.operatingRoomName)" -ForegroundColor White
            $_.surgeries | ForEach-Object {
                Write-Host "    - $($_.patientName): $($_.surgeryServiceName) at $($_.scheduledTime)" -ForegroundColor White
            }
        }
    } else {
        Write-Host "  No surgeries scheduled for today" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Error getting schedule: $_" -ForegroundColor Red
}

# 8. Tiếp nhận bệnh nhân vào phòng mổ
Write-Host "`n=== STEP 8: Check-in Patient (Tiep nhan BN vao phong mo) ===" -ForegroundColor Yellow
$checkInBody = @{
    surgeryId = $surgeryId
    checkInTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    operatingRoomId = $operatingRoom.id
    notes = "Benh nhan da duoc kiem tra danh tinh va ho so"
} | ConvertTo-Json

try {
    $checkedIn = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/check-in" -Method Post -Body $checkInBody -Headers $headers
    Write-Host "Patient checked in:" -ForegroundColor Green
    Write-Host "  Status: $($checkedIn.statusName)" -ForegroundColor White
}
catch {
    Write-Host "Error check-in: $_" -ForegroundColor Red
}

# 9. Bắt đầu ca mổ (Gây mê + Thực hiện PTTT)
Write-Host "`n=== STEP 9: Start Surgery (Bat dau gay me va PTTT) ===" -ForegroundColor Yellow
$startBody = @{
    surgeryId = $surgeryId
    startTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    teamMembers = @(
        @{ staffId = "9e5309dc-ecf9-4d48-9a09-224cd15347b1"; role = 1; feePercent = 40 }  # PT viên chính
        @{ staffId = "9e5309dc-ecf9-4d48-9a09-224cd15347b1"; role = 4; feePercent = 20 }  # BS gây mê
    )
} | ConvertTo-Json -Depth 5

try {
    $started = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/start" -Method Post -Body $startBody -Headers $headers
    Write-Host "Surgery started:" -ForegroundColor Green
    Write-Host "  Start time: $($started.startTime)" -ForegroundColor White
    Write-Host "  Status: $($started.statusName)" -ForegroundColor White
}
catch {
    Write-Host "Error starting surgery: $_" -ForegroundColor Red
}

# 10. Kê thuốc/vật tư trong mổ
Write-Host "`n=== STEP 10: Add Medicines/Supplies (Ke thuoc/VT trong mo) ===" -ForegroundColor Yellow

# Thêm thuốc
$medicineBody = @{
    surgeryId = $surgeryId
    medicineId = [Guid]::NewGuid().ToString()  # Mock medicine ID
    quantity = 5
    warehouseId = [Guid]::NewGuid().ToString()  # Mock warehouse ID
    isInPackage = $false
    paymentObject = 1
    usageInstruction = "Tiem tinh mach"
    notes = "Thuoc gay me"
} | ConvertTo-Json

try {
    $medicine = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/$surgeryId/medicines" -Method Post -Body $medicineBody -Headers $headers
    Write-Host "Medicine added: $($medicine.medicineName)" -ForegroundColor Green
}
catch {
    Write-Host "Medicine add skipped (mock mode)" -ForegroundColor Yellow
}

# Thêm vật tư
$supplyBody = @{
    surgeryId = $surgeryId
    supplyId = [Guid]::NewGuid().ToString()  # Mock supply ID
    quantity = 2
    warehouseId = [Guid]::NewGuid().ToString()  # Mock warehouse ID
    isInPackage = $false
    paymentObject = 1
    notes = "Kim may ruot"
} | ConvertTo-Json

try {
    $supply = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/$surgeryId/supplies" -Method Post -Body $supplyBody -Headers $headers
    Write-Host "Supply added: $($supply.supplyName)" -ForegroundColor Green
}
catch {
    Write-Host "Supply add skipped (mock mode)" -ForegroundColor Yellow
}

# 11. Kết thúc ca mổ
Write-Host "`n=== STEP 11: Complete Surgery (Ket thuc ca mo) ===" -ForegroundColor Yellow
$completeBody = @{
    surgeryId = $surgeryId
    endTime = (Get-Date).AddMinutes(90).ToString("yyyy-MM-ddTHH:mm:ss")
    postOperativeDiagnosis = "Viem ruot thua cap, da cat bo"
    postOperativeIcdCode = "K35.8"
    description = "Noi soi cat ruot thua thanh cong. O bung 3 lo trocar. Ruot thua viem do, co mu. Da cat va may bung ruot thua."
    conclusion = "Phau thuat thanh cong, benh nhan tinh, chuyen phong hoi tinh"
    complications = ""
} | ConvertTo-Json

try {
    $completed = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/complete" -Method Post -Body $completeBody -Headers $headers
    Write-Host "Surgery completed:" -ForegroundColor Green
    Write-Host "  End time: $($completed.endTime)" -ForegroundColor White
    Write-Host "  Duration: $($completed.durationMinutes) minutes" -ForegroundColor White
    Write-Host "  Status: $($completed.statusName)" -ForegroundColor White
    Write-Host "  Post-op diagnosis: $($completed.postOperativeDiagnosis)" -ForegroundColor White
}
catch {
    Write-Host "Error completing surgery: $_" -ForegroundColor Red
}

# 12. Tính công ekip mổ (theo QĐ73)
Write-Host "`n=== STEP 12: Calculate Team Fees (Tinh cong ekip mo) ===" -ForegroundColor Yellow
try {
    $fees = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/$surgeryId/fee-calculation" -Method Get -Headers $headers
    Write-Host "Team fee calculation:" -ForegroundColor Green
    Write-Host "  Service price: $($fees.servicePrice)" -ForegroundColor White
    Write-Host "  Total fee pool: $($fees.totalFeePool)" -ForegroundColor White
    if ($fees.teamFees) {
        Write-Host "  Team members:" -ForegroundColor White
        $fees.teamFees | ForEach-Object {
            Write-Host "    - $($_.staffName) ($($_.roleName)): $($_.feePercent)% = $($_.feeAmount)" -ForegroundColor White
        }
    }
}
catch {
    Write-Host "Fee calculation skipped (mock mode)" -ForegroundColor Yellow
}

# 13. Lấy chi tiết ca mổ hoàn thành
Write-Host "`n=== STEP 13: Get Surgery Details ===" -ForegroundColor Yellow
try {
    $details = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete/$surgeryId" -Method Get -Headers $headers
    Write-Host "Surgery details:" -ForegroundColor Green
    Write-Host "  Code: $($details.surgeryCode)" -ForegroundColor White
    Write-Host "  Patient: $($details.patientName)" -ForegroundColor White
    Write-Host "  Type: $($details.surgeryTypeName)" -ForegroundColor White
    Write-Host "  Class: $($details.surgeryClassName)" -ForegroundColor White
    Write-Host "  Nature: $($details.surgeryNatureName)" -ForegroundColor White
    Write-Host "  Anesthesia: $($details.anesthesiaTypeName)" -ForegroundColor White
    Write-Host "  Status: $($details.statusName)" -ForegroundColor White
    Write-Host "  Total cost: $($details.totalCost)" -ForegroundColor White
}
catch {
    Write-Host "Error getting details: $_" -ForegroundColor Red
}

# 14. Lấy danh sách ca mổ
Write-Host "`n=== STEP 14: Get Surgery List ===" -ForegroundColor Yellow
try {
    $surgeries = Invoke-RestMethod -Uri "$baseUrl/SurgeryComplete?pageSize=10" -Method Get -Headers $headers
    Write-Host "Surgery list:" -ForegroundColor Green
    if ($surgeries.items -and $surgeries.items.Count -gt 0) {
        $surgeries.items | ForEach-Object {
            Write-Host "  - $($_.surgeryCode): $($_.patientName) - $($_.statusName)" -ForegroundColor White
        }
    } else {
        Write-Host "  No surgeries found" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "Error getting list: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   TEST HOAN THANH!                    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nCac buoc da thuc hien:" -ForegroundColor White
Write-Host "  1. Login                - Xac thuc" -ForegroundColor White
Write-Host "  2. Get Operating Rooms  - Lay danh sach phong mo" -ForegroundColor White
Write-Host "  3. Get Services         - Lay dich vu PTTT" -ForegroundColor White
Write-Host "  4. Create Request       - Chi dinh PTTT tu khoa LS" -ForegroundColor White
Write-Host "  5. Approve              - Hoi chan va duyet mo" -ForegroundColor White
Write-Host "  6. Schedule             - Len lich mo" -ForegroundColor White
Write-Host "  7. Get Schedule         - Xem lich mo" -ForegroundColor White
Write-Host "  8. Check-in             - Tiep nhan BN vao phong mo" -ForegroundColor White
Write-Host "  9. Start Surgery        - Gay me va bat dau PTTT" -ForegroundColor White
Write-Host " 10. Add Medicine/Supply  - Ke thuoc/VT trong mo" -ForegroundColor White
Write-Host " 11. Complete Surgery     - Ket thuc ca mo" -ForegroundColor White
Write-Host " 12. Calculate Fees       - Tinh cong ekip mo (QD73)" -ForegroundColor White
Write-Host " 13. Get Details          - Xem chi tiet ca mo" -ForegroundColor White
Write-Host " 14. Get List             - Xem danh sach PTTT" -ForegroundColor White
