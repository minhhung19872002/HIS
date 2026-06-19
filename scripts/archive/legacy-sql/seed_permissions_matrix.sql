-- ============================================================================
-- Level 6 Permission Matrix Seed Data
-- Per Decree 85/2016/ND-CP and Circular 54/2017/TT-BYT
-- 8 standard hospital roles, ~40 permissions grouped by module
-- Idempotent: uses IF NOT EXISTS guards
-- ============================================================================

SET NOCOUNT ON;

-- ============================================================================
-- STEP 1: Insert 8 standard hospital roles
-- ============================================================================

-- 1. Admin (Quan tri he thong)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'ADMIN')
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'ADMIN', N'Quản trị hệ thống', N'Toàn quyền quản trị hệ thống HIS', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- 2. BacSi (Doctor)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'BACSI')
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'BACSI', N'Bác sĩ', N'Bác sĩ khám và điều trị bệnh nhân', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- 3. DieuDuong (Nurse)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'DIEUDUONG')
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'DIEUDUONG', N'Điều dưỡng', N'Điều dưỡng chăm sóc bệnh nhân', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- 4. TiepDon (Receptionist)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'TIEPDON')
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'TIEPDON', N'Tiếp đón', N'Nhân viên tiếp đón đăng ký khám bệnh', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- 5. ThuNgan (Cashier)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'THUNGAN')
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'THUNGAN', N'Thu ngân', N'Nhân viên thu ngân thanh toán viện phí', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- 6. DuocSi (Pharmacist)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'DUOCSI')
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'DUOCSI', N'Dược sĩ', N'Dược sĩ cấp phát thuốc và quản lý kho dược', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- 7. XetNghiem (Lab Technician)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'XETNGHIEM')
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'XETNGHIEM', N'Kỹ thuật viên xét nghiệm', N'Kỹ thuật viên thực hiện và trả kết quả xét nghiệm', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- 8. ChanDoan (Radiology Technician)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleCode = 'CHANDOAN')
    INSERT INTO Roles (Id, RoleCode, RoleName, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'CHANDOAN', N'Kỹ thuật viên CĐHA', N'Kỹ thuật viên chẩn đoán hình ảnh (X-quang, siêu âm, CT, MRI)', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- ============================================================================
-- STEP 2: Insert ~40 permissions grouped by module
-- ============================================================================

-- Module: Reception (Tiep don) - 4 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'RECEPTION_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'RECEPTION_VIEW', N'Xem danh sách tiếp đón', 'Reception', N'Xem danh sách bệnh nhân đăng ký khám', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'RECEPTION_CREATE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'RECEPTION_CREATE', N'Đăng ký khám bệnh', 'Reception', N'Tạo mới đăng ký khám cho bệnh nhân', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'RECEPTION_EDIT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'RECEPTION_EDIT', N'Sửa thông tin tiếp đón', 'Reception', N'Chỉnh sửa thông tin đăng ký khám', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'RECEPTION_CANCEL')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'RECEPTION_CANCEL', N'Hủy đăng ký khám', 'Reception', N'Hủy đăng ký khám đã tạo', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: OPD (Kham benh ngoai tru) - 5 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'OPD_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'OPD_VIEW', N'Xem danh sách bệnh nhân', 'OPD', N'Xem danh sách bệnh nhân chờ khám', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'OPD_EXAMINE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'OPD_EXAMINE', N'Khám bệnh', 'OPD', N'Thực hiện khám bệnh và ghi nhận kết quả', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'OPD_PRESCRIBE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'OPD_PRESCRIBE', N'Kê đơn thuốc', 'OPD', N'Kê đơn thuốc cho bệnh nhân ngoại trú', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'OPD_ORDER_SERVICE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'OPD_ORDER_SERVICE', N'Chỉ định dịch vụ CLS', 'OPD', N'Chỉ định xét nghiệm, CĐHA cho bệnh nhân', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'OPD_COMPLETE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'OPD_COMPLETE', N'Kết thúc khám', 'OPD', N'Hoàn thành phiên khám bệnh', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: Inpatient (Noi tru) - 5 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'IPD_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'IPD_VIEW', N'Xem danh sách nội trú', 'Inpatient', N'Xem danh sách bệnh nhân nội trú', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'IPD_ADMIT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'IPD_ADMIT', N'Nhập viện', 'Inpatient', N'Tiếp nhận bệnh nhân nhập viện và phân giường', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'IPD_TREAT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'IPD_TREAT', N'Điều trị nội trú', 'Inpatient', N'Ghi nhận diễn biến, y lệnh, chăm sóc', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'IPD_DISCHARGE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'IPD_DISCHARGE', N'Xuất viện', 'Inpatient', N'Làm thủ tục xuất viện bệnh nhân', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'IPD_TRANSFER')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'IPD_TRANSFER', N'Chuyển khoa/giường', 'Inpatient', N'Chuyển bệnh nhân giữa các khoa và giường', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: Pharmacy (Duoc) - 4 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'PHARMACY_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'PHARMACY_VIEW', N'Xem danh sách thuốc', 'Pharmacy', N'Xem tồn kho và danh sách đơn thuốc', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'PHARMACY_DISPENSE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'PHARMACY_DISPENSE', N'Cấp phát thuốc', 'Pharmacy', N'Cấp phát thuốc theo đơn cho bệnh nhân', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'PHARMACY_IMPORT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'PHARMACY_IMPORT', N'Nhập kho dược', 'Pharmacy', N'Tạo phiếu nhập kho thuốc/VTYT', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'PHARMACY_EXPORT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'PHARMACY_EXPORT', N'Xuất kho dược', 'Pharmacy', N'Tạo phiếu xuất kho thuốc/VTYT', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: Billing (Thu ngan) - 4 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'BILLING_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'BILLING_VIEW', N'Xem viện phí', 'Billing', N'Xem thông tin viện phí bệnh nhân', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'BILLING_COLLECT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'BILLING_COLLECT', N'Thu tiền', 'Billing', N'Thu tiền viện phí, tạm ứng, thanh toán', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'BILLING_REFUND')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'BILLING_REFUND', N'Hoàn tiền', 'Billing', N'Thực hiện hoàn tiền cho bệnh nhân', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'BILLING_REPORT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'BILLING_REPORT', N'Báo cáo thu ngân', 'Billing', N'Xem và in báo cáo thu ngân, sổ quỹ', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: Laboratory (Xet nghiem) - 3 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'LAB_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'LAB_VIEW', N'Xem phiếu xét nghiệm', 'Laboratory', N'Xem danh sách và kết quả xét nghiệm', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'LAB_PROCESS')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'LAB_PROCESS', N'Thực hiện xét nghiệm', 'Laboratory', N'Tiếp nhận mẫu, nhập kết quả, duyệt kết quả xét nghiệm', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'LAB_APPROVE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'LAB_APPROVE', N'Duyệt kết quả xét nghiệm', 'Laboratory', N'Phê duyệt kết quả xét nghiệm cuối cùng', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: Radiology (Chan doan hinh anh) - 3 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'RAD_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'RAD_VIEW', N'Xem phiếu CĐHA', 'Radiology', N'Xem danh sách và kết quả chẩn đoán hình ảnh', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'RAD_PROCESS')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'RAD_PROCESS', N'Thực hiện CĐHA', 'Radiology', N'Chụp phim, siêu âm, nhập kết quả CĐHA', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'RAD_APPROVE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'RAD_APPROVE', N'Duyệt kết quả CĐHA', 'Radiology', N'Phê duyệt kết quả chẩn đoán hình ảnh', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: EMR (Ho so benh an dien tu) - 4 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'EMR_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'EMR_VIEW', N'Xem hồ sơ bệnh án', 'EMR', N'Xem hồ sơ bệnh án điện tử', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'EMR_EDIT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'EMR_EDIT', N'Sửa hồ sơ bệnh án', 'EMR', N'Chỉnh sửa nội dung hồ sơ bệnh án', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'EMR_PRINT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'EMR_PRINT', N'In hồ sơ bệnh án', 'EMR', N'In các biểu mẫu hồ sơ bệnh án', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'EMR_SIGN')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'EMR_SIGN', N'Ký số hồ sơ bệnh án', 'EMR', N'Ký số điện tử trên hồ sơ bệnh án', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: MasterData (Danh muc) - 3 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'MASTER_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'MASTER_VIEW', N'Xem danh mục', 'MasterData', N'Xem các danh mục hệ thống', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'MASTER_EDIT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'MASTER_EDIT', N'Sửa danh mục', 'MasterData', N'Thêm/sửa/xóa mục trong danh mục', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'MASTER_IMPORT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'MASTER_IMPORT', N'Import danh mục', 'MasterData', N'Import danh mục từ file Excel/CSV', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: SystemAdmin (Quan tri) - 3 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'ADMIN_USER_MANAGE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'ADMIN_USER_MANAGE', N'Quản lý người dùng', 'SystemAdmin', N'Tạo/sửa/khóa tài khoản người dùng', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'ADMIN_ROLE_MANAGE')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'ADMIN_ROLE_MANAGE', N'Quản lý vai trò', 'SystemAdmin', N'Tạo/sửa vai trò và phân quyền', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'ADMIN_SYSTEM_CONFIG')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'ADMIN_SYSTEM_CONFIG', N'Cấu hình hệ thống', 'SystemAdmin', N'Cấu hình tham số, sao lưu, nhật ký hệ thống', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- Module: Reports (Bao cao) - 2 permissions
IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'REPORT_VIEW')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'REPORT_VIEW', N'Xem báo cáo', 'Reports', N'Xem các báo cáo tổng hợp, thống kê', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

IF NOT EXISTS (SELECT 1 FROM Permissions WHERE PermissionCode = 'REPORT_EXPORT')
    INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module, Description, CreatedAt, CreatedBy, IsActive)
    VALUES (NEWID(), 'REPORT_EXPORT', N'Xuất báo cáo', 'Reports', N'Xuất báo cáo ra Excel/PDF', GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1);

-- ============================================================================
-- STEP 3: Assign permissions to roles (RolePermissions)
-- Admin gets ALL permissions
-- Other roles get module-specific subsets
-- ============================================================================

-- Helper: Admin gets all permissions
INSERT INTO RolePermissions (Id, RoleId, PermissionId, CreatedAt, CreatedBy, IsActive)
SELECT NEWID(), r.Id, p.Id, GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1
FROM Roles r
CROSS JOIN Permissions p
WHERE r.RoleCode = 'ADMIN'
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
  );

-- BacSi (Doctor): OPD, IPD, EMR, Lab/Rad view, Reports view
INSERT INTO RolePermissions (Id, RoleId, PermissionId, CreatedAt, CreatedBy, IsActive)
SELECT NEWID(), r.Id, p.Id, GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1
FROM Roles r
CROSS JOIN Permissions p
WHERE r.RoleCode = 'BACSI'
  AND p.PermissionCode IN (
    'RECEPTION_VIEW',
    'OPD_VIEW', 'OPD_EXAMINE', 'OPD_PRESCRIBE', 'OPD_ORDER_SERVICE', 'OPD_COMPLETE',
    'IPD_VIEW', 'IPD_ADMIT', 'IPD_TREAT', 'IPD_DISCHARGE', 'IPD_TRANSFER',
    'EMR_VIEW', 'EMR_EDIT', 'EMR_PRINT', 'EMR_SIGN',
    'LAB_VIEW', 'RAD_VIEW',
    'PHARMACY_VIEW',
    'REPORT_VIEW',
    'MASTER_VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
  );

-- DieuDuong (Nurse): IPD treatment, EMR view/edit, Lab/Rad view
INSERT INTO RolePermissions (Id, RoleId, PermissionId, CreatedAt, CreatedBy, IsActive)
SELECT NEWID(), r.Id, p.Id, GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1
FROM Roles r
CROSS JOIN Permissions p
WHERE r.RoleCode = 'DIEUDUONG'
  AND p.PermissionCode IN (
    'RECEPTION_VIEW',
    'OPD_VIEW',
    'IPD_VIEW', 'IPD_TREAT',
    'EMR_VIEW', 'EMR_EDIT', 'EMR_PRINT',
    'LAB_VIEW', 'RAD_VIEW',
    'PHARMACY_VIEW',
    'MASTER_VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
  );

-- TiepDon (Receptionist): Reception full, OPD/IPD view, Billing view
INSERT INTO RolePermissions (Id, RoleId, PermissionId, CreatedAt, CreatedBy, IsActive)
SELECT NEWID(), r.Id, p.Id, GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1
FROM Roles r
CROSS JOIN Permissions p
WHERE r.RoleCode = 'TIEPDON'
  AND p.PermissionCode IN (
    'RECEPTION_VIEW', 'RECEPTION_CREATE', 'RECEPTION_EDIT', 'RECEPTION_CANCEL',
    'OPD_VIEW',
    'IPD_VIEW',
    'BILLING_VIEW',
    'MASTER_VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
  );

-- ThuNgan (Cashier): Billing full, Reception/OPD/IPD view, Reports
INSERT INTO RolePermissions (Id, RoleId, PermissionId, CreatedAt, CreatedBy, IsActive)
SELECT NEWID(), r.Id, p.Id, GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1
FROM Roles r
CROSS JOIN Permissions p
WHERE r.RoleCode = 'THUNGAN'
  AND p.PermissionCode IN (
    'RECEPTION_VIEW',
    'OPD_VIEW',
    'IPD_VIEW',
    'BILLING_VIEW', 'BILLING_COLLECT', 'BILLING_REFUND', 'BILLING_REPORT',
    'REPORT_VIEW', 'REPORT_EXPORT',
    'MASTER_VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
  );

-- DuocSi (Pharmacist): Pharmacy full, Prescription view, OPD view
INSERT INTO RolePermissions (Id, RoleId, PermissionId, CreatedAt, CreatedBy, IsActive)
SELECT NEWID(), r.Id, p.Id, GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1
FROM Roles r
CROSS JOIN Permissions p
WHERE r.RoleCode = 'DUOCSI'
  AND p.PermissionCode IN (
    'RECEPTION_VIEW',
    'OPD_VIEW',
    'IPD_VIEW',
    'PHARMACY_VIEW', 'PHARMACY_DISPENSE', 'PHARMACY_IMPORT', 'PHARMACY_EXPORT',
    'REPORT_VIEW',
    'MASTER_VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
  );

-- XetNghiem (Lab Technician): Lab full, Reception/OPD view
INSERT INTO RolePermissions (Id, RoleId, PermissionId, CreatedAt, CreatedBy, IsActive)
SELECT NEWID(), r.Id, p.Id, GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1
FROM Roles r
CROSS JOIN Permissions p
WHERE r.RoleCode = 'XETNGHIEM'
  AND p.PermissionCode IN (
    'RECEPTION_VIEW',
    'OPD_VIEW',
    'LAB_VIEW', 'LAB_PROCESS', 'LAB_APPROVE',
    'REPORT_VIEW',
    'MASTER_VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
  );

-- ChanDoan (Radiology Technician): Radiology full, Reception/OPD view
INSERT INTO RolePermissions (Id, RoleId, PermissionId, CreatedAt, CreatedBy, IsActive)
SELECT NEWID(), r.Id, p.Id, GETUTCDATE(), '00000000-0000-0000-0000-000000000001', 1
FROM Roles r
CROSS JOIN Permissions p
WHERE r.RoleCode = 'CHANDOAN'
  AND p.PermissionCode IN (
    'RECEPTION_VIEW',
    'OPD_VIEW',
    'RAD_VIEW', 'RAD_PROCESS', 'RAD_APPROVE',
    'EMR_VIEW',
    'REPORT_VIEW',
    'MASTER_VIEW'
  )
  AND NOT EXISTS (
    SELECT 1 FROM RolePermissions rp WHERE rp.RoleId = r.Id AND rp.PermissionId = p.Id
  );

PRINT N'Permission matrix seeded: 8 roles, ~40 permissions';
PRINT N'Run SELECT r.RoleName, COUNT(rp.Id) FROM Roles r LEFT JOIN RolePermissions rp ON r.Id = rp.RoleId GROUP BY r.RoleName to verify';
