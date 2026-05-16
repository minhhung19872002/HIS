IF DB_ID('HIS') IS NULL
BEGIN
    RAISERROR('Database HIS not found',16,1);
    RETURN;
END
GO
USE [HIS];
GO

IF OBJECT_ID('dbo.TeleAppointments','U') IS NULL
CREATE TABLE dbo.TeleAppointments (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    AppointmentDate DATETIME2 NOT NULL,
    StartTime TIME(7) NOT NULL,
    EndTime TIME(7) NULL,
    DurationMinutes INT NOT NULL DEFAULT 30,
    PatientId UNIQUEIDENTIFIER NOT NULL,
    DoctorId UNIQUEIDENTIFIER NOT NULL,
    SpecialityId UNIQUEIDENTIFIER NULL,
    Status NVARCHAR(50) NOT NULL,
    ChiefComplaint NVARCHAR(500) NULL,
    AppointmentCode NVARCHAR(50) NULL,
    CreatedAt DATETIME2 NULL,
    ConfirmedAt DATETIME2 NULL,
    CancellationReason NVARCHAR(500) NULL
);

IF OBJECT_ID('dbo.TeleSessions','U') IS NULL
CREATE TABLE dbo.TeleSessions (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    AppointmentId UNIQUEIDENTIFIER NOT NULL,
    SessionCode NVARCHAR(50) NULL,
    StartTime DATETIME2 NULL,
    EndTime DATETIME2 NULL,
    Status NVARCHAR(50) NOT NULL,
    RoomId NVARCHAR(100) NULL,
    RecordingUrl NVARCHAR(500) NULL
);

IF OBJECT_ID('dbo.NutritionScreenings','U') IS NULL
CREATE TABLE dbo.NutritionScreenings (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    AdmissionId UNIQUEIDENTIFIER NOT NULL,
    Weight DECIMAL(18,2) NULL,
    Height DECIMAL(18,2) NULL,
    BMI DECIMAL(18,2) NULL,
    NutritionScore INT NULL,
    DiseaseScore INT NULL,
    TotalScore INT NULL,
    RiskLevel NVARCHAR(50) NULL,
    ScreeningDate DATETIME2 NULL,
    CreatedAt DATETIME2 NULL
);

IF OBJECT_ID('dbo.DietOrders','U') IS NULL
CREATE TABLE dbo.DietOrders (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Status NVARCHAR(50) NULL,
    AdmissionId UNIQUEIDENTIFIER NULL,
    DietTypeId UNIQUEIDENTIFIER NULL,
    StartDate DATE NULL,
    EndDate DATE NULL
);

IF OBJECT_ID('dbo.HAICases','U') IS NULL
CREATE TABLE dbo.HAICases (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    CaseCode NVARCHAR(50) NULL,
    AdmissionId UNIQUEIDENTIFIER NULL,
    InfectionType NVARCHAR(200) NULL,
    InfectionSite NVARCHAR(200) NULL,
    OnsetDate DATETIME2 NULL,
    Organism NVARCHAR(200) NULL,
    IsMDRO BIT NULL,
    Status NVARCHAR(50) NULL
);

IF OBJECT_ID('dbo.IsolationOrders','U') IS NULL
CREATE TABLE dbo.IsolationOrders (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    AdmissionId UNIQUEIDENTIFIER NULL,
    IsolationType NVARCHAR(100) NULL,
    Status NVARCHAR(50) NULL,
    StartDate DATETIME2 NULL,
    EndDate DATETIME2 NULL
);

IF OBJECT_ID('dbo.Outbreaks','U') IS NULL
CREATE TABLE dbo.Outbreaks (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    OutbreakCode NVARCHAR(50) NULL,
    OutbreakType NVARCHAR(200) NULL,
    Status NVARCHAR(50) NULL,
    StartDate DATETIME2 NULL,
    EndDate DATETIME2 NULL
);

IF OBJECT_ID('dbo.RehabReferrals','U') IS NULL
CREATE TABLE dbo.RehabReferrals (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ReferralCode NVARCHAR(50) NULL,
    PatientId UNIQUEIDENTIFIER NULL,
    ReferredById UNIQUEIDENTIFIER NULL,
    RehabType NVARCHAR(100) NULL,
    Diagnosis NVARCHAR(500) NULL,
    Reason NVARCHAR(500) NULL,
    Status NVARCHAR(50) NULL
);

IF OBJECT_ID('dbo.RehabTreatmentPlans','U') IS NULL
CREATE TABLE dbo.RehabTreatmentPlans (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ReferralId UNIQUEIDENTIFIER NULL,
    Status NVARCHAR(50) NULL,
    ActualEndDate DATETIME2 NULL,
    DischargeSummary NVARCHAR(MAX) NULL
);

IF OBJECT_ID('dbo.RehabSessions','U') IS NULL
CREATE TABLE dbo.RehabSessions (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    TreatmentPlanId UNIQUEIDENTIFIER NULL,
    SessionNumber INT NULL,
    SessionDate DATETIME2 NOT NULL,
    StartTime TIME(7) NULL,
    Status NVARCHAR(50) NULL,
    TherapistId UNIQUEIDENTIFIER NULL,
    ProgressNotes NVARCHAR(MAX) NULL
);

IF OBJECT_ID('dbo.MedicalEquipments','U') IS NULL
CREATE TABLE dbo.MedicalEquipments (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    EquipmentCode NVARCHAR(100) NULL,
    EquipmentName NVARCHAR(255) NULL,
    Category NVARCHAR(100) NULL,
    SerialNumber NVARCHAR(200) NULL,
    Manufacturer NVARCHAR(255) NULL,
    DepartmentId UNIQUEIDENTIFIER NULL,
    Status NVARCHAR(50) NULL,
    Location NVARCHAR(255) NULL,
    NextCalibrationDate DATE NULL,
    DecommissionDate DATE NULL,
    DecommissionReason NVARCHAR(500) NULL
);

IF OBJECT_ID('dbo.RepairRequests','U') IS NULL
CREATE TABLE dbo.RepairRequests (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    EquipmentId UNIQUEIDENTIFIER NULL,
    RequestDate DATETIME2 NULL,
    Status NVARCHAR(50) NULL
);

IF OBJECT_ID('dbo.MedicalStaffs','U') IS NULL
CREATE TABLE dbo.MedicalStaffs (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    StaffCode NVARCHAR(100) NULL,
    FullName NVARCHAR(255) NULL,
    StaffType NVARCHAR(100) NULL,
    Specialty NVARCHAR(255) NULL,
    PrimaryDepartmentId UNIQUEIDENTIFIER NULL,
    LicenseNumber NVARCHAR(100) NULL,
    LicenseExpiryDate DATE NULL,
    Status NVARCHAR(50) NULL
);

IF OBJECT_ID('dbo.IncidentReports','U') IS NULL
CREATE TABLE dbo.IncidentReports (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ReportCode NVARCHAR(100) NULL,
    IncidentDate DATETIME2 NOT NULL,
    IncidentType NVARCHAR(200) NULL,
    Severity NVARCHAR(50) NULL,
    Description NVARCHAR(MAX) NULL,
    Status NVARCHAR(50) NULL,
    DepartmentId UNIQUEIDENTIFIER NULL,
    ReportedById UNIQUEIDENTIFIER NULL
);

IF OBJECT_ID('dbo.CAPAs','U') IS NULL
CREATE TABLE dbo.CAPAs (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    CAPACode NVARCHAR(100) NULL,
    ActionDescription NVARCHAR(MAX) NULL,
    Source NVARCHAR(100) NULL,
    ExpectedOutcome NVARCHAR(MAX) NULL,
    Status NVARCHAR(50) NULL,
    DueDate DATE NULL,
    AssignedToId UNIQUEIDENTIFIER NULL,
    CompletedDate DATETIME2 NULL,
    VerificationNotes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NULL
);

IF OBJECT_ID('dbo.PortalAppointments','U') IS NULL
CREATE TABLE dbo.PortalAppointments (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    PatientId UNIQUEIDENTIFIER NOT NULL,
    DepartmentId UNIQUEIDENTIFIER NULL,
    DoctorId UNIQUEIDENTIFIER NULL,
    AppointmentDate DATETIME2 NOT NULL,
    SlotTime TIME(7) NULL,
    ChiefComplaint NVARCHAR(500) NULL,
    Status NVARCHAR(50) NULL,
    CancellationReason NVARCHAR(500) NULL,
    CancelledAt DATETIME2 NULL,
    CreatedAt DATETIME2 NULL
);

IF OBJECT_ID('dbo.HIEConnections','U') IS NULL
CREATE TABLE dbo.HIEConnections (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ConnectionName NVARCHAR(200) NULL,
    ConnectionType NVARCHAR(100) NULL,
    EndpointUrl NVARCHAR(500) NULL,
    AuthType NVARCHAR(100) NULL,
    ClientId NVARCHAR(200) NULL,
    CertificatePath NVARCHAR(500) NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    LastSuccessfulConnection DATETIME2 NULL,
    Status NVARCHAR(50) NULL,
    LastErrorMessage NVARCHAR(1000) NULL
);

IF OBJECT_ID('dbo.InsuranceXMLSubmissions','U') IS NULL
CREATE TABLE dbo.InsuranceXMLSubmissions (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    SubmissionCode NVARCHAR(100) NULL,
    XMLType NVARCHAR(20) NULL,
    PeriodFrom DATETIME2 NULL,
    PeriodTo DATETIME2 NULL,
    DepartmentId UNIQUEIDENTIFIER NULL,
    GeneratedAt DATETIME2 NOT NULL,
    SubmittedAt DATETIME2 NULL,
    Status NVARCHAR(50) NULL,
    TotalRecords INT NULL,
    TotalAmount DECIMAL(18,2) NULL
);

IF OBJECT_ID('dbo.ElectronicReferrals','U') IS NULL
CREATE TABLE dbo.ElectronicReferrals (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ReferralCode NVARCHAR(100) NULL,
    PatientId UNIQUEIDENTIFIER NULL,
    FromFacilityCode NVARCHAR(50) NULL,
    FromFacilityName NVARCHAR(255) NULL,
    ToFacilityCode NVARCHAR(50) NULL,
    ToFacilityName NVARCHAR(255) NULL,
    Diagnosis NVARCHAR(500) NULL,
    ReferralReason NVARCHAR(500) NULL,
    Status NVARCHAR(50) NULL,
    SentAt DATETIME2 NULL,
    ReceivedAt DATETIME2 NULL
);

IF OBJECT_ID('dbo.TeleconsultationRequests','U') IS NULL
CREATE TABLE dbo.TeleconsultationRequests (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    RequestCode NVARCHAR(100) NULL,
    PatientId UNIQUEIDENTIFIER NULL,
    RequestingFacilityCode NVARCHAR(50) NULL,
    RequestingFacilityName NVARCHAR(255) NULL,
    RequestedById UNIQUEIDENTIFIER NULL,
    ConsultingFacilityCode NVARCHAR(50) NULL,
    ConsultingFacilityName NVARCHAR(255) NULL,
    ConsultingSpecialty NVARCHAR(255) NULL,
    CaseDescription NVARCHAR(MAX) NULL,
    Diagnosis NVARCHAR(500) NULL,
    ConsultationQuestion NVARCHAR(MAX) NULL,
    Urgency NVARCHAR(50) NULL,
    Status NVARCHAR(50) NULL,
    ScheduledDateTime DATETIME2 NULL,
    ConsultationOpinion NVARCHAR(MAX) NULL,
    Recommendations NVARCHAR(MAX) NULL,
    EndedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NULL
);

IF OBJECT_ID('dbo.MCIEvents','U') IS NULL
CREATE TABLE dbo.MCIEvents (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    EventCode NVARCHAR(100) NULL,
    EventName NVARCHAR(255) NULL,
    EventType NVARCHAR(100) NULL,
    EventLocation NVARCHAR(500) NULL,
    AlertReceivedAt DATETIME2 NOT NULL,
    ActivatedAt DATETIME2 NOT NULL,
    DeactivatedAt DATETIME2 NULL,
    AlertLevel NVARCHAR(50) NULL,
    EstimatedVictims INT NULL,
    ActualVictims INT NOT NULL DEFAULT 0,
    StaffMobilized INT NOT NULL DEFAULT 0,
    Status NVARCHAR(50) NULL,
    IncidentCommanderId UNIQUEIDENTIFIER NULL,
    AfterActionReport NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NULL
);

IF OBJECT_ID('dbo.MCIVictims','U') IS NULL
CREATE TABLE dbo.MCIVictims (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    MCIEventId UNIQUEIDENTIFIER NOT NULL,
    PatientId UNIQUEIDENTIFIER NULL,
    TagNumber NVARCHAR(50) NULL,
    Name NVARCHAR(255) NULL,
    EstimatedAge INT NULL,
    Gender NVARCHAR(20) NULL,
    IdentifyingFeatures NVARCHAR(500) NULL,
    TriageCategory NVARCHAR(20) NULL,
    TriageTime DATETIME2 NULL,
    RespiratoryRate INT NULL,
    HasRadialPulse BIT NULL,
    FollowsCommands BIT NULL,
    CanWalk BIT NULL,
    InjuryDescription NVARCHAR(1000) NULL,
    InitialTreatment NVARCHAR(MAX) NULL,
    TriageNotes NVARCHAR(1000) NULL,
    ArrivalTime DATETIME2 NOT NULL,
    CurrentLocation NVARCHAR(255) NULL,
    Status NVARCHAR(50) NULL,
    FamilyNotified BIT NOT NULL DEFAULT 0,
    FamilyContactName NVARCHAR(255) NULL,
    FamilyContactPhone NVARCHAR(50) NULL,
    FamilyNotifiedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NULL
);

IF OBJECT_ID('dbo.MCISituationReports','U') IS NULL
CREATE TABLE dbo.MCISituationReports (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    MCIEventId UNIQUEIDENTIFIER NOT NULL,
    ReportNumber INT NOT NULL,
    ReportTime DATETIME2 NOT NULL,
    ReportedById UNIQUEIDENTIFIER NULL,
    Comments NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NULL
);
GO
PRINT 'Extended workflow tables ensured.';
GO
