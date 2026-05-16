-- NangCap11: EMR Admin tables per Cong van 365/TTYQG-GPQLCL
-- 8 new tables + seed 31 cover types (TT 32/2023)

-- 1. EmrCoverTypes (Vo benh an)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmrCoverTypes')
CREATE TABLE EmrCoverTypes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(20) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Category NVARCHAR(50) NOT NULL, -- NoiTru, NgoaiTru, ChuyenKhoa
    DepartmentId UNIQUEIDENTIFIER NULL,
    DepartmentName NVARCHAR(200) NULL,
    [Description] NVARCHAR(500) NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- 2. EmrDocumentAttachments (Dinh kem tai lieu)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmrDocumentAttachments')
CREATE TABLE EmrDocumentAttachments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MedicalRecordId UNIQUEIDENTIFIER NOT NULL,
    FileName NVARCHAR(500) NOT NULL,
    FileType NVARCHAR(100) NOT NULL,
    FileSize BIGINT NOT NULL DEFAULT 0,
    FilePath NVARCHAR(1000) NOT NULL,
    DocumentCategory NVARCHAR(50) NULL, -- XN, CDHA, BenhAn, GiayTo, Khac
    [Description] NVARCHAR(500) NULL,
    UploadedById UNIQUEIDENTIFIER NULL,
    UploadedByName NVARCHAR(200) NULL,
    UploadedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_EmrDocumentAttachments_MedicalRecordId ON EmrDocumentAttachments(MedicalRecordId);

-- 3. EmrPrintLogs (Nhat ky in an)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmrPrintLogs')
CREATE TABLE EmrPrintLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MedicalRecordId UNIQUEIDENTIFIER NOT NULL,
    DocumentType NVARCHAR(100) NOT NULL,
    DocumentTitle NVARCHAR(500) NOT NULL,
    PrintedById UNIQUEIDENTIFIER NULL,
    PrintedByName NVARCHAR(200) NULL,
    PrintedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    IsStamped BIT NOT NULL DEFAULT 0,
    StampedAt DATETIME2 NULL,
    StampedByName NVARCHAR(200) NULL,
    PrintCount INT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_EmrPrintLogs_MedicalRecordId ON EmrPrintLogs(MedicalRecordId);

-- 4. EmrSignerCatalogs (Danh muc nguoi ky)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmrSignerCatalogs')
CREATE TABLE EmrSignerCatalogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    UserName NVARCHAR(100) NOT NULL,
    FullName NVARCHAR(200) NOT NULL,
    Title NVARCHAR(50) NULL, -- BS, BSCKI, BSCKII, ThS, TS, PGS, GS
    DepartmentId UNIQUEIDENTIFIER NULL,
    DepartmentName NVARCHAR(200) NULL,
    CertificateInfo NVARCHAR(500) NULL,
    SignatureImagePath NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- 5. EmrSigningRoles (Vai tro ky)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmrSigningRoles')
CREATE TABLE EmrSigningRoles (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(20) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    [Description] NVARCHAR(500) NULL,
    SortOrder INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- 6. EmrSigningOperations (Nghiep vu ky)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmrSigningOperations')
CREATE TABLE EmrSigningOperations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    RoleId UNIQUEIDENTIFIER NULL,
    RoleName NVARCHAR(200) NULL,
    DocumentType NVARCHAR(100) NULL,
    IsRequired BIT NOT NULL DEFAULT 1,
    SortOrder INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- 7. EmrDocumentGroups (Nhom van ban)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmrDocumentGroups')
CREATE TABLE EmrDocumentGroups (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(20) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Category NVARCHAR(50) NULL, -- BenhAn, DieuTri, ChamSoc, XetNghiem, ChanDoan, Khac
    SortOrder INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- 8. EmrDocumentTypes (Loai van ban)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EmrDocumentTypes')
CREATE TABLE EmrDocumentTypes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    GroupId UNIQUEIDENTIFIER NULL,
    GroupName NVARCHAR(200) NULL,
    FormTemplateKey NVARCHAR(100) NULL,
    IsRequired BIT NOT NULL DEFAULT 0,
    SortOrder INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedBy NVARCHAR(450) NULL,
    UpdatedAt DATETIME2 NULL,
    UpdatedBy NVARCHAR(450) NULL,
    IsDeleted BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_EmrDocumentTypes_GroupId ON EmrDocumentTypes(GroupId);

-- ============ SEED: 31 Vo benh an theo TT 32/2023/TT-BYT ============
IF NOT EXISTS (SELECT 1 FROM EmrCoverTypes WHERE Code = 'BA01')
BEGIN
    INSERT INTO EmrCoverTypes (Id, Code, Name, Category, SortOrder) VALUES
    (NEWID(), 'BA01', N'Benh an noi khoa', 'NoiTru', 1),
    (NEWID(), 'BA02', N'Benh an ngoai khoa', 'NoiTru', 2),
    (NEWID(), 'BA03', N'Benh an san khoa', 'NoiTru', 3),
    (NEWID(), 'BA04', N'Benh an phu khoa', 'NoiTru', 4),
    (NEWID(), 'BA05', N'Benh an nhi khoa', 'NoiTru', 5),
    (NEWID(), 'BA06', N'Benh an truyen nhiem', 'NoiTru', 6),
    (NEWID(), 'BA07', N'Benh an da lieu', 'ChuyenKhoa', 7),
    (NEWID(), 'BA08', N'Benh an mat', 'ChuyenKhoa', 8),
    (NEWID(), 'BA09', N'Benh an tai mui hong', 'ChuyenKhoa', 9),
    (NEWID(), 'BA10', N'Benh an rang ham mat', 'ChuyenKhoa', 10),
    (NEWID(), 'BA11', N'Benh an tam than', 'ChuyenKhoa', 11),
    (NEWID(), 'BA12', N'Benh an phuc hoi chuc nang', 'ChuyenKhoa', 12),
    (NEWID(), 'BA13', N'Benh an bong', 'ChuyenKhoa', 13),
    (NEWID(), 'BA14', N'Benh an ung buou', 'ChuyenKhoa', 14),
    (NEWID(), 'BA15', N'Benh an y hoc co truyen', 'ChuyenKhoa', 15),
    (NEWID(), 'BA16', N'Benh an cap cuu', 'NoiTru', 16),
    (NEWID(), 'BA17', N'Benh an hoi suc tich cuc', 'NoiTru', 17),
    (NEWID(), 'BA18', N'Benh an so sinh', 'ChuyenKhoa', 18),
    (NEWID(), 'BA19', N'Benh an ngoai tru', 'NgoaiTru', 19),
    (NEWID(), 'BA20', N'Benh an ngoai tru - Kham benh', 'NgoaiTru', 20),
    (NEWID(), 'BA21', N'Benh an ngoai tru - Theo doi', 'NgoaiTru', 21),
    (NEWID(), 'BA22', N'Benh an ngoai tru - PHCN', 'NgoaiTru', 22),
    (NEWID(), 'BA23', N'Benh an ngay', 'NgoaiTru', 23),
    (NEWID(), 'BA24', N'Benh an phau thuat ngay', 'NgoaiTru', 24),
    (NEWID(), 'BA25', N'Benh an noi tru - Ung buou (hoa xa tri)', 'ChuyenKhoa', 25),
    (NEWID(), 'BA26', N'Benh an dinh duong', 'ChuyenKhoa', 26),
    (NEWID(), 'BA27', N'Benh an dieu tri ARV', 'ChuyenKhoa', 27),
    (NEWID(), 'BA28', N'Benh an chan thuong chinh hinh', 'ChuyenKhoa', 28),
    (NEWID(), 'BA29', N'Benh an loc mau', 'ChuyenKhoa', 29),
    (NEWID(), 'BA30', N'Benh an ghep tang', 'ChuyenKhoa', 30),
    (NEWID(), 'BA31', N'Benh an giam dinh phap y', 'ChuyenKhoa', 31);
END;

-- ============ SEED: Signing Roles ============
IF NOT EXISTS (SELECT 1 FROM EmrSigningRoles WHERE Code = 'BSDT')
BEGIN
    INSERT INTO EmrSigningRoles (Id, Code, Name, [Description], SortOrder) VALUES
    (NEWID(), 'BSDT', N'Bac si dieu tri', N'Bac si truc tiep dieu tri benh nhan', 1),
    (NEWID(), 'TK', N'Truong khoa', N'Truong khoa duyet phieu', 2),
    (NEWID(), 'PTK', N'Pho truong khoa', N'Pho truong khoa duyet phieu', 3),
    (NEWID(), 'DD', N'Dieu duong', N'Dieu duong cham soc', 4),
    (NEWID(), 'DDT', N'Dieu duong truong', N'Dieu duong truong khoa', 5),
    (NEWID(), 'GD', N'Giam doc', N'Giam doc benh vien', 6),
    (NEWID(), 'PGD', N'Pho giam doc', N'Pho giam doc benh vien', 7),
    (NEWID(), 'KHTH', N'Ke hoach Tong hop', N'Phong KHTH duyet', 8);
END;

-- ============ SEED: Document Groups ============
IF NOT EXISTS (SELECT 1 FROM EmrDocumentGroups WHERE Code = 'BA')
BEGIN
    INSERT INTO EmrDocumentGroups (Id, Code, Name, Category, SortOrder) VALUES
    (NEWID(), 'BA', N'Ho so benh an', 'BenhAn', 1),
    (NEWID(), 'DT', N'Phieu dieu tri', 'DieuTri', 2),
    (NEWID(), 'CS', N'Phieu cham soc', 'ChamSoc', 3),
    (NEWID(), 'XN', N'Ket qua xet nghiem', 'XetNghiem', 4),
    (NEWID(), 'CD', N'Ket qua chan doan hinh anh', 'ChanDoan', 5),
    (NEWID(), 'PT', N'Phieu phau thuat thu thuat', 'DieuTri', 6),
    (NEWID(), 'HC', N'Bien ban hoi chan', 'DieuTri', 7),
    (NEWID(), 'GR', N'Giay ra vien', 'BenhAn', 8),
    (NEWID(), 'DK', N'Don thuoc/ke don', 'DieuTri', 9),
    (NEWID(), 'KH', N'Khac', 'Khac', 10);
END;

PRINT 'NangCap11 tables and seed data created successfully';
