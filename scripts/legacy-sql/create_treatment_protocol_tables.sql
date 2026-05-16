-- Treatment Protocol tables (NangCap8 - BV San Nhi Ninh Binh)
-- Phac do dieu tri voi versioning, lien ket ICD-10, buoc thuc hien

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TreatmentProtocols')
CREATE TABLE TreatmentProtocols (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX),
    IcdCode NVARCHAR(20),
    IcdName NVARCHAR(500),
    DiseaseGroup NVARCHAR(200),
    Version INT NOT NULL DEFAULT 1,
    Status INT NOT NULL DEFAULT 0,
    ApprovedBy NVARCHAR(200),
    ApprovedDate DATETIME2,
    EffectiveDate DATETIME2,
    ExpiryDate DATETIME2,
    Department NVARCHAR(200),
    [References] NVARCHAR(MAX),
    Notes NVARCHAR(MAX),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CreatedBy UNIQUEIDENTIFIER,
    UpdatedAt DATETIME2,
    UpdatedBy UNIQUEIDENTIFIER,
    IsDeleted BIT NOT NULL DEFAULT 0
);

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TreatmentProtocolSteps')
CREATE TABLE TreatmentProtocolSteps (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ProtocolId UNIQUEIDENTIFIER NOT NULL REFERENCES TreatmentProtocols(Id),
    StepOrder INT NOT NULL,
    Name NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX),
    ActivityType NVARCHAR(50),
    MedicationName NVARCHAR(200),
    MedicationDose NVARCHAR(100),
    MedicationRoute NVARCHAR(50),
    MedicationFrequency NVARCHAR(100),
    DurationDays INT,
    ServiceCode NVARCHAR(50),
    ServiceName NVARCHAR(200),
    Conditions NVARCHAR(MAX),
    ExpectedOutcome NVARCHAR(MAX),
    Notes NVARCHAR(MAX),
    IsOptional BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
    CreatedBy UNIQUEIDENTIFIER,
    UpdatedAt DATETIME2,
    UpdatedBy UNIQUEIDENTIFIER,
    IsDeleted BIT NOT NULL DEFAULT 0
);

-- Indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TreatmentProtocols_IcdCode')
    CREATE INDEX IX_TreatmentProtocols_IcdCode ON TreatmentProtocols(IcdCode);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TreatmentProtocols_DiseaseGroup')
    CREATE INDEX IX_TreatmentProtocols_DiseaseGroup ON TreatmentProtocols(DiseaseGroup);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TreatmentProtocols_Status')
    CREATE INDEX IX_TreatmentProtocols_Status ON TreatmentProtocols(Status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TreatmentProtocols_Code')
    CREATE INDEX IX_TreatmentProtocols_Code ON TreatmentProtocols(Code);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TreatmentProtocolSteps_ProtocolId')
    CREATE INDEX IX_TreatmentProtocolSteps_ProtocolId ON TreatmentProtocolSteps(ProtocolId);

-- Seed sample protocols for OB/GYN hospital (BV San Nhi Ninh Binh)
IF NOT EXISTS (SELECT 1 FROM TreatmentProtocols WHERE IsDeleted = 0)
INSERT INTO TreatmentProtocols (Id, Code, Name, IcdCode, IcdName, DiseaseGroup, Version, Status, Department, EffectiveDate, CreatedAt)
VALUES
(NEWID(), 'PD-SAN-001', N'Phac do xu tri de thuong', 'O80', N'De thuong', N'San khoa', 1, 1, N'Khoa San', GETDATE(), GETDATE()),
(NEWID(), 'PD-SAN-002', N'Phac do xu tri tien san giat', 'O14', N'Tien san giat', N'San khoa', 1, 1, N'Khoa San', GETDATE(), GETDATE()),
(NEWID(), 'PD-SAN-003', N'Phac do xu tri mo lay thai', 'O82', N'Mo lay thai', N'San khoa', 1, 1, N'Khoa San', GETDATE(), GETDATE()),
(NEWID(), 'PD-NHI-001', N'Phac do dieu tri viem phoi tre em', 'J18', N'Viem phoi', N'Nhi khoa', 1, 1, N'Khoa Nhi', GETDATE(), GETDATE()),
(NEWID(), 'PD-NHI-002', N'Phac do dieu tri tieu chay cap tre em', 'A09', N'Tieu chay', N'Nhi khoa', 1, 1, N'Khoa Nhi', GETDATE(), GETDATE()),
(NEWID(), 'PD-SS-001', N'Phac do cham soc so sinh du thang', 'P07', N'Cham soc so sinh', N'So sinh', 1, 1, N'Khoa So sinh', GETDATE(), GETDATE()),
(NEWID(), 'PD-SS-002', N'Phac do hoi suc so sinh', 'P21', N'Ngat so sinh', N'So sinh', 1, 1, N'Khoa So sinh', GETDATE(), GETDATE()),
(NEWID(), 'PD-NOI-001', N'Phac do dieu tri tang huyet ap', 'I10', N'Tang huyet ap', N'Noi khoa', 1, 1, N'Khoa Noi', GETDATE(), GETDATE()),
(NEWID(), 'PD-NOI-002', N'Phac do dieu tri dai thao duong type 2', 'E11', N'DTD type 2', N'Noi khoa', 1, 1, N'Khoa Noi', GETDATE(), GETDATE()),
(NEWID(), 'PD-NK-001', N'Phac do su dung khang sinh du phong phau thuat', 'Z29', N'KS du phong', N'Nhiem khuan', 1, 1, N'Chung', GETDATE(), GETDATE());

PRINT 'Treatment Protocol tables created and seeded successfully.';
