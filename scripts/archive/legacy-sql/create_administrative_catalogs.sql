-- ============================================================================
-- Administrative Catalogs: Occupations, Genders, AdministrativeDivisions,
--   Countries (add columns), HealthcareFacilities
-- Idempotent: IF NOT EXISTS / IF COL NOT EXISTS
-- ============================================================================

USE HIS;
GO

-- ============================================================================
-- 1. Occupations (Nghề nghiệp)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Occupations')
BEGIN
    CREATE TABLE Occupations (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(20) NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_Occupations_Code ON Occupations(Code);
END
GO

-- Seed occupations (common Vietnamese occupations per BHXH classification)
IF NOT EXISTS (SELECT 1 FROM Occupations)
BEGIN
    INSERT INTO Occupations (Id, Code, Name, SortOrder, IsActive) VALUES
    (NEWID(), 'NN01', N'Cán bộ, công chức', 1, 1),
    (NEWID(), 'NN02', N'Viên chức', 2, 1),
    (NEWID(), 'NN03', N'Công nhân', 3, 1),
    (NEWID(), 'NN04', N'Nông dân', 4, 1),
    (NEWID(), 'NN05', N'Ngư dân', 5, 1),
    (NEWID(), 'NN06', N'Buôn bán', 6, 1),
    (NEWID(), 'NN07', N'Lái xe', 7, 1),
    (NEWID(), 'NN08', N'Bác sĩ', 8, 1),
    (NEWID(), 'NN09', N'Y tá, Điều dưỡng', 9, 1),
    (NEWID(), 'NN10', N'Dược sĩ', 10, 1),
    (NEWID(), 'NN11', N'Giáo viên', 11, 1),
    (NEWID(), 'NN12', N'Kỹ sư', 12, 1),
    (NEWID(), 'NN13', N'Luật sư', 13, 1),
    (NEWID(), 'NN14', N'Kiến trúc sư', 14, 1),
    (NEWID(), 'NN15', N'Kế toán', 15, 1),
    (NEWID(), 'NN16', N'Học sinh, Sinh viên', 16, 1),
    (NEWID(), 'NN17', N'Nội trợ', 17, 1),
    (NEWID(), 'NN18', N'Hưu trí', 18, 1),
    (NEWID(), 'NN19', N'Tự do', 19, 1),
    (NEWID(), 'NN20', N'Thất nghiệp', 20, 1),
    (NEWID(), 'NN21', N'Bộ đội, Công an', 21, 1),
    (NEWID(), 'NN22', N'Thợ thủ công', 22, 1),
    (NEWID(), 'NN23', N'Kinh doanh', 23, 1),
    (NEWID(), 'NN24', N'Nghệ sĩ', 24, 1),
    (NEWID(), 'NN25', N'Nghề khác', 25, 1);
END
GO

-- ============================================================================
-- 2. Genders (Giới tính)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Genders')
BEGIN
    CREATE TABLE Genders (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(10) NOT NULL,
        Name NVARCHAR(50) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
END
GO

-- Seed genders
IF NOT EXISTS (SELECT 1 FROM Genders)
BEGIN
    INSERT INTO Genders (Id, Code, Name, SortOrder, IsActive) VALUES
    (NEWID(), '1', N'Nam', 1, 1),
    (NEWID(), '2', N'Nữ', 2, 1),
    (NEWID(), '3', N'Khác', 3, 1);
END
GO

-- ============================================================================
-- 3. AdministrativeDivisions (Đơn vị hành chính - Tỉnh/Huyện/Xã)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AdministrativeDivisions')
BEGIN
    CREATE TABLE AdministrativeDivisions (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(20) NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        Level INT NOT NULL, -- 1=Tinh, 2=Huyen, 3=Xa
        ParentCode NVARCHAR(20) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_AdministrativeDivisions_Code ON AdministrativeDivisions(Code);
    CREATE INDEX IX_AdministrativeDivisions_Level ON AdministrativeDivisions(Level);
    CREATE INDEX IX_AdministrativeDivisions_ParentCode ON AdministrativeDivisions(ParentCode);
END
GO

-- Seed 63 provinces/cities of Vietnam
IF NOT EXISTS (SELECT 1 FROM AdministrativeDivisions WHERE Level = 1)
BEGIN
    INSERT INTO AdministrativeDivisions (Id, Code, Name, Level, ParentCode, SortOrder, IsActive) VALUES
    -- 5 thành phố trực thuộc trung ương
    (NEWID(), '01', N'Thành phố Hà Nội', 1, NULL, 1, 1),
    (NEWID(), '79', N'Thành phố Hồ Chí Minh', 1, NULL, 2, 1),
    (NEWID(), '48', N'Thành phố Đà Nẵng', 1, NULL, 3, 1),
    (NEWID(), '31', N'Thành phố Hải Phòng', 1, NULL, 4, 1),
    (NEWID(), '92', N'Thành phố Cần Thơ', 1, NULL, 5, 1),
    -- Đồng bằng sông Hồng
    (NEWID(), '02', N'Tỉnh Hà Giang', 1, NULL, 6, 1),
    (NEWID(), '04', N'Tỉnh Cao Bằng', 1, NULL, 7, 1),
    (NEWID(), '06', N'Tỉnh Bắc Kạn', 1, NULL, 8, 1),
    (NEWID(), '08', N'Tỉnh Tuyên Quang', 1, NULL, 9, 1),
    (NEWID(), '10', N'Tỉnh Lào Cai', 1, NULL, 10, 1),
    (NEWID(), '11', N'Tỉnh Điện Biên', 1, NULL, 11, 1),
    (NEWID(), '12', N'Tỉnh Lai Châu', 1, NULL, 12, 1),
    (NEWID(), '14', N'Tỉnh Sơn La', 1, NULL, 13, 1),
    (NEWID(), '15', N'Tỉnh Yên Bái', 1, NULL, 14, 1),
    (NEWID(), '17', N'Tỉnh Hòa Bình', 1, NULL, 15, 1),
    (NEWID(), '19', N'Tỉnh Thái Nguyên', 1, NULL, 16, 1),
    (NEWID(), '20', N'Tỉnh Lạng Sơn', 1, NULL, 17, 1),
    (NEWID(), '22', N'Tỉnh Quảng Ninh', 1, NULL, 18, 1),
    (NEWID(), '24', N'Tỉnh Bắc Giang', 1, NULL, 19, 1),
    (NEWID(), '25', N'Tỉnh Phú Thọ', 1, NULL, 20, 1),
    (NEWID(), '26', N'Tỉnh Vĩnh Phúc', 1, NULL, 21, 1),
    (NEWID(), '27', N'Tỉnh Bắc Ninh', 1, NULL, 22, 1),
    (NEWID(), '30', N'Tỉnh Hải Dương', 1, NULL, 23, 1),
    (NEWID(), '33', N'Tỉnh Hưng Yên', 1, NULL, 24, 1),
    (NEWID(), '34', N'Tỉnh Thái Bình', 1, NULL, 25, 1),
    (NEWID(), '35', N'Tỉnh Hà Nam', 1, NULL, 26, 1),
    (NEWID(), '36', N'Tỉnh Nam Định', 1, NULL, 27, 1),
    (NEWID(), '37', N'Tỉnh Ninh Bình', 1, NULL, 28, 1),
    -- Bắc Trung Bộ
    (NEWID(), '38', N'Tỉnh Thanh Hóa', 1, NULL, 29, 1),
    (NEWID(), '40', N'Tỉnh Nghệ An', 1, NULL, 30, 1),
    (NEWID(), '42', N'Tỉnh Hà Tĩnh', 1, NULL, 31, 1),
    (NEWID(), '44', N'Tỉnh Quảng Bình', 1, NULL, 32, 1),
    (NEWID(), '45', N'Tỉnh Quảng Trị', 1, NULL, 33, 1),
    (NEWID(), '46', N'Tỉnh Thừa Thiên Huế', 1, NULL, 34, 1),
    -- Nam Trung Bộ
    (NEWID(), '49', N'Tỉnh Quảng Nam', 1, NULL, 35, 1),
    (NEWID(), '51', N'Tỉnh Quảng Ngãi', 1, NULL, 36, 1),
    (NEWID(), '52', N'Tỉnh Bình Định', 1, NULL, 37, 1),
    (NEWID(), '54', N'Tỉnh Phú Yên', 1, NULL, 38, 1),
    (NEWID(), '56', N'Tỉnh Khánh Hòa', 1, NULL, 39, 1),
    (NEWID(), '58', N'Tỉnh Ninh Thuận', 1, NULL, 40, 1),
    (NEWID(), '60', N'Tỉnh Bình Thuận', 1, NULL, 41, 1),
    -- Tây Nguyên
    (NEWID(), '62', N'Tỉnh Kon Tum', 1, NULL, 42, 1),
    (NEWID(), '64', N'Tỉnh Gia Lai', 1, NULL, 43, 1),
    (NEWID(), '66', N'Tỉnh Đắk Lắk', 1, NULL, 44, 1),
    (NEWID(), '67', N'Tỉnh Đắk Nông', 1, NULL, 45, 1),
    (NEWID(), '68', N'Tỉnh Lâm Đồng', 1, NULL, 46, 1),
    -- Đông Nam Bộ
    (NEWID(), '70', N'Tỉnh Bình Phước', 1, NULL, 47, 1),
    (NEWID(), '72', N'Tỉnh Tây Ninh', 1, NULL, 48, 1),
    (NEWID(), '74', N'Tỉnh Bình Dương', 1, NULL, 49, 1),
    (NEWID(), '75', N'Tỉnh Đồng Nai', 1, NULL, 50, 1),
    (NEWID(), '77', N'Tỉnh Bà Rịa - Vũng Tàu', 1, NULL, 51, 1),
    -- Đồng bằng sông Cửu Long
    (NEWID(), '80', N'Tỉnh Long An', 1, NULL, 52, 1),
    (NEWID(), '82', N'Tỉnh Tiền Giang', 1, NULL, 53, 1),
    (NEWID(), '83', N'Tỉnh Bến Tre', 1, NULL, 54, 1),
    (NEWID(), '84', N'Tỉnh Trà Vinh', 1, NULL, 55, 1),
    (NEWID(), '86', N'Tỉnh Vĩnh Long', 1, NULL, 56, 1),
    (NEWID(), '87', N'Tỉnh Đồng Tháp', 1, NULL, 57, 1),
    (NEWID(), '89', N'Tỉnh An Giang', 1, NULL, 58, 1),
    (NEWID(), '91', N'Tỉnh Kiên Giang', 1, NULL, 59, 1),
    (NEWID(), '93', N'Tỉnh Hậu Giang', 1, NULL, 60, 1),
    (NEWID(), '94', N'Tỉnh Sóc Trăng', 1, NULL, 61, 1),
    (NEWID(), '95', N'Tỉnh Bạc Liêu', 1, NULL, 62, 1),
    (NEWID(), '96', N'Tỉnh Cà Mau', 1, NULL, 63, 1);
END
GO

-- Seed sample districts for Hanoi (01) as example
IF NOT EXISTS (SELECT 1 FROM AdministrativeDivisions WHERE Level = 2 AND ParentCode = '01')
BEGIN
    INSERT INTO AdministrativeDivisions (Id, Code, Name, Level, ParentCode, SortOrder, IsActive) VALUES
    (NEWID(), '001', N'Quận Ba Đình', 2, '01', 1, 1),
    (NEWID(), '002', N'Quận Hoàn Kiếm', 2, '01', 2, 1),
    (NEWID(), '003', N'Quận Tây Hồ', 2, '01', 3, 1),
    (NEWID(), '004', N'Quận Long Biên', 2, '01', 4, 1),
    (NEWID(), '005', N'Quận Cầu Giấy', 2, '01', 5, 1),
    (NEWID(), '006', N'Quận Đống Đa', 2, '01', 6, 1),
    (NEWID(), '007', N'Quận Hai Bà Trưng', 2, '01', 7, 1),
    (NEWID(), '008', N'Quận Hoàng Mai', 2, '01', 8, 1),
    (NEWID(), '009', N'Quận Thanh Xuân', 2, '01', 9, 1),
    (NEWID(), '016', N'Quận Hà Đông', 2, '01', 10, 1),
    (NEWID(), '017', N'Quận Bắc Từ Liêm', 2, '01', 11, 1),
    (NEWID(), '018', N'Quận Nam Từ Liêm', 2, '01', 12, 1),
    (NEWID(), '019', N'Huyện Sóc Sơn', 2, '01', 13, 1),
    (NEWID(), '020', N'Huyện Đông Anh', 2, '01', 14, 1),
    (NEWID(), '021', N'Huyện Gia Lâm', 2, '01', 15, 1);
END
GO

-- Seed sample districts for HCMC (79)
IF NOT EXISTS (SELECT 1 FROM AdministrativeDivisions WHERE Level = 2 AND ParentCode = '79')
BEGIN
    INSERT INTO AdministrativeDivisions (Id, Code, Name, Level, ParentCode, SortOrder, IsActive) VALUES
    (NEWID(), '760', N'Quận 1', 2, '79', 1, 1),
    (NEWID(), '761', N'Quận 12', 2, '79', 2, 1),
    (NEWID(), '764', N'Quận Gò Vấp', 2, '79', 3, 1),
    (NEWID(), '765', N'Quận Bình Thạnh', 2, '79', 4, 1),
    (NEWID(), '766', N'Quận Tân Bình', 2, '79', 5, 1),
    (NEWID(), '767', N'Quận Tân Phú', 2, '79', 6, 1),
    (NEWID(), '768', N'Quận Phú Nhuận', 2, '79', 7, 1),
    (NEWID(), '769', N'Thành phố Thủ Đức', 2, '79', 8, 1),
    (NEWID(), '770', N'Quận 3', 2, '79', 9, 1),
    (NEWID(), '771', N'Quận 10', 2, '79', 10, 1),
    (NEWID(), '772', N'Quận 11', 2, '79', 11, 1),
    (NEWID(), '773', N'Quận 4', 2, '79', 12, 1),
    (NEWID(), '774', N'Quận 5', 2, '79', 13, 1),
    (NEWID(), '775', N'Quận 6', 2, '79', 14, 1),
    (NEWID(), '776', N'Quận 8', 2, '79', 15, 1),
    (NEWID(), '777', N'Quận Bình Tân', 2, '79', 16, 1),
    (NEWID(), '778', N'Quận 7', 2, '79', 17, 1),
    (NEWID(), '783', N'Huyện Củ Chi', 2, '79', 18, 1),
    (NEWID(), '784', N'Huyện Hóc Môn', 2, '79', 19, 1),
    (NEWID(), '785', N'Huyện Bình Chánh', 2, '79', 20, 1),
    (NEWID(), '786', N'Huyện Nhà Bè', 2, '79', 21, 1),
    (NEWID(), '787', N'Huyện Cần Giờ', 2, '79', 22, 1);
END
GO

-- Sample wards for Quan Ba Dinh (001)
IF NOT EXISTS (SELECT 1 FROM AdministrativeDivisions WHERE Level = 3 AND ParentCode = '001')
BEGIN
    INSERT INTO AdministrativeDivisions (Id, Code, Name, Level, ParentCode, SortOrder, IsActive) VALUES
    (NEWID(), '00001', N'Phường Phúc Xá', 3, '001', 1, 1),
    (NEWID(), '00004', N'Phường Trúc Bạch', 3, '001', 2, 1),
    (NEWID(), '00006', N'Phường Vĩnh Phúc', 3, '001', 3, 1),
    (NEWID(), '00007', N'Phường Cống Vị', 3, '001', 4, 1),
    (NEWID(), '00008', N'Phường Liễu Giai', 3, '001', 5, 1),
    (NEWID(), '00010', N'Phường Nguyễn Trung Trực', 3, '001', 6, 1),
    (NEWID(), '00013', N'Phường Quán Thánh', 3, '001', 7, 1),
    (NEWID(), '00016', N'Phường Ngọc Hà', 3, '001', 8, 1),
    (NEWID(), '00019', N'Phường Điện Biên', 3, '001', 9, 1),
    (NEWID(), '00022', N'Phường Đội Cấn', 3, '001', 10, 1),
    (NEWID(), '00025', N'Phường Ngọc Khánh', 3, '001', 11, 1),
    (NEWID(), '00028', N'Phường Kim Mã', 3, '001', 12, 1),
    (NEWID(), '00031', N'Phường Giảng Võ', 3, '001', 13, 1),
    (NEWID(), '00034', N'Phường Thành Công', 3, '001', 14, 1);
END
GO

-- ============================================================================
-- 4. Countries - add NationalityName and SortOrder columns if missing
-- ============================================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Countries' AND COLUMN_NAME = 'NationalityName')
BEGIN
    ALTER TABLE Countries ADD NationalityName NVARCHAR(200) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Countries' AND COLUMN_NAME = 'SortOrder')
BEGIN
    ALTER TABLE Countries ADD SortOrder INT NOT NULL DEFAULT 0;
END
GO

-- Update existing countries with NationalityName if they have none
UPDATE Countries SET NationalityName = N'Việt Nam', SortOrder = 1 WHERE Code = 'VN' AND NationalityName IS NULL;
GO

-- Seed countries if table is empty or only has VN
IF (SELECT COUNT(*) FROM Countries WHERE IsDeleted = 0) < 5
BEGIN
    -- Delete existing to re-seed with full data
    DELETE FROM Countries;

    INSERT INTO Countries (Id, Code, Name, NationalityName, SortOrder, IsActive) VALUES
    (NEWID(), 'VN', N'Việt Nam', N'Việt Nam', 1, 1),
    (NEWID(), 'US', N'Hoa Kỳ', N'Mỹ', 2, 1),
    (NEWID(), 'CN', N'Trung Quốc', N'Trung Quốc', 3, 1),
    (NEWID(), 'JP', N'Nhật Bản', N'Nhật Bản', 4, 1),
    (NEWID(), 'KR', N'Hàn Quốc', N'Hàn Quốc', 5, 1),
    (NEWID(), 'TH', N'Thái Lan', N'Thái Lan', 6, 1),
    (NEWID(), 'LA', N'Lào', N'Lào', 7, 1),
    (NEWID(), 'KH', N'Campuchia', N'Campuchia', 8, 1),
    (NEWID(), 'MY', N'Malaysia', N'Malaysia', 9, 1),
    (NEWID(), 'SG', N'Singapore', N'Singapore', 10, 1),
    (NEWID(), 'ID', N'Indonesia', N'Indonesia', 11, 1),
    (NEWID(), 'PH', N'Philippines', N'Philippines', 12, 1),
    (NEWID(), 'IN', N'Ấn Độ', N'Ấn Độ', 13, 1),
    (NEWID(), 'AU', N'Úc', N'Úc', 14, 1),
    (NEWID(), 'GB', N'Vương quốc Anh', N'Anh', 15, 1),
    (NEWID(), 'FR', N'Pháp', N'Pháp', 16, 1),
    (NEWID(), 'DE', N'Đức', N'Đức', 17, 1),
    (NEWID(), 'RU', N'Nga', N'Nga', 18, 1),
    (NEWID(), 'CA', N'Canada', N'Canada', 19, 1),
    (NEWID(), 'TW', N'Đài Loan', N'Đài Loan', 20, 1),
    (NEWID(), 'MM', N'Myanmar', N'Myanmar', 21, 1);
END
GO

-- ============================================================================
-- 5. HealthcareFacilities (Cơ sở KCB - CSKCB)
-- ============================================================================
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'HealthcareFacilities')
BEGIN
    CREATE TABLE HealthcareFacilities (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(20) NOT NULL,
        Name NVARCHAR(500) NOT NULL,
        Address NVARCHAR(500) NULL,
        Level NVARCHAR(20) NULL, -- TW, Tinh, Huyen, Xa
        ProvinceCode NVARCHAR(10) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_HealthcareFacilities_Code ON HealthcareFacilities(Code);
    CREATE INDEX IX_HealthcareFacilities_Level ON HealthcareFacilities(Level);
    CREATE INDEX IX_HealthcareFacilities_ProvinceCode ON HealthcareFacilities(ProvinceCode);
END
GO

-- Seed sample healthcare facilities
IF NOT EXISTS (SELECT 1 FROM HealthcareFacilities)
BEGIN
    INSERT INTO HealthcareFacilities (Id, Code, Name, Address, Level, ProvinceCode, SortOrder, IsActive) VALUES
    -- Bệnh viện trung ương
    (NEWID(), '01001', N'Bệnh viện Bạch Mai', N'78 Giải Phóng, Đống Đa, Hà Nội', 'TW', '01', 1, 1),
    (NEWID(), '01002', N'Bệnh viện Việt Đức', N'40 Tràng Thi, Hoàn Kiếm, Hà Nội', 'TW', '01', 2, 1),
    (NEWID(), '01003', N'Bệnh viện Nhi Trung ương', N'18/879 La Thành, Đống Đa, Hà Nội', 'TW', '01', 3, 1),
    (NEWID(), '01004', N'Bệnh viện K', N'43 Quán Sứ, Hoàn Kiếm, Hà Nội', 'TW', '01', 4, 1),
    (NEWID(), '01005', N'Bệnh viện Phụ sản Trung ương', N'43 Tràng Thi, Hoàn Kiếm, Hà Nội', 'TW', '01', 5, 1),
    (NEWID(), '01006', N'Bệnh viện E', N'89 Trần Cung, Cầu Giấy, Hà Nội', 'TW', '01', 6, 1),
    (NEWID(), '01007', N'Bệnh viện Tai Mũi Họng Trung ương', N'78 Giải Phóng, Đống Đa, Hà Nội', 'TW', '01', 7, 1),
    (NEWID(), '79001', N'Bệnh viện Chợ Rẫy', N'201B Nguyễn Chí Thanh, Quận 5, TP.HCM', 'TW', '79', 8, 1),
    (NEWID(), '79002', N'Bệnh viện Thống Nhất', N'1 Lý Thường Kiệt, Quận Tân Bình, TP.HCM', 'TW', '79', 9, 1),
    (NEWID(), '79003', N'Bệnh viện Nhân dân 115', N'527 Sư Vạn Hạnh, Quận 10, TP.HCM', 'TW', '79', 10, 1),
    -- Bệnh viện tỉnh
    (NEWID(), '01010', N'Bệnh viện Đa khoa Xanh Pôn', N'12 Chu Văn An, Ba Đình, Hà Nội', 'Tinh', '01', 11, 1),
    (NEWID(), '01011', N'Bệnh viện Đa khoa Đống Đa', N'35 Trung Tự, Đống Đa, Hà Nội', 'Tinh', '01', 12, 1),
    (NEWID(), '48001', N'Bệnh viện Đa khoa Đà Nẵng', N'124 Hải Phòng, Thạch Thang, Đà Nẵng', 'Tinh', '48', 13, 1),
    (NEWID(), '31001', N'Bệnh viện Hữu nghị Việt Tiệp', N'1 Nhà Thương, Lê Chân, Hải Phòng', 'Tinh', '31', 14, 1),
    -- Bệnh viện huyện
    (NEWID(), '01020', N'Trung tâm Y tế huyện Sóc Sơn', N'TT Sóc Sơn, Sóc Sơn, Hà Nội', 'Huyen', '01', 15, 1),
    (NEWID(), '01021', N'Trung tâm Y tế huyện Đông Anh', N'TT Đông Anh, Đông Anh, Hà Nội', 'Huyen', '01', 16, 1),
    -- Trạm y tế xã
    (NEWID(), '01030', N'Trạm Y tế phường Phúc Xá', N'Phường Phúc Xá, Ba Đình, Hà Nội', 'Xa', '01', 17, 1),
    (NEWID(), '01031', N'Trạm Y tế phường Trúc Bạch', N'Phường Trúc Bạch, Ba Đình, Hà Nội', 'Xa', '01', 18, 1);
END
GO

PRINT N'Administrative catalogs created and seeded successfully.';
GO
