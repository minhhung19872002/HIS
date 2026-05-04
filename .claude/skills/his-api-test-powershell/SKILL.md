---
name: his-api-test-powershell
description: Use this skill when writing or modifying PowerShell test scripts (`test-*.ps1`) that exercise the HIS backend API at `localhost:5106`. Triggers include creating tests for Reception/OPD/IPD/Surgery/Billing/Pharmacy/Ward/Payment modules, login với admin/Admin@123, gọi API có Bearer JWT, hoặc parse response wrapper `data`/`items`/`value`.
type: project
---

# HIS API Test (PowerShell)

Skill này chuẩn hoá cách viết script test API của HIS bằng PowerShell. Project hiện đã có 21+ file `test-*.ps1` cùng pattern — mỗi script mới phải tuân theo để chạy được trên Windows + tận dụng helper sẵn có.

## Khi nào dùng

- Tạo file mới `test-<module>.ps1` để smoke-test API sau khi thêm endpoint.
- Sửa script hiện có (`test-reception-full.ps1`, `test-ipd-flow.ps1`, `test-billing.ps1`, ...) khi DTO hoặc route thay đổi.
- Viết E2E flow nhiều bước (đăng ký bệnh nhân → khám → kê đơn → thanh toán) chạy nhanh ngoài Cypress/Playwright.

## Quy trình chuẩn

1. **Đọc skeleton**: `references/test-script-template.ps1`. Copy nguyên skeleton, đổi `<MODULE>` và các bước test.
2. **Xác định endpoint**: tra `references/api-endpoints-cheatsheet.md` xem route + DTO đã verify. Nếu chưa có → đọc controller tương ứng trong `backend/src/HIS.API/Controllers/`.
3. **Đặt file** ở root project: `C:\Source\HIS\test-<module>-<scenario>.ps1`. KHÔNG đặt vào subfolder để giữ convention với 21 script hiện có.
4. **Chạy thử**: `powershell -ExecutionPolicy Bypass -File .\test-<module>.ps1` (yêu cầu backend đang chạy ở `localhost:5106`).
5. **Output format**: mỗi bước là 1 section `=== N. TÊN ===` màu Cyan, kết quả Green, lỗi Red. Đừng tự sáng tạo format khác.

## Convention bắt buộc

### Login + headers
```powershell
$baseUrl = "http://localhost:5106"
$loginBody = @{ username = "admin"; password = "Admin@123" } | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $loginResponse.data.token
$headers = @{ Authorization = "Bearer $token" }
```

### Helper `Get-ResultItems` (BẮT BUỘC copy y nguyên)
HIS API trả wrapper khác nhau giữa các endpoint: có endpoint trả `{ data: [...] }`, có endpoint `{ items: [...] }`, có endpoint `{ value: [...] }`, một số endpoint trả mảng trực tiếp. Helper này gom hết về 1 dạng:

```powershell
function Get-ResultItems($response) {
    if ($null -eq $response) { return @() }
    if ($response -is [System.Array]) { return $response }
    if ($response.PSObject.Properties.Name -contains "data" -and $null -ne $response.data) { return $response.data }
    if ($response.PSObject.Properties.Name -contains "items" -and $null -ne $response.items) { return $response.items }
    if ($response.PSObject.Properties.Name -contains "value" -and $null -ne $response.value) { return $response.value }
    return @($response)
}
```

### Chain steps qua `$global:`
Khi step N cần ID từ step N-1 → lưu vào `$global:`:
```powershell
$global:newPatientId = $regData.patientId
$global:newAdmissionId = $regData.id
```

### Test marker để dễ cleanup
```powershell
$testMarker = "[AUTO-REG]"
$patient.fullName = "$testMarker Patient $timestamp"
```
Tên có prefix `[AUTO-REG]` để sau dễ filter/xóa data test bằng `DELETE FROM Patients WHERE FullName LIKE '%[AUTO-REG]%'`.

### Try/catch mỗi step
KHÔNG để 1 step fail làm crash cả script. Mỗi `Invoke-RestMethod` bọc trong:
```powershell
try {
    $resp = Invoke-RestMethod -Uri "..." -Headers $headers
    Write-Host "SUCCESS" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
```

### Format section
```powershell
Write-Host ""
Write-Host "=== 3. REGISTER NEW PATIENT (Dang ky vien phi) ===" -ForegroundColor Cyan
```
- Tiêu đề tiếng Anh + chú thích tiếng Việt không dấu trong ngoặc (vì console Windows hay vỡ Unicode).
- Cuối script in `=== <MODULE> TEST COMPLETE ===` Green.

## Pitfalls

- **Đừng dùng `$response.data` trực tiếp** — endpoint khác wrapper khác → dùng `Get-ResultItems`.
- **Đừng hard-code GUID** trừ khi đang reference master data đã seed (room ID, department ID). Khi cần ID động → query trước rồi pick item đầu tiên.
- **Console Unicode**: Write-Host với ký tự có dấu thường vỡ trên Windows → dùng tiếng Việt KHÔNG dấu trong log (`Dang ky` thay vì `Đăng ký`).
- **Backend chưa chạy** → script fail ngay step 1. Trước khi chạy: `cd backend\src\HIS.API; dotnet run --launch-profile http`.
- **Token hết hạn** giữa chừng → script dài (>30 phút) phải re-login. Hiện chưa có script nào dài thế, nhưng nhớ.
- **Database state**: nhiều test ghi data thật (Patients, Admissions, Receipts...). Dọn bằng `[AUTO-REG]` filter sau mỗi run nếu cần lặp lại.

## Reference

- `references/test-script-template.ps1` — skeleton copy-paste-ready
- `references/api-endpoints-cheatsheet.md` — route + DTO đã verify từ 21 script hiện tại
