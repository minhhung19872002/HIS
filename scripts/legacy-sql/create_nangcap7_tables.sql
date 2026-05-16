-- NangCap7: Create tables for Specialty EMR, Partograph, Anesthesia
-- Idempotent script - safe to re-run

USE HIS;
GO

-- 1. SpecialtyEmrs - Bệnh án chuyên khoa
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SpecialtyEmrs')
BEGIN
    CREATE TABLE SpecialtyEmrs (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientCode NVARCHAR(50) NOT NULL,
        PatientName NVARCHAR(200) NOT NULL,
        SpecialtyType NVARCHAR(50) NOT NULL, -- surgical, internal, obstetrics, etc.
        RecordDate DATETIME2 NOT NULL,
        DoctorName NVARCHAR(200),
        DepartmentName NVARCHAR(200),
        IcdCode NVARCHAR(20),
        IcdName NVARCHAR(500),
        FieldData NVARCHAR(MAX) NOT NULL DEFAULT '{}', -- JSON
        Status INT NOT NULL DEFAULT 0, -- 0=Draft, 1=Completed, 2=Signed
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER,
        UpdatedAt DATETIME2,
        UpdatedBy UNIQUEIDENTIFIER,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_SpecialtyEmrs_PatientId ON SpecialtyEmrs(PatientId);
    CREATE INDEX IX_SpecialtyEmrs_SpecialtyType ON SpecialtyEmrs(SpecialtyType);
    CREATE INDEX IX_SpecialtyEmrs_RecordDate ON SpecialtyEmrs(RecordDate);
    CREATE INDEX IX_SpecialtyEmrs_Status ON SpecialtyEmrs(Status);
    PRINT 'Created table SpecialtyEmrs';
END
GO

-- 2. PartographRecords - Biểu đồ chuyển dạ
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PartographRecords')
BEGIN
    CREATE TABLE PartographRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AdmissionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientName NVARCHAR(200) NOT NULL,
        RecordTime DATETIME2 NOT NULL,
        CervicalDilation DECIMAL(4,1), -- cm
        ContractionFrequency INT, -- per 10 min
        ContractionDuration INT, -- seconds
        FetalHeartRate INT, -- bpm
        AmnioticFluid NVARCHAR(50), -- Trong/Phân su/Máu
        MouldingDegree NVARCHAR(10), -- 0/+/++/+++
        FetalPosition NVARCHAR(10), -- LOA/LOP/ROA/ROP
        SystolicBP INT,
        DiastolicBP INT,
        MaternalPulse INT,
        Temperature DECIMAL(4,1),
        OxytocinDose NVARCHAR(50),
        DrugGiven NVARCHAR(200),
        AlertLine NVARCHAR(20), -- Normal/Alert/Action
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER,
        UpdatedAt DATETIME2,
        UpdatedBy UNIQUEIDENTIFIER,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_PartographRecords_AdmissionId ON PartographRecords(AdmissionId);
    CREATE INDEX IX_PartographRecords_PatientId ON PartographRecords(PatientId);
    CREATE INDEX IX_PartographRecords_RecordTime ON PartographRecords(RecordTime);
    PRINT 'Created table PartographRecords';
END
GO

-- 3. AnesthesiaRecords - Phiếu gây mê hồi sức
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnesthesiaRecords')
BEGIN
    CREATE TABLE AnesthesiaRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SurgeryId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientName NVARCHAR(200) NOT NULL,
        AsaClass INT NOT NULL DEFAULT 1, -- 1-5
        MallampatiScore INT NOT NULL DEFAULT 1, -- 1-4
        Allergies NVARCHAR(500),
        NpoStatus NVARCHAR(200),
        AnesthesiaType NVARCHAR(50) NOT NULL, -- Gây mê/Gây tê/Tê tại chỗ
        AirwayPlan NVARCHAR(500),
        PreOpAssessment NVARCHAR(MAX),
        RecoveryNotes NVARCHAR(MAX),
        Status INT NOT NULL DEFAULT 0, -- 0=Draft, 1=InProgress, 2=Completed
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER,
        UpdatedAt DATETIME2,
        UpdatedBy UNIQUEIDENTIFIER,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_AnesthesiaRecords_SurgeryId ON AnesthesiaRecords(SurgeryId);
    CREATE INDEX IX_AnesthesiaRecords_PatientId ON AnesthesiaRecords(PatientId);
    PRINT 'Created table AnesthesiaRecords';
END
GO

-- 4. AnesthesiaMonitors - Theo dõi trong gây mê
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnesthesiaMonitors')
BEGIN
    CREATE TABLE AnesthesiaMonitors (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AnesthesiaRecordId UNIQUEIDENTIFIER NOT NULL,
        MonitorTime DATETIME2 NOT NULL,
        SystolicBP INT,
        DiastolicBP INT,
        HeartRate INT,
        SpO2 INT,
        EtCO2 INT,
        Temperature DECIMAL(4,1),
        Notes NVARCHAR(500),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER,
        UpdatedAt DATETIME2,
        UpdatedBy UNIQUEIDENTIFIER,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AnesthesiaMonitors_Record FOREIGN KEY (AnesthesiaRecordId) REFERENCES AnesthesiaRecords(Id)
    );
    CREATE INDEX IX_AnesthesiaMonitors_RecordId ON AnesthesiaMonitors(AnesthesiaRecordId);
    PRINT 'Created table AnesthesiaMonitors';
END
GO

-- 5. AnesthesiaDrugs - Thuốc dùng trong gây mê
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnesthesiaDrugs')
BEGIN
    CREATE TABLE AnesthesiaDrugs (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AnesthesiaRecordId UNIQUEIDENTIFIER NOT NULL,
        GivenTime DATETIME2 NOT NULL,
        DrugName NVARCHAR(200) NOT NULL,
        Dose NVARCHAR(100),
        Route NVARCHAR(50), -- IV/IM/SC/Inhalation
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER,
        UpdatedAt DATETIME2,
        UpdatedBy UNIQUEIDENTIFIER,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AnesthesiaDrugs_Record FOREIGN KEY (AnesthesiaRecordId) REFERENCES AnesthesiaRecords(Id)
    );
    CREATE INDEX IX_AnesthesiaDrugs_RecordId ON AnesthesiaDrugs(AnesthesiaRecordId);
    PRINT 'Created table AnesthesiaDrugs';
END
GO

-- 6. AnesthesiaFluids - Dịch truyền trong gây mê
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AnesthesiaFluids')
BEGIN
    CREATE TABLE AnesthesiaFluids (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AnesthesiaRecordId UNIQUEIDENTIFIER NOT NULL,
        FluidType NVARCHAR(200) NOT NULL,
        Volume INT, -- mL
        StartTime DATETIME2,
        EndTime DATETIME2,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER,
        UpdatedAt DATETIME2,
        UpdatedBy UNIQUEIDENTIFIER,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AnesthesiaFluids_Record FOREIGN KEY (AnesthesiaRecordId) REFERENCES AnesthesiaRecords(Id)
    );
    CREATE INDEX IX_AnesthesiaFluids_RecordId ON AnesthesiaFluids(AnesthesiaRecordId);
    PRINT 'Created table AnesthesiaFluids';
END
GO

PRINT 'All NangCap7 tables created successfully';
GO
