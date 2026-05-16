-- ============================================================
-- Public Health Modules: FoodSafety, CommunityHealth, HIV/AIDS
-- Idempotent: IF NOT EXISTS for all tables
-- ============================================================

USE HIS;
GO

-- ==================== MODULE 1: Food Safety ====================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FoodPoisoningIncidents')
BEGIN
    CREATE TABLE FoodPoisoningIncidents (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ReportNumber NVARCHAR(50) NOT NULL,
        IncidentDate DATETIME2 NOT NULL,
        Location NVARCHAR(500) NOT NULL,
        FoodSource NVARCHAR(500),
        FoodType NVARCHAR(200),
        EstimatedExposed INT NOT NULL DEFAULT 0,
        AffectedCount INT NOT NULL DEFAULT 0,
        HospitalizedCount INT NOT NULL DEFAULT 0,
        DeathCount INT NOT NULL DEFAULT 0,
        Symptoms NVARCHAR(MAX),
        SuspectedCause NVARCHAR(500),
        InvestigationStatus INT NOT NULL DEFAULT 0,  -- 0=Reported, 1=Investigating, 2=Confirmed, 3=Closed
        SeverityLevel INT NOT NULL DEFAULT 1,         -- 1=Minor, 2=Moderate, 3=Serious, 4=Critical
        ReportedBy NVARCHAR(200),
        ReportedAt DATETIME2,
        InvestigatorId UNIQUEIDENTIFIER,
        InvestigationStartedAt DATETIME2,
        InvestigationCompletedAt DATETIME2,
        Conclusion NVARCHAR(MAX),
        CorrectiveActions NVARCHAR(MAX),
        NotifiedAuthorities BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_FoodPoisoningIncidents_IncidentDate ON FoodPoisoningIncidents(IncidentDate);
    CREATE INDEX IX_FoodPoisoningIncidents_Status ON FoodPoisoningIncidents(InvestigationStatus);
    CREATE INDEX IX_FoodPoisoningIncidents_Severity ON FoodPoisoningIncidents(SeverityLevel);
    PRINT 'Created table: FoodPoisoningIncidents';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FoodSafetySamples')
BEGIN
    CREATE TABLE FoodSafetySamples (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        IncidentId UNIQUEIDENTIFIER NOT NULL,
        SampleType NVARCHAR(50) NOT NULL,      -- Food, Water, Swab, Biological
        SampleCode NVARCHAR(50) NOT NULL,
        CollectedAt DATETIME2 NOT NULL,
        CollectedBy NVARCHAR(200),
        LabSentAt DATETIME2,
        LabResult NVARCHAR(MAX),
        LabResultDate DATETIME2,
        PathogensFound NVARCHAR(500),
        IsPositive BIT,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_FoodSafetySamples_Incident FOREIGN KEY (IncidentId) REFERENCES FoodPoisoningIncidents(Id)
    );
    CREATE INDEX IX_FoodSafetySamples_IncidentId ON FoodSafetySamples(IncidentId);
    CREATE INDEX IX_FoodSafetySamples_SampleCode ON FoodSafetySamples(SampleCode);
    PRINT 'Created table: FoodSafetySamples';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FoodEstablishmentInspections')
BEGIN
    CREATE TABLE FoodEstablishmentInspections (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        EstablishmentName NVARCHAR(500) NOT NULL,
        Address NVARCHAR(500),
        LicenseNumber NVARCHAR(50),
        InspectionDate DATETIME2 NOT NULL,
        InspectorId UNIQUEIDENTIFIER,
        InspectorName NVARCHAR(200),
        OverallScore INT NOT NULL DEFAULT 0,
        ComplianceLevel NVARCHAR(1) NOT NULL DEFAULT 'B',  -- A, B, C, D
        ViolationsFound NVARCHAR(MAX),
        CorrectiveDeadline DATETIME2,
        FollowUpDate DATETIME2,
        Status INT NOT NULL DEFAULT 0,  -- 0=Scheduled, 1=InProgress, 2=Completed, 3=FollowUpNeeded
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_FoodEstablishmentInspections_Date ON FoodEstablishmentInspections(InspectionDate);
    CREATE INDEX IX_FoodEstablishmentInspections_Status ON FoodEstablishmentInspections(Status);
    CREATE INDEX IX_FoodEstablishmentInspections_Compliance ON FoodEstablishmentInspections(ComplianceLevel);
    PRINT 'Created table: FoodEstablishmentInspections';
END
GO

-- ==================== MODULE 2: Community Health ====================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CommunityHealthTeams')
BEGIN
    CREATE TABLE CommunityHealthTeams (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TeamCode NVARCHAR(50) NOT NULL,
        TeamName NVARCHAR(200) NOT NULL,
        LeaderName NVARCHAR(200),
        LeaderId UNIQUEIDENTIFIER,
        AssignedWard NVARCHAR(200),
        MemberCount INT NOT NULL DEFAULT 0,
        ActiveHouseholds INT NOT NULL DEFAULT 0,
        Status INT NOT NULL DEFAULT 0,  -- 0=Active, 1=Inactive
        EstablishedDate DATETIME2,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_CommunityHealthTeams_TeamCode ON CommunityHealthTeams(TeamCode);
    CREATE INDEX IX_CommunityHealthTeams_Status ON CommunityHealthTeams(Status);
    PRINT 'Created table: CommunityHealthTeams';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HouseholdHealthRecords')
BEGIN
    CREATE TABLE HouseholdHealthRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        HouseholdCode NVARCHAR(50) NOT NULL,
        Address NVARCHAR(500),
        WardName NVARCHAR(200),
        DistrictName NVARCHAR(200),
        HeadOfHousehold NVARCHAR(200),
        PhoneNumber NVARCHAR(20),
        MemberCount INT NOT NULL DEFAULT 0,
        RiskLevel INT NOT NULL DEFAULT 0,  -- 0=Low, 1=Medium, 2=High, 3=VeryHigh
        AssignedTeamId UNIQUEIDENTIFIER,
        LastVisitDate DATETIME2,
        NextVisitDate DATETIME2,
        Notes NVARCHAR(MAX),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_HouseholdHealthRecords_Team FOREIGN KEY (AssignedTeamId) REFERENCES CommunityHealthTeams(Id)
    );
    CREATE INDEX IX_HouseholdHealthRecords_Code ON HouseholdHealthRecords(HouseholdCode);
    CREATE INDEX IX_HouseholdHealthRecords_RiskLevel ON HouseholdHealthRecords(RiskLevel);
    CREATE INDEX IX_HouseholdHealthRecords_TeamId ON HouseholdHealthRecords(AssignedTeamId);
    CREATE INDEX IX_HouseholdHealthRecords_NextVisit ON HouseholdHealthRecords(NextVisitDate);
    PRINT 'Created table: HouseholdHealthRecords';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NcdScreenings')
BEGIN
    CREATE TABLE NcdScreenings (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        ScreeningDate DATETIME2 NOT NULL,
        ScreeningType NVARCHAR(20) NOT NULL DEFAULT 'Combined',  -- HTN, DM, CVD, Combined
        SystolicBP INT,
        DiastolicBP INT,
        FastingGlucose DECIMAL(6,2),
        RandomGlucose DECIMAL(6,2),
        HbA1c DECIMAL(4,2),
        BMI DECIMAL(5,2),
        WaistCircumference DECIMAL(5,2),
        SmokingStatus INT NOT NULL DEFAULT 0,      -- 0=Never, 1=Former, 2=Current
        AlcoholUse INT NOT NULL DEFAULT 0,          -- 0=None, 1=Low, 2=Moderate, 3=Heavy
        PhysicalActivity INT NOT NULL DEFAULT 0,    -- 0=Sedentary, 1=Light, 2=Moderate, 3=Active
        FamilyHistory NVARCHAR(500),
        CVDRiskScore DECIMAL(5,2),
        RiskLevel INT NOT NULL DEFAULT 0,           -- 0=Low, 1=Medium, 2=High, 3=VeryHigh
        Diagnosis NVARCHAR(500),
        ReferredToFacility BIT NOT NULL DEFAULT 0,
        FollowUpDate DATETIME2,
        ScreenedBy NVARCHAR(200),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_NcdScreenings_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );
    CREATE INDEX IX_NcdScreenings_PatientId ON NcdScreenings(PatientId);
    CREATE INDEX IX_NcdScreenings_Date ON NcdScreenings(ScreeningDate);
    CREATE INDEX IX_NcdScreenings_Type ON NcdScreenings(ScreeningType);
    CREATE INDEX IX_NcdScreenings_RiskLevel ON NcdScreenings(RiskLevel);
    PRINT 'Created table: NcdScreenings';
END
GO

-- ==================== MODULE 3: HIV/AIDS Management ====================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HivPatients')
BEGIN
    CREATE TABLE HivPatients (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        HivCode NVARCHAR(50) NOT NULL,
        DiagnosisDate DATETIME2 NOT NULL,
        DiagnosisType NVARCHAR(20) NOT NULL DEFAULT 'VCT',  -- VCT, HTC, PMTCT, Other
        ConfirmationDate DATETIME2,
        CurrentARTRegimen NVARCHAR(200),
        ARTStartDate DATETIME2,
        ARTStatus INT NOT NULL DEFAULT 0,  -- 0=PreART, 1=OnART, 2=Interrupted, 3=Transferred, 4=Deceased, 5=LostToFollowUp
        WHOStage INT NOT NULL DEFAULT 1,   -- 1-4
        LastCD4Count INT,
        LastCD4Date DATETIME2,
        LastViralLoad DECIMAL(18,2),
        LastViralLoadDate DATETIME2,
        IsVirallySuppressed BIT,
        CoInfections NVARCHAR(500),
        ReferralSource NVARCHAR(200),
        LinkedToMethadone BIT NOT NULL DEFAULT 0,
        MethadonePatientId UNIQUEIDENTIFIER,
        NextAppointmentDate DATETIME2,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_HivPatients_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );
    CREATE UNIQUE INDEX IX_HivPatients_HivCode ON HivPatients(HivCode) WHERE IsDeleted = 0;
    CREATE INDEX IX_HivPatients_PatientId ON HivPatients(PatientId);
    CREATE INDEX IX_HivPatients_ARTStatus ON HivPatients(ARTStatus);
    CREATE INDEX IX_HivPatients_WHOStage ON HivPatients(WHOStage);
    CREATE INDEX IX_HivPatients_NextAppt ON HivPatients(NextAppointmentDate);
    PRINT 'Created table: HivPatients';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HivLabResults')
BEGIN
    CREATE TABLE HivLabResults (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        HivPatientId UNIQUEIDENTIFIER NOT NULL,
        TestDate DATETIME2 NOT NULL,
        TestType NVARCHAR(50) NOT NULL,  -- CD4, ViralLoad, Genotype, DrugResistance, HepB, HepC
        Result NVARCHAR(200),
        Unit NVARCHAR(50),
        IsAbnormal BIT,
        LabName NVARCHAR(200),
        OrderedBy NVARCHAR(200),
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_HivLabResults_HivPatient FOREIGN KEY (HivPatientId) REFERENCES HivPatients(Id)
    );
    CREATE INDEX IX_HivLabResults_HivPatientId ON HivLabResults(HivPatientId);
    CREATE INDEX IX_HivLabResults_TestDate ON HivLabResults(TestDate);
    CREATE INDEX IX_HivLabResults_TestType ON HivLabResults(TestType);
    PRINT 'Created table: HivLabResults';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PmtctRecords')
BEGIN
    CREATE TABLE PmtctRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        HivPatientId UNIQUEIDENTIFIER NOT NULL,
        PregnancyId UNIQUEIDENTIFIER,
        GestationalAgeAtDiagnosis INT,
        ARTDuringPregnancy BIT NOT NULL DEFAULT 0,
        DeliveryDate DATETIME2,
        DeliveryMode NVARCHAR(50),
        InfantProphylaxis BIT NOT NULL DEFAULT 0,
        InfantHivTestDate DATETIME2,
        InfantHivTestResult NVARCHAR(50),  -- Positive, Negative, Indeterminate
        BreastfeedingStatus NVARCHAR(50),  -- Exclusive, Mixed, Formula, None
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100),
        UpdatedAt DATETIME2,
        UpdatedBy NVARCHAR(100),
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_PmtctRecords_HivPatient FOREIGN KEY (HivPatientId) REFERENCES HivPatients(Id)
    );
    CREATE INDEX IX_PmtctRecords_HivPatientId ON PmtctRecords(HivPatientId);
    PRINT 'Created table: PmtctRecords';
END
GO

PRINT '=== All medinet tables created successfully ==='
GO
