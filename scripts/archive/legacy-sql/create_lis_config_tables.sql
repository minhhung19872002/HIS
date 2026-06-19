-- ============================================================================
-- LIS Configuration Tables + Service Locking Table
-- Idempotent: IF NOT EXISTS checks
-- ============================================================================

USE HIS;
GO

-- ============================================================================
-- 1. LockedServices - Khóa dịch vụ
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LockedServices')
BEGIN
    CREATE TABLE LockedServices (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ServiceId UNIQUEIDENTIFIER NOT NULL,
        ServiceName NVARCHAR(500) NOT NULL DEFAULT '',
        ServiceCode NVARCHAR(50) NOT NULL DEFAULT '',
        ServiceType INT NOT NULL DEFAULT 0,
        ServiceTypeName NVARCHAR(50) NOT NULL DEFAULT '',
        IsLocked BIT NOT NULL DEFAULT 1,
        LockReason NVARCHAR(1000) NULL,
        LockedBy NVARCHAR(200) NULL,
        LockedByName NVARCHAR(200) NULL,
        LockedAt DATETIME2 NULL,
        UnlockedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_LockedServices_ServiceId ON LockedServices(ServiceId);
    CREATE INDEX IX_LockedServices_IsLocked ON LockedServices(IsLocked);
    PRINT 'Created table: LockedServices';
END
ELSE
    PRINT 'Table already exists: LockedServices';
GO

-- ============================================================================
-- 2. LisAnalyzers - Cấu hình máy phân tích LIS
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LisAnalyzers')
BEGIN
    CREATE TABLE LisAnalyzers (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(200) NOT NULL DEFAULT '',
        Model NVARCHAR(200) NULL,
        Manufacturer NVARCHAR(200) NULL,
        ConnectionType NVARCHAR(50) NOT NULL DEFAULT 'HL7',
        IpAddress NVARCHAR(100) NULL,
        Port INT NULL,
        ComPort NVARCHAR(20) NULL,
        BaudRate INT NULL,
        ProtocolVersion NVARCHAR(50) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        LastConnectionTime DATETIME2 NULL,
        ConnectionStatus NVARCHAR(50) NULL,
        Description NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_LisAnalyzers_IsActive ON LisAnalyzers(IsActive);
    PRINT 'Created table: LisAnalyzers';
END
ELSE
    PRINT 'Table already exists: LisAnalyzers';
GO

-- ============================================================================
-- 3. LisTestParameters - Thông số xét nghiệm
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LisTestParameters')
BEGIN
    CREATE TABLE LisTestParameters (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(50) NOT NULL DEFAULT '',
        Name NVARCHAR(500) NOT NULL DEFAULT '',
        Unit NVARCHAR(50) NOT NULL DEFAULT '',
        ReferenceLow DECIMAL(18,4) NULL,
        ReferenceHigh DECIMAL(18,4) NULL,
        CriticalLow DECIMAL(18,4) NULL,
        CriticalHigh DECIMAL(18,4) NULL,
        DataType NVARCHAR(50) NOT NULL DEFAULT 'Number',
        EnumValues NVARCHAR(MAX) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IX_LisTestParameters_Code ON LisTestParameters(Code) WHERE IsDeleted = 0;
    CREATE INDEX IX_LisTestParameters_IsActive ON LisTestParameters(IsActive);
    PRINT 'Created table: LisTestParameters';
END
ELSE
    PRINT 'Table already exists: LisTestParameters';
GO

-- ============================================================================
-- 4. LisReferenceRanges - Khoảng tham chiếu theo tuổi/giới
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LisReferenceRanges')
BEGIN
    CREATE TABLE LisReferenceRanges (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TestParameterId UNIQUEIDENTIFIER NOT NULL,
        AgeGroup NVARCHAR(50) NOT NULL DEFAULT 'Adult',
        Gender NVARCHAR(20) NOT NULL DEFAULT 'Both',
        Low DECIMAL(18,4) NULL,
        High DECIMAL(18,4) NULL,
        CriticalLow DECIMAL(18,4) NULL,
        CriticalHigh DECIMAL(18,4) NULL,
        Unit NVARCHAR(50) NOT NULL DEFAULT '',
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_LisReferenceRanges_TestParameter FOREIGN KEY (TestParameterId)
            REFERENCES LisTestParameters(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_LisReferenceRanges_TestParameterId ON LisReferenceRanges(TestParameterId);
    CREATE INDEX IX_LisReferenceRanges_AgeGroup_Gender ON LisReferenceRanges(AgeGroup, Gender);
    PRINT 'Created table: LisReferenceRanges';
END
ELSE
    PRINT 'Table already exists: LisReferenceRanges';
GO

-- ============================================================================
-- 5. LisAnalyzerMappings - Mapping mã test máy phân tích <-> HIS
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LisAnalyzerMappings')
BEGIN
    CREATE TABLE LisAnalyzerMappings (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AnalyzerId UNIQUEIDENTIFIER NOT NULL,
        AnalyzerTestCode NVARCHAR(100) NOT NULL DEFAULT '',
        HisTestParameterId UNIQUEIDENTIFIER NOT NULL,
        HisTestCode NVARCHAR(50) NULL,
        HisTestName NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_LisAnalyzerMappings_Analyzer FOREIGN KEY (AnalyzerId)
            REFERENCES LisAnalyzers(Id) ON DELETE CASCADE,
        CONSTRAINT FK_LisAnalyzerMappings_TestParameter FOREIGN KEY (HisTestParameterId)
            REFERENCES LisTestParameters(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_LisAnalyzerMappings_AnalyzerId ON LisAnalyzerMappings(AnalyzerId);
    CREATE INDEX IX_LisAnalyzerMappings_HisTestParameterId ON LisAnalyzerMappings(HisTestParameterId);
    CREATE INDEX IX_LisAnalyzerMappings_AnalyzerTestCode ON LisAnalyzerMappings(AnalyzerTestCode);
    PRINT 'Created table: LisAnalyzerMappings';
END
ELSE
    PRINT 'Table already exists: LisAnalyzerMappings';
GO

-- ============================================================================
-- 6. LabconnectSyncHistories - Lịch sử đồng bộ Labconnect
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LabconnectSyncHistories')
BEGIN
    CREATE TABLE LabconnectSyncHistories (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SyncTime DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        Direction NVARCHAR(20) NOT NULL DEFAULT 'Both',
        ItemCount INT NOT NULL DEFAULT 0,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Success',
        ErrorMessage NVARCHAR(MAX) NULL,
        DurationMs INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_LabconnectSyncHistories_SyncTime ON LabconnectSyncHistories(SyncTime DESC);
    CREATE INDEX IX_LabconnectSyncHistories_Status ON LabconnectSyncHistories(Status);
    PRINT 'Created table: LabconnectSyncHistories';
END
ELSE
    PRINT 'Table already exists: LabconnectSyncHistories';
GO

-- ============================================================================
-- SEED DATA: Sample Analyzers
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM LisAnalyzers WHERE IsDeleted = 0)
BEGIN
    INSERT INTO LisAnalyzers (Id, Name, Model, Manufacturer, ConnectionType, IpAddress, Port, BaudRate, ProtocolVersion, IsActive, ConnectionStatus, Description)
    VALUES
    (NEWID(), N'Beckman Coulter AU5800', 'AU5800', 'Beckman Coulter', 'HL7', '192.168.1.101', 5000, NULL, '2.5.1', 1, 'Unknown', N'Máy sinh hóa tự động'),
    (NEWID(), N'Sysmex XN-1000', 'XN-1000', 'Sysmex', 'HL7', '192.168.1.102', 5001, NULL, '2.5.1', 1, 'Unknown', N'Máy huyết học tự động'),
    (NEWID(), N'Cobas e411', 'e411', 'Roche', 'ASTM', '192.168.1.103', 5002, NULL, '1.0', 1, 'Unknown', N'Máy miễn dịch'),
    (NEWID(), N'ABL90 FLEX', 'ABL90 FLEX', 'Radiometer', 'Serial', NULL, NULL, 9600, NULL, 1, 'Unknown', N'Máy khí máu'),
    (NEWID(), N'CLINITEK Novus', 'Novus', 'Siemens', 'HL7', '192.168.1.105', 5004, NULL, '2.5.1', 1, 'Unknown', N'Máy nước tiểu tự động');

    PRINT 'Seeded 5 sample analyzers';
END
GO

-- ============================================================================
-- SEED DATA: Common Test Parameters
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM LisTestParameters WHERE IsDeleted = 0)
BEGIN
    INSERT INTO LisTestParameters (Id, Code, Name, Unit, ReferenceLow, ReferenceHigh, CriticalLow, CriticalHigh, DataType, SortOrder, IsActive)
    VALUES
    -- Sinh hóa (Chemistry)
    (NEWID(), 'GLU', N'Glucose', 'mmol/L', 3.9, 6.1, 2.2, 25.0, 'Number', 1, 1),
    (NEWID(), 'CREA', N'Creatinine', N'µmol/L', 53.0, 115.0, 20.0, 1000.0, 'Number', 2, 1),
    (NEWID(), 'UREA', N'Ure', 'mmol/L', 2.5, 7.5, 1.0, 50.0, 'Number', 3, 1),
    (NEWID(), 'AST', N'AST (GOT)', 'U/L', 0.0, 40.0, NULL, 1000.0, 'Number', 4, 1),
    (NEWID(), 'ALT', N'ALT (GPT)', 'U/L', 0.0, 40.0, NULL, 1000.0, 'Number', 5, 1),
    (NEWID(), 'TBIL', N'Bilirubin toàn phần', N'µmol/L', 3.4, 20.5, NULL, 300.0, 'Number', 6, 1),
    (NEWID(), 'DBIL', N'Bilirubin trực tiếp', N'µmol/L', 0.0, 5.1, NULL, NULL, 'Number', 7, 1),
    (NEWID(), 'TP', N'Protein toàn phần', 'g/L', 64.0, 83.0, NULL, NULL, 'Number', 8, 1),
    (NEWID(), 'ALB', N'Albumin', 'g/L', 35.0, 52.0, 15.0, NULL, 'Number', 9, 1),
    (NEWID(), 'CHOL', N'Cholesterol toàn phần', 'mmol/L', 0.0, 5.2, NULL, NULL, 'Number', 10, 1),
    (NEWID(), 'TG', N'Triglycerid', 'mmol/L', 0.0, 2.3, NULL, NULL, 'Number', 11, 1),
    (NEWID(), 'HDL', N'HDL-Cholesterol', 'mmol/L', 1.0, 1.5, NULL, NULL, 'Number', 12, 1),
    (NEWID(), 'LDL', N'LDL-Cholesterol', 'mmol/L', 0.0, 3.4, NULL, NULL, 'Number', 13, 1),
    (NEWID(), 'UA', N'Acid uric', N'µmol/L', 155.0, 428.0, NULL, NULL, 'Number', 14, 1),
    (NEWID(), 'NA', N'Natri (Na+)', 'mmol/L', 136.0, 146.0, 120.0, 160.0, 'Number', 15, 1),
    (NEWID(), 'K', N'Kali (K+)', 'mmol/L', 3.5, 5.1, 2.5, 6.5, 'Number', 16, 1),
    (NEWID(), 'CL', N'Clo (Cl-)', 'mmol/L', 98.0, 106.0, 80.0, 120.0, 'Number', 17, 1),
    (NEWID(), 'CA', N'Calci toàn phần', 'mmol/L', 2.15, 2.55, 1.5, 3.5, 'Number', 18, 1),
    (NEWID(), 'AMY', N'Amylase', 'U/L', 28.0, 100.0, NULL, NULL, 'Number', 19, 1),
    (NEWID(), 'LIP', N'Lipase', 'U/L', 0.0, 67.0, NULL, NULL, 'Number', 20, 1),

    -- Huyết học (Hematology)
    (NEWID(), 'WBC', N'Bạch cầu (WBC)', 'G/L', 4.0, 10.0, 1.0, 30.0, 'Number', 21, 1),
    (NEWID(), 'RBC', N'Hồng cầu (RBC)', 'T/L', 4.0, 5.5, 2.0, 8.0, 'Number', 22, 1),
    (NEWID(), 'HGB', N'Hemoglobin (Hb)', 'g/L', 120.0, 160.0, 60.0, 200.0, 'Number', 23, 1),
    (NEWID(), 'HCT', N'Hematocrit', '%', 36.0, 48.0, 20.0, 65.0, 'Number', 24, 1),
    (NEWID(), 'MCV', N'MCV', 'fL', 80.0, 96.0, NULL, NULL, 'Number', 25, 1),
    (NEWID(), 'MCH', N'MCH', 'pg', 27.0, 33.0, NULL, NULL, 'Number', 26, 1),
    (NEWID(), 'MCHC', N'MCHC', 'g/L', 320.0, 360.0, NULL, NULL, 'Number', 27, 1),
    (NEWID(), 'PLT', N'Tiểu cầu (PLT)', 'G/L', 150.0, 400.0, 20.0, 1000.0, 'Number', 28, 1),
    (NEWID(), 'NEU', N'Neutrophil', '%', 40.0, 70.0, NULL, NULL, 'Number', 29, 1),
    (NEWID(), 'LYM', N'Lymphocyte', '%', 20.0, 45.0, NULL, NULL, 'Number', 30, 1),
    (NEWID(), 'MONO', N'Monocyte', '%', 2.0, 10.0, NULL, NULL, 'Number', 31, 1),
    (NEWID(), 'EOS', N'Eosinophil', '%', 0.0, 6.0, NULL, NULL, 'Number', 32, 1),
    (NEWID(), 'BASO', N'Basophil', '%', 0.0, 2.0, NULL, NULL, 'Number', 33, 1),
    (NEWID(), 'ESR', N'Tốc độ máu lắng', 'mm/h', 0.0, 20.0, NULL, NULL, 'Number', 34, 1),

    -- Đông máu (Coagulation)
    (NEWID(), 'PT', N'Prothrombin Time', 's', 11.0, 13.5, 5.0, 50.0, 'Number', 35, 1),
    (NEWID(), 'INR', N'INR', '', 0.85, 1.15, NULL, 5.0, 'Number', 36, 1),
    (NEWID(), 'APTT', N'APTT', 's', 25.0, 35.0, NULL, 100.0, 'Number', 37, 1),
    (NEWID(), 'FIB', N'Fibrinogen', 'g/L', 2.0, 4.0, 0.5, 10.0, 'Number', 38, 1),
    (NEWID(), 'DDIMER', N'D-Dimer', 'mg/L', 0.0, 0.5, NULL, 10.0, 'Number', 39, 1),

    -- Miễn dịch (Immunoassay)
    (NEWID(), 'TSH', N'TSH', 'mIU/L', 0.27, 4.2, 0.01, 100.0, 'Number', 40, 1),
    (NEWID(), 'FT4', N'Free T4', 'pmol/L', 12.0, 22.0, NULL, NULL, 'Number', 41, 1),
    (NEWID(), 'FT3', N'Free T3', 'pmol/L', 3.1, 6.8, NULL, NULL, 'Number', 42, 1),
    (NEWID(), 'CRP', N'CRP (hs)', 'mg/L', 0.0, 5.0, NULL, 200.0, 'Number', 43, 1),
    (NEWID(), 'PCT', N'Procalcitonin', 'ng/mL', 0.0, 0.5, NULL, 10.0, 'Number', 44, 1),
    (NEWID(), 'TROP', N'Troponin I', 'ng/mL', 0.0, 0.04, NULL, 10.0, 'Number', 45, 1),
    (NEWID(), 'PSA', N'PSA', 'ng/mL', 0.0, 4.0, NULL, NULL, 'Number', 46, 1),
    (NEWID(), 'AFP', N'AFP', 'ng/mL', 0.0, 7.0, NULL, NULL, 'Number', 47, 1),
    (NEWID(), 'CEA', N'CEA', 'ng/mL', 0.0, 5.0, NULL, NULL, 'Number', 48, 1),
    (NEWID(), 'FERR', N'Ferritin', 'ng/mL', 12.0, 300.0, NULL, NULL, 'Number', 49, 1),
    (NEWID(), 'HBSAG', N'HBsAg', '', NULL, NULL, NULL, NULL, 'Text', 50, 1),
    (NEWID(), 'ANTIHCV', N'Anti-HCV', '', NULL, NULL, NULL, NULL, 'Text', 51, 1),
    (NEWID(), 'ANTIHIV', N'Anti-HIV', '', NULL, NULL, NULL, NULL, 'Text', 52, 1),

    -- Nước tiểu (Urinalysis)
    (NEWID(), 'UPH', N'pH nước tiểu', '', 5.0, 8.0, NULL, NULL, 'Number', 53, 1),
    (NEWID(), 'USG', N'Tỷ trọng nước tiểu', '', 1.005, 1.030, NULL, NULL, 'Number', 54, 1),
    (NEWID(), 'UPRO', N'Protein nước tiểu', '', NULL, NULL, NULL, NULL, 'Text', 55, 1),
    (NEWID(), 'UGLU', N'Glucose nước tiểu', '', NULL, NULL, NULL, NULL, 'Text', 56, 1),

    -- Khí máu (Blood Gas)
    (NEWID(), 'PH', N'pH máu', '', 7.35, 7.45, 6.9, 7.8, 'Number', 57, 1),
    (NEWID(), 'PCO2', N'pCO2', 'mmHg', 35.0, 45.0, 10.0, 100.0, 'Number', 58, 1),
    (NEWID(), 'PO2', N'pO2', 'mmHg', 80.0, 100.0, 30.0, NULL, 'Number', 59, 1),
    (NEWID(), 'HCO3', N'HCO3-', 'mmol/L', 22.0, 26.0, 10.0, 40.0, 'Number', 60, 1),
    (NEWID(), 'LAC', N'Lactate', 'mmol/L', 0.5, 2.2, NULL, 10.0, 'Number', 61, 1);

    PRINT 'Seeded 61 common test parameters';
END
GO

PRINT 'LIS Configuration tables and seed data complete.';
GO
