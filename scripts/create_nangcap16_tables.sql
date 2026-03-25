-- NangCap16 Tables: EMR Enhancement - Sharing, Extracts, Spines, Signatures, Locks, Tags, Images, Shortcodes, AutoCheck, CloseLogs
-- Idempotent script: IF NOT EXISTS for all tables
-- Run: docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HisDocker2024Pass#" -d HIS -i /tmp/create_nangcap16_tables.sql -C

USE HIS;
GO

-- ============================================================
-- 1. EmrShares - Chia se ho so benh an dien tu
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrShares')
BEGIN
    CREATE TABLE EmrShares (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ExaminationId UNIQUEIDENTIFIER NOT NULL,
        SharedByUserId NVARCHAR(450) NULL,
        SharedToUserId NVARCHAR(450) NULL,
        SharedToDepartmentId UNIQUEIDENTIFIER NULL,
        ShareType INT NOT NULL DEFAULT 1, -- 1=User, 2=Department, 3=PublicLink
        FormType NVARCHAR(200) NULL,
        ExpiresAt DATETIME2 NULL,
        AccessCount INT NOT NULL DEFAULT 0,
        IsRevoked BIT NOT NULL DEFAULT 0,
        Note NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_EmrShares_ExaminationId ON EmrShares(ExaminationId);
    CREATE INDEX IX_EmrShares_SharedByUserId ON EmrShares(SharedByUserId);
    CREATE INDEX IX_EmrShares_SharedToUserId ON EmrShares(SharedToUserId);
    CREATE INDEX IX_EmrShares_SharedToDepartmentId ON EmrShares(SharedToDepartmentId);
    CREATE INDEX IX_EmrShares_ShareType ON EmrShares(ShareType);
    CREATE INDEX IX_EmrShares_ExpiresAt ON EmrShares(ExpiresAt) WHERE IsRevoked = 0 AND IsDeleted = 0;

    PRINT 'Created table: EmrShares';
END
ELSE
    PRINT 'Table EmrShares already exists';
GO

-- ============================================================
-- 2. EmrShareAccessLogs - Nhat ky truy cap chia se
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrShareAccessLogs')
BEGIN
    CREATE TABLE EmrShareAccessLogs (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        EmrShareId UNIQUEIDENTIFIER NOT NULL,
        AccessedByUserId NVARCHAR(450) NULL,
        AccessedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        Action NVARCHAR(50) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_EmrShareAccessLogs_EmrShare FOREIGN KEY (EmrShareId)
            REFERENCES EmrShares(Id) ON DELETE NO ACTION
    );

    CREATE INDEX IX_EmrShareAccessLogs_EmrShareId ON EmrShareAccessLogs(EmrShareId);
    CREATE INDEX IX_EmrShareAccessLogs_AccessedByUserId ON EmrShareAccessLogs(AccessedByUserId);
    CREATE INDEX IX_EmrShareAccessLogs_AccessedAt ON EmrShareAccessLogs(AccessedAt);

    PRINT 'Created table: EmrShareAccessLogs';
END
ELSE
    PRINT 'Table EmrShareAccessLogs already exists';
GO

-- ============================================================
-- 3. EmrExtracts - Trich xuat ho so benh an
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrExtracts')
BEGIN
    CREATE TABLE EmrExtracts (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ExaminationId UNIQUEIDENTIFIER NOT NULL,
        ExtractedByUserId NVARCHAR(450) NULL,
        ExtractType INT NOT NULL DEFAULT 1, -- 1=FullRecord, 2=SelectedForms, 3=Summary
        FormTypes NVARCHAR(1000) NULL,
        WatermarkText NVARCHAR(500) NULL,
        AccessCode NVARCHAR(100) NULL,
        ExpiresAt DATETIME2 NULL,
        AccessCount INT NOT NULL DEFAULT 0,
        MaxAccessCount INT NOT NULL DEFAULT 5,
        IsRevoked BIT NOT NULL DEFAULT 0,
        Note NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_EmrExtracts_ExaminationId ON EmrExtracts(ExaminationId);
    CREATE INDEX IX_EmrExtracts_ExtractedByUserId ON EmrExtracts(ExtractedByUserId);
    CREATE INDEX IX_EmrExtracts_AccessCode ON EmrExtracts(AccessCode);
    CREATE INDEX IX_EmrExtracts_ExpiresAt ON EmrExtracts(ExpiresAt) WHERE IsRevoked = 0 AND IsDeleted = 0;

    PRINT 'Created table: EmrExtracts';
END
ELSE
    PRINT 'Table EmrExtracts already exists';
GO

-- ============================================================
-- 4. EmrSpines - Cau truc gay ho so benh an
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrSpines')
BEGIN
    CREATE TABLE EmrSpines (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        Name NVARCHAR(200) NOT NULL,
        Code NVARCHAR(50) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        Description NVARCHAR(500) NULL,
        IsDefault BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IX_EmrSpines_Code ON EmrSpines(Code) WHERE IsDeleted = 0;
    CREATE INDEX IX_EmrSpines_IsActive ON EmrSpines(IsActive) WHERE IsDeleted = 0;
    CREATE INDEX IX_EmrSpines_SortOrder ON EmrSpines(SortOrder);

    PRINT 'Created table: EmrSpines';
END
ELSE
    PRINT 'Table EmrSpines already exists';
GO

-- ============================================================
-- 5. EmrSpineSections - Phan cua gay ho so
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrSpineSections')
BEGIN
    CREATE TABLE EmrSpineSections (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        EmrSpineId UNIQUEIDENTIFIER NOT NULL,
        FormType NVARCHAR(100) NOT NULL,
        FormName NVARCHAR(200) NOT NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsRequired BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_EmrSpineSections_EmrSpine FOREIGN KEY (EmrSpineId)
            REFERENCES EmrSpines(Id) ON DELETE NO ACTION
    );

    CREATE INDEX IX_EmrSpineSections_EmrSpineId ON EmrSpineSections(EmrSpineId);
    CREATE INDEX IX_EmrSpineSections_FormType ON EmrSpineSections(FormType);
    CREATE INDEX IX_EmrSpineSections_SortOrder ON EmrSpineSections(SortOrder);

    PRINT 'Created table: EmrSpineSections';
END
ELSE
    PRINT 'Table EmrSpineSections already exists';
GO

-- ============================================================
-- 6. PatientSignatures - Chu ky dien tu benh nhan
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PatientSignatures')
BEGIN
    CREATE TABLE PatientSignatures (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        ExaminationId UNIQUEIDENTIFIER NULL,
        DocumentType NVARCHAR(100) NULL,
        SignatureData NVARCHAR(MAX) NULL,
        SignedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        DeviceInfo NVARCHAR(500) NULL,
        IpAddress NVARCHAR(50) NULL,
        VerificationCode NVARCHAR(100) NULL,
        IsVerified BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_PatientSignatures_PatientId ON PatientSignatures(PatientId);
    CREATE INDEX IX_PatientSignatures_ExaminationId ON PatientSignatures(ExaminationId);
    CREATE INDEX IX_PatientSignatures_DocumentType ON PatientSignatures(DocumentType);
    CREATE INDEX IX_PatientSignatures_SignedAt ON PatientSignatures(SignedAt);
    CREATE INDEX IX_PatientSignatures_VerificationCode ON PatientSignatures(VerificationCode) WHERE VerificationCode IS NOT NULL;

    PRINT 'Created table: PatientSignatures';
END
ELSE
    PRINT 'Table PatientSignatures already exists';
GO

-- ============================================================
-- 7. DocumentLocks - Khoa tai lieu tranh xung dot
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DocumentLocks')
BEGIN
    CREATE TABLE DocumentLocks (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        DocumentType NVARCHAR(100) NOT NULL,
        DocumentId UNIQUEIDENTIFIER NOT NULL,
        LockedByUserId NVARCHAR(450) NULL,
        LockedByUserName NVARCHAR(200) NULL,
        LockedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        ExpiresAt DATETIME2 NOT NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_DocumentLocks_DocumentType_DocumentId ON DocumentLocks(DocumentType, DocumentId) WHERE IsActive = 1 AND IsDeleted = 0;
    CREATE INDEX IX_DocumentLocks_LockedByUserId ON DocumentLocks(LockedByUserId);
    CREATE INDEX IX_DocumentLocks_ExpiresAt ON DocumentLocks(ExpiresAt) WHERE IsActive = 1;

    PRINT 'Created table: DocumentLocks';
END
ELSE
    PRINT 'Table DocumentLocks already exists';
GO

-- ============================================================
-- 8. EmrDataTags - The du lieu EMR (data tag / data element)
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrDataTags')
BEGIN
    CREATE TABLE EmrDataTags (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        Code NVARCHAR(50) NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL,
        DataType NVARCHAR(50) NOT NULL DEFAULT 'Text', -- Text, Number, Date, Boolean, Select
        DefaultValue NVARCHAR(500) NULL,
        Category NVARCHAR(100) NULL,
        FormType NVARCHAR(100) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsSystem BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IX_EmrDataTags_Code ON EmrDataTags(Code) WHERE IsDeleted = 0;
    CREATE INDEX IX_EmrDataTags_Category ON EmrDataTags(Category);
    CREATE INDEX IX_EmrDataTags_FormType ON EmrDataTags(FormType);
    CREATE INDEX IX_EmrDataTags_IsActive ON EmrDataTags(IsActive) WHERE IsDeleted = 0;
    CREATE INDEX IX_EmrDataTags_SortOrder ON EmrDataTags(SortOrder);

    PRINT 'Created table: EmrDataTags';
END
ELSE
    PRINT 'Table EmrDataTags already exists';
GO

-- ============================================================
-- 9. EmrImages - Thu vien hinh anh EMR
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrImages')
BEGIN
    CREATE TABLE EmrImages (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        Title NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL,
        ImageData NVARCHAR(MAX) NULL,
        Category NVARCHAR(100) NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        UploadedByUserId NVARCHAR(450) NULL,
        Tags NVARCHAR(500) NULL,
        Annotations NVARCHAR(MAX) NULL,
        IsShared BIT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_EmrImages_Category ON EmrImages(Category);
    CREATE INDEX IX_EmrImages_DepartmentId ON EmrImages(DepartmentId);
    CREATE INDEX IX_EmrImages_UploadedByUserId ON EmrImages(UploadedByUserId);
    CREATE INDEX IX_EmrImages_IsShared ON EmrImages(IsShared) WHERE IsActive = 1 AND IsDeleted = 0;
    CREATE INDEX IX_EmrImages_CreatedAt ON EmrImages(CreatedAt);

    PRINT 'Created table: EmrImages';
END
ELSE
    PRINT 'Table EmrImages already exists';
GO

-- ============================================================
-- 10. Shortcodes - Ma viet tat (shortcode / text expander)
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Shortcodes')
BEGIN
    CREATE TABLE Shortcodes (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        Code NVARCHAR(50) NOT NULL,
        FullText NVARCHAR(MAX) NOT NULL,
        Category NVARCHAR(100) NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        UserId NVARCHAR(450) NULL,
        IsGlobal BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_Shortcodes_Code ON Shortcodes(Code);
    CREATE INDEX IX_Shortcodes_Category ON Shortcodes(Category);
    CREATE INDEX IX_Shortcodes_DepartmentId ON Shortcodes(DepartmentId);
    CREATE INDEX IX_Shortcodes_UserId ON Shortcodes(UserId);
    CREATE INDEX IX_Shortcodes_IsGlobal ON Shortcodes(IsGlobal) WHERE IsActive = 1 AND IsDeleted = 0;

    PRINT 'Created table: Shortcodes';
END
ELSE
    PRINT 'Table Shortcodes already exists';
GO

-- ============================================================
-- 11. EmrAutoCheckRules - Quy tac kiem tra tu dong EMR
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrAutoCheckRules')
BEGIN
    CREATE TABLE EmrAutoCheckRules (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        RuleName NVARCHAR(200) NOT NULL,
        RuleType NVARCHAR(50) NOT NULL, -- RequiredForm, RequiredField, RequiredSignature, DataConsistency, Completeness
        FormType NVARCHAR(100) NULL,
        FieldName NVARCHAR(200) NULL,
        ErrorMessage NVARCHAR(500) NOT NULL,
        Severity INT NOT NULL DEFAULT 1, -- 1=Warning, 2=Error, 3=Critical
        IsActive BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_EmrAutoCheckRules_RuleType ON EmrAutoCheckRules(RuleType);
    CREATE INDEX IX_EmrAutoCheckRules_FormType ON EmrAutoCheckRules(FormType);
    CREATE INDEX IX_EmrAutoCheckRules_IsActive ON EmrAutoCheckRules(IsActive) WHERE IsDeleted = 0;
    CREATE INDEX IX_EmrAutoCheckRules_Severity ON EmrAutoCheckRules(Severity);

    PRINT 'Created table: EmrAutoCheckRules';
END
ELSE
    PRINT 'Table EmrAutoCheckRules already exists';
GO

-- ============================================================
-- 12. EmrCloseLogs - Nhat ky dong/khoa ho so benh an
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmrCloseLogs')
BEGIN
    CREATE TABLE EmrCloseLogs (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        ExaminationId UNIQUEIDENTIFIER NOT NULL,
        ClosedByUserId NVARCHAR(450) NULL,
        ClosedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        Status INT NOT NULL DEFAULT 1, -- 1=Closed, 2=Reopened, 3=Archived
        ValidationErrors NVARCHAR(MAX) NULL,
        Note NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_EmrCloseLogs_ExaminationId ON EmrCloseLogs(ExaminationId);
    CREATE INDEX IX_EmrCloseLogs_ClosedByUserId ON EmrCloseLogs(ClosedByUserId);
    CREATE INDEX IX_EmrCloseLogs_ClosedAt ON EmrCloseLogs(ClosedAt);
    CREATE INDEX IX_EmrCloseLogs_Status ON EmrCloseLogs(Status);

    PRINT 'Created table: EmrCloseLogs';
END
ELSE
    PRINT 'Table EmrCloseLogs already exists';
GO

-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed EmrSpines: 5 default spine structures
IF NOT EXISTS (SELECT 1 FROM EmrSpines)
BEGIN
    DECLARE @spineHC UNIQUEIDENTIFIER = NEWID();
    DECLARE @spineBA UNIQUEIDENTIFIER = NEWID();
    DECLARE @spineDT UNIQUEIDENTIFIER = NEWID();
    DECLARE @spineCLS UNIQUEIDENTIFIER = NEWID();
    DECLARE @spineCS UNIQUEIDENTIFIER = NEWID();

    INSERT INTO EmrSpines (Id, Name, Code, SortOrder, Description, IsDefault, IsActive) VALUES
    (@spineHC, N'Hanh chinh', 'HANH_CHINH', 1, N'Thong tin hanh chinh benh nhan: ho ten, ngay sinh, gioi tinh, dia chi, BHYT', 1, 1),
    (@spineBA, N'Benh an', 'BENH_AN', 2, N'Ho so benh an: benh su, kham lam sang, chan doan, dieu tri, ket luan', 0, 1),
    (@spineDT, N'To dieu tri', 'DIEU_TRI', 3, N'To dieu tri hang ngay: dien bien, y lenh, thuoc, thu thuat', 0, 1),
    (@spineCLS, N'Phieu CLS', 'CAN_LAM_SANG', 4, N'Phieu can lam sang: xet nghiem, CDHA, giai phau benh, tham do chuc nang', 0, 1),
    (@spineCS, N'Phieu cham soc', 'CHAM_SOC', 5, N'Phieu cham soc dieu duong: nhan dinh, can thiep, theo doi, ghi nhan', 0, 1);

    -- Seed EmrSpineSections for each spine
    -- Hanh chinh sections
    INSERT INTO EmrSpineSections (EmrSpineId, FormType, FormName, SortOrder, IsRequired, IsActive) VALUES
    (@spineHC, 'patient_info', N'Thong tin benh nhan', 1, 1, 1),
    (@spineHC, 'insurance_info', N'Thong tin BHYT', 2, 0, 1),
    (@spineHC, 'emergency_contact', N'Lien he khan cap', 3, 0, 1);

    -- Benh an sections
    INSERT INTO EmrSpineSections (EmrSpineId, FormType, FormName, SortOrder, IsRequired, IsActive) VALUES
    (@spineBA, 'medical_history', N'Benh su', 1, 1, 1),
    (@spineBA, 'physical_exam', N'Kham lam sang', 2, 1, 1),
    (@spineBA, 'diagnosis', N'Chan doan', 3, 1, 1),
    (@spineBA, 'treatment_plan', N'Ke hoach dieu tri', 4, 0, 1),
    (@spineBA, 'summary', N'Tom tat benh an', 5, 0, 1);

    -- To dieu tri sections
    INSERT INTO EmrSpineSections (EmrSpineId, FormType, FormName, SortOrder, IsRequired, IsActive) VALUES
    (@spineDT, 'daily_progress', N'Dien bien hang ngay', 1, 1, 1),
    (@spineDT, 'medication_order', N'Y lenh thuoc', 2, 0, 1),
    (@spineDT, 'procedure_order', N'Y lenh thu thuat', 3, 0, 1);

    -- Phieu CLS sections
    INSERT INTO EmrSpineSections (EmrSpineId, FormType, FormName, SortOrder, IsRequired, IsActive) VALUES
    (@spineCLS, 'lab_request', N'Phieu xet nghiem', 1, 0, 1),
    (@spineCLS, 'radiology_request', N'Phieu CDHA', 2, 0, 1),
    (@spineCLS, 'pathology_request', N'Phieu giai phau benh', 3, 0, 1),
    (@spineCLS, 'functional_test', N'Phieu tham do chuc nang', 4, 0, 1);

    -- Phieu cham soc sections
    INSERT INTO EmrSpineSections (EmrSpineId, FormType, FormName, SortOrder, IsRequired, IsActive) VALUES
    (@spineCS, 'nursing_assessment', N'Nhan dinh dieu duong', 1, 1, 1),
    (@spineCS, 'nursing_intervention', N'Can thiep dieu duong', 2, 0, 1),
    (@spineCS, 'vital_signs_sheet', N'Phieu theo doi dau hieu sinh ton', 3, 0, 1),
    (@spineCS, 'infusion_record', N'Phieu truyen dich', 4, 0, 1),
    (@spineCS, 'medication_admin', N'Phieu cong khai thuoc', 5, 0, 1);

    PRINT 'Seeded EmrSpines: 5 spines + 21 sections';
END
ELSE
    PRINT 'EmrSpines already has data - skipping seed';
GO

-- Seed EmrAutoCheckRules: 10 default rules
IF NOT EXISTS (SELECT 1 FROM EmrAutoCheckRules)
BEGIN
    INSERT INTO EmrAutoCheckRules (RuleName, RuleType, FormType, FieldName, ErrorMessage, Severity, IsActive, SortOrder) VALUES
    (N'Kiem tra phieu kham lam sang', 'RequiredForm', 'physical_exam', NULL, N'Thieu phieu kham lam sang - bat buoc cho moi ho so benh an', 3, 1, 1),
    (N'Kiem tra chan doan chinh', 'RequiredField', 'diagnosis', 'MainIcdCode', N'Chua nhap chan doan chinh (ma ICD-10) - bat buoc truoc khi dong ho so', 3, 1, 2),
    (N'Kiem tra chu ky bac si dieu tri', 'RequiredSignature', 'treatment_plan', 'DoctorSignature', N'Thieu chu ky bac si dieu tri tren ke hoach dieu tri', 2, 1, 3),
    (N'Kiem tra benh su', 'RequiredForm', 'medical_history', NULL, N'Thieu benh su - bat buoc ghi nhan ly do kham, tien su benh', 3, 1, 4),
    (N'Kiem tra to dieu tri noi tru', 'RequiredForm', 'daily_progress', NULL, N'Benh nhan noi tru phai co to dieu tri hang ngay', 2, 1, 5),
    (N'Kiem tra dau hieu sinh ton', 'RequiredField', 'vital_signs', 'BloodPressure', N'Chua ghi nhan huyet ap - can nhap dau hieu sinh ton truoc kham', 1, 1, 6),
    (N'Kiem tra dong y dieu tri', 'RequiredSignature', 'consent_form', 'PatientSignature', N'Thieu chu ky benh nhan/nguoi nha tren phieu dong y dieu tri', 2, 1, 7),
    (N'Kiem tra tom tat ra vien', 'RequiredForm', 'discharge_summary', NULL, N'Benh nhan xuat vien phai co tom tat ra vien (giay ra vien)', 3, 1, 8),
    (N'Kiem tra tinh nhat quan chan doan', 'DataConsistency', 'diagnosis', 'MainIcdCode', N'Chan doan vao vien va ra vien khong nhat quan - can xem lai', 1, 1, 9),
    (N'Kiem tra day du ho so', 'Completeness', NULL, NULL, N'Ho so benh an chua day du cac phieu bat buoc theo quy dinh', 2, 1, 10);

    PRINT 'Seeded EmrAutoCheckRules: 10 rules';
END
ELSE
    PRINT 'EmrAutoCheckRules already has data - skipping seed';
GO

-- Seed Shortcodes: 15 common medical abbreviations in Vietnamese
IF NOT EXISTS (SELECT 1 FROM Shortcodes)
BEGIN
    INSERT INTO Shortcodes (Code, FullText, Category, IsGlobal, SortOrder, IsActive) VALUES
    ('bt', N'Binh thuong', N'Kham lam sang', 1, 1, 1),
    ('kpbt', N'Khong phat hien bat thuong', N'Kham lam sang', 1, 2, 1),
    ('ttbth', N'Tinh trang benh nhan on dinh. Dieu tri tiep theo phuong an da de ra.', N'Dien bien', 1, 3, 1),
    ('shbt', N'Mach: .... l/p, Nhiet do: ....°C, Huyet ap: ..../....mmHg, Nhip tho: .... l/p, SpO2: ....%', N'Sinh hieu', 1, 4, 1),
    ('kddtk', N'Khong dau dau, khong chong mat, khong buon non', N'Than kinh', 1, 5, 1),
    ('tmbt', N'Nhip tim deu, tieng tim ro, khong nghe tieng tho bat thuong', N'Tim mach', 1, 6, 1),
    ('hhbt', N'Phe nam deu 2 ben, rung thanh deu, rales (-), ran (-)' , N'Ho hap', 1, 7, 1),
    ('thbt', N'Bung mem, khong chuong, gan lach khong so thay, an uong duoc', N'Tieu hoa', 1, 8, 1),
    ('cxkbt', N'Cot song khong bien dang, van dong chi binh thuong, khong teo co', N'Co xuong khop', 1, 9, 1),
    ('ttxv', N'Benh nhan tinh tao, dap ung tot, xuat vien. Hen tai kham sau ... ngay.', N'Xuat vien', 1, 10, 1),
    ('dlbt', N'Da niem mac hong, khong phu, khong xuat huyet, khong ban', N'Da lieu', 1, 11, 1),
    ('mkbt', N'Nhin binh thuong, van nhan binh thuong, dong tu 2 ben deu 3mm, phan xa anh sang (+)', N'Mat', 1, 12, 1),
    ('tmhbt', N'Tai: mang nhi sang bong 2 ben. Mui: khong nghet, khong chay dich. Hong: khong do, khong sung', N'Tai mui hong', 1, 13, 1),
    ('sdbt', N'San phu tu cung co hoi tot, san dich binh thuong, khong sot', N'San khoa', 1, 14, 1),
    ('tntbt', N'Tieu tien binh thuong, khong tieu buot, khong tieu rat, khong tieu mau', N'Tiet nieu', 1, 15, 1);

    PRINT 'Seeded Shortcodes: 15 medical abbreviations';
END
ELSE
    PRINT 'Shortcodes already has data - skipping seed';
GO

PRINT '============================================================';
PRINT 'NangCap16 tables creation complete: 12 tables + seed data.';
PRINT '============================================================';
GO
