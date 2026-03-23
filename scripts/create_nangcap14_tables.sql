-- NangCap14: BV Phoi Hai Duong - 4 new modules
-- Idempotent script: IF NOT EXISTS for all tables
-- Run: docker exec his-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "HisDocker2024Pass#" -d HIS -i /tmp/create_nangcap14_tables.sql -C

USE HIS;
GO

-- ============================================================
-- Module 5: Quan ly benh man tinh (Chronic Disease Management)
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ChronicDiseaseRecords')
BEGIN
    CREATE TABLE ChronicDiseaseRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        IcdCode NVARCHAR(20) NOT NULL,
        IcdName NVARCHAR(500) NOT NULL,
        DiagnosisDate DATETIME2 NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Active', -- Active, Remission, Closed, Removed
        DoctorId UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(MAX) NULL,
        FollowUpIntervalDays INT NOT NULL DEFAULT 30,
        NextFollowUpDate DATETIME2 NULL,
        ClosedDate DATETIME2 NULL,
        ClosedReason NVARCHAR(500) NULL,
        ClosedBy NVARCHAR(100) NULL,
        RemovedDate DATETIME2 NULL,
        RemovedReason NVARCHAR(500) NULL,
        RemovedBy NVARCHAR(100) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_ChronicDiseaseRecords_PatientId ON ChronicDiseaseRecords(PatientId);
    CREATE INDEX IX_ChronicDiseaseRecords_Status ON ChronicDiseaseRecords(Status);
    CREATE INDEX IX_ChronicDiseaseRecords_IcdCode ON ChronicDiseaseRecords(IcdCode);
    CREATE INDEX IX_ChronicDiseaseRecords_NextFollowUpDate ON ChronicDiseaseRecords(NextFollowUpDate);
    CREATE INDEX IX_ChronicDiseaseRecords_DoctorId ON ChronicDiseaseRecords(DoctorId);

    PRINT 'Created table: ChronicDiseaseRecords';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ChronicDiseaseFollowUps')
BEGIN
    CREATE TABLE ChronicDiseaseFollowUps (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ChronicDiseaseRecordId UNIQUEIDENTIFIER NOT NULL,
        FollowUpDate DATETIME2 NOT NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Scheduled', -- Scheduled, Completed, Missed, Cancelled
        ExaminationId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(MAX) NULL,
        VitalSigns NVARCHAR(MAX) NULL, -- JSON
        MedicationChanges NVARCHAR(MAX) NULL,
        LabResults NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ChronicDiseaseFollowUps_Record FOREIGN KEY (ChronicDiseaseRecordId)
            REFERENCES ChronicDiseaseRecords(Id) ON DELETE NO ACTION
    );

    CREATE INDEX IX_ChronicDiseaseFollowUps_RecordId ON ChronicDiseaseFollowUps(ChronicDiseaseRecordId);
    CREATE INDEX IX_ChronicDiseaseFollowUps_FollowUpDate ON ChronicDiseaseFollowUps(FollowUpDate);
    CREATE INDEX IX_ChronicDiseaseFollowUps_Status ON ChronicDiseaseFollowUps(Status);

    PRINT 'Created table: ChronicDiseaseFollowUps';
END
GO

-- ============================================================
-- Module 16: Nha thuoc benh vien (Hospital Pharmacy Retail)
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RetailSales')
BEGIN
    CREATE TABLE RetailSales (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SaleCode NVARCHAR(50) NOT NULL,
        PatientId UNIQUEIDENTIFIER NULL,
        PatientName NVARCHAR(200) NULL,
        PhoneNumber NVARCHAR(20) NULL,
        TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        PaymentMethod NVARCHAR(20) NOT NULL DEFAULT 'Cash', -- Cash, Card, Transfer, Mixed
        PaymentReference NVARCHAR(100) NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Draft', -- Draft, Completed, Cancelled
        CashierId UNIQUEIDENTIFIER NOT NULL,
        Notes NVARCHAR(MAX) NULL,
        PrescriptionId UNIQUEIDENTIFIER NULL,
        CancelledBy NVARCHAR(100) NULL,
        CancelledAt DATETIME2 NULL,
        CancellationReason NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IX_RetailSales_SaleCode ON RetailSales(SaleCode);
    CREATE INDEX IX_RetailSales_PatientId ON RetailSales(PatientId);
    CREATE INDEX IX_RetailSales_Status ON RetailSales(Status);
    CREATE INDEX IX_RetailSales_CashierId ON RetailSales(CashierId);
    CREATE INDEX IX_RetailSales_CreatedAt ON RetailSales(CreatedAt);

    PRINT 'Created table: RetailSales';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RetailSaleItems')
BEGIN
    CREATE TABLE RetailSaleItems (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RetailSaleId UNIQUEIDENTIFIER NOT NULL,
        MedicineId UNIQUEIDENTIFIER NOT NULL,
        MedicineName NVARCHAR(500) NOT NULL,
        Unit NVARCHAR(50) NULL,
        Quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
        UnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
        Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        BatchNumber NVARCHAR(100) NULL,
        ExpiryDate DATETIME2 NULL,
        WarehouseId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RetailSaleItems_Sale FOREIGN KEY (RetailSaleId)
            REFERENCES RetailSales(Id) ON DELETE NO ACTION
    );

    CREATE INDEX IX_RetailSaleItems_RetailSaleId ON RetailSaleItems(RetailSaleId);
    CREATE INDEX IX_RetailSaleItems_MedicineId ON RetailSaleItems(MedicineId);

    PRINT 'Created table: RetailSaleItems';
END
GO

-- ============================================================
-- Module 20: Chi dao tuyen (Clinical Guidance)
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ClinicalGuidanceBatches')
BEGIN
    CREATE TABLE ClinicalGuidanceBatches (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Code NVARCHAR(50) NOT NULL,
        Title NVARCHAR(500) NOT NULL,
        TargetFacility NVARCHAR(500) NOT NULL,
        TargetFacilityCode NVARCHAR(50) NULL,
        GuidanceType NVARCHAR(30) NOT NULL DEFAULT 'KhamChua', -- KhamChua, DaoTao, ChuyenGiao, HoTro
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NULL,
        Status NVARCHAR(20) NOT NULL DEFAULT 'Planning', -- Planning, InProgress, Completed, Cancelled
        LeadDoctorId UNIQUEIDENTIFIER NOT NULL,
        TeamMembers NVARCHAR(MAX) NULL, -- JSON array
        Budget DECIMAL(18,2) NOT NULL DEFAULT 0,
        ActualCost DECIMAL(18,2) NOT NULL DEFAULT 0,
        Summary NVARCHAR(MAX) NULL,
        Results NVARCHAR(MAX) NULL,
        Recommendations NVARCHAR(MAX) NULL,
        PatientsExamined INT NOT NULL DEFAULT 0,
        TraineesCount INT NOT NULL DEFAULT 0,
        TechniquesTransferred INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IX_ClinicalGuidanceBatches_Code ON ClinicalGuidanceBatches(Code);
    CREATE INDEX IX_ClinicalGuidanceBatches_Status ON ClinicalGuidanceBatches(Status);
    CREATE INDEX IX_ClinicalGuidanceBatches_GuidanceType ON ClinicalGuidanceBatches(GuidanceType);
    CREATE INDEX IX_ClinicalGuidanceBatches_StartDate ON ClinicalGuidanceBatches(StartDate);
    CREATE INDEX IX_ClinicalGuidanceBatches_LeadDoctorId ON ClinicalGuidanceBatches(LeadDoctorId);

    PRINT 'Created table: ClinicalGuidanceBatches';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ClinicalGuidanceActivities')
BEGIN
    CREATE TABLE ClinicalGuidanceActivities (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        BatchId UNIQUEIDENTIFIER NOT NULL,
        ActivityDate DATETIME2 NOT NULL,
        ActivityType NVARCHAR(30) NOT NULL DEFAULT 'KhamBenh', -- KhamBenh, DaoTao, ChuyenGiao, HoiChan, BaoCao, Other
        Description NVARCHAR(MAX) NOT NULL,
        Performer NVARCHAR(200) NULL,
        Location NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        PatientCount INT NULL,
        TraineeCount INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ClinicalGuidanceActivities_Batch FOREIGN KEY (BatchId)
            REFERENCES ClinicalGuidanceBatches(Id) ON DELETE NO ACTION
    );

    CREATE INDEX IX_ClinicalGuidanceActivities_BatchId ON ClinicalGuidanceActivities(BatchId);
    CREATE INDEX IX_ClinicalGuidanceActivities_ActivityDate ON ClinicalGuidanceActivities(ActivityDate);

    PRINT 'Created table: ClinicalGuidanceActivities';
END
GO

-- ============================================================
-- Module 4.38-4.39: Quan ly BN Lao/HIV (TB/HIV Management)
-- ============================================================

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TbHivRecords')
BEGIN
    CREATE TABLE TbHivRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        RecordType NVARCHAR(10) NOT NULL DEFAULT 'TB', -- TB, HIV, TB_HIV
        RegistrationDate DATETIME2 NOT NULL,
        RegistrationCode NVARCHAR(50) NOT NULL,
        TreatmentCategory NVARCHAR(30) NOT NULL DEFAULT 'New', -- New, Relapse, FailedTreatment, ReturnAfterDefault, TransferIn, Other
        TreatmentRegimen NVARCHAR(200) NULL,
        TreatmentStartDate DATETIME2 NULL,
        ExpectedEndDate DATETIME2 NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'OnTreatment', -- OnTreatment, Completed, Failed, DefaultedLostToFollowUp, Died, TransferredOut
        -- TB specific
        SmearResult NVARCHAR(20) NULL, -- Positive, Negative, NotDone
        GeneXpertResult NVARCHAR(30) NULL, -- Detected, NotDetected, RifResistant, Indeterminate, NotDone
        TbSite NVARCHAR(20) NULL, -- Pulmonary, ExtraPulmonary, Both
        IsMdr BIT NOT NULL DEFAULT 0,
        -- HIV specific
        Cd4Count INT NULL,
        ViralLoad DECIMAL(18,2) NULL,
        ArtRegimen NVARCHAR(200) NULL,
        ArtStartDate DATETIME2 NULL,
        WhoStage NVARCHAR(5) NULL, -- I, II, III, IV
        -- DOT
        DotProvider NVARCHAR(200) NULL,
        DotProviderPhone NVARCHAR(20) NULL,
        -- Outcome
        OutcomeDate DATETIME2 NULL,
        OutcomeNotes NVARCHAR(MAX) NULL,
        DoctorId UNIQUEIDENTIFIER NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IX_TbHivRecords_RegistrationCode ON TbHivRecords(RegistrationCode);
    CREATE INDEX IX_TbHivRecords_PatientId ON TbHivRecords(PatientId);
    CREATE INDEX IX_TbHivRecords_RecordType ON TbHivRecords(RecordType);
    CREATE INDEX IX_TbHivRecords_Status ON TbHivRecords(Status);
    CREATE INDEX IX_TbHivRecords_TreatmentCategory ON TbHivRecords(TreatmentCategory);
    CREATE INDEX IX_TbHivRecords_DoctorId ON TbHivRecords(DoctorId);
    CREATE INDEX IX_TbHivRecords_RegistrationDate ON TbHivRecords(RegistrationDate);

    PRINT 'Created table: TbHivRecords';
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TbHivFollowUps')
BEGIN
    CREATE TABLE TbHivFollowUps (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TbHivRecordId UNIQUEIDENTIFIER NOT NULL,
        VisitDate DATETIME2 NOT NULL,
        TreatmentMonth INT NOT NULL DEFAULT 0,
        Weight DECIMAL(6,2) NULL,
        SmearResult NVARCHAR(20) NULL,
        CultureResult NVARCHAR(50) NULL,
        Cd4Count INT NULL,
        ViralLoad DECIMAL(18,2) NULL,
        DrugAdherence NVARCHAR(10) NULL, -- Good, Fair, Poor
        SideEffects NVARCHAR(MAX) NULL,
        RegimenChanged BIT NOT NULL DEFAULT 0,
        NewRegimen NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        ExaminationId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TbHivFollowUps_Record FOREIGN KEY (TbHivRecordId)
            REFERENCES TbHivRecords(Id) ON DELETE NO ACTION
    );

    CREATE INDEX IX_TbHivFollowUps_TbHivRecordId ON TbHivFollowUps(TbHivRecordId);
    CREATE INDEX IX_TbHivFollowUps_VisitDate ON TbHivFollowUps(VisitDate);

    PRINT 'Created table: TbHivFollowUps';
END
GO

PRINT 'NangCap14 tables creation complete.';
GO
