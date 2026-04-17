-- =============================================================================
-- Create Extended Workflow Tables for 10 Modules (Luong 11-20)
-- Idempotent: uses IF NOT EXISTS for all tables
-- BaseEntity: Id, CreatedAt, CreatedBy, UpdatedAt, UpdatedBy, IsDeleted
-- CreatedBy/UpdatedBy = UNIQUEIDENTIFIER (matching tablesWithGuidAudit in HISDbContext)
-- =============================================================================

-- =============================================================================
-- LUONG 11: TELEMEDICINE
-- =============================================================================

-- 11.1 TeleAppointments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TeleAppointments')
BEGIN
    CREATE TABLE TeleAppointments (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        AppointmentCode NVARCHAR(500) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        DoctorId UNIQUEIDENTIFIER NOT NULL,
        SpecialityId UNIQUEIDENTIFIER NULL,
        AppointmentDate DATETIME2 NOT NULL,
        StartTime TIME NOT NULL,
        EndTime TIME NULL,
        DurationMinutes INT NOT NULL DEFAULT 15,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Pending',
        ChiefComplaint NVARCHAR(500) NULL,
        CancellationReason NVARCHAR(500) NULL,
        ConfirmedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TeleAppointments_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_TeleAppointments_Doctor FOREIGN KEY (DoctorId) REFERENCES Users(Id),
        CONSTRAINT FK_TeleAppointments_Speciality FOREIGN KEY (SpecialityId) REFERENCES Departments(Id)
    );
    PRINT 'Created TeleAppointments table';
END
ELSE
    PRINT 'TeleAppointments table already exists';
GO

-- 11.2 TeleSessions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TeleSessions')
BEGIN
    CREATE TABLE TeleSessions (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        SessionCode NVARCHAR(500) NOT NULL,
        AppointmentId UNIQUEIDENTIFIER NOT NULL,
        RoomId NVARCHAR(500) NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Waiting',
        StartTime DATETIME2 NULL,
        EndTime DATETIME2 NULL,
        DurationMinutes INT NULL,
        RecordingUrl NVARCHAR(500) NULL,
        IsRecorded BIT NOT NULL DEFAULT 0,
        ConnectionQuality NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TeleSessions_Appointment FOREIGN KEY (AppointmentId) REFERENCES TeleAppointments(Id)
    );
    PRINT 'Created TeleSessions table';
END
ELSE
    PRINT 'TeleSessions table already exists';
GO

-- 11.3 TeleConsultations
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TeleConsultations')
BEGIN
    CREATE TABLE TeleConsultations (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        SessionId UNIQUEIDENTIFIER NOT NULL,
        Symptoms NVARCHAR(MAX) NULL,
        Diagnosis NVARCHAR(MAX) NULL,
        IcdCode NVARCHAR(500) NULL,
        TreatmentPlan NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        RequiresFollowUp BIT NOT NULL DEFAULT 0,
        FollowUpDate DATETIME2 NULL,
        RequiresInPerson BIT NOT NULL DEFAULT 0,
        InPersonReason NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TeleConsultations_Session FOREIGN KEY (SessionId) REFERENCES TeleSessions(Id)
    );
    PRINT 'Created TeleConsultations table';
END
ELSE
    PRINT 'TeleConsultations table already exists';
GO

-- 11.4 TelePrescriptions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TelePrescriptions')
BEGIN
    CREATE TABLE TelePrescriptions (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PrescriptionCode NVARCHAR(500) NOT NULL,
        SessionId UNIQUEIDENTIFIER NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Draft',
        PrescriptionDate DATETIME2 NOT NULL,
        Note NVARCHAR(MAX) NULL,
        DigitalSignature NVARCHAR(MAX) NULL,
        SignedAt DATETIME2 NULL,
        QRCode NVARCHAR(MAX) NULL,
        SentToPharmacyId UNIQUEIDENTIFIER NULL,
        SentToPharmacyAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TelePrescriptions_Session FOREIGN KEY (SessionId) REFERENCES TeleSessions(Id)
    );
    PRINT 'Created TelePrescriptions table';
END
ELSE
    PRINT 'TelePrescriptions table already exists';
GO

-- 11.5 TelePrescriptionItems
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TelePrescriptionItems')
BEGIN
    CREATE TABLE TelePrescriptionItems (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PrescriptionId UNIQUEIDENTIFIER NOT NULL,
        MedicineId UNIQUEIDENTIFIER NOT NULL,
        MedicineName NVARCHAR(500) NOT NULL,
        Quantity DECIMAL(18,2) NOT NULL,
        Unit NVARCHAR(500) NOT NULL,
        Dosage NVARCHAR(500) NULL,
        Frequency NVARCHAR(500) NULL,
        DurationDays INT NULL,
        Instructions NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TelePrescriptionItems_Prescription FOREIGN KEY (PrescriptionId) REFERENCES TelePrescriptions(Id),
        CONSTRAINT FK_TelePrescriptionItems_Medicine FOREIGN KEY (MedicineId) REFERENCES Medicines(Id)
    );
    PRINT 'Created TelePrescriptionItems table';
END
ELSE
    PRINT 'TelePrescriptionItems table already exists';
GO

-- 11.6 TeleFeedbacks
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TeleFeedbacks')
BEGIN
    CREATE TABLE TeleFeedbacks (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        SessionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        OverallRating INT NOT NULL,
        VideoQualityRating INT NULL,
        DoctorRating INT NULL,
        EaseOfUseRating INT NULL,
        Comments NVARCHAR(MAX) NULL,
        WouldRecommend BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TeleFeedbacks_Session FOREIGN KEY (SessionId) REFERENCES TeleSessions(Id),
        CONSTRAINT FK_TeleFeedbacks_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );
    PRINT 'Created TeleFeedbacks table';
END
ELSE
    PRINT 'TeleFeedbacks table already exists';
GO

-- =============================================================================
-- LUONG 12: CLINICAL NUTRITION
-- =============================================================================

-- 12.1 NutritionScreenings
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NutritionScreenings')
BEGIN
    CREATE TABLE NutritionScreenings (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        AdmissionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        ScreeningDate DATETIME2 NOT NULL,
        ScreenedById UNIQUEIDENTIFIER NOT NULL,
        -- Anthropometric
        Weight DECIMAL(18,2) NOT NULL,
        Height DECIMAL(18,2) NOT NULL,
        BMI DECIMAL(18,2) NOT NULL,
        WeightLossPercent DECIMAL(18,2) NULL,
        WeightLossPeriodWeeks INT NULL,
        -- NRS-2002 Score
        NutritionScore INT NOT NULL DEFAULT 0,
        DiseaseScore INT NOT NULL DEFAULT 0,
        AgeScore INT NOT NULL DEFAULT 0,
        TotalScore INT NOT NULL DEFAULT 0,
        -- SGA Category
        SGACategory NVARCHAR(500) NULL,
        -- Result
        RiskLevel NVARCHAR(500) NOT NULL DEFAULT 'Low',
        RequiresIntervention BIT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_NutritionScreenings_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_NutritionScreenings_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_NutritionScreenings_ScreenedBy FOREIGN KEY (ScreenedById) REFERENCES Users(Id)
    );
    PRINT 'Created NutritionScreenings table';
END
ELSE
    PRINT 'NutritionScreenings table already exists';
GO

-- 12.2 NutritionAssessments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NutritionAssessments')
BEGIN
    CREATE TABLE NutritionAssessments (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ScreeningId UNIQUEIDENTIFIER NOT NULL,
        AssessmentDate DATETIME2 NOT NULL,
        AssessedById UNIQUEIDENTIFIER NOT NULL,
        -- Lab Values
        Albumin DECIMAL(18,2) NULL,
        Prealbumin DECIMAL(18,2) NULL,
        Transferrin DECIMAL(18,2) NULL,
        TotalProtein DECIMAL(18,2) NULL,
        TotalLymphocyteCount INT NULL,
        -- Energy/Protein Requirements
        EnergyRequirement DECIMAL(18,2) NOT NULL,
        ProteinRequirement DECIMAL(18,2) NOT NULL,
        FluidRequirement DECIMAL(18,2) NOT NULL,
        CalculationMethod NVARCHAR(500) NOT NULL DEFAULT 'Harris-Benedict',
        ActivityFactor DECIMAL(18,2) NOT NULL DEFAULT 1.2,
        StressFactor DECIMAL(18,2) NOT NULL DEFAULT 1.0,
        -- Goals
        NutritionGoals NVARCHAR(MAX) NULL,
        InterventionPlan NVARCHAR(MAX) NULL,
        NextReviewDate DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_NutritionAssessments_Screening FOREIGN KEY (ScreeningId) REFERENCES NutritionScreenings(Id),
        CONSTRAINT FK_NutritionAssessments_AssessedBy FOREIGN KEY (AssessedById) REFERENCES Users(Id)
    );
    PRINT 'Created NutritionAssessments table';
END
ELSE
    PRINT 'NutritionAssessments table already exists';
GO

-- 12.3 DietTypes (must be created before DietOrders due to FK)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DietTypes')
BEGIN
    CREATE TABLE DietTypes (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        Code NVARCHAR(500) NOT NULL,
        Name NVARCHAR(500) NOT NULL,
        NameEnglish NVARCHAR(500) NULL,
        Category NVARCHAR(500) NOT NULL DEFAULT 'Regular',
        Description NVARCHAR(MAX) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        -- Nutritional info
        BaseCalories DECIMAL(18,2) NULL,
        MacroDistribution NVARCHAR(500) NULL,
        Restrictions NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created DietTypes table';
END
ELSE
    PRINT 'DietTypes table already exists';
GO

-- 12.4 DietOrders
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DietOrders')
BEGIN
    CREATE TABLE DietOrders (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OrderCode NVARCHAR(500) NOT NULL,
        AdmissionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        DietTypeId UNIQUEIDENTIFIER NOT NULL,
        OrderedById UNIQUEIDENTIFIER NOT NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        -- Texture
        TextureModification NVARCHAR(500) NULL,
        FluidConsistency NVARCHAR(500) NULL,
        -- Restrictions
        Allergies NVARCHAR(MAX) NULL,
        FoodPreferences NVARCHAR(MAX) NULL,
        Restrictions NVARCHAR(MAX) NULL,
        -- Calories target
        TargetCalories DECIMAL(18,2) NULL,
        TargetProtein DECIMAL(18,2) NULL,
        SpecialInstructions NVARCHAR(MAX) NULL,
        DiscontinuationReason NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_DietOrders_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_DietOrders_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_DietOrders_DietType FOREIGN KEY (DietTypeId) REFERENCES DietTypes(Id),
        CONSTRAINT FK_DietOrders_OrderedBy FOREIGN KEY (OrderedById) REFERENCES Users(Id)
    );
    PRINT 'Created DietOrders table';
END
ELSE
    PRINT 'DietOrders table already exists';
GO

-- 12.5 MealPlans
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MealPlans')
BEGIN
    CREATE TABLE MealPlans (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        Date DATETIME2 NOT NULL,
        MealType NVARCHAR(500) NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Planned',
        TotalPatients INT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MealPlans_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)
    );
    PRINT 'Created MealPlans table';
END
ELSE
    PRINT 'MealPlans table already exists';
GO

-- 12.6 MealPlanItems
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MealPlanItems')
BEGIN
    CREATE TABLE MealPlanItems (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        MealPlanId UNIQUEIDENTIFIER NOT NULL,
        DietOrderId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        RoomBed NVARCHAR(500) NULL,
        IsDelivered BIT NOT NULL DEFAULT 0,
        DeliveredAt DATETIME2 NULL,
        IntakePercent DECIMAL(18,2) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MealPlanItems_MealPlan FOREIGN KEY (MealPlanId) REFERENCES MealPlans(Id),
        CONSTRAINT FK_MealPlanItems_DietOrder FOREIGN KEY (DietOrderId) REFERENCES DietOrders(Id),
        CONSTRAINT FK_MealPlanItems_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );
    PRINT 'Created MealPlanItems table';
END
ELSE
    PRINT 'MealPlanItems table already exists';
GO

-- 12.7 NutritionMonitorings
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NutritionMonitorings')
BEGIN
    CREATE TABLE NutritionMonitorings (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        AdmissionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        Date DATETIME2 NOT NULL,
        RecordedById UNIQUEIDENTIFIER NOT NULL,
        -- Intake monitoring
        BreakfastIntakePercent DECIMAL(18,2) NULL,
        LunchIntakePercent DECIMAL(18,2) NULL,
        DinnerIntakePercent DECIMAL(18,2) NULL,
        SnackIntakePercent DECIMAL(18,2) NULL,
        TotalCaloriesConsumed DECIMAL(18,2) NULL,
        FluidIntakeMl DECIMAL(18,2) NULL,
        -- Weight tracking
        CurrentWeight DECIMAL(18,2) NULL,
        WeightChange DECIMAL(18,2) NULL,
        -- Assessment
        GISymptoms NVARCHAR(MAX) NULL,
        AppetiteLevel NVARCHAR(500) NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_NutritionMonitorings_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_NutritionMonitorings_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_NutritionMonitorings_RecordedBy FOREIGN KEY (RecordedById) REFERENCES Users(Id)
    );
    PRINT 'Created NutritionMonitorings table';
END
ELSE
    PRINT 'NutritionMonitorings table already exists';
GO

-- 12.8 TPNOrders
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TPNOrders')
BEGIN
    CREATE TABLE TPNOrders (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OrderCode NVARCHAR(500) NOT NULL,
        AdmissionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        OrderedById UNIQUEIDENTIFIER NOT NULL,
        OrderDate DATETIME2 NOT NULL,
        -- TPN Components
        Dextrose DECIMAL(18,2) NOT NULL,
        AminoAcids DECIMAL(18,2) NOT NULL,
        Lipids DECIMAL(18,2) NOT NULL,
        TotalVolume DECIMAL(18,2) NOT NULL,
        InfusionRate DECIMAL(18,2) NOT NULL,
        InfusionHours INT NOT NULL,
        -- Electrolytes
        Sodium DECIMAL(18,2) NULL,
        Potassium DECIMAL(18,2) NULL,
        Calcium DECIMAL(18,2) NULL,
        Magnesium DECIMAL(18,2) NULL,
        Phosphate DECIMAL(18,2) NULL,
        -- Vitamins/Trace elements
        AddMultivitamins BIT NOT NULL DEFAULT 0,
        AddTraceElements BIT NOT NULL DEFAULT 0,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Pending',
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TPNOrders_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_TPNOrders_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_TPNOrders_OrderedBy FOREIGN KEY (OrderedById) REFERENCES Users(Id)
    );
    PRINT 'Created TPNOrders table';
END
ELSE
    PRINT 'TPNOrders table already exists';
GO

-- =============================================================================
-- LUONG 13: INFECTION CONTROL
-- =============================================================================

-- 13.1 Outbreaks (must be created before HAICases due to FK)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Outbreaks')
BEGIN
    CREATE TABLE Outbreaks (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OutbreakCode NVARCHAR(500) NOT NULL,
        DetectionDate DATETIME2 NOT NULL,
        DetectedById UNIQUEIDENTIFIER NOT NULL,
        Organism NVARCHAR(500) NOT NULL,
        SourceSuspected NVARCHAR(MAX) NULL,
        AffectedAreas NVARCHAR(500) NOT NULL,
        InitialCases INT NOT NULL DEFAULT 0,
        TotalCases INT NOT NULL DEFAULT 0,
        Deaths INT NOT NULL DEFAULT 0,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        ContainedDate DATETIME2 NULL,
        ResolvedDate DATETIME2 NULL,
        ReportedToAuthority BIT NOT NULL DEFAULT 0,
        ReportedDate DATETIME2 NULL,
        ControlMeasures NVARCHAR(MAX) NULL,
        LessonsLearned NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_Outbreaks_DetectedBy FOREIGN KEY (DetectedById) REFERENCES Users(Id)
    );
    PRINT 'Created Outbreaks table';
END
ELSE
    PRINT 'Outbreaks table already exists';
GO

-- 13.2 HAICases
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HAICases')
BEGIN
    CREATE TABLE HAICases (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        CaseCode NVARCHAR(500) NOT NULL,
        AdmissionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        OnsetDate DATETIME2 NOT NULL,
        ReportedById UNIQUEIDENTIFIER NOT NULL,
        -- Classification
        InfectionType NVARCHAR(500) NOT NULL,
        InfectionSite NVARCHAR(500) NOT NULL,
        Organism NVARCHAR(500) NULL,
        IsMDRO BIT NOT NULL DEFAULT 0,
        ResistancePattern NVARCHAR(MAX) NULL,
        -- Device-associated
        IsDeviceAssociated BIT NOT NULL DEFAULT 0,
        DeviceType NVARCHAR(500) NULL,
        DeviceDays INT NULL,
        -- Status
        Status NVARCHAR(500) NOT NULL DEFAULT 'Suspected',
        ConfirmedDate DATETIME2 NULL,
        ResolvedDate DATETIME2 NULL,
        Outcome NVARCHAR(500) NULL,
        Notes NVARCHAR(MAX) NULL,
        -- Investigation
        IsInvestigated BIT NOT NULL DEFAULT 0,
        RootCause NVARCHAR(MAX) NULL,
        ContributingFactors NVARCHAR(MAX) NULL,
        PreventiveMeasures NVARCHAR(MAX) NULL,
        -- Outbreak linkage
        OutbreakId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_HAICases_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_HAICases_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_HAICases_ReportedBy FOREIGN KEY (ReportedById) REFERENCES Users(Id),
        CONSTRAINT FK_HAICases_Outbreak FOREIGN KEY (OutbreakId) REFERENCES Outbreaks(Id)
    );
    PRINT 'Created HAICases table';
END
ELSE
    PRINT 'HAICases table already exists';
GO

-- 13.3 IsolationOrders
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IsolationOrders')
BEGIN
    CREATE TABLE IsolationOrders (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OrderCode NVARCHAR(500) NOT NULL,
        HAICaseId UNIQUEIDENTIFIER NULL,
        AdmissionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        OrderedById UNIQUEIDENTIFIER NOT NULL,
        IsolationType NVARCHAR(500) NOT NULL,
        Precautions NVARCHAR(MAX) NULL,
        Reason NVARCHAR(500) NOT NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        -- Precaution flags
        RequiresGown BIT NOT NULL DEFAULT 0,
        RequiresGloves BIT NOT NULL DEFAULT 0,
        RequiresMask BIT NOT NULL DEFAULT 0,
        RequiresN95 BIT NOT NULL DEFAULT 0,
        RequiresEyeProtection BIT NOT NULL DEFAULT 0,
        RequiresNegativePressure BIT NOT NULL DEFAULT 0,
        SpecialInstructions NVARCHAR(MAX) NULL,
        DiscontinuationReason NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IsolationOrders_HAICase FOREIGN KEY (HAICaseId) REFERENCES HAICases(Id),
        CONSTRAINT FK_IsolationOrders_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_IsolationOrders_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_IsolationOrders_OrderedBy FOREIGN KEY (OrderedById) REFERENCES Users(Id)
    );
    PRINT 'Created IsolationOrders table';
END
ELSE
    PRINT 'IsolationOrders table already exists';
GO

-- 13.4 HandHygieneObservations
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HandHygieneObservations')
BEGIN
    CREATE TABLE HandHygieneObservations (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ObservationDate DATETIME2 NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NOT NULL,
        ObservedById UNIQUEIDENTIFIER NOT NULL,
        TotalOpportunities INT NOT NULL DEFAULT 0,
        ComplianceCount INT NOT NULL DEFAULT 0,
        ComplianceRate DECIMAL(18,2) NOT NULL DEFAULT 0,
        -- By moment (WHO 5 moments)
        BeforePatientContact INT NULL,
        BeforeAseptic INT NULL,
        AfterBodyFluid INT NULL,
        AfterPatientContact INT NULL,
        AfterEnvironment INT NULL,
        -- By profession
        DoctorOpportunities INT NULL,
        DoctorCompliance INT NULL,
        NurseOpportunities INT NULL,
        NurseCompliance INT NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_HandHygieneObservations_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_HandHygieneObservations_ObservedBy FOREIGN KEY (ObservedById) REFERENCES Users(Id)
    );
    PRINT 'Created HandHygieneObservations table';
END
ELSE
    PRINT 'HandHygieneObservations table already exists';
GO

-- 13.5 OutbreakCases
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OutbreakCases')
BEGIN
    CREATE TABLE OutbreakCases (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        OutbreakId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        AdmissionId UNIQUEIDENTIFIER NULL,
        OnsetDate DATETIME2 NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_OutbreakCases_Outbreak FOREIGN KEY (OutbreakId) REFERENCES Outbreaks(Id),
        CONSTRAINT FK_OutbreakCases_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_OutbreakCases_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id)
    );
    PRINT 'Created OutbreakCases table';
END
ELSE
    PRINT 'OutbreakCases table already exists';
GO

-- 13.6 AntibioticStewardships
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AntibioticStewardships')
BEGIN
    CREATE TABLE AntibioticStewardships (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        AdmissionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PrescriptionDetailId UNIQUEIDENTIFIER NOT NULL,
        AntibioticName NVARCHAR(500) NOT NULL,
        StartDate DATETIME2 NOT NULL,
        DayOfTherapy INT NOT NULL DEFAULT 0,
        RequiresReview BIT NOT NULL DEFAULT 0,
        ReviewReason NVARCHAR(MAX) NULL,
        ReviewDate DATETIME2 NULL,
        ReviewedById UNIQUEIDENTIFIER NULL,
        ReviewOutcome NVARCHAR(500) NULL,
        ReviewNotes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AntibioticStewardships_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_AntibioticStewardships_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_AntibioticStewardships_PrescriptionDetail FOREIGN KEY (PrescriptionDetailId) REFERENCES PrescriptionDetails(Id),
        CONSTRAINT FK_AntibioticStewardships_ReviewedBy FOREIGN KEY (ReviewedById) REFERENCES Users(Id)
    );
    PRINT 'Created AntibioticStewardships table';
END
ELSE
    PRINT 'AntibioticStewardships table already exists';
GO

-- =============================================================================
-- LUONG 14: REHABILITATION
-- =============================================================================

-- 14.1 RehabReferrals
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RehabReferrals')
BEGIN
    CREATE TABLE RehabReferrals (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ReferralCode NVARCHAR(500) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        AdmissionId UNIQUEIDENTIFIER NULL,
        ExaminationId UNIQUEIDENTIFIER NULL,
        ReferredById UNIQUEIDENTIFIER NOT NULL,
        AcceptedById UNIQUEIDENTIFIER NULL,
        RehabType NVARCHAR(500) NOT NULL,
        Diagnosis NVARCHAR(500) NOT NULL,
        IcdCode NVARCHAR(500) NULL,
        Reason NVARCHAR(500) NOT NULL,
        Goals NVARCHAR(MAX) NULL,
        Precautions NVARCHAR(MAX) NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Pending',
        AcceptedDate DATETIME2 NULL,
        DeclineReason NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RehabReferrals_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_RehabReferrals_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_RehabReferrals_Examination FOREIGN KEY (ExaminationId) REFERENCES Examinations(Id),
        CONSTRAINT FK_RehabReferrals_ReferredBy FOREIGN KEY (ReferredById) REFERENCES Users(Id),
        CONSTRAINT FK_RehabReferrals_AcceptedBy FOREIGN KEY (AcceptedById) REFERENCES Users(Id)
    );
    PRINT 'Created RehabReferrals table';
END
ELSE
    PRINT 'RehabReferrals table already exists';
GO

-- 14.2 FunctionalAssessments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FunctionalAssessments')
BEGIN
    CREATE TABLE FunctionalAssessments (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ReferralId UNIQUEIDENTIFIER NOT NULL,
        AssessmentDate DATETIME2 NOT NULL,
        AssessedById UNIQUEIDENTIFIER NOT NULL,
        -- Standard Scales
        BarthelIndex INT NULL,
        FIMScore INT NULL,
        MoCAScore INT NULL,
        BergBalanceScale INT NULL,
        TinettiFallRisk INT NULL,
        -- Mobility
        MobilityStatus NVARCHAR(500) NULL,
        GaitPattern NVARCHAR(500) NULL,
        RequiresAssistiveDevice BIT NOT NULL DEFAULT 0,
        AssistiveDeviceType NVARCHAR(500) NULL,
        -- Range of Motion
        ROMFindings NVARCHAR(MAX) NULL,
        StrengthFindings NVARCHAR(MAX) NULL,
        SensoryFindings NVARCHAR(MAX) NULL,
        -- Communication (for ST)
        SpeechStatus NVARCHAR(MAX) NULL,
        SwallowingStatus NVARCHAR(MAX) NULL,
        CognitiveStatus NVARCHAR(MAX) NULL,
        -- ADL
        ADLStatus NVARCHAR(MAX) NULL,
        IADLStatus NVARCHAR(MAX) NULL,
        -- Goals & Plan
        ShortTermGoals NVARCHAR(MAX) NULL,
        LongTermGoals NVARCHAR(MAX) NULL,
        PlanSummary NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_FunctionalAssessments_Referral FOREIGN KEY (ReferralId) REFERENCES RehabReferrals(Id),
        CONSTRAINT FK_FunctionalAssessments_AssessedBy FOREIGN KEY (AssessedById) REFERENCES Users(Id)
    );
    PRINT 'Created FunctionalAssessments table';
END
ELSE
    PRINT 'FunctionalAssessments table already exists';
GO

-- 14.3 RehabTreatmentPlans
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RehabTreatmentPlans')
BEGIN
    CREATE TABLE RehabTreatmentPlans (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PlanCode NVARCHAR(500) NOT NULL,
        ReferralId UNIQUEIDENTIFIER NOT NULL,
        CreatedById UNIQUEIDENTIFIER NOT NULL,
        RehabType NVARCHAR(500) NOT NULL,
        PlannedSessions INT NOT NULL DEFAULT 0,
        CompletedSessions INT NOT NULL DEFAULT 0,
        Frequency NVARCHAR(500) NOT NULL,
        DurationMinutesPerSession INT NOT NULL DEFAULT 45,
        StartDate DATETIME2 NOT NULL,
        ExpectedEndDate DATETIME2 NULL,
        ActualEndDate DATETIME2 NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        -- Goals
        ShortTermGoals NVARCHAR(MAX) NULL,
        LongTermGoals NVARCHAR(MAX) NULL,
        Interventions NVARCHAR(MAX) NULL,
        Precautions NVARCHAR(MAX) NULL,
        DiscontinuationReason NVARCHAR(MAX) NULL,
        DischargeSummary NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RehabTreatmentPlans_Referral FOREIGN KEY (ReferralId) REFERENCES RehabReferrals(Id),
        CONSTRAINT FK_RehabTreatmentPlans_CreatedBy FOREIGN KEY (CreatedById) REFERENCES Users(Id)
    );
    PRINT 'Created RehabTreatmentPlans table';
END
ELSE
    PRINT 'RehabTreatmentPlans table already exists';
GO

-- 14.4 RehabSessions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RehabSessions')
BEGIN
    CREATE TABLE RehabSessions (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TreatmentPlanId UNIQUEIDENTIFIER NOT NULL,
        SessionNumber INT NOT NULL DEFAULT 0,
        SessionDate DATETIME2 NOT NULL,
        StartTime TIME NOT NULL,
        EndTime TIME NULL,
        DurationMinutes INT NULL,
        TherapistId UNIQUEIDENTIFIER NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Scheduled',
        -- Treatment provided
        InterventionsProvided NVARCHAR(MAX) NULL,
        ExercisesPerformed NVARCHAR(MAX) NULL,
        ModalitiesUsed NVARCHAR(500) NULL,
        -- Progress
        PatientResponse NVARCHAR(MAX) NULL,
        ProgressNotes NVARCHAR(MAX) NULL,
        GoalProgress NVARCHAR(500) NULL,
        CancellationReason NVARCHAR(MAX) NULL,
        HomeExercises NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RehabSessions_TreatmentPlan FOREIGN KEY (TreatmentPlanId) REFERENCES RehabTreatmentPlans(Id),
        CONSTRAINT FK_RehabSessions_Therapist FOREIGN KEY (TherapistId) REFERENCES Users(Id)
    );
    PRINT 'Created RehabSessions table';
END
ELSE
    PRINT 'RehabSessions table already exists';
GO

-- =============================================================================
-- LUONG 15: MEDICAL EQUIPMENT
-- =============================================================================

-- 15.1 MedicalEquipments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MedicalEquipments')
BEGIN
    CREATE TABLE MedicalEquipments (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        EquipmentCode NVARCHAR(500) NOT NULL,
        EquipmentName NVARCHAR(500) NOT NULL,
        NameEnglish NVARCHAR(500) NULL,
        Category NVARCHAR(500) NOT NULL,
        RiskClass NVARCHAR(500) NULL,
        -- Identification
        SerialNumber NVARCHAR(500) NULL,
        Model NVARCHAR(500) NULL,
        Manufacturer NVARCHAR(500) NULL,
        CountryOfOrigin NVARCHAR(500) NULL,
        YearOfManufacture INT NULL,
        -- Location
        DepartmentId UNIQUEIDENTIFIER NULL,
        Location NVARCHAR(500) NULL,
        -- Acquisition
        PurchaseDate DATETIME2 NULL,
        PurchasePrice DECIMAL(18,2) NULL,
        PurchaseSource NVARCHAR(500) NULL,
        WarrantyExpiry DATETIME2 NULL,
        -- Status
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        StatusReason NVARCHAR(MAX) NULL,
        LastMaintenanceDate DATETIME2 NULL,
        NextMaintenanceDate DATETIME2 NULL,
        LastCalibrationDate DATETIME2 NULL,
        NextCalibrationDate DATETIME2 NULL,
        -- Runtime
        TotalRuntimeHours INT NULL,
        UsageCount INT NULL,
        -- Lifecycle
        ExpectedLifeYears INT NULL,
        DecommissionDate DATETIME2 NULL,
        DecommissionReason NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MedicalEquipments_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)
    );
    PRINT 'Created MedicalEquipments table';
END
ELSE
    PRINT 'MedicalEquipments table already exists';
GO

-- 15.2 MaintenanceRecords
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MaintenanceRecords')
BEGIN
    CREATE TABLE MaintenanceRecords (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        EquipmentId UNIQUEIDENTIFIER NOT NULL,
        MaintenanceType NVARCHAR(500) NOT NULL,
        ScheduledDate DATETIME2 NOT NULL,
        PerformedDate DATETIME2 NULL,
        PerformedById UNIQUEIDENTIFIER NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Scheduled',
        -- Work done
        WorkDescription NVARCHAR(MAX) NULL,
        PartsReplaced NVARCHAR(MAX) NULL,
        PartsCost DECIMAL(18,2) NULL,
        LaborCost DECIMAL(18,2) NULL,
        TotalCost DECIMAL(18,2) NULL,
        -- Service provider
        IsInternal BIT NOT NULL DEFAULT 0,
        VendorName NVARCHAR(500) NULL,
        ServiceReportNumber NVARCHAR(500) NULL,
        -- Result
        Findings NVARCHAR(MAX) NULL,
        Recommendations NVARCHAR(MAX) NULL,
        NextMaintenanceDate DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MaintenanceRecords_Equipment FOREIGN KEY (EquipmentId) REFERENCES MedicalEquipments(Id),
        CONSTRAINT FK_MaintenanceRecords_PerformedBy FOREIGN KEY (PerformedById) REFERENCES Users(Id)
    );
    PRINT 'Created MaintenanceRecords table';
END
ELSE
    PRINT 'MaintenanceRecords table already exists';
GO

-- 15.3 CalibrationRecords
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CalibrationRecords')
BEGIN
    CREATE TABLE CalibrationRecords (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        EquipmentId UNIQUEIDENTIFIER NOT NULL,
        ScheduledDate DATETIME2 NOT NULL,
        PerformedDate DATETIME2 NULL,
        PerformedBy NVARCHAR(500) NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Scheduled',
        -- Calibration details
        CertificateNumber NVARCHAR(500) NULL,
        CalibrationStandard NVARCHAR(500) NULL,
        PassedCalibration BIT NOT NULL DEFAULT 0,
        DeviationFindings NVARCHAR(MAX) NULL,
        AdjustmentsMade NVARCHAR(MAX) NULL,
        -- Cost
        CalibrationCost DECIMAL(18,2) NULL,
        -- Validity
        ValidFrom DATETIME2 NULL,
        ValidUntil DATETIME2 NULL,
        NextCalibrationDate DATETIME2 NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_CalibrationRecords_Equipment FOREIGN KEY (EquipmentId) REFERENCES MedicalEquipments(Id)
    );
    PRINT 'Created CalibrationRecords table';
END
ELSE
    PRINT 'CalibrationRecords table already exists';
GO

-- 15.4 RepairRequests
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RepairRequests')
BEGIN
    CREATE TABLE RepairRequests (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        RequestCode NVARCHAR(500) NOT NULL,
        EquipmentId UNIQUEIDENTIFIER NOT NULL,
        RequestedById UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        RequestDate DATETIME2 NOT NULL,
        ProblemDescription NVARCHAR(MAX) NOT NULL,
        Priority NVARCHAR(500) NOT NULL DEFAULT 'Normal',
        Status NVARCHAR(500) NOT NULL DEFAULT 'Pending',
        -- Assignment
        AssignedToId UNIQUEIDENTIFIER NULL,
        AssignedDate DATETIME2 NULL,
        -- Repair work
        StartedDate DATETIME2 NULL,
        CompletedDate DATETIME2 NULL,
        DiagnosisFindings NVARCHAR(MAX) NULL,
        RepairActions NVARCHAR(MAX) NULL,
        PartsUsed NVARCHAR(MAX) NULL,
        -- Cost
        PartsCost DECIMAL(18,2) NULL,
        LaborCost DECIMAL(18,2) NULL,
        ExternalServiceCost DECIMAL(18,2) NULL,
        TotalCost DECIMAL(18,2) NULL,
        -- Result
        IsRepaired BIT NOT NULL DEFAULT 0,
        UnrepairableReason NVARCHAR(MAX) NULL,
        RecommendReplacement BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_RepairRequests_Equipment FOREIGN KEY (EquipmentId) REFERENCES MedicalEquipments(Id),
        CONSTRAINT FK_RepairRequests_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_RepairRequests_RequestedBy FOREIGN KEY (RequestedById) REFERENCES Users(Id),
        CONSTRAINT FK_RepairRequests_AssignedTo FOREIGN KEY (AssignedToId) REFERENCES Users(Id)
    );
    PRINT 'Created RepairRequests table';
END
ELSE
    PRINT 'RepairRequests table already exists';
GO

-- =============================================================================
-- LUONG 16: MEDICAL HR
-- =============================================================================

-- 16.1 MedicalStaffs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MedicalStaffs')
BEGIN
    CREATE TABLE MedicalStaffs (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        StaffCode NVARCHAR(500) NOT NULL,
        FullName NVARCHAR(500) NOT NULL,
        StaffType NVARCHAR(500) NOT NULL,
        -- Qualifications
        HighestDegree NVARCHAR(500) NULL,
        Specialty NVARCHAR(500) NULL,
        SubSpecialty NVARCHAR(500) NULL,
        YearsOfExperience INT NULL,
        -- License
        LicenseNumber NVARCHAR(500) NULL,
        LicenseIssueDate DATETIME2 NULL,
        LicenseExpiryDate DATETIME2 NULL,
        LicenseIssuedBy NVARCHAR(500) NULL,
        LicenseActive BIT NOT NULL DEFAULT 1,
        -- Department assignment
        PrimaryDepartmentId UNIQUEIDENTIFIER NULL,
        SecondaryDepartmentId UNIQUEIDENTIFIER NULL,
        -- Contact
        PersonalPhone NVARCHAR(500) NULL,
        WorkPhone NVARCHAR(500) NULL,
        PersonalEmail NVARCHAR(500) NULL,
        -- Status
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        JoinDate DATETIME2 NULL,
        TerminationDate DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MedicalStaffs_User FOREIGN KEY (UserId) REFERENCES Users(Id),
        CONSTRAINT FK_MedicalStaffs_PrimaryDepartment FOREIGN KEY (PrimaryDepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_MedicalStaffs_SecondaryDepartment FOREIGN KEY (SecondaryDepartmentId) REFERENCES Departments(Id)
    );
    PRINT 'Created MedicalStaffs table';
END
ELSE
    PRINT 'MedicalStaffs table already exists';
GO

-- 16.2 StaffQualifications
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'StaffQualifications')
BEGIN
    CREATE TABLE StaffQualifications (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        StaffId UNIQUEIDENTIFIER NOT NULL,
        QualificationType NVARCHAR(500) NOT NULL,
        Name NVARCHAR(500) NOT NULL,
        IssuedBy NVARCHAR(500) NULL,
        IssueDate DATETIME2 NULL,
        ExpiryDate DATETIME2 NULL,
        DocumentPath NVARCHAR(500) NULL,
        IsVerified BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_StaffQualifications_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    PRINT 'Created StaffQualifications table';
END
ELSE
    PRINT 'StaffQualifications table already exists';
GO

-- 16.3 DutyRosters
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DutyRosters')
BEGIN
    CREATE TABLE DutyRosters (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        DepartmentId UNIQUEIDENTIFIER NOT NULL,
        [Year] INT NOT NULL,
        [Month] INT NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Draft',
        CreatedById UNIQUEIDENTIFIER NOT NULL,
        PublishedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_DutyRosters_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_DutyRosters_CreatedBy FOREIGN KEY (CreatedById) REFERENCES Users(Id)
    );
    PRINT 'Created DutyRosters table';
END
ELSE
    PRINT 'DutyRosters table already exists';
GO

-- 16.4 DutyShifts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DutyShifts')
BEGIN
    CREATE TABLE DutyShifts (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        DutyRosterId UNIQUEIDENTIFIER NOT NULL,
        StaffId UNIQUEIDENTIFIER NOT NULL,
        ShiftDate DATETIME2 NOT NULL,
        ShiftType NVARCHAR(500) NOT NULL,
        StartTime TIME NOT NULL,
        EndTime TIME NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Scheduled',
        -- Swap
        SwappedWithId UNIQUEIDENTIFIER NULL,
        SwapReason NVARCHAR(MAX) NULL,
        SwapApproved BIT NOT NULL DEFAULT 0,
        -- Attendance
        CheckInTime DATETIME2 NULL,
        CheckOutTime DATETIME2 NULL,
        AttendanceNotes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_DutyShifts_DutyRoster FOREIGN KEY (DutyRosterId) REFERENCES DutyRosters(Id),
        CONSTRAINT FK_DutyShifts_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id),
        CONSTRAINT FK_DutyShifts_SwappedWith FOREIGN KEY (SwappedWithId) REFERENCES MedicalStaffs(Id)
    );
    PRINT 'Created DutyShifts table';
END
ELSE
    PRINT 'DutyShifts table already exists';
GO

-- 16.5 ClinicAssignments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ClinicAssignments')
BEGIN
    CREATE TABLE ClinicAssignments (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        AssignmentDate DATETIME2 NOT NULL,
        RoomId UNIQUEIDENTIFIER NOT NULL,
        StaffId UNIQUEIDENTIFIER NOT NULL,
        ShiftType NVARCHAR(500) NOT NULL,
        StartTime TIME NOT NULL,
        EndTime TIME NOT NULL,
        MaxPatients INT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ClinicAssignments_Room FOREIGN KEY (RoomId) REFERENCES Rooms(Id),
        CONSTRAINT FK_ClinicAssignments_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    PRINT 'Created ClinicAssignments table';
END
ELSE
    PRINT 'ClinicAssignments table already exists';
GO

-- 16.6 CMERecords
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CMERecords')
BEGIN
    CREATE TABLE CMERecords (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        StaffId UNIQUEIDENTIFIER NOT NULL,
        ActivityName NVARCHAR(500) NOT NULL,
        ActivityType NVARCHAR(500) NOT NULL,
        ActivityDate DATETIME2 NOT NULL,
        CreditHours INT NOT NULL DEFAULT 0,
        Provider NVARCHAR(500) NULL,
        CertificateNumber NVARCHAR(500) NULL,
        DocumentPath NVARCHAR(500) NULL,
        IsVerified BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_CMERecords_Staff FOREIGN KEY (StaffId) REFERENCES MedicalStaffs(Id)
    );
    PRINT 'Created CMERecords table';
END
ELSE
    PRINT 'CMERecords table already exists';
GO

-- =============================================================================
-- LUONG 17: QUALITY MANAGEMENT
-- =============================================================================

-- 17.1 QualityIndicators
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QualityIndicators')
BEGIN
    CREATE TABLE QualityIndicators (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        IndicatorCode NVARCHAR(500) NOT NULL,
        Name NVARCHAR(500) NOT NULL,
        Category NVARCHAR(500) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        -- Measurement
        MeasurementType NVARCHAR(500) NOT NULL DEFAULT 'Percentage',
        NumeratorDefinition NVARCHAR(MAX) NULL,
        DenominatorDefinition NVARCHAR(MAX) NULL,
        MeasurementFrequency NVARCHAR(500) NOT NULL DEFAULT 'Monthly',
        -- Targets
        TargetValue DECIMAL(18,2) NULL,
        ThresholdLow DECIMAL(18,2) NULL,
        ThresholdHigh DECIMAL(18,2) NULL,
        ThresholdDirection NVARCHAR(500) NOT NULL DEFAULT 'HigherIsBetter',
        -- Standard reference
        StandardReference NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created QualityIndicators table';
END
ELSE
    PRINT 'QualityIndicators table already exists';
GO

-- 17.2 QualityIndicatorValues
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'QualityIndicatorValues')
BEGIN
    CREATE TABLE QualityIndicatorValues (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        IndicatorId UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        PeriodStart DATETIME2 NOT NULL,
        PeriodEnd DATETIME2 NOT NULL,
        Numerator DECIMAL(18,2) NULL,
        Denominator DECIMAL(18,2) NULL,
        Value DECIMAL(18,2) NOT NULL DEFAULT 0,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Normal',
        Trend DECIMAL(18,2) NULL,
        RecordedById UNIQUEIDENTIFIER NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_QualityIndicatorValues_Indicator FOREIGN KEY (IndicatorId) REFERENCES QualityIndicators(Id),
        CONSTRAINT FK_QualityIndicatorValues_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_QualityIndicatorValues_RecordedBy FOREIGN KEY (RecordedById) REFERENCES Users(Id)
    );
    PRINT 'Created QualityIndicatorValues table';
END
ELSE
    PRINT 'QualityIndicatorValues table already exists';
GO

-- 17.3 IncidentReports
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IncidentReports')
BEGIN
    CREATE TABLE IncidentReports (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ReportCode NVARCHAR(500) NOT NULL,
        IncidentDate DATETIME2 NOT NULL,
        ReportDate DATETIME2 NOT NULL,
        ReportedById UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        PatientId UNIQUEIDENTIFIER NULL,
        -- Classification
        IncidentType NVARCHAR(500) NOT NULL,
        Severity NVARCHAR(500) NOT NULL DEFAULT 'Minor',
        HarmLevel NVARCHAR(500) NOT NULL DEFAULT 'None',
        -- Description
        Description NVARCHAR(MAX) NOT NULL,
        ImmediateActions NVARCHAR(MAX) NULL,
        ContributingFactors NVARCHAR(MAX) NULL,
        -- Investigation
        Status NVARCHAR(500) NOT NULL DEFAULT 'Reported',
        InvestigatorId UNIQUEIDENTIFIER NULL,
        InvestigationStartDate DATETIME2 NULL,
        InvestigationEndDate DATETIME2 NULL,
        -- RCA
        RootCause NVARCHAR(MAX) NULL,
        RCAMethod NVARCHAR(500) NULL,
        IsAnonymous BIT NOT NULL DEFAULT 0,
        ReportedToAuthority BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_IncidentReports_ReportedBy FOREIGN KEY (ReportedById) REFERENCES Users(Id),
        CONSTRAINT FK_IncidentReports_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_IncidentReports_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_IncidentReports_Investigator FOREIGN KEY (InvestigatorId) REFERENCES Users(Id)
    );
    PRINT 'Created IncidentReports table';
END
ELSE
    PRINT 'IncidentReports table already exists';
GO

-- 17.4 CAPAs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CAPAs')
BEGIN
    CREATE TABLE CAPAs (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        CAPACode NVARCHAR(500) NOT NULL,
        IncidentReportId UNIQUEIDENTIFIER NULL,
        AuditFindingId UNIQUEIDENTIFIER NULL,
        Source NVARCHAR(500) NOT NULL,
        Type NVARCHAR(500) NOT NULL DEFAULT 'Corrective',
        ActionDescription NVARCHAR(MAX) NOT NULL,
        ExpectedOutcome NVARCHAR(MAX) NULL,
        AssignedToId UNIQUEIDENTIFIER NOT NULL,
        DueDate DATETIME2 NOT NULL,
        CompletedDate DATETIME2 NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Open',
        Priority NVARCHAR(500) NOT NULL DEFAULT 'Medium',
        -- Verification
        IsEffective BIT NOT NULL DEFAULT 0,
        VerifiedById UNIQUEIDENTIFIER NULL,
        VerifiedDate DATETIME2 NULL,
        VerificationNotes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_CAPAs_IncidentReport FOREIGN KEY (IncidentReportId) REFERENCES IncidentReports(Id),
        CONSTRAINT FK_CAPAs_AssignedTo FOREIGN KEY (AssignedToId) REFERENCES Users(Id),
        CONSTRAINT FK_CAPAs_VerifiedBy FOREIGN KEY (VerifiedById) REFERENCES Users(Id)
    );
    PRINT 'Created CAPAs table';
END
ELSE
    PRINT 'CAPAs table already exists';
GO

-- 17.5 AuditPlans
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'AuditPlans')
BEGIN
    CREATE TABLE AuditPlans (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        AuditCode NVARCHAR(500) NOT NULL,
        AuditName NVARCHAR(500) NOT NULL,
        AuditType NVARCHAR(500) NOT NULL,
        Standard NVARCHAR(500) NOT NULL,
        [Year] INT NOT NULL,
        PlannedStartDate DATETIME2 NOT NULL,
        PlannedEndDate DATETIME2 NOT NULL,
        ActualStartDate DATETIME2 NULL,
        ActualEndDate DATETIME2 NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Planned',
        LeadAuditorId UNIQUEIDENTIFIER NOT NULL,
        AuditTeam NVARCHAR(MAX) NULL,
        ScopeDescription NVARCHAR(MAX) NULL,
        DepartmentsAudited NVARCHAR(MAX) NULL,
        -- Results
        TotalFindings INT NULL,
        MajorNonconformities INT NULL,
        MinorNonconformities INT NULL,
        Observations INT NULL,
        SummaryReport NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_AuditPlans_LeadAuditor FOREIGN KEY (LeadAuditorId) REFERENCES Users(Id)
    );
    PRINT 'Created AuditPlans table';
END
ELSE
    PRINT 'AuditPlans table already exists';
GO

-- 17.6 SatisfactionSurveys
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SatisfactionSurveys')
BEGIN
    CREATE TABLE SatisfactionSurveys (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NULL,
        VisitId UNIQUEIDENTIFIER NULL,
        SurveyType NVARCHAR(500) NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        SurveyDate DATETIME2 NOT NULL,
        -- Ratings (1-5 scale)
        OverallRating INT NULL,
        WaitTimeRating INT NULL,
        StaffCourtesyRating INT NULL,
        CommunicationRating INT NULL,
        CleanlinessRating INT NULL,
        FacilitiesRating INT NULL,
        WouldRecommend BIT NOT NULL DEFAULT 0,
        PositiveFeedback NVARCHAR(MAX) NULL,
        NegativeFeedback NVARCHAR(MAX) NULL,
        Suggestions NVARCHAR(MAX) NULL,
        IsAnonymous BIT NOT NULL DEFAULT 0,
        RequiresFollowUp BIT NOT NULL DEFAULT 0,
        FollowedUp BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_SatisfactionSurveys_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_SatisfactionSurveys_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)
    );
    PRINT 'Created SatisfactionSurveys table';
END
ELSE
    PRINT 'SatisfactionSurveys table already exists';
GO

-- =============================================================================
-- LUONG 18: PATIENT PORTAL
-- =============================================================================

-- 18.1 PortalAccounts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PortalAccounts')
BEGIN
    CREATE TABLE PortalAccounts (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        Username NVARCHAR(500) NOT NULL,
        PasswordHash NVARCHAR(500) NOT NULL,
        Email NVARCHAR(500) NOT NULL,
        Phone NVARCHAR(500) NOT NULL,
        -- Verification
        IsEmailVerified BIT NOT NULL DEFAULT 0,
        IsPhoneVerified BIT NOT NULL DEFAULT 0,
        IsKYCVerified BIT NOT NULL DEFAULT 0,
        KYCDocumentType NVARCHAR(500) NULL,
        KYCDocumentNumber NVARCHAR(500) NULL,
        -- Status
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        LastLoginAt DATETIME2 NULL,
        FailedLoginAttempts INT NOT NULL DEFAULT 0,
        LockedUntil DATETIME2 NULL,
        -- Preferences
        ReceiveEmailNotifications BIT NOT NULL DEFAULT 1,
        ReceiveSMSNotifications BIT NOT NULL DEFAULT 1,
        PreferredLanguage NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_PortalAccounts_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );
    PRINT 'Created PortalAccounts table';
END
ELSE
    PRINT 'PortalAccounts table already exists';
GO

-- 18.2 PortalAppointments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PortalAppointments')
BEGIN
    CREATE TABLE PortalAppointments (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        BookingCode NVARCHAR(500) NOT NULL,
        PortalAccountId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NOT NULL,
        DoctorId UNIQUEIDENTIFIER NULL,
        AppointmentDate DATETIME2 NOT NULL,
        SlotTime TIME NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Pending',
        ChiefComplaint NVARCHAR(MAX) NULL,
        -- Payment
        IsPaid BIT NOT NULL DEFAULT 0,
        BookingFee DECIMAL(18,2) NULL,
        PaymentMethod NVARCHAR(500) NULL,
        PaymentReference NVARCHAR(500) NULL,
        PaidAt DATETIME2 NULL,
        -- Cancellation
        CancelledAt DATETIME2 NULL,
        CancellationReason NVARCHAR(MAX) NULL,
        IsRefunded BIT NOT NULL DEFAULT 0,
        -- Check-in
        CheckedInAt DATETIME2 NULL,
        QueueNumber NVARCHAR(500) NULL,
        -- Reminder
        ReminderSent BIT NOT NULL DEFAULT 0,
        ReminderSentAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_PortalAppointments_PortalAccount FOREIGN KEY (PortalAccountId) REFERENCES PortalAccounts(Id),
        CONSTRAINT FK_PortalAppointments_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_PortalAppointments_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_PortalAppointments_Doctor FOREIGN KEY (DoctorId) REFERENCES Users(Id)
    );
    PRINT 'Created PortalAppointments table';
END
ELSE
    PRINT 'PortalAppointments table already exists';
GO

-- 18.3 OnlinePayments
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OnlinePayments')
BEGIN
    CREATE TABLE OnlinePayments (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TransactionCode NVARCHAR(500) NOT NULL,
        PortalAccountId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        PaymentType NVARCHAR(500) NOT NULL,
        ReferenceId UNIQUEIDENTIFIER NULL,
        Amount DECIMAL(18,2) NOT NULL,
        Currency NVARCHAR(500) NOT NULL DEFAULT 'VND',
        PaymentMethod NVARCHAR(500) NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Pending',
        -- Gateway response
        GatewayTransactionId NVARCHAR(500) NULL,
        GatewayResponse NVARCHAR(MAX) NULL,
        PaidAt DATETIME2 NULL,
        -- Refund
        IsRefunded BIT NOT NULL DEFAULT 0,
        RefundAmount DECIMAL(18,2) NULL,
        RefundedAt DATETIME2 NULL,
        RefundReason NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_OnlinePayments_PortalAccount FOREIGN KEY (PortalAccountId) REFERENCES PortalAccounts(Id),
        CONSTRAINT FK_OnlinePayments_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id)
    );
    PRINT 'Created OnlinePayments table';
END
ELSE
    PRINT 'OnlinePayments table already exists';
GO

-- =============================================================================
-- LUONG 19: HEALTH INFORMATION EXCHANGE
-- =============================================================================

-- 19.1 HIEConnections
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HIEConnections')
BEGIN
    CREATE TABLE HIEConnections (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ConnectionName NVARCHAR(500) NOT NULL,
        ConnectionType NVARCHAR(500) NOT NULL,
        EndpointUrl NVARCHAR(500) NOT NULL,
        -- Authentication
        AuthType NVARCHAR(500) NOT NULL DEFAULT 'OAuth2',
        ClientId NVARCHAR(500) NULL,
        ClientSecretEncrypted NVARCHAR(MAX) NULL,
        CertificatePath NVARCHAR(500) NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        LastSuccessfulConnection DATETIME2 NULL,
        LastFailedConnection DATETIME2 NULL,
        LastErrorMessage NVARCHAR(MAX) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created HIEConnections table';
END
ELSE
    PRINT 'HIEConnections table already exists';
GO

-- 19.2 InsuranceXMLSubmissions
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InsuranceXMLSubmissions')
BEGIN
    CREATE TABLE InsuranceXMLSubmissions (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        SubmissionCode NVARCHAR(500) NOT NULL,
        XMLType NVARCHAR(500) NOT NULL,
        PeriodFrom DATETIME2 NOT NULL,
        PeriodTo DATETIME2 NOT NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        TotalRecords INT NOT NULL DEFAULT 0,
        TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Generated',
        GeneratedAt DATETIME2 NOT NULL,
        SubmittedAt DATETIME2 NULL,
        ResponseAt DATETIME2 NULL,
        FilePath NVARCHAR(500) NULL,
        Checksum NVARCHAR(500) NULL,
        SubmittedById UNIQUEIDENTIFIER NULL,
        PortalTransactionId NVARCHAR(500) NULL,
        PortalResponse NVARCHAR(MAX) NULL,
        AcceptedRecords INT NULL,
        RejectedRecords INT NULL,
        RejectionReasons NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_InsuranceXMLSubmissions_Department FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
        CONSTRAINT FK_InsuranceXMLSubmissions_SubmittedBy FOREIGN KEY (SubmittedById) REFERENCES Users(Id)
    );
    PRINT 'Created InsuranceXMLSubmissions table';
END
ELSE
    PRINT 'InsuranceXMLSubmissions table already exists';
GO

-- 19.3 ElectronicReferrals
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ElectronicReferrals')
BEGIN
    CREATE TABLE ElectronicReferrals (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        ReferralCode NVARCHAR(500) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        ExaminationId UNIQUEIDENTIFIER NULL,
        AdmissionId UNIQUEIDENTIFIER NULL,
        -- From
        FromFacilityCode NVARCHAR(500) NOT NULL,
        FromFacilityName NVARCHAR(500) NOT NULL,
        ReferredById UNIQUEIDENTIFIER NOT NULL,
        -- To
        ToFacilityCode NVARCHAR(500) NOT NULL,
        ToFacilityName NVARCHAR(500) NOT NULL,
        ToDepartment NVARCHAR(500) NULL,
        -- Clinical info
        Diagnosis NVARCHAR(500) NOT NULL,
        IcdCodes NVARCHAR(500) NULL,
        ReferralReason NVARCHAR(MAX) NOT NULL,
        ClinicalSummary NVARCHAR(MAX) NULL,
        TreatmentGiven NVARCHAR(MAX) NULL,
        AttachedDocuments NVARCHAR(MAX) NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Sent',
        SentAt DATETIME2 NOT NULL,
        ReceivedAt DATETIME2 NULL,
        ResponseAt DATETIME2 NULL,
        ResponseMessage NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ElectronicReferrals_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_ElectronicReferrals_Examination FOREIGN KEY (ExaminationId) REFERENCES Examinations(Id),
        CONSTRAINT FK_ElectronicReferrals_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_ElectronicReferrals_ReferredBy FOREIGN KEY (ReferredById) REFERENCES Users(Id)
    );
    PRINT 'Created ElectronicReferrals table';
END
ELSE
    PRINT 'ElectronicReferrals table already exists';
GO

-- 19.4 TeleconsultationRequests
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TeleconsultationRequests')
BEGIN
    CREATE TABLE TeleconsultationRequests (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        RequestCode NVARCHAR(500) NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        AdmissionId UNIQUEIDENTIFIER NULL,
        -- Requesting facility
        RequestingFacilityCode NVARCHAR(500) NOT NULL,
        RequestingFacilityName NVARCHAR(500) NOT NULL,
        RequestedById UNIQUEIDENTIFIER NOT NULL,
        -- Consulting facility
        ConsultingFacilityCode NVARCHAR(500) NOT NULL,
        ConsultingFacilityName NVARCHAR(500) NOT NULL,
        ConsultingSpecialty NVARCHAR(500) NULL,
        -- Case info
        CaseDescription NVARCHAR(MAX) NOT NULL,
        Diagnosis NVARCHAR(500) NULL,
        ConsultationQuestion NVARCHAR(MAX) NOT NULL,
        AttachedFiles NVARCHAR(MAX) NULL,
        Urgency NVARCHAR(500) NOT NULL DEFAULT 'Routine',
        Status NVARCHAR(500) NOT NULL DEFAULT 'Requested',
        -- Session
        ScheduledDateTime DATETIME2 NULL,
        StartedAt DATETIME2 NULL,
        EndedAt DATETIME2 NULL,
        SessionUrl NVARCHAR(500) NULL,
        -- Response
        ConsultantName NVARCHAR(500) NULL,
        ConsultationOpinion NVARCHAR(MAX) NULL,
        Recommendations NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_TeleconsultationRequests_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_TeleconsultationRequests_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id),
        CONSTRAINT FK_TeleconsultationRequests_RequestedBy FOREIGN KEY (RequestedById) REFERENCES Users(Id)
    );
    PRINT 'Created TeleconsultationRequests table';
END
ELSE
    PRINT 'TeleconsultationRequests table already exists';
GO

-- =============================================================================
-- LUONG 20: MASS CASUALTY INCIDENT
-- =============================================================================

-- 20.1 MCIEvents
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MCIEvents')
BEGIN
    CREATE TABLE MCIEvents (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        EventCode NVARCHAR(500) NOT NULL,
        EventName NVARCHAR(500) NOT NULL,
        EventType NVARCHAR(500) NOT NULL,
        EventLocation NVARCHAR(500) NOT NULL,
        AlertReceivedAt DATETIME2 NOT NULL,
        ActivatedAt DATETIME2 NOT NULL,
        DeactivatedAt DATETIME2 NULL,
        AlertLevel NVARCHAR(500) NOT NULL DEFAULT 'Yellow',
        EstimatedVictims INT NOT NULL DEFAULT 0,
        ActualVictims INT NOT NULL DEFAULT 0,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        IncidentCommanderId UNIQUEIDENTIFIER NOT NULL,
        -- Resources
        BedsActivated INT NOT NULL DEFAULT 0,
        StaffMobilized INT NOT NULL DEFAULT 0,
        BloodBankAlerted BIT NOT NULL DEFAULT 0,
        ORsCleared BIT NOT NULL DEFAULT 0,
        -- Reporting
        ReportedToAuthority BIT NOT NULL DEFAULT 0,
        ReportedAt DATETIME2 NULL,
        AfterActionReport NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MCIEvents_IncidentCommander FOREIGN KEY (IncidentCommanderId) REFERENCES Users(Id)
    );
    PRINT 'Created MCIEvents table';
END
ELSE
    PRINT 'MCIEvents table already exists';
GO

-- 20.2 MCIVictims
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MCIVictims')
BEGIN
    CREATE TABLE MCIVictims (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        MCIEventId UNIQUEIDENTIFIER NOT NULL,
        TagNumber NVARCHAR(500) NOT NULL,
        -- Identity
        PatientId UNIQUEIDENTIFIER NULL,
        Name NVARCHAR(500) NULL,
        EstimatedAge INT NULL,
        Gender NVARCHAR(500) NULL,
        IdentifyingFeatures NVARCHAR(MAX) NULL,
        -- Triage
        ArrivalTime DATETIME2 NOT NULL,
        TriageCategory NVARCHAR(500) NOT NULL,
        TriageTime DATETIME2 NULL,
        TriagedById UNIQUEIDENTIFIER NULL,
        TriageNotes NVARCHAR(MAX) NULL,
        -- Triage assessment (START)
        CanWalk BIT NULL,
        RespiratoryRate INT NULL,
        HasRadialPulse BIT NULL,
        FollowsCommands BIT NULL,
        -- Injuries
        InjuryDescription NVARCHAR(MAX) NULL,
        BodyAreasAffected NVARCHAR(MAX) NULL,
        -- Status tracking
        CurrentLocation NVARCHAR(500) NOT NULL,
        Status NVARCHAR(500) NOT NULL DEFAULT 'Active',
        -- Treatment
        InitialTreatment NVARCHAR(MAX) NULL,
        AdmissionId UNIQUEIDENTIFIER NULL,
        -- Family contact
        FamilyNotified BIT NOT NULL DEFAULT 0,
        FamilyContactName NVARCHAR(500) NULL,
        FamilyContactPhone NVARCHAR(500) NULL,
        FamilyNotifiedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MCIVictims_MCIEvent FOREIGN KEY (MCIEventId) REFERENCES MCIEvents(Id),
        CONSTRAINT FK_MCIVictims_Patient FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_MCIVictims_TriagedBy FOREIGN KEY (TriagedById) REFERENCES Users(Id),
        CONSTRAINT FK_MCIVictims_Admission FOREIGN KEY (AdmissionId) REFERENCES Admissions(Id)
    );
    PRINT 'Created MCIVictims table';
END
ELSE
    PRINT 'MCIVictims table already exists';
GO

-- 20.3 MCISituationReports
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MCISituationReports')
BEGIN
    CREATE TABLE MCISituationReports (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        MCIEventId UNIQUEIDENTIFIER NOT NULL,
        ReportNumber INT NOT NULL DEFAULT 0,
        ReportTime DATETIME2 NOT NULL,
        ReportedById UNIQUEIDENTIFIER NOT NULL,
        -- Victim counts
        TotalArrived INT NOT NULL DEFAULT 0,
        RedCount INT NOT NULL DEFAULT 0,
        YellowCount INT NOT NULL DEFAULT 0,
        GreenCount INT NOT NULL DEFAULT 0,
        BlackCount INT NOT NULL DEFAULT 0,
        -- Status counts
        InED INT NOT NULL DEFAULT 0,
        InOR INT NOT NULL DEFAULT 0,
        InICU INT NOT NULL DEFAULT 0,
        Admitted INT NOT NULL DEFAULT 0,
        Discharged INT NOT NULL DEFAULT 0,
        Transferred INT NOT NULL DEFAULT 0,
        Deceased INT NOT NULL DEFAULT 0,
        -- Resources
        BedsAvailable INT NOT NULL DEFAULT 0,
        ORsInUse INT NOT NULL DEFAULT 0,
        VentilatorsInUse INT NOT NULL DEFAULT 0,
        BloodSupplyStatus NVARCHAR(500) NULL,
        CriticalSupplyIssues NVARCHAR(MAX) NULL,
        -- Staffing
        DoctorsOnDuty INT NOT NULL DEFAULT 0,
        NursesOnDuty INT NOT NULL DEFAULT 0,
        Comments NVARCHAR(MAX) NULL,
        ImmediateNeeds NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_MCISituationReports_MCIEvent FOREIGN KEY (MCIEventId) REFERENCES MCIEvents(Id),
        CONSTRAINT FK_MCISituationReports_ReportedBy FOREIGN KEY (ReportedById) REFERENCES Users(Id)
    );
    PRINT 'Created MCISituationReports table';
END
ELSE
    PRINT 'MCISituationReports table already exists';
GO

PRINT '=== All 38 extended workflow tables creation complete ===';
GO
