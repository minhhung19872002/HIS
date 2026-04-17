-- =====================================================================
-- Public Health Module Tables
-- 6 modules: Health Checkup, Vaccination, Disease Surveillance,
--            School Health, Occupational Health, Methadone Treatment
-- =====================================================================

-- 1. Health Checkups (Khám sức khỏe)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HealthCheckups')
BEGIN
    CREATE TABLE HealthCheckups (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        CheckupType NVARCHAR(50) NOT NULL,
        FormCode NVARCHAR(20) NOT NULL,
        BatchCode NVARCHAR(50) NULL,
        OrganizationName NVARCHAR(200) NULL,
        Status INT NOT NULL DEFAULT 0,
        ExamResult NVARCHAR(200) NULL,
        Classification NVARCHAR(50) NULL,
        GeneralConclusion NVARCHAR(MAX) NULL,
        InternalMedicine NVARCHAR(MAX) NULL,
        Surgery NVARCHAR(MAX) NULL,
        Ophthalmology NVARCHAR(MAX) NULL,
        ENT NVARCHAR(MAX) NULL,
        Dental NVARCHAR(MAX) NULL,
        Dermatology NVARCHAR(MAX) NULL,
        Gynecology NVARCHAR(MAX) NULL,
        Psychiatry NVARCHAR(MAX) NULL,
        Height REAL NULL,
        Weight REAL NULL,
        BMI REAL NULL,
        BloodPressure NVARCHAR(20) NULL,
        HeartRate REAL NULL,
        BloodType NVARCHAR(10) NULL,
        VisionLeft NVARCHAR(20) NULL,
        VisionRight NVARCHAR(20) NULL,
        HearingLeft NVARCHAR(50) NULL,
        HearingRight NVARCHAR(50) NULL,
        LabResults NVARCHAR(MAX) NULL,
        XrayResult NVARCHAR(MAX) NULL,
        DoctorId NVARCHAR(100) NULL,
        DoctorName NVARCHAR(200) NULL,
        ExamDate DATETIME2 NULL,
        CertificateDate DATETIME2 NULL,
        CertificateNumber NVARCHAR(50) NULL,
        Notes NVARCHAR(MAX) NULL,
        DriverLicenseClass NVARCHAR(10) NULL,
        DriverReactionTest NVARCHAR(200) NULL,
        DriverColorVision NVARCHAR(200) NULL,
        AgeMonths INT NULL,
        DevelopmentAssessment NVARCHAR(MAX) NULL,
        NutritionStatus NVARCHAR(100) NULL,
        VaccinationStatus NVARCHAR(200) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_HealthCheckups_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );

    CREATE INDEX IX_HealthCheckups_PatientId ON HealthCheckups(PatientId);
    CREATE INDEX IX_HealthCheckups_CheckupType ON HealthCheckups(CheckupType);
    CREATE INDEX IX_HealthCheckups_Status ON HealthCheckups(Status);
    CREATE INDEX IX_HealthCheckups_ExamDate ON HealthCheckups(ExamDate);
    CREATE INDEX IX_HealthCheckups_BatchCode ON HealthCheckups(BatchCode) WHERE BatchCode IS NOT NULL;

    PRINT 'Created table: HealthCheckups';
END
GO

-- 2. Vaccination Records (Tiêm chủng)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VaccinationRecords')
BEGIN
    CREATE TABLE VaccinationRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        VaccineName NVARCHAR(200) NOT NULL,
        VaccineCode NVARCHAR(50) NULL,
        LotNumber NVARCHAR(50) NULL,
        Manufacturer NVARCHAR(200) NULL,
        VaccinationDate DATETIME2 NOT NULL,
        DoseNumber INT NOT NULL DEFAULT 1,
        InjectionSite NVARCHAR(100) NULL,
        Route NVARCHAR(20) NULL,
        DoseMl REAL NULL,
        AdministeredBy NVARCHAR(200) NULL,
        FacilityName NVARCHAR(200) NULL,
        Status INT NOT NULL DEFAULT 0,
        AefiReport NVARCHAR(MAX) NULL,
        AefiSeverity INT NULL,
        NextDoseDate DATETIME2 NULL,
        CampaignCode NVARCHAR(50) NULL,
        Notes NVARCHAR(MAX) NULL,
        IsEPI BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_VaccinationRecords_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );

    CREATE INDEX IX_VaccinationRecords_PatientId ON VaccinationRecords(PatientId);
    CREATE INDEX IX_VaccinationRecords_VaccinationDate ON VaccinationRecords(VaccinationDate);
    CREATE INDEX IX_VaccinationRecords_VaccineName ON VaccinationRecords(VaccineName);
    CREATE INDEX IX_VaccinationRecords_Status ON VaccinationRecords(Status);
    CREATE INDEX IX_VaccinationRecords_CampaignCode ON VaccinationRecords(CampaignCode) WHERE CampaignCode IS NOT NULL;
    CREATE INDEX IX_VaccinationRecords_IsEPI ON VaccinationRecords(IsEPI) WHERE IsEPI = 1;

    PRINT 'Created table: VaccinationRecords';
END
GO

-- 3. Vaccination Campaigns (Chiến dịch tiêm chủng)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VaccinationCampaigns')
BEGIN
    CREATE TABLE VaccinationCampaigns (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CampaignCode NVARCHAR(50) NOT NULL,
        CampaignName NVARCHAR(200) NOT NULL,
        VaccineName NVARCHAR(200) NOT NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NOT NULL,
        TargetGroup NVARCHAR(200) NULL,
        TargetCount INT NOT NULL DEFAULT 0,
        CompletedCount INT NOT NULL DEFAULT 0,
        Status INT NOT NULL DEFAULT 0,
        Description NVARCHAR(MAX) NULL,
        Areas NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX UX_VaccinationCampaigns_Code ON VaccinationCampaigns(CampaignCode) WHERE IsDeleted = 0;
    CREATE INDEX IX_VaccinationCampaigns_Status ON VaccinationCampaigns(Status);

    PRINT 'Created table: VaccinationCampaigns';
END
GO

-- 4. Disease Reports (Báo cáo bệnh truyền nhiễm)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DiseaseReports')
BEGIN
    CREATE TABLE DiseaseReports (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NULL,
        PatientName NVARCHAR(200) NOT NULL,
        PatientAge NVARCHAR(20) NULL,
        PatientGender NVARCHAR(10) NULL,
        PatientAddress NVARCHAR(500) NULL,
        DiseaseCode NVARCHAR(20) NOT NULL,
        DiseaseName NVARCHAR(200) NOT NULL,
        DiseaseGroup NVARCHAR(10) NULL,
        OnsetDate DATETIME2 NOT NULL,
        ReportDate DATETIME2 NOT NULL,
        DiagnosisDate DATETIME2 NULL,
        ReportedBy NVARCHAR(200) NULL,
        FacilityName NVARCHAR(200) NULL,
        Status INT NOT NULL DEFAULT 0,
        IsNotifiable BIT NOT NULL DEFAULT 0,
        Outcome NVARCHAR(50) NULL,
        QuarantineStatus NVARCHAR(100) NULL,
        ContactTracingNotes NVARCHAR(MAX) NULL,
        ContactCount INT NOT NULL DEFAULT 0,
        TravelHistory NVARCHAR(MAX) NULL,
        ExposureSource NVARCHAR(500) NULL,
        LabConfirmation NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_DiseaseReports_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );

    CREATE INDEX IX_DiseaseReports_PatientId ON DiseaseReports(PatientId) WHERE PatientId IS NOT NULL;
    CREATE INDEX IX_DiseaseReports_DiseaseCode ON DiseaseReports(DiseaseCode);
    CREATE INDEX IX_DiseaseReports_DiseaseGroup ON DiseaseReports(DiseaseGroup) WHERE DiseaseGroup IS NOT NULL;
    CREATE INDEX IX_DiseaseReports_ReportDate ON DiseaseReports(ReportDate);
    CREATE INDEX IX_DiseaseReports_Status ON DiseaseReports(Status);
    CREATE INDEX IX_DiseaseReports_IsNotifiable ON DiseaseReports(IsNotifiable) WHERE IsNotifiable = 1;

    PRINT 'Created table: DiseaseReports';
END
GO

-- 5. Outbreak Events (Sự kiện dịch bệnh)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OutbreakEvents')
BEGIN
    CREATE TABLE OutbreakEvents (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        OutbreakCode NVARCHAR(50) NOT NULL,
        DiseaseName NVARCHAR(200) NOT NULL,
        DiseaseCode NVARCHAR(20) NULL,
        DetectedDate DATETIME2 NOT NULL,
        ResolvedDate DATETIME2 NULL,
        Location NVARCHAR(500) NULL,
        AffectedArea NVARCHAR(500) NULL,
        CaseCount INT NOT NULL DEFAULT 0,
        DeathCount INT NOT NULL DEFAULT 0,
        Status INT NOT NULL DEFAULT 0,
        ResponseActions NVARCHAR(MAX) NULL,
        RiskLevel NVARCHAR(20) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX UX_OutbreakEvents_Code ON OutbreakEvents(OutbreakCode) WHERE IsDeleted = 0;
    CREATE INDEX IX_OutbreakEvents_Status ON OutbreakEvents(Status);
    CREATE INDEX IX_OutbreakEvents_DetectedDate ON OutbreakEvents(DetectedDate);
    CREATE INDEX IX_OutbreakEvents_RiskLevel ON OutbreakEvents(RiskLevel) WHERE RiskLevel IS NOT NULL;

    PRINT 'Created table: OutbreakEvents';
END
GO

-- 6. School Health Exams (Y tế trường học)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SchoolHealthExams')
BEGIN
    CREATE TABLE SchoolHealthExams (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        SchoolName NVARCHAR(200) NOT NULL,
        SchoolCode NVARCHAR(50) NULL,
        AcademicYear NVARCHAR(20) NOT NULL,
        GradeLevel NVARCHAR(20) NULL,
        StudentName NVARCHAR(200) NOT NULL,
        StudentCode NVARCHAR(50) NULL,
        DateOfBirth DATETIME2 NULL,
        Gender NVARCHAR(10) NULL,
        ExamDate DATETIME2 NOT NULL,
        Height REAL NULL,
        Weight REAL NULL,
        BMI REAL NULL,
        NutritionStatus NVARCHAR(50) NULL,
        VisionLeft NVARCHAR(20) NULL,
        VisionRight NVARCHAR(20) NULL,
        HasVisionProblem BIT NULL,
        HearingResult NVARCHAR(100) NULL,
        DentalResult NVARCHAR(200) NULL,
        DentalCavityCount INT NULL,
        SpineResult NVARCHAR(100) NULL,
        SkinResult NVARCHAR(200) NULL,
        HeartLungResult NVARCHAR(200) NULL,
        MentalHealthResult NVARCHAR(200) NULL,
        OverallResult NVARCHAR(20) NULL,
        Recommendations NVARCHAR(MAX) NULL,
        DoctorName NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_SchoolHealthExams_SchoolName ON SchoolHealthExams(SchoolName);
    CREATE INDEX IX_SchoolHealthExams_AcademicYear ON SchoolHealthExams(AcademicYear);
    CREATE INDEX IX_SchoolHealthExams_ExamDate ON SchoolHealthExams(ExamDate);
    CREATE INDEX IX_SchoolHealthExams_Status ON SchoolHealthExams(Status);
    CREATE INDEX IX_SchoolHealthExams_SchoolCode ON SchoolHealthExams(SchoolCode) WHERE SchoolCode IS NOT NULL;

    PRINT 'Created table: SchoolHealthExams';
END
GO

-- 7. Occupational Health Exams (Sức khỏe nghề nghiệp)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OccupationalHealthExams')
BEGIN
    CREATE TABLE OccupationalHealthExams (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NULL,
        EmployeeName NVARCHAR(200) NOT NULL,
        EmployeeCode NVARCHAR(50) NULL,
        CompanyName NVARCHAR(200) NOT NULL,
        CompanyTaxCode NVARCHAR(20) NULL,
        Department NVARCHAR(200) NULL,
        JobTitle NVARCHAR(200) NULL,
        HazardExposure NVARCHAR(500) NULL,
        ExposureYears INT NOT NULL DEFAULT 0,
        ExamDate DATETIME2 NOT NULL,
        ExamType NVARCHAR(50) NOT NULL,
        GeneralHealth NVARCHAR(MAX) NULL,
        RespiratoryResult NVARCHAR(MAX) NULL,
        HearingResult NVARCHAR(MAX) NULL,
        VisionResult NVARCHAR(MAX) NULL,
        SkinResult NVARCHAR(MAX) NULL,
        LabResults NVARCHAR(MAX) NULL,
        XrayResult NVARCHAR(MAX) NULL,
        OccupationalDisease NVARCHAR(200) NULL,
        DiseaseCode NVARCHAR(20) NULL,
        Classification NVARCHAR(50) NULL,
        Recommendations NVARCHAR(MAX) NULL,
        DoctorName NVARCHAR(200) NULL,
        Status INT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_OccupationalHealthExams_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );

    CREATE INDEX IX_OccupationalHealthExams_PatientId ON OccupationalHealthExams(PatientId) WHERE PatientId IS NOT NULL;
    CREATE INDEX IX_OccupationalHealthExams_CompanyName ON OccupationalHealthExams(CompanyName);
    CREATE INDEX IX_OccupationalHealthExams_ExamDate ON OccupationalHealthExams(ExamDate);
    CREATE INDEX IX_OccupationalHealthExams_ExamType ON OccupationalHealthExams(ExamType);
    CREATE INDEX IX_OccupationalHealthExams_Status ON OccupationalHealthExams(Status);

    PRINT 'Created table: OccupationalHealthExams';
END
GO

-- 8. Methadone Patients (Bệnh nhân Methadone)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MethadonePatients')
BEGIN
    CREATE TABLE MethadonePatients (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PatientCode NVARCHAR(50) NOT NULL,
        EnrollmentDate DATETIME2 NOT NULL,
        DischargeDate DATETIME2 NULL,
        DischargeReason NVARCHAR(500) NULL,
        CurrentDoseMg REAL NOT NULL DEFAULT 0,
        Phase NVARCHAR(50) NOT NULL,
        Status INT NOT NULL DEFAULT 0,
        TransferredFrom NVARCHAR(200) NULL,
        TransferredTo NVARCHAR(200) NULL,
        MissedDoseCount INT NOT NULL DEFAULT 0,
        LastDosingDate DATETIME2 NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MethadonePatients_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );

    CREATE INDEX IX_MethadonePatients_PatientId ON MethadonePatients(PatientId);
    CREATE INDEX IX_MethadonePatients_PatientCode ON MethadonePatients(PatientCode);
    CREATE INDEX IX_MethadonePatients_Status ON MethadonePatients(Status);
    CREATE INDEX IX_MethadonePatients_Phase ON MethadonePatients(Phase);
    CREATE INDEX IX_MethadonePatients_EnrollmentDate ON MethadonePatients(EnrollmentDate);

    PRINT 'Created table: MethadonePatients';
END
GO

-- 9. Methadone Dosing Records (Lịch sử cấp thuốc Methadone)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MethadoneDosingRecords')
BEGIN
    CREATE TABLE MethadoneDosingRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MethadonePatientId UNIQUEIDENTIFIER NOT NULL,
        DosingDate DATETIME2 NOT NULL,
        DoseMg REAL NOT NULL,
        Witnessed BIT NOT NULL DEFAULT 1,
        TakeHome BIT NOT NULL DEFAULT 0,
        AdministeredBy NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MethadoneDosingRecords_Patient FOREIGN KEY (MethadonePatientId) REFERENCES MethadonePatients(Id)
    );

    CREATE INDEX IX_MethadoneDosingRecords_PatientId ON MethadoneDosingRecords(MethadonePatientId);
    CREATE INDEX IX_MethadoneDosingRecords_DosingDate ON MethadoneDosingRecords(DosingDate);
    CREATE INDEX IX_MethadoneDosingRecords_Status ON MethadoneDosingRecords(Status);

    PRINT 'Created table: MethadoneDosingRecords';
END
GO

-- 10. Methadone Urine Tests (Xét nghiệm nước tiểu Methadone)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MethadoneUrineTests')
BEGIN
    CREATE TABLE MethadoneUrineTests (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MethadonePatientId UNIQUEIDENTIFIER NOT NULL,
        TestDate DATETIME2 NOT NULL,
        IsRandom BIT NOT NULL DEFAULT 0,
        Morphine NVARCHAR(20) NULL,
        Amphetamine NVARCHAR(20) NULL,
        Methamphetamine NVARCHAR(20) NULL,
        THC NVARCHAR(20) NULL,
        Benzodiazepine NVARCHAR(20) NULL,
        Methadone NVARCHAR(20) NULL,
        OverallResult NVARCHAR(50) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MethadoneUrineTests_Patient FOREIGN KEY (MethadonePatientId) REFERENCES MethadonePatients(Id)
    );

    CREATE INDEX IX_MethadoneUrineTests_PatientId ON MethadoneUrineTests(MethadonePatientId);
    CREATE INDEX IX_MethadoneUrineTests_TestDate ON MethadoneUrineTests(TestDate);
    CREATE INDEX IX_MethadoneUrineTests_OverallResult ON MethadoneUrineTests(OverallResult) WHERE OverallResult IS NOT NULL;

    PRINT 'Created table: MethadoneUrineTests';
END
GO

PRINT '=== Public Health tables creation complete ===';
GO
