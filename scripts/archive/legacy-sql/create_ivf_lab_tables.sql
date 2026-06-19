-- IVF Lab Management Tables
-- NangCap17 Module B: Phong Lab IVF

-- 1. Cap vo chong IVF
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IvfPatientCouples')
BEGIN
    CREATE TABLE IvfPatientCouples (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        WifePatientId UNIQUEIDENTIFIER NOT NULL,
        HusbandPatientId UNIQUEIDENTIFIER NOT NULL,
        InfertilityDurationMonths INT NOT NULL DEFAULT 0,
        InfertilityCause NVARCHAR(500) NULL,
        MarriageDate DATETIME2 NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IvfPatientCouples_WifePatient FOREIGN KEY (WifePatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_IvfPatientCouples_HusbandPatient FOREIGN KEY (HusbandPatientId) REFERENCES Patients(Id)
    );
    CREATE INDEX IX_IvfPatientCouples_WifePatientId ON IvfPatientCouples(WifePatientId);
    CREATE INDEX IX_IvfPatientCouples_HusbandPatientId ON IvfPatientCouples(HusbandPatientId);
    CREATE INDEX IX_IvfPatientCouples_IsDeleted ON IvfPatientCouples(IsDeleted) WHERE IsDeleted = 0;
END;

-- 2. Chu ky IVF
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IvfCycles')
BEGIN
    CREATE TABLE IvfCycles (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CoupleId UNIQUEIDENTIFIER NOT NULL,
        CycleNumber INT NOT NULL DEFAULT 1,
        StartDate DATETIME2 NOT NULL,
        Status INT NOT NULL DEFAULT 1,  -- 1=Active,2=OvumPickup,3=Fertilization,4=Transfer,5=Frozen,6=Completed,7=Cancelled
        Protocol NVARCHAR(200) NULL,
        DoctorId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IvfCycles_Couple FOREIGN KEY (CoupleId) REFERENCES IvfPatientCouples(Id),
        CONSTRAINT FK_IvfCycles_Doctor FOREIGN KEY (DoctorId) REFERENCES Users(Id)
    );
    CREATE INDEX IX_IvfCycles_CoupleId ON IvfCycles(CoupleId);
    CREATE INDEX IX_IvfCycles_Status ON IvfCycles(Status);
    CREATE INDEX IX_IvfCycles_IsDeleted ON IvfCycles(IsDeleted) WHERE IsDeleted = 0;
END;

-- 3. Choc trung (OPU)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IvfOvumPickups')
BEGIN
    CREATE TABLE IvfOvumPickups (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CycleId UNIQUEIDENTIFIER NOT NULL,
        PickupDate DATETIME2 NOT NULL,
        TotalOvums INT NOT NULL DEFAULT 0,
        MatureOvums INT NOT NULL DEFAULT 0,
        ImmatureOvums INT NOT NULL DEFAULT 0,
        DegeneratedOvums INT NOT NULL DEFAULT 0,
        PerformedById UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IvfOvumPickups_Cycle FOREIGN KEY (CycleId) REFERENCES IvfCycles(Id),
        CONSTRAINT FK_IvfOvumPickups_PerformedBy FOREIGN KEY (PerformedById) REFERENCES Users(Id)
    );
    CREATE INDEX IX_IvfOvumPickups_CycleId ON IvfOvumPickups(CycleId);
END;

-- 4. Phoi (Embryo)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IvfEmbryos')
BEGIN
    CREATE TABLE IvfEmbryos (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CycleId UNIQUEIDENTIFIER NOT NULL,
        EmbryoCode NVARCHAR(50) NOT NULL,
        Day2Grade NVARCHAR(20) NULL,
        Day3Grade NVARCHAR(20) NULL,
        Day5Grade NVARCHAR(20) NULL,
        Day6Grade NVARCHAR(20) NULL,
        Day7Grade NVARCHAR(20) NULL,
        Status INT NOT NULL DEFAULT 1,  -- 1=Culture,2=Fresh_Transfer,3=Frozen,4=Thawed,5=Transferred,6=Discarded
        FreezeDate DATETIME2 NULL,
        ThawDate DATETIME2 NULL,
        StrawCode NVARCHAR(50) NULL,
        StrawColor NVARCHAR(30) NULL,
        BoxCode NVARCHAR(50) NULL,
        TankCode NVARCHAR(50) NULL,
        RackPosition NVARCHAR(30) NULL,
        Notes NVARCHAR(1000) NULL,
        ImageUrl NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IvfEmbryos_Cycle FOREIGN KEY (CycleId) REFERENCES IvfCycles(Id)
    );
    CREATE INDEX IX_IvfEmbryos_CycleId ON IvfEmbryos(CycleId);
    CREATE INDEX IX_IvfEmbryos_Status ON IvfEmbryos(Status);
    CREATE INDEX IX_IvfEmbryos_TankCode ON IvfEmbryos(TankCode) WHERE TankCode IS NOT NULL;
END;

-- 5. Chuyen phoi (Embryo Transfer)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IvfEmbryoTransfers')
BEGIN
    CREATE TABLE IvfEmbryoTransfers (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CycleId UNIQUEIDENTIFIER NOT NULL,
        TransferDate DATETIME2 NOT NULL,
        TransferType INT NOT NULL DEFAULT 1,  -- 1=Fresh, 2=Frozen
        EmbryoCount INT NOT NULL DEFAULT 0,
        DoctorId UNIQUEIDENTIFIER NULL,
        EmbryologistId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(1000) NULL,
        ResultStatus INT NOT NULL DEFAULT 0,  -- 0=Pending, 1=Positive, 2=Negative
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IvfEmbryoTransfers_Cycle FOREIGN KEY (CycleId) REFERENCES IvfCycles(Id),
        CONSTRAINT FK_IvfEmbryoTransfers_Doctor FOREIGN KEY (DoctorId) REFERENCES Users(Id),
        CONSTRAINT FK_IvfEmbryoTransfers_Embryologist FOREIGN KEY (EmbryologistId) REFERENCES Users(Id)
    );
    CREATE INDEX IX_IvfEmbryoTransfers_CycleId ON IvfEmbryoTransfers(CycleId);
    CREATE INDEX IX_IvfEmbryoTransfers_TransferDate ON IvfEmbryoTransfers(TransferDate);
END;

-- 6. Ngan hang tinh trung (Sperm Bank)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IvfSpermBanks')
BEGIN
    CREATE TABLE IvfSpermBanks (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        SampleCode NVARCHAR(50) NOT NULL,
        CollectionDate DATETIME2 NOT NULL,
        Volume DECIMAL(10,2) NULL,
        Concentration DECIMAL(10,2) NULL,
        Motility DECIMAL(5,2) NULL,
        Morphology DECIMAL(5,2) NULL,
        StrawCount INT NOT NULL DEFAULT 0,
        TankCode NVARCHAR(50) NULL,
        RackPosition NVARCHAR(30) NULL,
        BoxCode NVARCHAR(50) NULL,
        Status INT NOT NULL DEFAULT 1,  -- 1=Stored, 2=Used, 3=Disposed
        ExpiryDate DATETIME2 NULL,
        StorageFee DECIMAL(18,2) NOT NULL DEFAULT 0,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IvfSpermBanks_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );
    CREATE INDEX IX_IvfSpermBanks_PatientId ON IvfSpermBanks(PatientId);
    CREATE INDEX IX_IvfSpermBanks_Status ON IvfSpermBanks(Status);
    CREATE INDEX IX_IvfSpermBanks_ExpiryDate ON IvfSpermBanks(ExpiryDate) WHERE ExpiryDate IS NOT NULL;
    CREATE INDEX IX_IvfSpermBanks_SampleCode ON IvfSpermBanks(SampleCode);
END;

-- 7. Sinh thiet phoi (Biopsy / PGT)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IvfBiopsies')
BEGIN
    CREATE TABLE IvfBiopsies (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CycleId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NULL,
        BiopsyLab NVARCHAR(200) NULL,
        SentDate DATETIME2 NULL,
        ResultDate DATETIME2 NULL,
        Result NVARCHAR(2000) NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IvfBiopsies_Cycle FOREIGN KEY (CycleId) REFERENCES IvfCycles(Id),
        CONSTRAINT FK_IvfBiopsies_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );
    CREATE INDEX IX_IvfBiopsies_CycleId ON IvfBiopsies(CycleId);
    CREATE INDEX IX_IvfBiopsies_PatientId ON IvfBiopsies(PatientId) WHERE PatientId IS NOT NULL;
END;

PRINT 'IVF Lab tables created successfully.';
