-- ============================================
-- HIS Seed Data Script
-- ============================================

USE HIS;
GO

-- ============================================
-- ROLES
-- ============================================
INSERT INTO Roles (Id, RoleCode, RoleName, Description) VALUES
(NEWID(), 'ADMIN', N'Quản trị hệ thống', N'Quản trị toàn bộ hệ thống'),
(NEWID(), 'DOCTOR', N'Bác sĩ', N'Bác sĩ khám chữa bệnh'),
(NEWID(), 'NURSE', N'Điều dưỡng', N'Điều dưỡng viên'),
(NEWID(), 'RECEPTIONIST', N'Tiếp đón', N'Nhân viên tiếp đón'),
(NEWID(), 'CASHIER', N'Thu ngân', N'Nhân viên thu ngân'),
(NEWID(), 'PHARMACIST', N'Dược sĩ', N'Dược sĩ phát thuốc'),
(NEWID(), 'LAB_TECH', N'Kỹ thuật viên XN', N'Kỹ thuật viên xét nghiệm'),
(NEWID(), 'IMAGING_TECH', N'Kỹ thuật viên CĐHA', N'Kỹ thuật viên chẩn đoán hình ảnh');

-- ============================================
-- PERMISSIONS
-- ============================================
INSERT INTO Permissions (Id, PermissionCode, PermissionName, Module) VALUES
-- Reception
(NEWID(), 'RECEPTION_VIEW', N'Xem tiếp đón', 'Reception'),
(NEWID(), 'RECEPTION_CREATE', N'Tạo tiếp đón', 'Reception'),
(NEWID(), 'RECEPTION_EDIT', N'Sửa tiếp đón', 'Reception'),
(NEWID(), 'RECEPTION_DELETE', N'Xóa tiếp đón', 'Reception'),
-- OPD
(NEWID(), 'OPD_VIEW', N'Xem khám bệnh', 'OPD'),
(NEWID(), 'OPD_EXAMINE', N'Khám bệnh', 'OPD'),
(NEWID(), 'OPD_PRESCRIBE', N'Kê đơn thuốc', 'OPD'),
(NEWID(), 'OPD_ORDER', N'Chỉ định dịch vụ', 'OPD'),
-- IPD
(NEWID(), 'IPD_VIEW', N'Xem nội trú', 'IPD'),
(NEWID(), 'IPD_ADMIT', N'Nhập viện', 'IPD'),
(NEWID(), 'IPD_DISCHARGE', N'Xuất viện', 'IPD'),
-- Pharmacy
(NEWID(), 'PHARMACY_VIEW', N'Xem kho dược', 'Pharmacy'),
(NEWID(), 'PHARMACY_DISPENSE', N'Cấp phát thuốc', 'Pharmacy'),
(NEWID(), 'PHARMACY_IMPORT', N'Nhập kho', 'Pharmacy'),
-- Lab
(NEWID(), 'LAB_VIEW', N'Xem xét nghiệm', 'Lab'),
(NEWID(), 'LAB_RESULT', N'Trả kết quả XN', 'Lab'),
-- Billing
(NEWID(), 'BILLING_VIEW', N'Xem viện phí', 'Billing'),
(NEWID(), 'BILLING_COLLECT', N'Thu tiền', 'Billing'),
(NEWID(), 'BILLING_REFUND', N'Hoàn tiền', 'Billing'),
-- Admin
(NEWID(), 'ADMIN_USER', N'Quản lý người dùng', 'Admin'),
(NEWID(), 'ADMIN_CATALOG', N'Quản lý danh mục', 'Admin'),
(NEWID(), 'ADMIN_REPORT', N'Báo cáo', 'Admin');

-- ============================================
-- ADMIN USER (Password: Admin@123)
-- ============================================
DECLARE @AdminId UNIQUEIDENTIFIER = NEWID();
DECLARE @AdminRoleId UNIQUEIDENTIFIER;
SELECT @AdminRoleId = Id FROM Roles WHERE RoleCode = 'ADMIN';

INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, IsActive)
VALUES (@AdminId, 'admin', '$2a$11$rKN7CQ8HqJqN7vQDNGJj8.Yp1qKHvYqZL4.RXgGpI6xgVfOhNVcHq', N'Administrator', 'admin@his.local', 1);

INSERT INTO UserRoles (UserId, RoleId) VALUES (@AdminId, @AdminRoleId);

-- Grant all permissions to Admin
INSERT INTO RolePermissions (RoleId, PermissionId)
SELECT @AdminRoleId, Id FROM Permissions;

-- ============================================
-- DEPARTMENTS
-- ============================================
DECLARE @KhoaNoi UNIQUEIDENTIFIER = NEWID();
DECLARE @KhoaNgoai UNIQUEIDENTIFIER = NEWID();
DECLARE @KhoaSan UNIQUEIDENTIFIER = NEWID();
DECLARE @KhoaNhi UNIQUEIDENTIFIER = NEWID();
DECLARE @KhoaXN UNIQUEIDENTIFIER = NEWID();
DECLARE @KhoaCDHA UNIQUEIDENTIFIER = NEWID();
DECLARE @KhoaDuoc UNIQUEIDENTIFIER = NEWID();
DECLARE @PhongTiepDon UNIQUEIDENTIFIER = NEWID();

INSERT INTO Departments (Id, DepartmentCode, DepartmentName, DepartmentCodeBYT, DepartmentType, DisplayOrder) VALUES
(@KhoaNoi, 'KHOA_NOI', N'Khoa Nội', '01', 1, 1),
(@KhoaNgoai, 'KHOA_NGOAI', N'Khoa Ngoại', '02', 1, 2),
(@KhoaSan, 'KHOA_SAN', N'Khoa Sản', '03', 1, 3),
(@KhoaNhi, 'KHOA_NHI', N'Khoa Nhi', '04', 1, 4),
(@KhoaXN, 'KHOA_XN', N'Khoa Xét nghiệm', '10', 2, 5),
(@KhoaCDHA, 'KHOA_CDHA', N'Khoa Chẩn đoán hình ảnh', '11', 2, 6),
(@KhoaDuoc, 'KHOA_DUOC', N'Khoa Dược', '20', 3, 7),
(@PhongTiepDon, 'PHONG_TD', N'Phòng Tiếp đón', '30', 3, 8);

-- ============================================
-- ROOMS
-- ============================================
-- Phòng khám Nội
INSERT INTO Rooms (RoomCode, RoomName, RoomType, MaxPatients, MaxInsurancePatients, DepartmentId, DisplayOrder) VALUES
('PK_NOI_01', N'Phòng khám Nội 1', 1, 80, 40, @KhoaNoi, 1),
('PK_NOI_02', N'Phòng khám Nội 2', 1, 80, 40, @KhoaNoi, 2);

-- Phòng khám Ngoại
INSERT INTO Rooms (RoomCode, RoomName, RoomType, MaxPatients, MaxInsurancePatients, DepartmentId, DisplayOrder) VALUES
('PK_NGOAI_01', N'Phòng khám Ngoại 1', 1, 60, 30, @KhoaNgoai, 1);

-- Phòng khám Sản
INSERT INTO Rooms (RoomCode, RoomName, RoomType, MaxPatients, MaxInsurancePatients, DepartmentId, DisplayOrder) VALUES
('PK_SAN_01', N'Phòng khám Sản', 1, 50, 25, @KhoaSan, 1);

-- Phòng khám Nhi
INSERT INTO Rooms (RoomCode, RoomName, RoomType, MaxPatients, MaxInsurancePatients, DepartmentId, DisplayOrder) VALUES
('PK_NHI_01', N'Phòng khám Nhi', 1, 80, 40, @KhoaNhi, 1);

-- Phòng xét nghiệm
INSERT INTO Rooms (RoomCode, RoomName, RoomType, MaxPatients, DepartmentId, DisplayOrder) VALUES
('PXN_01', N'Phòng lấy mẫu', 4, 200, @KhoaXN, 1);

-- Phòng CĐHA
INSERT INTO Rooms (RoomCode, RoomName, RoomType, MaxPatients, DepartmentId, DisplayOrder) VALUES
('PCDHA_XQUANG', N'Phòng X-Quang', 4, 100, @KhoaCDHA, 1),
('PCDHA_SA', N'Phòng Siêu âm', 4, 100, @KhoaCDHA, 2),
('PCDHA_CT', N'Phòng CT Scanner', 4, 50, @KhoaCDHA, 3);

-- Quầy tiếp đón
INSERT INTO Rooms (RoomCode, RoomName, RoomType, MaxPatients, DepartmentId, DisplayOrder) VALUES
('TD_01', N'Quầy tiếp đón 1', 1, 200, @PhongTiepDon, 1),
('TD_02', N'Quầy tiếp đón 2', 1, 200, @PhongTiepDon, 2);

-- ============================================
-- SERVICE GROUPS
-- ============================================
DECLARE @NhomKham UNIQUEIDENTIFIER = NEWID();
DECLARE @NhomXN UNIQUEIDENTIFIER = NEWID();
DECLARE @NhomCDHA UNIQUEIDENTIFIER = NEWID();
DECLARE @NhomTDCN UNIQUEIDENTIFIER = NEWID();
DECLARE @NhomPTTT UNIQUEIDENTIFIER = NEWID();

INSERT INTO ServiceGroups (Id, GroupCode, GroupName, GroupType, DisplayOrder) VALUES
(@NhomKham, 'KHAM', N'Khám bệnh', 1, 1),
(@NhomXN, 'XN', N'Xét nghiệm', 2, 2),
(@NhomCDHA, 'CDHA', N'Chẩn đoán hình ảnh', 3, 3),
(@NhomTDCN, 'TDCN', N'Thăm dò chức năng', 4, 4),
(@NhomPTTT, 'PTTT', N'Phẫu thuật thủ thuật', 5, 5);

-- Sub groups
DECLARE @XN_SinhHoa UNIQUEIDENTIFIER = NEWID();
DECLARE @XN_HuyetHoc UNIQUEIDENTIFIER = NEWID();
DECLARE @CDHA_XQuang UNIQUEIDENTIFIER = NEWID();
DECLARE @CDHA_SieuAm UNIQUEIDENTIFIER = NEWID();

INSERT INTO ServiceGroups (Id, GroupCode, GroupName, GroupType, ParentId, DisplayOrder) VALUES
(@XN_SinhHoa, 'XN_SH', N'Xét nghiệm sinh hóa', 2, @NhomXN, 1),
(@XN_HuyetHoc, 'XN_HH', N'Xét nghiệm huyết học', 2, @NhomXN, 2),
(@CDHA_XQuang, 'CDHA_XQ', N'X-Quang', 3, @NhomCDHA, 1),
(@CDHA_SieuAm, 'CDHA_SA', N'Siêu âm', 3, @NhomCDHA, 2);

-- ============================================
-- SERVICES
-- ============================================
-- Khám bệnh
INSERT INTO Services (ServiceCode, ServiceName, ServiceGroupId, UnitPrice, InsurancePrice, ServiceType, IsInsuranceCovered) VALUES
('KB_TQ', N'Khám bệnh thông thường', @NhomKham, 50000, 38500, 1, 1),
('KB_CK', N'Khám chuyên khoa', @NhomKham, 80000, 38500, 1, 1),
('KB_DV', N'Khám dịch vụ theo yêu cầu', @NhomKham, 200000, 0, 1, 0);

-- Xét nghiệm
INSERT INTO Services (ServiceCode, ServiceName, ServiceGroupId, UnitPrice, InsurancePrice, ServiceType, IsInsuranceCovered, RequiresSample, RequiresResult) VALUES
('XN_CTM', N'Công thức máu', @XN_HuyetHoc, 65000, 50000, 2, 1, 1, 1),
('XN_DMM', N'Đường máu mao mạch', @XN_SinhHoa, 25000, 20000, 2, 1, 1, 1),
('XN_URE', N'Ure máu', @XN_SinhHoa, 35000, 27000, 2, 1, 1, 1),
('XN_CREATININ', N'Creatinin máu', @XN_SinhHoa, 40000, 31000, 2, 1, 1, 1),
('XN_GOT', N'GOT (AST)', @XN_SinhHoa, 35000, 27000, 2, 1, 1, 1),
('XN_GPT', N'GPT (ALT)', @XN_SinhHoa, 35000, 27000, 2, 1, 1, 1),
('XN_HBA1C', N'HbA1c', @XN_SinhHoa, 120000, 92000, 2, 1, 1, 1);

-- Chẩn đoán hình ảnh
INSERT INTO Services (ServiceCode, ServiceName, ServiceGroupId, UnitPrice, InsurancePrice, ServiceType, IsInsuranceCovered, RequiresResult) VALUES
('XQ_NGUC', N'X-Quang ngực thẳng', @CDHA_XQuang, 80000, 62000, 3, 1, 1),
('XQ_COTSO', N'X-Quang cột sống', @CDHA_XQuang, 100000, 77000, 3, 1, 1),
('SA_BUNG', N'Siêu âm ổ bụng tổng quát', @CDHA_SieuAm, 150000, 115000, 3, 1, 1),
('SA_TIM', N'Siêu âm tim', @CDHA_SieuAm, 250000, 192000, 3, 1, 1),
('SA_GIAP', N'Siêu âm tuyến giáp', @CDHA_SieuAm, 120000, 92000, 3, 1, 1);

-- ============================================
-- SAMPLE ICD CODES
-- ============================================
INSERT INTO IcdCodes (Code, Name, ChapterCode, ChapterName, IsActive) VALUES
('A00', N'Bệnh tả', 'I', N'Bệnh nhiễm trùng và ký sinh trùng', 1),
('A09', N'Tiêu chảy và viêm dạ dày-ruột', 'I', N'Bệnh nhiễm trùng và ký sinh trùng', 1),
('E11', N'Đái tháo đường typ 2', 'IV', N'Bệnh nội tiết, dinh dưỡng và chuyển hóa', 1),
('I10', N'Tăng huyết áp vô căn', 'IX', N'Bệnh hệ tuần hoàn', 1),
('J00', N'Viêm mũi họng cấp', 'X', N'Bệnh hệ hô hấp', 1),
('J06', N'Nhiễm khuẩn đường hô hấp trên cấp', 'X', N'Bệnh hệ hô hấp', 1),
('K29', N'Viêm dạ dày và viêm tá tràng', 'XI', N'Bệnh hệ tiêu hóa', 1),
('M54', N'Đau lưng', 'XIII', N'Bệnh hệ cơ xương khớp', 1);

PRINT 'Seed data inserted successfully!';
GO
