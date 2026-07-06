# HIS Commercial — Permission Catalog v1 (Resource × Action × Role)

> **Nguồn sự thật duy nhất** cho catalog quyền của bản thương mại. Phần 4–6 của brief thương mại hóa (2026-07-05).
> Format: `Resource.Action` PascalCase (theo chuẩn RBAC epic #372) — **thay thế** ví dụ `MODULE.ACTION` uppercase trong `03-permission-pipeline.md`.
> Trần cứng: **100 mã**. v1 = **72 mã**. Thêm mã mới phải qua design review (chống permission explosion).

---

## 1. Resources (17)

### Domain chính (11)

| # | Resource | Mô tả | Module |
|---|---|---|---|
| 1 | `Patient` | Hồ sơ hành chính bệnh nhân | TIEPDON |
| 2 | `Appointment` | Lịch hẹn + hàng đợi (số thứ tự) | TIEPDON |
| 3 | `Encounter` | Lượt khám + bệnh án (EMR) | KHAMBENH |
| 4 | `Prescription` | Đơn thuốc | KHAMBENH / DUOCKHO |
| 5 | `ServiceOrder` | Chỉ định dịch vụ (XN / CĐHA / thủ thuật) | KHAMBENH |
| 6 | `LabResult` | Kết quả xét nghiệm | LIS |
| 7 | `ImagingResult` | Kết quả chẩn đoán hình ảnh | CDHA |
| 8 | `Inventory` | Kho (phiếu nhập / xuất / kiểm kê) | DUOCKHO |
| 9 | `Invoice` | Hóa đơn + thanh toán | THUNGAN |
| 10 | `InsuranceClaim` | Hồ sơ BHYT (giám định, XML) | BHYT |
| 11 | `Admission` | Nội trú (vào viện / ra viện) | NOITRU |

### Supporting (6)

| # | Resource | Mô tả | Module |
|---|---|---|---|
| 12 | `Report` | Báo cáo tổng hợp | BAOCAO |
| 13 | `Catalog` | Danh mục (dịch vụ, giá, thuốc, khoa phòng) | QUANTRI |
| 14 | `User` | Tài khoản | QUANTRI |
| 15 | `Role` | Vai trò + gán quyền | QUANTRI |
| 16 | `AuditLog` | Nhật ký truy vết | QUANTRI |
| 17 | `Setting` | Cấu hình hệ thống | QUANTRI |

**Đã loại (model thành Action, không phải Resource):** `Dispense` → `Prescription.Dispense` · `Payment/Collect` → `Invoice.Collect` · `Refund` → `Invoice.Refund`.

---

## 2. Actions

### Chuẩn (8)
`View` · `Create` · `Update` · `Delete` · `Approve` · `Print` · `Export` · `Import`

### Đặc thù (3 — trần 5)
`Dispense` (Prescription) · `Collect` (Invoice) · `Refund` (Invoice)

### Quy tắc Permission vs Business Rule

| Trường hợp | Quyết định | Lý do |
|---|---|---|
| `Print` | Permission CHỈ ở nơi có ý nghĩa pháp lý/tài chính: `Invoice.Print`, `Prescription.Print`, `Encounter.Print` (trích xuất HSBA) | In kết quả XN của KTV là workflow bình thường → đi kèm `View`, không cần mã riêng |
| `Patient.Delete` | **KHÔNG tồn tại** | Y tế – pháp lý: chỉ deactivate, không xóa |
| `Invoice.Delete` | = **void-with-audit** (hủy hóa đơn có truy vết), không phải hard-delete | Chứng từ tài chính |
| Chuyển trạng thái (gọi số tiếp, bắt đầu khám, hoàn thành...) | Business rule (state machine), KHÔNG phải permission | Nếu là permission → explosion |
| Hủy đơn thuốc trước cấp phát | `Prescription.Delete` | Sau cấp phát → không hủy được (business rule) |
| Duyệt hoàn tiền | `Invoice.Refund` chỉ gán Manager/Admin mặc định | Thu ngân cần → gán thêm hoặc business-rule override có mật khẩu quản lý (v2) |

---

## 3. Permission Catalog — 72 mã × 12 role

**Role codes:** ADM=Quản trị · MGR=Quản lý/Giám đốc · DOC=Bác sĩ · NUR=Điều dưỡng · REC=Lễ tân · CAS=Thu ngân · PHA=Dược sĩ · STO=Thủ kho · LAB=KTV XN · IMG=KTV CĐHA · ACC=Kế toán · PCD=BS CLS (duyệt KQ)

> Ma trận dưới là **seed mặc định** — mỗi triển khai chỉnh lại theo thực tế (role template editable). Triết lý seed: **rộng vừa đủ cho phòng khám nhỏ** (ít người, kiêm nhiệm); bệnh viện lớn siết lại bằng cách sửa/clone template.

### TIEPDON — Patient (4) + Appointment (4)

| Permission | ADM | MGR | DOC | NUR | REC | CAS | PHA | STO | LAB | IMG | ACC | PCD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Patient.View | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | | ✓ |
| Patient.Create | ✓ | | | | ✓ | | | | | | | |
| Patient.Update | ✓ | | | | ✓ | | | | | | | |
| Patient.Export | ✓ | ✓ | | | | | | | | | | |
| Appointment.View | ✓ | ✓ | ✓ | ✓ | ✓ | | | | | | | |
| Appointment.Create | ✓ | | ✓ | ✓ | ✓ | | | | | | | |
| Appointment.Update | ✓ | | | ✓ | ✓ | | | | | | | |
| Appointment.Delete | ✓ | | | | ✓ | | | | | | | |

### KHAMBENH — Encounter (5) + Prescription (6) + ServiceOrder (4)

| Permission | ADM | MGR | DOC | NUR | REC | CAS | PHA | STO | LAB | IMG | ACC | PCD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Encounter.View | ✓ | ✓ | ✓ | ✓ | | | | | | | | ✓ |
| Encounter.Create | ✓ | | ✓ | | ✓ | | | | | | | |
| Encounter.Update | | | ✓ | ✓ | | | | | | | | |
| Encounter.Approve | | | ✓ | | | | | | | | | |
| Encounter.Print | ✓ | ✓ | ✓ | | | | | | | | | |
| Prescription.View | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | | | |
| Prescription.Create | | | ✓ | | | | | | | | | |
| Prescription.Update | | | ✓ | | | | | | | | | |
| Prescription.Delete | ✓ | | ✓ | | | | | | | | | |
| Prescription.Dispense | | | | | | | ✓ | | | | | |
| Prescription.Print | | | ✓ | | | | ✓ | | | | | |
| ServiceOrder.View | ✓ | ✓ | ✓ | ✓ | | | | | ✓ | ✓ | | ✓ |
| ServiceOrder.Create | | | ✓ | | | | | | | | | |
| ServiceOrder.Update | | | ✓ | | | | | | | | | |
| ServiceOrder.Delete | ✓ | | ✓ | | | | | | | | | |

### LIS + CDHA — LabResult (4) + ImagingResult (4)

| Permission | ADM | MGR | DOC | NUR | REC | CAS | PHA | STO | LAB | IMG | ACC | PCD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LabResult.View | ✓ | ✓ | ✓ | ✓ | | | | | ✓ | | | ✓ |
| LabResult.Create | | | | | | | | | ✓ | | | |
| LabResult.Update | | | | | | | | | ✓ | | | ✓ |
| LabResult.Approve | | | | | | | | | | | | ✓ |
| ImagingResult.View | ✓ | ✓ | ✓ | ✓ | | | | | | ✓ | | ✓ |
| ImagingResult.Create | | | | | | | | | | ✓ | | |
| ImagingResult.Update | | | | | | | | | | ✓ | | ✓ |
| ImagingResult.Approve | | | | | | | | | | | | ✓ |

> Phòng khám không có BS CLS chuyên trách → gán template **PCD** cho tài khoản bác sĩ điều trị (multi-role union).

### DUOCKHO — Inventory (6)

| Permission | ADM | MGR | DOC | NUR | REC | CAS | PHA | STO | LAB | IMG | ACC | PCD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Inventory.View | ✓ | ✓ | | | | | ✓ | ✓ | | | ✓ | |
| Inventory.Create | | | | | | | ✓ | ✓ | | | | |
| Inventory.Update | | | | | | | ✓ | ✓ | | | | |
| Inventory.Delete | ✓ | | | | | | | ✓ | | | | |
| Inventory.Approve | ✓ | ✓ | | | | | ✓ | | | | | |
| Inventory.Export | ✓ | ✓ | | | | | ✓ | ✓ | | | ✓ | |

### THUNGAN — Invoice (7)

| Permission | ADM | MGR | DOC | NUR | REC | CAS | PHA | STO | LAB | IMG | ACC | PCD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Invoice.View | ✓ | ✓ | | | | ✓ | | | | | ✓ | |
| Invoice.Create | | | | | | ✓ | | | | | | |
| Invoice.Collect | | | | | | ✓ | | | | | | |
| Invoice.Refund | ✓ | ✓ | | | | | | | | | | |
| Invoice.Delete (void) | ✓ | ✓ | | | | | | | | | | |
| Invoice.Print | ✓ | | | | | ✓ | | | | | ✓ | |
| Invoice.Export | ✓ | ✓ | | | | | | | | | ✓ | |

### BHYT — InsuranceClaim (5)

| Permission | ADM | MGR | DOC | NUR | REC | CAS | PHA | STO | LAB | IMG | ACC | PCD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| InsuranceClaim.View | ✓ | ✓ | | | | ✓ | | | | | ✓ | |
| InsuranceClaim.Create | | | | | | | | | | | ✓ | |
| InsuranceClaim.Update | | | | | | | | | | | ✓ | |
| InsuranceClaim.Approve | ✓ | ✓ | | | | | | | | | ✓ | |
| InsuranceClaim.Export (XML) | ✓ | | | | | | | | | | ✓ | |

### NOITRU — Admission (4) *(module bật cho bệnh viện)*

| Permission | ADM | MGR | DOC | NUR | REC | CAS | PHA | STO | LAB | IMG | ACC | PCD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admission.View | ✓ | ✓ | ✓ | ✓ | | | | | | | | |
| Admission.Create | | | ✓ | | | | | | | | | |
| Admission.Update | | | ✓ | ✓ | | | | | | | | |
| Admission.Approve (ra viện) | | | ✓ | | | | | | | | | |

### BAOCAO + QUANTRI — Report (2) + Catalog (5) + User (4) + Role (4) + AuditLog (2) + Setting (2)

| Permission | ADM | MGR | DOC | NUR | REC | CAS | PHA | STO | LAB | IMG | ACC | PCD |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Report.View | ✓ | ✓ | | | | | | | | | ✓ | |
| Report.Export | ✓ | ✓ | | | | | | | | | ✓ | |
| Catalog.View | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Catalog.Create | ✓ | ✓ | | | | | | | | | | |
| Catalog.Update | ✓ | ✓ | | | | | | | | | | |
| Catalog.Delete | ✓ | | | | | | | | | | | |
| Catalog.Import | ✓ | | | | | | | | | | | |
| User.View | ✓ | ✓ | | | | | | | | | | |
| User.Create | ✓ | | | | | | | | | | | |
| User.Update | ✓ | | | | | | | | | | | |
| User.Delete (deactivate) | ✓ | | | | | | | | | | | |
| Role.View | ✓ | ✓ | | | | | | | | | | |
| Role.Create | ✓ | | | | | | | | | | | |
| Role.Update | ✓ | | | | | | | | | | | |
| Role.Delete | ✓ | | | | | | | | | | | |
| AuditLog.View | ✓ | ✓ | | | | | | | | | | |
| AuditLog.Export | ✓ | | | | | | | | | | | |
| Setting.View | ✓ | | | | | | | | | | | |
| Setting.Update | ✓ | | | | | | | | | | | |

**Tổng: 72 mã** (8+15+8+6+7+5+4+19).

> Ghi chú `Report.View`: danh sách báo cáo hiển thị được lọc thêm theo module user nhìn thấy (BS không có `Invoice.View` → không thấy nhóm báo cáo doanh thu dù có `Report.View`). Đây là **đơn giản hóa có chủ đích** — nếu khách hàng yêu cầu chi tiết hơn mới tách `Report` theo nhóm (revisit-trigger).

---

## 4. 12 Role Templates (seed data — KHÔNG hardcode enum)

| # | Template | Workspace mặc định | PK nhỏ dùng? | Ghi chú gộp từ 18 role cũ |
|---|---|---|---|---|
| 1 | Quản trị hệ thống (ADM) | Quản trị | ✓ | + ITStaff |
| 2 | Quản lý / Giám đốc (MGR) | Quản trị | ✓ (thường = chủ PK) | + DirectorDoctor, QualityManager |
| 3 | Bác sĩ (DOC) | Chuyên môn | ✓ | + SpecialtyDoctor, EmergencyDoctor, DepartmentHead (khác biệt = clone template) |
| 4 | Điều dưỡng (NUR) | Chuyên môn | ✓ | |
| 5 | Lễ tân (REC) | Tiếp đón & Thu phí | ✓ | + MedicalRecords (BV cần → clone + Encounter.View/Print) |
| 6 | Thu ngân (CAS) | Tiếp đón & Thu phí | ✓ (thường kiêm REC) | |
| 7 | Dược sĩ (PHA) | Dược & Kho | ✓ | |
| 8 | Thủ kho (STO) | Dược & Kho | BV | + WarehouseManager (PK nhỏ: gán kèm PHA) |
| 9 | KTV Xét nghiệm (LAB) | Chuyên môn | Nếu có LIS | |
| 10 | KTV CĐHA (IMG) | Chuyên môn | Nếu có CDHA | + RadiologyTech |
| 11 | Kế toán (ACC) | Quản trị | BV / PK có BHYT | |
| 12 | BS Cận lâm sàng (PCD) | Chuyên môn | Gán kèm DOC | + Radiologist, LabDoctor |

**Loại khỏi commercial core** (module không ship v1): NutritionStaff, SocialWorker, SecurityStaff.

**Nguyên tắc:**
- Multi-role / user = **UNION** quyền (1 người kiêm nhiều vai — chuẩn phòng khám nhỏ).
- Template **clone được**: BV muốn "Trưởng khoa dược" → clone Pharmacist + Inventory.Approve.
- Role phục vụ **permission bundle**, không phục vụ chức danh — không tạo role mới chỉ vì có chức danh mới.

---

## 5. Đồng bộ FE ↔ BE

- **BE là nguồn gốc**: hằng số permission trong `HIS.Core` (phối hợp #367 AUTHZ-1 — `RequirePermission` + PermissionCatalog + policy provider).
- **FE mirror**: `src/app/permissions.ts` — copy thủ công có kiểm tra (72 mã, ít đổi) hoặc generator sau này nếu drift xảy ra ≥2 lần.
- JWT: giữ permission claims khi ≤100 mã (72 OK); `/auth/me` là fallback + invalidation (cache 5 phút).
