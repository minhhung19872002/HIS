-- ============================================================
-- HIS Database Comprehensive Seed Data Script
-- Generated: 2026-02-23
-- Purpose: Populate all empty/sparse tables with realistic
--          Vietnamese hospital data for UI development
-- ============================================================
-- This script is idempotent: uses IF NOT EXISTS checks
-- Execute in order to respect foreign key constraints
-- ============================================================

SET NOCOUNT ON;
PRINT '=== HIS Seed Data Script Starting ===';

-- ============================================================
-- STEP 1: DECLARE EXISTING IDs FOR REFERENCE
-- ============================================================

-- Admin user
DECLARE @AdminId UNIQUEIDENTIFIER = '9E5309DC-ECF9-4D48-9A09-224CD15347B1';

-- Departments
DECLARE @KhoaNoi UNIQUEIDENTIFIER = 'B1126838-0C70-4869-ACBA-CD5AE3D41A76';      -- Khoa Noi
DECLARE @KhoaNgoai UNIQUEIDENTIFIER = 'A5FF333B-FA29-48BE-A540-43B959CC1C70';     -- Khoa Ngoai
DECLARE @KhoaSan UNIQUEIDENTIFIER = '88566D6D-2D7E-47D8-B61D-B023E1DFB185';       -- Khoa San
DECLARE @KhoaNhi UNIQUEIDENTIFIER = '73BD3105-3B2B-433E-B1C7-B3E6115340FA';       -- Khoa Nhi
DECLARE @KhoaCDHA UNIQUEIDENTIFIER = 'F16B6CC8-ECBA-4675-81BC-0AA4CC3FA441';      -- Khoa CDHA
DECLARE @KhoaXN UNIQUEIDENTIFIER = '5D27B234-AEE3-413D-9B45-A7575CB5E413';        -- Khoa XN
DECLARE @KhoaDuoc UNIQUEIDENTIFIER = '83D99FAC-70ED-4DB6-9280-E9AB34B35731';      -- Khoa Duoc
DECLARE @KhoaKB UNIQUEIDENTIFIER = '96B9F79F-49EB-4249-A7B9-6F1465E219E7';        -- Khoa Kham benh
DECLARE @PhongTD UNIQUEIDENTIFIER = '7C1E88E9-4337-464C-838C-9BB493D6FFBB';       -- Phong Tiep don
DECLARE @KhoaCC UNIQUEIDENTIFIER = '2EF7E0FD-C3C5-4D12-A4E9-A99CB2544DF1';        -- Khoa Cap cuu

-- Rooms
DECLARE @PK_Noi1 UNIQUEIDENTIFIER = 'BF6B00E9-578B-47FB-AFF8-AF25FB35A794';       -- PK Noi 1
DECLARE @PK_Noi2 UNIQUEIDENTIFIER = 'B2552837-CC61-402A-B0E3-AD7EA639CEC6';       -- PK Noi 2
DECLARE @PK_Ngoai1 UNIQUEIDENTIFIER = '534F64ED-508C-4FD8-942D-99A4CBBEAC5A';     -- PK Ngoai 1
DECLARE @PK_Nhi UNIQUEIDENTIFIER = 'B9603B68-8D83-4F0A-9E8B-B46B8E77F8D8';        -- PK Nhi
DECLARE @PK_San UNIQUEIDENTIFIER = '0DBB8BF4-25B3-4F0F-8E9D-8E1C5E34C055';        -- PK San
DECLARE @PK_101 UNIQUEIDENTIFIER = '65C7EC65-B79A-4C9D-B836-92D5392BD221';         -- P101 Noi TQ
DECLARE @PK_102 UNIQUEIDENTIFIER = '099FFCF6-C61B-4B95-91C6-75EF6B1C80D6';         -- P102 Ngoai TQ
DECLARE @PK_103 UNIQUEIDENTIFIER = '6BA37ABF-D320-460B-88E2-AE912C95F933';         -- P103 Nhi khoa
DECLARE @PK_104 UNIQUEIDENTIFIER = '5CBF521E-FE28-4543-8201-3C3578679279';         -- P104 Tim mach
DECLARE @TD_01 UNIQUEIDENTIFIER = '18582A83-6ED1-4952-8F88-3303D4DED8CC';           -- Quay tiep don 1
DECLARE @PXN_01 UNIQUEIDENTIFIER = '3B79C511-2A68-4ED9-9C70-58A34CF151BC';         -- Phong lay mau
DECLARE @PCDHA_XQ UNIQUEIDENTIFIER = '638A14D3-D47C-4D1B-B2C5-8C9CC722737B';       -- Phong X-Quang
DECLARE @PCDHA_SA UNIQUEIDENTIFIER = 'A4C4D239-914B-40E6-8B48-F97647D8262F';       -- Phong Sieu am
DECLARE @PCDHA_CT UNIQUEIDENTIFIER = 'B3242DF4-ED12-4C39-809C-1E19BBD3E3F1';       -- Phong CT Scanner
DECLARE @NT101 UNIQUEIDENTIFIER = '54344D93-42DA-4937-AF86-048124E0CCDC';           -- Phong Noi 101
DECLARE @NT102 UNIQUEIDENTIFIER = 'CD3CC485-EC28-4702-B557-0ADC9907367D';           -- Phong Noi 102
DECLARE @NT103VIP UNIQUEIDENTIFIER = '6E01C04D-6154-4555-BB57-BDE50C14D059';        -- Phong VIP 103

-- Warehouses
DECLARE @KhoThuocChinh UNIQUEIDENTIFIER = '89127D8A-0BDF-4F96-95F7-67BECCEBD606';  -- Kho thuoc chinh
DECLARE @NhaThuoc UNIQUEIDENTIFIER = 'EF523A99-B2D5-41EE-9AE7-972B91F661DF';       -- Nha thuoc BV
DECLARE @TuTrucNoi UNIQUEIDENTIFIER = '4CA2BF69-52C7-43CD-8B46-CD643DA2FA28';      -- Tu truc Khoa Noi
DECLARE @KhoVTYT UNIQUEIDENTIFIER = '325D8646-0B07-4111-A3A8-FB9A0D183652';        -- Kho vat tu y te

-- Operating Rooms
DECLARE @OR1 UNIQUEIDENTIFIER = '6FA3A447-E50F-49DE-898F-92BEB0634961';
DECLARE @OR2 UNIQUEIDENTIFIER = '600837FF-386A-451F-A7E8-9374B60C94BB';
DECLARE @OR3 UNIQUEIDENTIFIER = '868133E5-FFDD-4FEC-80CB-9A29A220DFD5';

-- Existing Admission
DECLARE @ExistingAdmissionId UNIQUEIDENTIFIER = '4D90FD83-FACE-4E2E-9781-CFE372543F10';

-- Patients (first 6 original)
DECLARE @Pat1 UNIQUEIDENTIFIER = '076D33FB-B973-4D42-A4F6-92E0F70D294F';  -- Nguyen Van An
DECLARE @Pat2 UNIQUEIDENTIFIER = '5F36C19E-2FD8-43E0-BFBA-59AA9BC0E6D1';  -- Tran Thi Binh
DECLARE @Pat3 UNIQUEIDENTIFIER = '31D853F4-8C56-4A2A-BD41-C2C3707A5CF0';  -- Le Hoang Cuong
DECLARE @Pat4 UNIQUEIDENTIFIER = '94E61079-ED7D-4F02-9D10-AD11D9D152FD';  -- Pham Thi Dung
DECLARE @Pat5 UNIQUEIDENTIFIER = '23AB08E4-1DCA-45CB-A906-5DF54470EF2F';  -- Hoang Minh Duc
DECLARE @Pat6 UNIQUEIDENTIFIER = '7AABF68D-6FBB-4501-BFF5-648974EE823C';  -- Vo Thi En

-- Medical Records for those patients
DECLARE @MR1 UNIQUEIDENTIFIER = '5A6B2A40-8BCB-438B-AC52-E5B7F94AD78F';  -- HS-2024-00001
DECLARE @MR2 UNIQUEIDENTIFIER = '07DBABCD-3DBA-4520-9B5B-708226584123';  -- HS-2024-00002
DECLARE @MR3 UNIQUEIDENTIFIER = '74E26FFA-8730-4E17-BA96-F9D08C4EE197';  -- HS-2024-00003
DECLARE @MR4 UNIQUEIDENTIFIER = 'D02B2712-EA42-421F-A4F9-0A1030D63599';  -- HS-2024-00004
DECLARE @MR5 UNIQUEIDENTIFIER = 'E1C4740B-1011-43A6-BB7D-F9CC74850CB0';  -- HS-2024-00005
DECLARE @MR6 UNIQUEIDENTIFIER = 'A652736C-2EEE-4BAB-BF99-8A18E1C3873F';  -- HS-2024-00006

-- Roles
DECLARE @RoleBacSi UNIQUEIDENTIFIER = 'DFC4FB84-3782-409E-99AF-6E6159D9ECD4';     -- Bac si
DECLARE @RoleDieuDuong UNIQUEIDENTIFIER = '5D7B2E04-C096-4801-BA05-DC97B149E40F';  -- Dieu duong
DECLARE @RoleTiepDon UNIQUEIDENTIFIER = '7A92640F-8A43-4BFE-8C9B-3C6938C9506F';   -- Tiep don
DECLARE @RoleDuocSi UNIQUEIDENTIFIER = '5A90CEA2-9A5A-4AC9-8210-9D61DB244F69';    -- Duoc si
DECLARE @RoleKTVCDHA UNIQUEIDENTIFIER = 'E5AA36C1-D080-4137-89D6-901C93546D24';   -- KTV CDHA
DECLARE @RoleKTVXN UNIQUEIDENTIFIER = 'A5237280-323E-40C2-ABD3-939CEA030706';     -- KTV XN
DECLARE @RoleThuNgan UNIQUEIDENTIFIER = 'DBD90B7F-6E25-46DA-8D22-054891C6A86B';   -- Thu ngan
DECLARE @RoleAdmin UNIQUEIDENTIFIER = '51FEB0E7-7400-4EE8-BB8A-FB520D299767';     -- Quan tri

-- Medicines
DECLARE @MedPara UNIQUEIDENTIFIER = '4632E3B6-AB73-45A3-89BF-00DC01137706';        -- Paracetamol 500mg
DECLARE @MedMetf UNIQUEIDENTIFIER = 'E133A0B9-4D07-4EBE-95D9-08E87ACE3DD5';        -- Metformin 500mg
DECLARE @MedLora UNIQUEIDENTIFIER = 'BA5AF79D-1273-4F95-A9ED-14FAA5FE9EEE';        -- Loratadine 10mg
DECLARE @MedIbu UNIQUEIDENTIFIER = '14FF19BA-DE87-4061-A3F7-181A69D5F2F1';          -- Ibuprofen 400mg
DECLARE @MedOmep UNIQUEIDENTIFIER = '7C83C709-7C9A-4175-928A-3604C7E0842A';        -- Omeprazole 20mg
DECLARE @MedVitC UNIQUEIDENTIFIER = '2BE8EE19-FF28-4CDB-BA96-718D70EF5550';        -- Vitamin C 500mg
DECLARE @MedAmlo UNIQUEIDENTIFIER = 'B573A911-DEDC-454D-BCC5-9C1B9DDDC372';        -- Amlodipine 5mg
DECLARE @MedCefa UNIQUEIDENTIFIER = '802E2D8C-E1B4-4F51-9709-BBDABB885EFE';        -- Cefadroxil 500mg
DECLARE @MedAmox UNIQUEIDENTIFIER = 'FFD589A4-B95C-41D4-A481-BF871F0C9005';        -- Amoxicillin 500mg
DECLARE @MedDicl UNIQUEIDENTIFIER = 'DC43E315-61C9-4C14-B6B4-DC0487B5B0F2';        -- Diclofenac 50mg
DECLARE @MedAzit UNIQUEIDENTIFIER = 'F1BCF290-0F3E-4604-BBB1-E9DC1B45C9C6';        -- Azithromycin 250mg

-- Surgery Request IDs
DECLARE @SR1 UNIQUEIDENTIFIER = '9148CD76-A2D1-4F1B-AA01-944E2A05B2CD';
DECLARE @SR2 UNIQUEIDENTIFIER = '70C73A0C-7BCF-471E-A966-C61F5310D340';
DECLARE @SR3 UNIQUEIDENTIFIER = '58EB9527-DA07-49CB-954F-D914B24F71A4';
DECLARE @SR4 UNIQUEIDENTIFIER = '4FD6811D-FDEE-4806-AD53-F3D53168E719';

DECLARE @Now DATETIME2 = GETDATE();
DECLARE @Today DATE = CAST(GETDATE() AS DATE);
DECLARE @BCryptHash NVARCHAR(255) = N'$2a$11$K7LVqzrHvB5KEHnVJM6z5.N9b7Q3EyHLSGQAqbFT0mM7HMz.ZzlVi';

-- ============================================================
-- STEP 2: CREATE USERS (12 staff members)
-- ============================================================
PRINT 'Step 2: Creating Users...';

-- Pre-declare user IDs so we can reference them later
DECLARE @DrAn UNIQUEIDENTIFIER = NEWID();
DECLARE @DrBinh UNIQUEIDENTIFIER = NEWID();
DECLARE @DrCuong UNIQUEIDENTIFIER = NEWID();
DECLARE @DrDung UNIQUEIDENTIFIER = NEWID();
DECLARE @DrEm UNIQUEIDENTIFIER = NEWID();
DECLARE @NsPhuong UNIQUEIDENTIFIER = NEWID();
DECLARE @NsGiang UNIQUEIDENTIFIER = NEWID();
DECLARE @RcHung UNIQUEIDENTIFIER = NEWID();
DECLARE @PhOanh UNIQUEIDENTIFIER = NEWID();
DECLARE @TcKhanh UNIQUEIDENTIFIER = NEWID();
DECLARE @TcLam UNIQUEIDENTIFIER = NEWID();
DECLARE @CsMai UNIQUEIDENTIFIER = NEWID();

-- BS Nguyen Van An - Doctor, Noi khoa
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'bsannn')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, LicenseNumber, Title, Degree, Specialty, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@DrAn, N'bsannn', @BCryptHash, N'BS. Nguyễn Văn An', N'bsannn@bv.vn', N'0901234001', N'NV001', N'BS001234', N'Bác sĩ CKI', N'Thạc sĩ', N'Nội tổng hợp', @KhoaNoi, 1, N'BS001', 1, @Now, N'admin', 0);
END
ELSE SET @DrAn = (SELECT Id FROM Users WHERE Username = N'bsannn');

-- BS Tran Thi Binh - Doctor, Ngoai khoa
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'bsbinh')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, LicenseNumber, Title, Degree, Specialty, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@DrBinh, N'bsbinh', @BCryptHash, N'BS. Trần Thị Bình', N'bsbinh@bv.vn', N'0901234002', N'NV002', N'BS002345', N'Bác sĩ CKII', N'Tiến sĩ', N'Ngoại tổng hợp', @KhoaNgoai, 1, N'BS002', 1, @Now, N'admin', 0);
END
ELSE SET @DrBinh = (SELECT Id FROM Users WHERE Username = N'bsbinh');

-- BS Le Van Cuong - Doctor, San khoa
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'bscuong')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, LicenseNumber, Title, Degree, Specialty, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@DrCuong, N'bscuong', @BCryptHash, N'BS. Lê Văn Cường', N'bscuong@bv.vn', N'0901234003', N'NV003', N'BS003456', N'Bác sĩ CKI', N'Thạc sĩ', N'Sản phụ khoa', @KhoaSan, 1, N'BS003', 1, @Now, N'admin', 0);
END
ELSE SET @DrCuong = (SELECT Id FROM Users WHERE Username = N'bscuong');

-- BS Pham Thi Dung - Doctor, Nhi khoa
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'bsdung')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, LicenseNumber, Title, Degree, Specialty, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@DrDung, N'bsdung', @BCryptHash, N'BS. Phạm Thị Dung', N'bsdung@bv.vn', N'0901234004', N'NV004', N'BS004567', N'Bác sĩ CKI', N'Thạc sĩ', N'Nhi khoa', @KhoaNhi, 1, N'BS004', 1, @Now, N'admin', 0);
END
ELSE SET @DrDung = (SELECT Id FROM Users WHERE Username = N'bsdung');

-- BS Hoang Van Em - Radiologist, CDHA
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'bsem')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, LicenseNumber, Title, Degree, Specialty, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@DrEm, N'bsem', @BCryptHash, N'BS. Hoàng Văn Em', N'bsem@bv.vn', N'0901234005', N'NV005', N'BS005678', N'Bác sĩ CKI', N'Thạc sĩ', N'Chẩn đoán hình ảnh', @KhoaCDHA, 1, N'BS005', 1, @Now, N'admin', 0);
END
ELSE SET @DrEm = (SELECT Id FROM Users WHERE Username = N'bsem');

-- DD Vu Thi Phuong - Nurse
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'ddphuong')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, Title, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@NsPhuong, N'ddphuong', @BCryptHash, N'ĐD. Vũ Thị Phương', N'ddphuong@bv.vn', N'0901234006', N'NV006', N'Điều dưỡng trưởng', @KhoaNoi, 1, N'DD001', 2, @Now, N'admin', 0);
END
ELSE SET @NsPhuong = (SELECT Id FROM Users WHERE Username = N'ddphuong');

-- DD Nguyen Thi Giang - Nurse
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'ddgiang')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, Title, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@NsGiang, N'ddgiang', @BCryptHash, N'ĐD. Nguyễn Thị Giang', N'ddgiang@bv.vn', N'0901234007', N'NV007', N'Điều dưỡng', @KhoaNgoai, 1, N'DD002', 2, @Now, N'admin', 0);
END
ELSE SET @NsGiang = (SELECT Id FROM Users WHERE Username = N'ddgiang');

-- LT Dao Van Hung - Receptionist
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'lthung')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, Title, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@RcHung, N'lthung', @BCryptHash, N'Đào Văn Hùng', N'lthung@bv.vn', N'0901234008', N'NV008', N'Nhân viên tiếp đón', @PhongTD, 1, N'TD001', 3, @Now, N'admin', 0);
END
ELSE SET @RcHung = (SELECT Id FROM Users WHERE Username = N'lthung');

-- DS Bui Thi Oanh - Pharmacist
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'dsoanh')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, LicenseNumber, Title, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@PhOanh, N'dsoanh', @BCryptHash, N'DS. Bùi Thị Oanh', N'dsoanh@bv.vn', N'0901234009', N'NV009', N'DS001234', N'Dược sĩ đại học', @KhoaDuoc, 1, N'DS001', 4, @Now, N'admin', 0);
END
ELSE SET @PhOanh = (SELECT Id FROM Users WHERE Username = N'dsoanh');

-- KTV Ngo Van Khanh - Lab Tech
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'ktvkhanh')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, Title, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@TcKhanh, N'ktvkhanh', @BCryptHash, N'KTV. Ngô Văn Khánh', N'ktvkhanh@bv.vn', N'0901234010', N'NV010', N'Kỹ thuật viên xét nghiệm', @KhoaXN, 1, N'KTV001', 1, @Now, N'admin', 0);
END
ELSE SET @TcKhanh = (SELECT Id FROM Users WHERE Username = N'ktvkhanh');

-- KTV Tran Van Lam - Imaging Tech
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'ktvlam')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, Title, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@TcLam, N'ktvlam', @BCryptHash, N'KTV. Trần Văn Lâm', N'ktvlam@bv.vn', N'0901234011', N'NV011', N'Kỹ thuật viên CĐHA', @KhoaCDHA, 1, N'KTV002', 1, @Now, N'admin', 0);
END
ELSE SET @TcLam = (SELECT Id FROM Users WHERE Username = N'ktvlam');

-- TN Do Thi Mai - Cashier
IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = N'tnmai')
BEGIN
    INSERT INTO Users (Id, Username, PasswordHash, FullName, Email, PhoneNumber, EmployeeCode, Title, DepartmentId, IsActive, UserCode, UserType, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@CsMai, N'tnmai', @BCryptHash, N'Đỗ Thị Mai', N'tnmai@bv.vn', N'0901234012', N'NV012', N'Nhân viên thu ngân', @PhongTD, 1, N'TN001', 3, @Now, N'admin', 0);
END
ELSE SET @CsMai = (SELECT Id FROM Users WHERE Username = N'tnmai');

PRINT '  Users created/verified.';

-- ============================================================
-- STEP 2b: ASSIGN ROLES via UserRoles
-- ============================================================
PRINT 'Step 2b: Assigning UserRoles...';

-- Doctor roles
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @DrAn AND RoleId = @RoleBacSi)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @DrAn, @RoleBacSi, @Now, 0);
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @DrBinh AND RoleId = @RoleBacSi)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @DrBinh, @RoleBacSi, @Now, 0);
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @DrCuong AND RoleId = @RoleBacSi)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @DrCuong, @RoleBacSi, @Now, 0);
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @DrDung AND RoleId = @RoleBacSi)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @DrDung, @RoleBacSi, @Now, 0);
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @DrEm AND RoleId = @RoleBacSi)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @DrEm, @RoleBacSi, @Now, 0);

-- Nurse roles
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @NsPhuong AND RoleId = @RoleDieuDuong)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @NsPhuong, @RoleDieuDuong, @Now, 0);
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @NsGiang AND RoleId = @RoleDieuDuong)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @NsGiang, @RoleDieuDuong, @Now, 0);

-- Receptionist role
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @RcHung AND RoleId = @RoleTiepDon)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @RcHung, @RoleTiepDon, @Now, 0);

-- Pharmacist role
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @PhOanh AND RoleId = @RoleDuocSi)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @PhOanh, @RoleDuocSi, @Now, 0);

-- Lab tech role
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @TcKhanh AND RoleId = @RoleKTVXN)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @TcKhanh, @RoleKTVXN, @Now, 0);

-- Imaging tech role
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @TcLam AND RoleId = @RoleKTVCDHA)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @TcLam, @RoleKTVCDHA, @Now, 0);

-- Cashier role
IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @CsMai AND RoleId = @RoleThuNgan)
    INSERT INTO UserRoles (Id, UserId, RoleId, CreatedAt, IsDeleted) VALUES (NEWID(), @CsMai, @RoleThuNgan, @Now, 0);

PRINT '  UserRoles assigned.';

-- ============================================================
-- STEP 3: ADD ICD CODES (30+ common codes)
-- ============================================================
PRINT 'Step 3: Adding ICD Codes...';

-- Respiratory
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'J06.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'J06.9', N'Nhiễm khuẩn đường hô hấp trên cấp, không đặc hiệu', N'Acute upper respiratory infection, unspecified', N'X', N'Bệnh hệ hô hấp', N'J00-J06', N'Nhiễm khuẩn hô hấp trên cấp', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'J18.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'J18.9', N'Viêm phổi, không đặc hiệu', N'Pneumonia, unspecified organism', N'X', N'Bệnh hệ hô hấp', N'J09-J18', N'Cúm và viêm phổi', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'J45')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'J45', N'Hen phế quản', N'Asthma', N'X', N'Bệnh hệ hô hấp', N'J40-J47', N'Bệnh đường hô hấp dưới mạn tính', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'J20.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'J20.9', N'Viêm phế quản cấp, không đặc hiệu', N'Acute bronchitis, unspecified', N'X', N'Bệnh hệ hô hấp', N'J20-J22', N'Nhiễm khuẩn hô hấp dưới cấp khác', 1, 0, 1, @Now, N'admin', 0);

-- Cardiovascular
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'I10' AND Name LIKE N'%Tăng huyết áp%')
    UPDATE IcdCodes SET Name = N'Tăng huyết áp vô căn (nguyên phát)' WHERE Code = N'I10';
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'I20.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'I20.9', N'Đau thắt ngực, không đặc hiệu', N'Angina pectoris, unspecified', N'IX', N'Bệnh hệ tuần hoàn', N'I20-I25', N'Bệnh tim thiếu máu cục bộ', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'I50')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'I50', N'Suy tim', N'Heart failure', N'IX', N'Bệnh hệ tuần hoàn', N'I26-I52', N'Bệnh tim khác', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'I25.1')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'I25.1', N'Bệnh tim do xơ vữa động mạch', N'Atherosclerotic heart disease', N'IX', N'Bệnh hệ tuần hoàn', N'I20-I25', N'Bệnh tim thiếu máu cục bộ', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'I48')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'I48', N'Rung nhĩ và cuồng nhĩ', N'Atrial fibrillation and flutter', N'IX', N'Bệnh hệ tuần hoàn', N'I26-I52', N'Bệnh tim khác', 1, 0, 1, @Now, N'admin', 0);

-- Gastrointestinal
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'K29.7')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'K29.7', N'Viêm dạ dày, không đặc hiệu', N'Gastritis, unspecified', N'XI', N'Bệnh hệ tiêu hóa', N'K20-K31', N'Bệnh thực quản, dạ dày và tá tràng', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'K80.2')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'K80.2', N'Sỏi túi mật không có viêm túi mật', N'Calculus of gallbladder without cholecystitis', N'XI', N'Bệnh hệ tiêu hóa', N'K80-K87', N'Bệnh túi mật, đường mật, tụy', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'K35.8')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'K35.8', N'Viêm ruột thừa cấp, khác và không đặc hiệu', N'Other and unspecified acute appendicitis', N'XI', N'Bệnh hệ tiêu hóa', N'K35-K38', N'Bệnh ruột thừa', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'K21.0')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'K21.0', N'Trào ngược dạ dày thực quản có viêm thực quản', N'Gastro-esophageal reflux disease with esophagitis', N'XI', N'Bệnh hệ tiêu hóa', N'K20-K31', N'Bệnh thực quản, dạ dày và tá tràng', 1, 0, 1, @Now, N'admin', 0);

-- Endocrine/Metabolic
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'E78.5')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'E78.5', N'Rối loạn lipid máu, không đặc hiệu', N'Hyperlipidemia, unspecified', N'IV', N'Bệnh nội tiết, dinh dưỡng', N'E70-E90', N'Rối loạn chuyển hóa', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'E03.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'E03.9', N'Suy giáp, không đặc hiệu', N'Hypothyroidism, unspecified', N'IV', N'Bệnh nội tiết, dinh dưỡng', N'E00-E07', N'Bệnh tuyến giáp', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'E66.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'E66.9', N'Béo phì, không đặc hiệu', N'Obesity, unspecified', N'IV', N'Bệnh nội tiết, dinh dưỡng', N'E65-E68', N'Béo phì và tăng dinh dưỡng khác', 1, 0, 1, @Now, N'admin', 0);

-- Musculoskeletal
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'M54.5')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'M54.5', N'Đau thắt lưng', N'Low back pain', N'XIII', N'Bệnh hệ cơ xương khớp', N'M50-M54', N'Bệnh lý cột sống khác', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'M17.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'M17.9', N'Thoái hóa khớp gối, không đặc hiệu', N'Gonarthrosis, unspecified', N'XIII', N'Bệnh hệ cơ xương khớp', N'M15-M19', N'Thoái hóa khớp', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'M79.3')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'M79.3', N'Viêm cân mạc bàn chân', N'Panniculitis, unspecified', N'XIII', N'Bệnh hệ cơ xương khớp', N'M70-M79', N'Bệnh lý phần mềm khác', 1, 0, 1, @Now, N'admin', 0);

-- Genitourinary
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'N39.0')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'N39.0', N'Nhiễm khuẩn đường tiết niệu, vị trí không đặc hiệu', N'Urinary tract infection, site not specified', N'XIV', N'Bệnh hệ sinh dục-tiết niệu', N'N30-N39', N'Bệnh hệ tiết niệu khác', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'N20.0')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'N20.0', N'Sỏi thận', N'Calculus of kidney', N'XIV', N'Bệnh hệ sinh dục-tiết niệu', N'N20-N23', N'Sỏi niệu', 1, 0, 1, @Now, N'admin', 0);

-- Neurological
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'G43.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'G43.9', N'Đau nửa đầu (Migraine), không đặc hiệu', N'Migraine, unspecified', N'VI', N'Bệnh hệ thần kinh', N'G40-G47', N'Bệnh thần kinh từng cơn', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'G47.0')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'G47.0', N'Rối loạn giấc ngủ - Mất ngủ', N'Disorders of initiating and maintaining sleep (insomnia)', N'VI', N'Bệnh hệ thần kinh', N'G40-G47', N'Bệnh thần kinh từng cơn', 1, 0, 1, @Now, N'admin', 0);

-- Blood disorders
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'D50.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'D50.9', N'Thiếu máu thiếu sắt, không đặc hiệu', N'Iron deficiency anaemia, unspecified', N'III', N'Bệnh máu', N'D50-D53', N'Thiếu máu dinh dưỡng', 1, 0, 1, @Now, N'admin', 0);

-- Trauma/Injury
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'S52.5')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'S52.5', N'Gãy đầu dưới xương quay', N'Fracture of lower end of radius', N'XIX', N'Chấn thương, ngộ độc', N'S50-S59', N'Chấn thương cẳng tay', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'S82.1')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'S82.1', N'Gãy đầu trên xương chày', N'Fracture of upper end of tibia', N'XIX', N'Chấn thương, ngộ độc', N'S80-S89', N'Chấn thương đầu gối và cẳng chân', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'S06.0')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'S06.0', N'Chấn động não', N'Concussion', N'XIX', N'Chấn thương, ngộ độc', N'S00-S09', N'Chấn thương đầu', 1, 0, 1, @Now, N'admin', 0);

-- Infectious
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'A90')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'A90', N'Sốt Dengue (sốt xuất huyết Dengue)', N'Dengue fever', N'I', N'Bệnh nhiễm trùng', N'A90-A99', N'Sốt do virus qua tiết túc chân', 1, 1, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'B18.1')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'B18.1', N'Viêm gan virus B mạn', N'Chronic viral hepatitis B', N'I', N'Bệnh nhiễm trùng', N'B15-B19', N'Viêm gan virus', 1, 1, 1, @Now, N'admin', 0);

-- Dermatology
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'L30.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'L30.9', N'Viêm da, không đặc hiệu', N'Dermatitis, unspecified', N'XII', N'Bệnh da và mô dưới da', N'L20-L30', N'Viêm da và chàm', 1, 0, 1, @Now, N'admin', 0);

-- Eye
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'H10.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'H10.9', N'Viêm kết mạc, không đặc hiệu', N'Conjunctivitis, unspecified', N'VII', N'Bệnh mắt', N'H10-H13', N'Bệnh kết mạc', 1, 0, 1, @Now, N'admin', 0);

-- Obstetric
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'O80')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'O80', N'Đẻ thường một thai', N'Single spontaneous delivery', N'XV', N'Thai nghén, sinh đẻ', N'O80-O84', N'Đẻ', 1, 0, 1, @Now, N'admin', 0);

-- Mental health
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'F32.9')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'F32.9', N'Giai đoạn trầm cảm, không đặc hiệu', N'Depressive episode, unspecified', N'V', N'Rối loạn tâm thần', N'F30-F39', N'Rối loạn khí sắc', 1, 0, 1, @Now, N'admin', 0);
IF NOT EXISTS (SELECT 1 FROM IcdCodes WHERE Code = N'F41.1')
    INSERT INTO IcdCodes (Id, Code, Name, NameEnglish, ChapterCode, ChapterName, GroupCode, GroupName, IcdType, IsNotifiable, IsActive, CreatedAt, CreatedBy, IsDeleted) VALUES (NEWID(), N'F41.1', N'Rối loạn lo âu lan tỏa', N'Generalized anxiety disorder', N'V', N'Rối loạn tâm thần', N'F40-F48', N'Rối loạn liên quan stress', 1, 0, 1, @Now, N'admin', 0);

PRINT '  ICD Codes added.';

-- ============================================================
-- STEP 4: ADD QUEUES FOR TODAY
-- ============================================================
PRINT 'Step 4: Creating Queues for today...';

-- Clear old queue data for today to make this idempotent
DELETE FROM Queues WHERE QueueDate = @Today;

-- Queue entries: patients waiting to be seen today
-- Patient 1 - Nguyen Van An waiting at Noi 1
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 1, N'N001', @Pat1, @MR1, 1, @KhoaKB, @PK_101, 0, 0, NULL, NULL, 0, N'P101', @Now, N'admin', 0);

-- Patient 2 - Tran Thi Binh being examined at Noi 1
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 2, N'N002', @Pat2, @MR2, 1, @KhoaKB, @PK_101, 0, 2, DATEADD(MINUTE, -30, @Now), DATEADD(MINUTE, -25, @Now), 1, N'P101', @Now, N'admin', 0);

-- Patient 3 - Le Hoang Cuong waiting at Ngoai 1
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 1, N'NG001', @Pat3, @MR3, 1, @KhoaKB, @PK_102, 0, 0, NULL, NULL, 0, N'P102', @Now, N'admin', 0);

-- Patient 4 - Pham Thi Dung being called at Nhi
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 1, N'NH001', @Pat4, @MR4, 1, @KhoaKB, @PK_103, 1, 1, DATEADD(MINUTE, -5, @Now), NULL, 1, N'P103', @Now, N'admin', 0);

-- Patient 5 - Hoang Minh Duc completed at P104 Tim mach
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CompletedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 1, N'TM001', @Pat5, @MR5, 1, @KhoaKB, @PK_104, 0, 3, DATEADD(HOUR, -2, @Now), DATEADD(HOUR, -2, @Now), DATEADD(HOUR, -1, @Now), 1, N'P104', @Now, N'admin', 0);

-- Patient 6 - Vo Thi En waiting for lab
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 1, N'XN001', @Pat6, @MR6, 2, @KhoaXN, @PXN_01, 0, 0, NULL, NULL, 0, N'XN', @Now, N'admin', 0);

-- More patients waiting at Noi 2
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 3, N'N003', @Pat1, @MR1, 1, @KhoaKB, @PK_Noi1, 0, 0, NULL, NULL, 0, N'NOI1', @Now, N'admin', 0);

-- Imaging queue
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 1, N'XQ001', @Pat3, @MR3, 3, @KhoaCDHA, @PCDHA_XQ, 0, 0, NULL, NULL, 0, N'XQ', @Now, N'admin', 0);

-- San khoa queue
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 1, N'SK001', @Pat2, @MR2, 1, @KhoaKB, @PK_San, 0, 0, NULL, NULL, 0, N'SAN', @Now, N'admin', 0);

-- Sieu am queue
INSERT INTO Queues (Id, QueueDate, QueueNumber, QueueCode, PatientId, MedicalRecordId, QueueType, DepartmentId, RoomId, Priority, Status, CalledAt, StartedAt, CalledCount, Counter, CreatedAt, CreatedBy, IsDeleted)
VALUES (NEWID(), @Today, 1, N'SA001', @Pat4, @MR4, 3, @KhoaCDHA, @PCDHA_SA, 0, 0, NULL, NULL, 0, N'SA', @Now, N'admin', 0);

PRINT '  Queues created for today.';

-- ============================================================
-- STEP 5: ADD SURGERY SCHEDULES AND RECORDS
-- ============================================================
PRINT 'Step 5: Creating Surgery Schedules and Records...';

-- Schedule 1: For SR1 - Scheduled for today, upcoming
DECLARE @SS1 UNIQUEIDENTIFIER = NEWID();
IF NOT EXISTS (SELECT 1 FROM SurgerySchedules WHERE SurgeryRequestId = @SR1)
BEGIN
    INSERT INTO SurgerySchedules (Id, SurgeryRequestId, OperatingRoomId, ScheduledDate, ScheduledTime, ScheduledDateTime, EstimatedDuration, SurgeonId, AnesthesiologistId, Status, Notes, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@SS1, @SR1, @OR1, @Today, '08:00:00', CAST(CAST(@Today AS NVARCHAR) + ' 08:00:00' AS DATETIME2), 120, @DrBinh, @DrAn, 1, N'Phẫu thuật nội soi cắt u - chuẩn bị dụng cụ nội soi', @Now, N'admin', 0);
END

-- Schedule 2: For SR2 - Scheduled for today, in progress
DECLARE @SS2 UNIQUEIDENTIFIER = NEWID();
IF NOT EXISTS (SELECT 1 FROM SurgerySchedules WHERE SurgeryRequestId = @SR2)
BEGIN
    INSERT INTO SurgerySchedules (Id, SurgeryRequestId, OperatingRoomId, ScheduledDate, ScheduledTime, ScheduledDateTime, EstimatedDuration, SurgeonId, AnesthesiologistId, Status, Notes, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@SS2, @SR2, @OR2, @Today, '10:00:00', CAST(CAST(@Today AS NVARCHAR) + ' 10:00:00' AS DATETIME2), 90, @DrBinh, @DrAn, 2, N'Mổ nội soi - đang tiến hành', @Now, N'admin', 0);
END

-- Schedule 3: For SR3 - Completed yesterday
DECLARE @SS3 UNIQUEIDENTIFIER = NEWID();
DECLARE @Yesterday DATE = DATEADD(DAY, -1, @Today);
IF NOT EXISTS (SELECT 1 FROM SurgerySchedules WHERE SurgeryRequestId = @SR3)
BEGIN
    INSERT INTO SurgerySchedules (Id, SurgeryRequestId, OperatingRoomId, ScheduledDate, ScheduledTime, ScheduledDateTime, EstimatedDuration, SurgeonId, AnesthesiologistId, Status, Notes, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@SS3, @SR3, @OR1, @Yesterday, '14:00:00', CAST(CAST(@Yesterday AS NVARCHAR) + ' 14:00:00' AS DATETIME2), 60, @DrBinh, @DrAn, 3, N'Đã hoàn thành', @Now, N'admin', 0);
END

-- Schedule 4: For SR4 - Scheduled for tomorrow
DECLARE @SS4 UNIQUEIDENTIFIER = NEWID();
DECLARE @Tomorrow DATE = DATEADD(DAY, 1, @Today);
IF NOT EXISTS (SELECT 1 FROM SurgerySchedules WHERE SurgeryRequestId = @SR4)
BEGIN
    INSERT INTO SurgerySchedules (Id, SurgeryRequestId, OperatingRoomId, ScheduledDate, ScheduledTime, ScheduledDateTime, EstimatedDuration, SurgeonId, AnesthesiologistId, Status, Notes, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@SS4, @SR4, @OR3, @Tomorrow, '09:00:00', CAST(CAST(@Tomorrow AS NVARCHAR) + ' 09:00:00' AS DATETIME2), 45, @DrBinh, @DrAn, 0, N'Tán sỏi qua da - chuẩn bị máy tán sỏi', @Now, N'admin', 0);
END

-- Surgery Record for the completed schedule (SR3/SS3)
DECLARE @SRec1 UNIQUEIDENTIFIER = NEWID();
IF NOT EXISTS (SELECT 1 FROM SurgeryRecords WHERE SurgeryScheduleId = @SS3) AND EXISTS (SELECT 1 FROM SurgerySchedules WHERE Id = @SS3)
BEGIN
    INSERT INTO SurgeryRecords (Id, SurgeryScheduleId, ActualStartTime, ActualEndTime, ActualDuration, ProcedurePerformed, Findings, Complications, BloodLoss, PostOpDiagnosis, PostOpIcdCode, PostOpInstructions, PostOpCare, Result, Notes, IsApproved, ApprovedBy, ApprovedAt, CreatedAt, CreatedBy, IsDeleted)
    VALUES (@SRec1, @SS3,
        CAST(CAST(@Yesterday AS NVARCHAR) + ' 14:15:00' AS DATETIME2),
        CAST(CAST(@Yesterday AS NVARCHAR) + ' 15:05:00' AS DATETIME2),
        50,
        N'Phẫu thuật thử nghiệm phương pháp mới - thành công',
        N'U nang nhỏ 2cm vùng bụng phải, không xâm lấn mạch máu, bờ rõ ràng',
        N'Không có biến chứng',
        50.0,
        N'Sau phẫu thuật ổn định, vết mổ khô',
        N'K35.8',
        N'Theo dõi dấu hiệu sinh tồn mỗi 2h trong 24h đầu. Nhịn ăn 6h sau mổ.',
        N'Kháng sinh dự phòng Cefazolin 1g TM. Giảm đau Paracetamol 1g TM mỗi 8h.',
        1,
        N'Phẫu thuật thành công, bệnh nhân tỉnh táo sau gây mê',
        1,
        @DrBinh,
        CAST(CAST(@Yesterday AS NVARCHAR) + ' 16:00:00' AS DATETIME2),
        @Now, N'admin', 0);

    -- Surgery Team Members for the completed surgery
    INSERT INTO SurgeryTeamMembers (Id, SurgeryRecordId, UserId, Role, RoleName, JoinedAt, LeftAt, Notes, CreatedAt, CreatedBy, IsDeleted)
    VALUES
        (NEWID(), @SRec1, @DrBinh, 1, N'Phẫu thuật viên chính', CAST(CAST(@Yesterday AS NVARCHAR) + ' 14:10:00' AS DATETIME2), CAST(CAST(@Yesterday AS NVARCHAR) + ' 15:05:00' AS DATETIME2), NULL, @Now, N'admin', 0),
        (NEWID(), @SRec1, @DrAn, 2, N'Bác sĩ gây mê', CAST(CAST(@Yesterday AS NVARCHAR) + ' 14:00:00' AS DATETIME2), CAST(CAST(@Yesterday AS NVARCHAR) + ' 15:10:00' AS DATETIME2), N'Gây mê toàn thân', @Now, N'admin', 0),
        (NEWID(), @SRec1, @NsGiang, 3, N'Điều dưỡng dụng cụ', CAST(CAST(@Yesterday AS NVARCHAR) + ' 13:45:00' AS DATETIME2), CAST(CAST(@Yesterday AS NVARCHAR) + ' 15:15:00' AS DATETIME2), NULL, @Now, N'admin', 0),
        (NEWID(), @SRec1, @NsPhuong, 4, N'Điều dưỡng chạy ngoài', CAST(CAST(@Yesterday AS NVARCHAR) + ' 13:45:00' AS DATETIME2), CAST(CAST(@Yesterday AS NVARCHAR) + ' 15:15:00' AS DATETIME2), NULL, @Now, N'admin', 0);
END

PRINT '  Surgery Schedules and Records created.';

-- ============================================================
-- STEP 6: ADD INVENTORY ITEMS
-- ============================================================
PRINT 'Step 6: Creating Inventory Items...';

-- Clear existing to be idempotent
IF (SELECT COUNT(*) FROM InventoryItems) = 0
BEGIN
    -- Main pharmacy warehouse inventory
    INSERT INTO InventoryItems (Id, WarehouseId, ItemType, MedicineId, BatchNumber, ExpiryDate, ManufactureDate, Quantity, ReservedQuantity, ImportPrice, UnitPrice, IsLocked, CreatedAt, IsDeleted)
    VALUES
    -- Paracetamol 500mg - large stock
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedPara, N'PARA-2025-001', '2027-06-30', '2025-06-01', 5000, 0, 500, 800, 0, @Now, 0),
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedPara, N'PARA-2025-002', '2027-12-31', '2025-12-01', 3000, 200, 520, 800, 0, @Now, 0),
    -- Amoxicillin 500mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedAmox, N'AMOX-2025-001', '2027-03-31', '2025-03-01', 2000, 100, 1200, 1800, 0, @Now, 0),
    -- Omeprazole 20mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedOmep, N'OMEP-2025-001', '2027-09-30', '2025-09-01', 3000, 50, 800, 1200, 0, @Now, 0),
    -- Metformin 500mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedMetf, N'METF-2025-001', '2027-08-31', '2025-08-01', 4000, 0, 600, 900, 0, @Now, 0),
    -- Amlodipine 5mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedAmlo, N'AMLO-2025-001', '2027-11-30', '2025-11-01', 2500, 100, 900, 1500, 0, @Now, 0),
    -- Cefadroxil 500mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedCefa, N'CEFA-2025-001', '2027-05-31', '2025-05-01', 1500, 0, 1500, 2200, 0, @Now, 0),
    -- Azithromycin 250mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedAzit, N'AZIT-2025-001', '2027-07-31', '2025-07-01', 1000, 0, 2000, 3000, 0, @Now, 0),
    -- Ibuprofen 400mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedIbu, N'IBU-2025-001', '2027-04-30', '2025-04-01', 2000, 50, 700, 1100, 0, @Now, 0),
    -- Vitamin C 500mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedVitC, N'VITC-2025-001', '2027-10-31', '2025-10-01', 5000, 0, 300, 500, 0, @Now, 0),
    -- Loratadine 10mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedLora, N'LORA-2025-001', '2027-08-31', '2025-08-01', 3000, 0, 400, 700, 0, @Now, 0),
    -- Diclofenac 50mg
    (NEWID(), @KhoThuocChinh, N'Medicine', @MedDicl, N'DICL-2025-001', '2027-06-30', '2025-06-01', 2000, 0, 600, 1000, 0, @Now, 0),

    -- Nha thuoc BV (smaller quantities)
    (NEWID(), @NhaThuoc, N'Medicine', @MedPara, N'PARA-2025-001', '2027-06-30', '2025-06-01', 500, 0, 500, 800, 0, @Now, 0),
    (NEWID(), @NhaThuoc, N'Medicine', @MedAmox, N'AMOX-2025-001', '2027-03-31', '2025-03-01', 200, 0, 1200, 1800, 0, @Now, 0),
    (NEWID(), @NhaThuoc, N'Medicine', @MedOmep, N'OMEP-2025-001', '2027-09-30', '2025-09-01', 300, 0, 800, 1200, 0, @Now, 0),
    (NEWID(), @NhaThuoc, N'Medicine', @MedAmlo, N'AMLO-2025-001', '2027-11-30', '2025-11-01', 200, 0, 900, 1500, 0, @Now, 0),
    (NEWID(), @NhaThuoc, N'Medicine', @MedMetf, N'METF-2025-001', '2027-08-31', '2025-08-01', 400, 0, 600, 900, 0, @Now, 0),

    -- Tu truc Khoa Noi (ward cabinet - small quantities)
    (NEWID(), @TuTrucNoi, N'Medicine', @MedPara, N'PARA-2025-001', '2027-06-30', '2025-06-01', 100, 0, 500, 800, 0, @Now, 0),
    (NEWID(), @TuTrucNoi, N'Medicine', @MedAmlo, N'AMLO-2025-001', '2027-11-30', '2025-11-01', 50, 0, 900, 1500, 0, @Now, 0),
    (NEWID(), @TuTrucNoi, N'Medicine', @MedOmep, N'OMEP-2025-001', '2027-09-30', '2025-09-01', 50, 0, 800, 1200, 0, @Now, 0),
    (NEWID(), @TuTrucNoi, N'Medicine', @MedDicl, N'DICL-2025-001', '2027-06-30', '2025-06-01', 30, 0, 600, 1000, 0, @Now, 0);

    PRINT '  Inventory Items created.';
END
ELSE
    PRINT '  Inventory Items already exist, skipping.';

-- ============================================================
-- STEP 7: ADD SUPPLIERS
-- ============================================================
PRINT 'Step 7: Creating Suppliers...';

IF NOT EXISTS (SELECT 1 FROM Suppliers WHERE SupplierCode = N'NCC001')
    INSERT INTO Suppliers (Id, SupplierCode, SupplierName, SupplierType, TaxCode, Address, PhoneNumber, Email, ContactPerson, BankAccount, BankName, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'NCC001', N'Công ty CP Dược phẩm Hà Nội (Hanoi Pharma)', N'Pharmacy', N'0100100014', N'170 La Thành, Đống Đa, Hà Nội', N'024.3852.1234', N'info@hanoipharma.vn', N'Nguyễn Minh Tuấn', N'12010001234567', N'Ngân hàng Vietcombank', 1, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM Suppliers WHERE SupplierCode = N'NCC002')
    INSERT INTO Suppliers (Id, SupplierCode, SupplierName, SupplierType, TaxCode, Address, PhoneNumber, Email, ContactPerson, BankAccount, BankName, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'NCC002', N'Công ty TNHH Dược phẩm Sài Gòn (Sapharco)', N'Pharmacy', N'0302000025', N'18-20 Nguyễn Trường Tộ, Quận 4, TP.HCM', N'028.3940.5678', N'sapharco@sapharco.com.vn', N'Trần Thanh Hà', N'79010003456789', N'Ngân hàng BIDV', 1, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM Suppliers WHERE SupplierCode = N'NCC003')
    INSERT INTO Suppliers (Id, SupplierCode, SupplierName, SupplierType, TaxCode, Address, PhoneNumber, Email, ContactPerson, BankAccount, BankName, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'NCC003', N'Công ty CP Trang thiết bị Y tế Việt Nhật', N'MedicalSupply', N'0106012345', N'234 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', N'024.3826.9012', N'contact@vietnhatmed.vn', N'Lê Văn Thành', N'01201005678901', N'Ngân hàng Agribank', 1, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM Suppliers WHERE SupplierCode = N'NCC004')
    INSERT INTO Suppliers (Id, SupplierCode, SupplierName, SupplierType, TaxCode, Address, PhoneNumber, Email, ContactPerson, BankAccount, BankName, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'NCC004', N'Công ty CP Dược phẩm Trung ương 1 (Pharbaco)', N'Pharmacy', N'0100109012', N'160 Tôn Đức Thắng, Đống Đa, Hà Nội', N'024.3851.3456', N'pharbaco@pharbaco.com.vn', N'Phạm Đức Long', N'31010007890123', N'Ngân hàng Techcombank', 1, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM Suppliers WHERE SupplierCode = N'NCC005')
    INSERT INTO Suppliers (Id, SupplierCode, SupplierName, SupplierType, TaxCode, Address, PhoneNumber, Email, ContactPerson, BankAccount, BankName, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'NCC005', N'Công ty CP Thiết bị Y tế Medinsco', N'MedicalSupply', N'0312345678', N'45 Nguyễn Thị Minh Khai, Quận 1, TP.HCM', N'028.3822.7890', N'sales@medinsco.vn', N'Hoàng Thu Trang', N'19010009012345', N'Ngân hàng ACB', 1, @Now, 0);

IF NOT EXISTS (SELECT 1 FROM Suppliers WHERE SupplierCode = N'NCC006')
    INSERT INTO Suppliers (Id, SupplierCode, SupplierName, SupplierType, TaxCode, Address, PhoneNumber, Email, ContactPerson, BankAccount, BankName, IsActive, CreatedAt, IsDeleted)
    VALUES (NEWID(), N'NCC006', N'Công ty CP Dược Hậu Giang (DHG Pharma)', N'Pharmacy', N'1800156801', N'288 Bis Nguyễn Văn Cừ, Ninh Kiều, Cần Thơ', N'0292.389.1234', N'dhgpharma@dhgpharma.com.vn', N'Đỗ Thị Thanh', N'56010001234567', N'Ngân hàng Vietinbank', 1, @Now, 0);

PRINT '  Suppliers created.';

-- ============================================================
-- STEP 8: ADD DAILY PROGRESS NOTES AND NURSING CARE
-- ============================================================
PRINT 'Step 8: Creating Daily Progress Notes and Nursing Care...';

-- Progress Notes for the existing admission (4D90FD83-FACE-4E2E-9781-CFE372543F10)
-- Day 1: Admission day (Feb 6)
IF NOT EXISTS (SELECT 1 FROM DailyProgresses WHERE AdmissionId = @ExistingAdmissionId)
BEGIN
    INSERT INTO DailyProgresses (Id, AdmissionId, ProgressDate, DoctorId, SubjectiveFindings, ObjectiveFindings, Assessment, [Plan], VitalSigns, DietOrder, ActivityOrder, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    -- Day 1 progress note
    (NEWID(), @ExistingAdmissionId, '2026-02-06 08:00:00', @DrAn,
        N'Bệnh nhân nhập viện với tình trạng đau bụng vùng thượng vị, buồn nôn, nôn 2 lần.',
        N'Bệnh nhân tỉnh, tiếp xúc tốt. Bụng mềm, ấn đau thượng vị. Không có phản ứng thành bụng. Gan lách không to.',
        N'Viêm dạ dày cấp. Cần theo dõi thêm, loại trừ loét dạ dày tá tràng.',
        N'- Nhịn ăn 12h, truyền dịch NaCl 0.9% 500ml + Glucose 5% 500ml
- Omeprazole 40mg TM x 2 lần/ngày
- Ondansetron 4mg TM khi nôn
- Xét nghiệm công thức máu, sinh hóa gan thận
- Nội soi dạ dày khi ổn định',
        N'{"nhietDo":"37.2","mach":"82","huyetAp":"125/80","nhipTho":"18","SpO2":"98"}',
        N'Nhịn ăn, chỉ uống nước lọc',
        N'Nằm nghỉ tại giường',
        @Now, N'admin', 0),

    -- Day 2 progress note
    (NEWID(), @ExistingAdmissionId, '2026-02-07 08:00:00', @DrAn,
        N'Bệnh nhân đỡ đau bụng, hết nôn. Ngủ được đêm qua. Chưa đi ngoài.',
        N'Tỉnh, tiếp xúc tốt. Bụng mềm, ấn đau nhẹ vùng thượng vị. Nhu động ruột bình thường.',
        N'Viêm dạ dày cấp - cải thiện. Kết quả XN: Hb 13.5g/dL, BC 8.200, TC 245.000. Creatinin 0.9, GOT 25, GPT 30.',
        N'- Chuyển ăn cháo loãng
- Tiếp tục Omeprazole 40mg TM sáng chiều
- Bổ sung Sucralfat gel 1 gói x 3 lần/ngày trước ăn
- Chuẩn bị nội soi dạ dày ngày mai',
        N'{"nhietDo":"36.8","mach":"78","huyetAp":"120/75","nhipTho":"16","SpO2":"99"}',
        N'Cháo loãng, chia nhỏ bữa ăn',
        N'Đi lại nhẹ trong phòng',
        @Now, N'admin', 0),

    -- Day 3 progress note
    (NEWID(), @ExistingAdmissionId, '2026-02-08 08:00:00', @DrAn,
        N'Bệnh nhân ăn uống được, không đau bụng. Đại tiện bình thường.',
        N'Tỉnh, da niêm mạc hồng. Bụng mềm, không đau. Tim phổi bình thường.',
        N'Viêm dạ dày cấp - ổn định. Nội soi dạ dày: viêm hang vị, HP (+). Chỉ định điều trị HP.',
        N'- Chế độ ăn bình thường, tránh đồ cay nóng
- Chuyển thuốc uống: Omeprazole 20mg x 2 viên/ngày
- Phác đồ diệt HP: Omeprazole + Amoxicillin 1g x 2 + Clarithromycin 500mg x 2 trong 14 ngày
- Dự kiến xuất viện ngày mai',
        N'{"nhietDo":"36.5","mach":"76","huyetAp":"118/72","nhipTho":"16","SpO2":"99"}',
        N'Ăn bình thường, hạn chế đồ cay',
        N'Hoạt động bình thường',
        @Now, N'admin', 0);
END

PRINT '  Daily Progress Notes created.';

-- Nursing Care Records
IF NOT EXISTS (SELECT 1 FROM NursingCares WHERE AdmissionId = @ExistingAdmissionId)
BEGIN
    INSERT INTO NursingCares (Id, AdmissionId, NurseId, CareDate, CareType, Description, Status, CreatedAt, CreatedBy, IsDeleted)
    VALUES
    -- Day 1 nursing care
    (NEWID(), @ExistingAdmissionId, @NsPhuong, '2026-02-06 07:00:00', 1,
        N'Đón tiếp bệnh nhân nhập viện. Đo dấu hiệu sinh tồn: M 82 l/p, HA 125/80 mmHg, T 37.2°C, NT 18 l/p, SpO2 98%. Lập bảng theo dõi. Thực hiện y lệnh truyền dịch NaCl 0.9% 500ml.', 1, @Now, N'admin', 0),
    (NEWID(), @ExistingAdmissionId, @NsPhuong, '2026-02-06 14:00:00', 2,
        N'Thực hiện tiêm Omeprazole 40mg TM. Theo dõi dấu hiệu sinh tồn chiều: M 80, HA 122/78, T 36.9°C. Bệnh nhân hết nôn, nghỉ ngơi tại giường.', 1, @Now, N'admin', 0),
    (NEWID(), @ExistingAdmissionId, @NsPhuong, '2026-02-06 21:00:00', 3,
        N'Theo dõi đêm: BN ngủ yên, không nôn. Kiểm tra đường truyền dịch bình thường. Dấu hiệu sinh tồn ổn định.', 1, @Now, N'admin', 0),

    -- Day 2 nursing care
    (NEWID(), @ExistingAdmissionId, @NsPhuong, '2026-02-07 07:00:00', 1,
        N'Dấu hiệu sinh tồn sáng: M 78, HA 120/75, T 36.8°C, NT 16, SpO2 99%. Lấy máu xét nghiệm theo y lệnh. Cho BN ăn cháo loãng.', 1, @Now, N'admin', 0),
    (NEWID(), @ExistingAdmissionId, @NsPhuong, '2026-02-07 14:00:00', 2,
        N'Thực hiện tiêm Omeprazole 40mg TM chiều. Hướng dẫn BN uống Sucralfat trước bữa ăn. BN ăn được 1/2 bát cháo.', 1, @Now, N'admin', 0),

    -- Day 3 nursing care
    (NEWID(), @ExistingAdmissionId, @NsPhuong, '2026-02-08 07:00:00', 1,
        N'DHST sáng: M 76, HA 118/72, T 36.5°C. BN ăn uống tốt, không đau bụng. Chuẩn bị nội soi dạ dày: hướng dẫn BN nhịn ăn từ 22h tối qua.', 1, @Now, N'admin', 0),
    (NEWID(), @ExistingAdmissionId, @NsPhuong, '2026-02-08 16:00:00', 4,
        N'Sau nội soi: BN ổn định, không có biến chứng. Cho ăn lại sau 2h. Hướng dẫn chế độ ăn và phác đồ thuốc uống. Chuẩn bị hồ sơ xuất viện.', 1, @Now, N'admin', 0);
END

PRINT '  Nursing Care Records created.';

-- ============================================================
-- STEP 9: ADD MEDICAL SUPPLIES
-- ============================================================
PRINT 'Step 9: Creating Medical Supplies...';

IF (SELECT COUNT(*) FROM MedicalSupplies) = 0
BEGIN
    INSERT INTO MedicalSupplies (Id, SupplyCode, SupplyName, Unit, Specification, Manufacturer, CountryOfOrigin, UnitPrice, InsurancePrice, IsActive, CreatedAt, IsDeleted)
    VALUES
    (NEWID(), N'VT001', N'Bơm tiêm 5ml', N'Cái', N'5ml, đầu kim 23G', N'Vinahankook', N'Việt Nam', 2500, 2000, 1, @Now, 0),
    (NEWID(), N'VT002', N'Bơm tiêm 10ml', N'Cái', N'10ml, đầu kim 21G', N'Vinahankook', N'Việt Nam', 3500, 3000, 1, @Now, 0),
    (NEWID(), N'VT003', N'Dây truyền dịch', N'Bộ', N'Dây truyền dịch người lớn', N'Nipro', N'Nhật Bản', 15000, 12000, 1, @Now, 0),
    (NEWID(), N'VT004', N'Kim luồn tĩnh mạch 22G', N'Cái', N'22G x 25mm', N'BD Insyte', N'Singapore', 25000, 20000, 1, @Now, 0),
    (NEWID(), N'VT005', N'Gạc vô trùng 10x10cm', N'Miếng', N'Gạc y tế vô khuẩn 10x10cm', N'Bông Bạch Tuyết', N'Việt Nam', 1500, 1200, 1, @Now, 0),
    (NEWID(), N'VT006', N'Băng keo y tế 1.25cm', N'Cuộn', N'Micropore 1.25cm x 9.14m', N'3M', N'Hoa Kỳ', 18000, 15000, 1, @Now, 0),
    (NEWID(), N'VT007', N'Găng tay y tế không bột', N'Đôi', N'Size M, Latex không bột', N'Vglove', N'Việt Nam', 3000, 2500, 1, @Now, 0),
    (NEWID(), N'VT008', N'Ống thở oxy mũi', N'Cái', N'Cannula oxy người lớn', N'Flexicare', N'Anh', 8000, 6500, 1, @Now, 0),
    (NEWID(), N'VT009', N'Nước muối sinh lý NaCl 0.9%', N'Chai', N'NaCl 0.9% 500ml', N'Otsuka', N'Việt Nam', 12000, 10000, 1, @Now, 0),
    (NEWID(), N'VT010', N'Dung dịch Glucose 5%', N'Chai', N'Glucose 5% 500ml', N'Otsuka', N'Việt Nam', 15000, 12000, 1, @Now, 0),
    (NEWID(), N'VT011', N'Chỉ khâu Vicryl 3-0', N'Sợi', N'Chỉ tự tiêu Polyglactin 910, 75cm', N'Ethicon', N'Bỉ', 85000, 70000, 1, @Now, 0),
    (NEWID(), N'VT012', N'Ống nội khí quản 7.5', N'Cái', N'ET tube 7.5mm có bóng chèn', N'Portex', N'Anh', 45000, 38000, 1, @Now, 0);

    PRINT '  Medical Supplies created.';
END
ELSE
    PRINT '  Medical Supplies already exist, skipping.';

-- ============================================================
-- STEP 10: ADD AUDIT LOGS (sample entries)
-- ============================================================
PRINT 'Step 10: Creating Audit Logs...';

IF (SELECT COUNT(*) FROM AuditLogs) = 0
BEGIN
    INSERT INTO AuditLogs (Id, TableName, RecordId, Action, OldValues, NewValues, IpAddress, UserAgent, UserId, Username, CreatedAt, IsDeleted)
    VALUES
    (NEWID(), N'Users', @DrAn, N'INSERT', NULL, N'{"Username":"bsannn","FullName":"BS. Nguyễn Văn An"}', N'192.168.1.100', N'Mozilla/5.0', @AdminId, N'admin', DATEADD(DAY, -7, @Now), 0),
    (NEWID(), N'Users', @DrBinh, N'INSERT', NULL, N'{"Username":"bsbinh","FullName":"BS. Trần Thị Bình"}', N'192.168.1.100', N'Mozilla/5.0', @AdminId, N'admin', DATEADD(DAY, -7, @Now), 0),
    (NEWID(), N'Patients', @Pat1, N'UPDATE', N'{"Status":0}', N'{"Status":1}', N'192.168.1.101', N'Mozilla/5.0', @AdminId, N'admin', DATEADD(DAY, -5, @Now), 0),
    (NEWID(), N'Admissions', @ExistingAdmissionId, N'INSERT', NULL, N'{"PatientId":"42AFD08D-B32E-42F6-8DD3-C63567791F7E","Status":0}', N'192.168.1.102', N'Mozilla/5.0', @AdminId, N'admin', DATEADD(DAY, -17, @Now), 0),
    (NEWID(), N'Queues', NEWID(), N'INSERT', NULL, N'{"QueueNumber":1,"RoomId":"BF6B00E9-578B-47FB-AFF8-AF25FB35A794"}', N'192.168.1.100', N'Mozilla/5.0', @AdminId, N'admin', DATEADD(HOUR, -2, @Now), 0),
    (NEWID(), N'Prescriptions', NEWID(), N'INSERT', NULL, N'{"PrescriptionCode":"DT20260223001","DoctorId":"new"}', N'192.168.1.103', N'Mozilla/5.0', @AdminId, N'admin', DATEADD(HOUR, -1, @Now), 0);

    PRINT '  Audit Logs created.';
END
ELSE
    PRINT '  Audit Logs already exist, skipping.';

-- ============================================================
-- SUMMARY
-- ============================================================
PRINT '';
PRINT '=== HIS Seed Data Script Complete ===';
PRINT '';
PRINT 'Summary of seeded data:';

-- Print counts
DECLARE @cnt INT;
SELECT @cnt = COUNT(*) FROM Users WHERE IsDeleted = 0; PRINT '  Users: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM UserRoles WHERE IsDeleted = 0; PRINT '  UserRoles: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM IcdCodes WHERE IsDeleted = 0; PRINT '  IcdCodes: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM Queues WHERE IsDeleted = 0; PRINT '  Queues: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM SurgerySchedules WHERE IsDeleted = 0; PRINT '  SurgerySchedules: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM SurgeryRecords WHERE IsDeleted = 0; PRINT '  SurgeryRecords: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM SurgeryTeamMembers WHERE IsDeleted = 0; PRINT '  SurgeryTeamMembers: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM InventoryItems WHERE IsDeleted = 0; PRINT '  InventoryItems: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM Suppliers WHERE IsDeleted = 0; PRINT '  Suppliers: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM DailyProgresses WHERE IsDeleted = 0; PRINT '  DailyProgresses: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM NursingCares WHERE IsDeleted = 0; PRINT '  NursingCares: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM MedicalSupplies WHERE IsDeleted = 0; PRINT '  MedicalSupplies: ' + CAST(@cnt AS VARCHAR);
SELECT @cnt = COUNT(*) FROM AuditLogs WHERE IsDeleted = 0; PRINT '  AuditLogs: ' + CAST(@cnt AS VARCHAR);

PRINT '';
PRINT '=== Done ===';
GO
