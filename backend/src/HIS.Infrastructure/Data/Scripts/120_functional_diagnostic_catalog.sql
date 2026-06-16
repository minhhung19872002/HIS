-- 120_functional_diagnostic_catalog.sql
-- Catalog DB-driven cho Thăm dò chức năng (#40 #64 #65 #66 #67)
-- Idempotent: OBJECT_ID + IF NOT EXISTS guards
-- Audit cols: NVARCHAR(450) NULL (tránh ValueConverter Guid/String)

-- ─── Bảng FunctionalDiagnosticTestTypes ──────────────────────────────────────
IF OBJECT_ID(N'dbo.FunctionalDiagnosticTestTypes', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.FunctionalDiagnosticTestTypes (
        Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        Code        NVARCHAR(50)     NOT NULL,
        Name        NVARCHAR(200)    NOT NULL,
        Description NVARCHAR(500)    NULL,
        IsActive    BIT              NOT NULL DEFAULT 1,
        -- Audit (NVARCHAR tránh Guid/String mismatch)
        CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy   NVARCHAR(450)    NULL,
        UpdatedAt   DATETIME2        NULL,
        UpdatedBy   NVARCHAR(450)    NULL,
        IsDeleted   BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_FunctionalDiagnosticTestTypes PRIMARY KEY (Id)
    );
    CREATE UNIQUE INDEX UX_FDTestTypes_Code
        ON dbo.FunctionalDiagnosticTestTypes (Code)
        WHERE IsDeleted = 0;
END

-- ─── Bảng FunctionalDiagnosticTemplates ──────────────────────────────────────
IF OBJECT_ID(N'dbo.FunctionalDiagnosticTemplates', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.FunctionalDiagnosticTemplates (
        Id          UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        Code        NVARCHAR(50)     NOT NULL,
        Name        NVARCHAR(200)    NOT NULL,
        TestTypeId  UNIQUEIDENTIFIER NOT NULL,
        Content     NVARCHAR(MAX)    NULL,
        IsActive    BIT              NOT NULL DEFAULT 1,
        -- Audit
        CreatedAt   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy   NVARCHAR(450)    NULL,
        UpdatedAt   DATETIME2        NULL,
        UpdatedBy   NVARCHAR(450)    NULL,
        IsDeleted   BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_FunctionalDiagnosticTemplates PRIMARY KEY (Id),
        CONSTRAINT FK_FDTemplates_TestTypes
            FOREIGN KEY (TestTypeId)
            REFERENCES dbo.FunctionalDiagnosticTestTypes (Id)
    );
    CREATE INDEX IX_FDTemplates_TestTypeId
        ON dbo.FunctionalDiagnosticTemplates (TestTypeId);
END

-- ─── Seed loại TDCN cơ bản (IF NOT EXISTS từng dòng, idempotent) ─────────────
IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'ECG' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('ECG', N'Điện tim', N'Điện tâm đồ thường quy (ECG/EKG)');

IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'ECGStress' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('ECGStress', N'Điện tim gắng sức', N'Nghiệm pháp gắng sức (Stress test)');

IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'EEG' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('EEG', N'Điện não', N'Điện não đồ (EEG)');

IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'EMG' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('EMG', N'Điện cơ', N'Điện cơ đồ (EMG) và đo tốc độ dẫn truyền thần kinh');

IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'Spirometry' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('Spirometry', N'Đo chức năng hô hấp', N'Spirometry — đo FVC/FEV1/PEF');

IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'Audiometry' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('Audiometry', N'Đo thính lực', N'Thính lực đồ (Audiogram)');

IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'Endoscopy' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('Endoscopy', N'Nội soi', N'Nội soi tiêu hóa — dạ dày / đại tràng');

IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'Ultrasound' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('Ultrasound', N'Siêu âm', N'Siêu âm chẩn đoán (ổ bụng, tim mạch, sản khoa...)');

IF NOT EXISTS (SELECT 1 FROM dbo.FunctionalDiagnosticTestTypes WHERE Code = 'BoneDensity' AND IsDeleted = 0)
    INSERT INTO dbo.FunctionalDiagnosticTestTypes (Code, Name, Description)
    VALUES ('BoneDensity', N'Đo loãng xương', N'DEXA scan / đo mật độ xương');
