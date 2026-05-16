-- ============================================================================
-- Medinet Healthcare Modules - 10 modules, 17 tables
-- Idempotent script - uses IF NOT EXISTS
-- ============================================================================

USE HIS;
GO

-- ========================
-- Module 1: Giám định Y khoa (Medical Forensics)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ForensicCases')
BEGIN
    CREATE TABLE ForensicCases (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CaseCode NVARCHAR(50) NOT NULL,
        CaseType NVARCHAR(50) NOT NULL DEFAULT 'disability',
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientName NVARCHAR(200) NOT NULL DEFAULT '',
        DateOfBirth DATETIME2 NULL,
        Gender INT NULL,
        Cccd NVARCHAR(20) NULL,
        RequestingOrganization NVARCHAR(500) NULL,
        RequestDate DATETIME2 NULL,
        ExaminationDate DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        CouncilMembers NVARCHAR(MAX) NULL,
        DisabilityPercentage DECIMAL(5,2) NULL,
        Conclusion NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_ForensicCases_CaseCode ON ForensicCases(CaseCode);
    CREATE INDEX IX_ForensicCases_PatientId ON ForensicCases(PatientId);
    CREATE INDEX IX_ForensicCases_Status ON ForensicCases(Status);
    PRINT 'Created table ForensicCases';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ForensicExaminations')
BEGIN
    CREATE TABLE ForensicExaminations (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ForensicCaseId UNIQUEIDENTIFIER NOT NULL,
        ExamCategory NVARCHAR(50) NOT NULL DEFAULT 'general',
        Findings NVARCHAR(MAX) NULL,
        FunctionScore INT NULL,
        DisabilityScore INT NULL,
        ExaminerName NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ForensicExaminations_Case FOREIGN KEY (ForensicCaseId) REFERENCES ForensicCases(Id)
    );
    CREATE INDEX IX_ForensicExaminations_CaseId ON ForensicExaminations(ForensicCaseId);
    PRINT 'Created table ForensicExaminations';
END
GO

-- ========================
-- Module 2: Y học cổ truyền (Traditional Medicine)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TraditionalMedicineTreatments')
BEGIN
    CREATE TABLE TraditionalMedicineTreatments (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TreatmentCode NVARCHAR(50) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientName NVARCHAR(200) NOT NULL DEFAULT '',
        TreatmentType NVARCHAR(50) NOT NULL DEFAULT 'combined',
        DiagnosisTCM NVARCHAR(500) NULL,
        DiagnosisWestern NVARCHAR(500) NULL,
        SessionNumber INT NOT NULL DEFAULT 1,
        TreatmentPlan NVARCHAR(MAX) NULL,
        Practitioner NVARCHAR(200) NULL,
        Status INT NOT NULL DEFAULT 0,
        StartDate DATETIME2 NULL,
        EndDate DATETIME2 NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_TraditionalMedicineTreatments_Code ON TraditionalMedicineTreatments(TreatmentCode);
    CREATE INDEX IX_TraditionalMedicineTreatments_PatientId ON TraditionalMedicineTreatments(PatientId);
    PRINT 'Created table TraditionalMedicineTreatments';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HerbalPrescriptions')
BEGIN
    CREATE TABLE HerbalPrescriptions (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TreatmentId UNIQUEIDENTIFIER NOT NULL,
        PrescriptionCode NVARCHAR(50) NOT NULL,
        HerbalFormula NVARCHAR(500) NULL,
        Ingredients NVARCHAR(MAX) NULL,
        Dosage NVARCHAR(500) NULL,
        Instructions NVARCHAR(MAX) NULL,
        Duration INT NOT NULL DEFAULT 7,
        Quantity INT NOT NULL DEFAULT 1,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_HerbalPrescriptions_Treatment FOREIGN KEY (TreatmentId) REFERENCES TraditionalMedicineTreatments(Id)
    );
    CREATE INDEX IX_HerbalPrescriptions_TreatmentId ON HerbalPrescriptions(TreatmentId);
    PRINT 'Created table HerbalPrescriptions';
END
GO

-- ========================
-- Module 3: Sức khỏe sinh sản (Reproductive Health)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PrenatalRecords')
BEGIN
    CREATE TABLE PrenatalRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RecordCode NVARCHAR(50) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientName NVARCHAR(200) NOT NULL DEFAULT '',
        DateOfBirth DATETIME2 NULL,
        Gravida INT NOT NULL DEFAULT 1,
        Para INT NOT NULL DEFAULT 0,
        GestationalAge INT NOT NULL DEFAULT 0,
        ExpectedDeliveryDate DATETIME2 NULL,
        LastMenstrualPeriod DATETIME2 NULL,
        BloodType NVARCHAR(10) NULL,
        RhFactor NVARCHAR(10) NULL,
        CurrentWeight DECIMAL(5,2) NULL,
        PrePregnancyWeight DECIMAL(5,2) NULL,
        BloodPressureSystolic INT NULL,
        BloodPressureDiastolic INT NULL,
        FetalHeartRate INT NULL,
        FundalHeight DECIMAL(5,1) NULL,
        RiskLevel NVARCHAR(20) NOT NULL DEFAULT 'low',
        RiskFactors NVARCHAR(MAX) NULL,
        ScreeningResults NVARCHAR(MAX) NULL,
        NextAppointment DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_PrenatalRecords_PatientId ON PrenatalRecords(PatientId);
    CREATE INDEX IX_PrenatalRecords_RiskLevel ON PrenatalRecords(RiskLevel);
    PRINT 'Created table PrenatalRecords';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FamilyPlanningRecords')
BEGIN
    CREATE TABLE FamilyPlanningRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RecordCode NVARCHAR(50) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientName NVARCHAR(200) NOT NULL DEFAULT '',
        DateOfBirth DATETIME2 NULL,
        Gender INT NULL,
        Method NVARCHAR(50) NOT NULL DEFAULT 'none',
        StartDate DATETIME2 NULL,
        ExpiryDate DATETIME2 NULL,
        FollowUpDate DATETIME2 NULL,
        Provider NVARCHAR(200) NULL,
        FacilityName NVARCHAR(500) NULL,
        SideEffects NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_FamilyPlanningRecords_PatientId ON FamilyPlanningRecords(PatientId);
    CREATE INDEX IX_FamilyPlanningRecords_Method ON FamilyPlanningRecords(Method);
    PRINT 'Created table FamilyPlanningRecords';
END
GO

-- ========================
-- Module 4: Sức khỏe tâm thần (Mental Health)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MentalHealthCases')
BEGIN
    CREATE TABLE MentalHealthCases (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CaseCode NVARCHAR(50) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientName NVARCHAR(200) NOT NULL DEFAULT '',
        DateOfBirth DATETIME2 NULL,
        Gender INT NULL,
        DiagnosisCode NVARCHAR(20) NULL,
        DiagnosisName NVARCHAR(500) NULL,
        Severity NVARCHAR(20) NOT NULL DEFAULT 'moderate',
        CaseType NVARCHAR(50) NOT NULL DEFAULT 'other',
        TreatingDoctor NVARCHAR(200) NULL,
        CommunityWorker NVARCHAR(200) NULL,
        MedicationRegimen NVARCHAR(MAX) NULL,
        AdherenceLevel NVARCHAR(20) NOT NULL DEFAULT 'fair',
        LastVisitDate DATETIME2 NULL,
        NextVisitDate DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        EmergencyContactName NVARCHAR(200) NULL,
        EmergencyContactPhone NVARCHAR(20) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_MentalHealthCases_PatientId ON MentalHealthCases(PatientId);
    CREATE INDEX IX_MentalHealthCases_CaseType ON MentalHealthCases(CaseType);
    CREATE INDEX IX_MentalHealthCases_Status ON MentalHealthCases(Status);
    PRINT 'Created table MentalHealthCases';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PsychiatricAssessments')
BEGIN
    CREATE TABLE PsychiatricAssessments (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CaseId UNIQUEIDENTIFIER NOT NULL,
        AssessmentDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        AssessmentType NVARCHAR(50) NOT NULL DEFAULT 'custom',
        TotalScore INT NOT NULL DEFAULT 0,
        Interpretation NVARCHAR(500) NULL,
        Findings NVARCHAR(MAX) NULL,
        Recommendations NVARCHAR(MAX) NULL,
        AssessorName NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_PsychiatricAssessments_Case FOREIGN KEY (CaseId) REFERENCES MentalHealthCases(Id)
    );
    CREATE INDEX IX_PsychiatricAssessments_CaseId ON PsychiatricAssessments(CaseId);
    PRINT 'Created table PsychiatricAssessments';
END
GO

-- ========================
-- Module 5: Quản lý môi trường y tế (Environmental Health)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WasteRecords')
BEGIN
    CREATE TABLE WasteRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RecordCode NVARCHAR(50) NOT NULL,
        RecordDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        WasteType NVARCHAR(50) NOT NULL DEFAULT 'general',
        Quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
        DisposalMethod NVARCHAR(50) NULL,
        DisposalDate DATETIME2 NULL,
        DisposedBy NVARCHAR(200) NULL,
        CollectorName NVARCHAR(200) NULL,
        CollectorLicense NVARCHAR(100) NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        DepartmentName NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_WasteRecords_WasteType ON WasteRecords(WasteType);
    CREATE INDEX IX_WasteRecords_Status ON WasteRecords(Status);
    PRINT 'Created table WasteRecords';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EnvironmentalMonitorings')
BEGIN
    CREATE TABLE EnvironmentalMonitorings (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MonitoringCode NVARCHAR(50) NOT NULL,
        MonitoringDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        MonitoringType NVARCHAR(50) NOT NULL DEFAULT 'air',
        Location NVARCHAR(500) NULL,
        MeasuredValue DECIMAL(10,2) NOT NULL DEFAULT 0,
        Unit NVARCHAR(50) NULL,
        StandardLimit DECIMAL(10,2) NULL,
        IsCompliant BIT NOT NULL DEFAULT 1,
        InstrumentUsed NVARCHAR(200) NULL,
        MeasuredBy NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_EnvironmentalMonitorings_Type ON EnvironmentalMonitorings(MonitoringType);
    CREATE INDEX IX_EnvironmentalMonitorings_Compliant ON EnvironmentalMonitorings(IsCompliant);
    PRINT 'Created table EnvironmentalMonitorings';
END
GO

-- ========================
-- Module 6: Sổ chấn thương (Trauma Registry)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TraumaCases')
BEGIN
    CREATE TABLE TraumaCases (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CaseCode NVARCHAR(50) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientName NVARCHAR(200) NOT NULL DEFAULT '',
        DateOfBirth DATETIME2 NULL,
        Gender INT NULL,
        AdmissionDate DATETIME2 NULL,
        InjuryDate DATETIME2 NULL,
        InjuryType NVARCHAR(50) NOT NULL DEFAULT 'other',
        InjuryMechanism NVARCHAR(500) NULL,
        InjuryLocation NVARCHAR(200) NULL,
        InjurySeverityScore INT NULL,
        RevisedTraumaScore DECIMAL(5,2) NULL,
        GlasgowComaScale INT NULL,
        TriageCategory NVARCHAR(20) NULL,
        Intentionality NVARCHAR(50) NULL,
        AlcoholInvolved BIT NOT NULL DEFAULT 0,
        TransportMode NVARCHAR(50) NULL,
        PreHospitalTime INT NULL,
        SurgeryRequired BIT NOT NULL DEFAULT 0,
        IcuAdmission BIT NOT NULL DEFAULT 0,
        VentilatorDays INT NULL,
        LengthOfStay INT NULL,
        Outcome NVARCHAR(50) NULL,
        DischargeDate DATETIME2 NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_TraumaCases_PatientId ON TraumaCases(PatientId);
    CREATE INDEX IX_TraumaCases_InjuryType ON TraumaCases(InjuryType);
    CREATE INDEX IX_TraumaCases_TriageCategory ON TraumaCases(TriageCategory);
    PRINT 'Created table TraumaCases';
END
GO

-- ========================
-- Module 7: Dân số - KHHGĐ (Population Health)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PopulationRecords')
BEGIN
    CREATE TABLE PopulationRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RecordCode NVARCHAR(50) NOT NULL,
        RecordType NVARCHAR(50) NOT NULL DEFAULT 'population_survey',
        PatientId UNIQUEIDENTIFIER NULL,
        PatientName NVARCHAR(200) NULL,
        DateOfBirth DATETIME2 NULL,
        Gender INT NULL,
        Ward NVARCHAR(200) NULL,
        District NVARCHAR(200) NULL,
        ServiceDate DATETIME2 NULL,
        ServiceType NVARCHAR(200) NULL,
        Provider NVARCHAR(200) NULL,
        FacilityName NVARCHAR(500) NULL,
        FollowUpDate DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_PopulationRecords_RecordType ON PopulationRecords(RecordType);
    CREATE INDEX IX_PopulationRecords_Status ON PopulationRecords(Status);
    PRINT 'Created table PopulationRecords';
END
GO

-- ========================
-- Module 8: Truyền thông GDSK (Health Education)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HealthCampaigns')
BEGIN
    CREATE TABLE HealthCampaigns (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CampaignCode NVARCHAR(50) NOT NULL,
        Title NVARCHAR(500) NOT NULL DEFAULT '',
        Description NVARCHAR(MAX) NULL,
        CampaignType NVARCHAR(50) NOT NULL DEFAULT 'other',
        TargetAudience NVARCHAR(500) NULL,
        StartDate DATETIME2 NULL,
        EndDate DATETIME2 NULL,
        Location NVARCHAR(500) NULL,
        Organizer NVARCHAR(200) NULL,
        ParticipantCount INT NULL,
        Budget DECIMAL(18,2) NULL,
        Status INT NOT NULL DEFAULT 0,
        Outcomes NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_HealthCampaigns_CampaignType ON HealthCampaigns(CampaignType);
    CREATE INDEX IX_HealthCampaigns_Status ON HealthCampaigns(Status);
    PRINT 'Created table HealthCampaigns';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HealthEducationMaterials')
BEGIN
    CREATE TABLE HealthEducationMaterials (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MaterialCode NVARCHAR(50) NOT NULL,
        Title NVARCHAR(500) NOT NULL DEFAULT '',
        MaterialType NVARCHAR(50) NOT NULL DEFAULT 'leaflet',
        Topic NVARCHAR(200) NULL,
        Language NVARCHAR(10) NOT NULL DEFAULT 'vi',
        FilePath NVARCHAR(500) NULL,
        FileSize BIGINT NULL,
        Downloads INT NOT NULL DEFAULT 0,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_HealthEducationMaterials_MaterialType ON HealthEducationMaterials(MaterialType);
    PRINT 'Created table HealthEducationMaterials';
END
GO

-- ========================
-- Module 9: Quản lý hành nghề (Practice License Management)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PracticeLicenses')
BEGIN
    CREATE TABLE PracticeLicenses (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        LicenseCode NVARCHAR(50) NOT NULL,
        LicenseType NVARCHAR(50) NOT NULL DEFAULT 'doctor',
        HolderName NVARCHAR(200) NOT NULL DEFAULT '',
        DateOfBirth DATETIME2 NULL,
        Cccd NVARCHAR(20) NULL,
        Specialty NVARCHAR(200) NULL,
        IssuingAuthority NVARCHAR(500) NULL,
        IssueDate DATETIME2 NULL,
        ExpiryDate DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        FacilityId UNIQUEIDENTIFIER NULL,
        FacilityName NVARCHAR(500) NULL,
        CertificateNumber NVARCHAR(100) NULL,
        TrainingInstitution NVARCHAR(500) NULL,
        GraduationYear INT NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_PracticeLicenses_LicenseCode ON PracticeLicenses(LicenseCode);
    CREATE INDEX IX_PracticeLicenses_LicenseType ON PracticeLicenses(LicenseType);
    CREATE INDEX IX_PracticeLicenses_Status ON PracticeLicenses(Status);
    CREATE INDEX IX_PracticeLicenses_ExpiryDate ON PracticeLicenses(ExpiryDate);
    PRINT 'Created table PracticeLicenses';
END
GO

-- ========================
-- Module 10: Chia sẻ dữ liệu liên viện (Inter-Hospital Sharing)
-- ========================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InterHospitalRequests')
BEGIN
    CREATE TABLE InterHospitalRequests (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RequestCode NVARCHAR(50) NOT NULL,
        RequestType NVARCHAR(50) NOT NULL DEFAULT 'consultation',
        RequestingFacility NVARCHAR(500) NULL,
        ReceivingFacility NVARCHAR(500) NULL,
        PatientId UNIQUEIDENTIFIER NULL,
        PatientName NVARCHAR(200) NULL,
        Urgency NVARCHAR(20) NOT NULL DEFAULT 'routine',
        RequestDate DATETIME2 NULL,
        ResponseDate DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        RequestDetails NVARCHAR(MAX) NULL,
        ResponseDetails NVARCHAR(MAX) NULL,
        RequestedBy NVARCHAR(200) NULL,
        RespondedBy NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(100) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(100) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_InterHospitalRequests_RequestCode ON InterHospitalRequests(RequestCode);
    CREATE INDEX IX_InterHospitalRequests_RequestType ON InterHospitalRequests(RequestType);
    CREATE INDEX IX_InterHospitalRequests_Status ON InterHospitalRequests(Status);
    CREATE INDEX IX_InterHospitalRequests_Urgency ON InterHospitalRequests(Urgency);
    PRINT 'Created table InterHospitalRequests';
END
GO

PRINT '=== All 17 Medinet module tables created successfully ===';
GO
