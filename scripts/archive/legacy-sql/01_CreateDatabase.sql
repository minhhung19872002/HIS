-- ============================================
-- HIS Database Creation Script
-- Server: localhost\DOTNET
-- Database: HIS
-- ============================================

USE master;
GO

-- Drop database if exists
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'HIS')
BEGIN
    ALTER DATABASE HIS SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE HIS;
END
GO

-- Create database
CREATE DATABASE HIS
COLLATE Vietnamese_CI_AS;
GO

USE HIS;
GO

-- ============================================
-- CREATE TABLES
-- ============================================

-- Users & Authentication
CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100),
    PhoneNumber NVARCHAR(20),
    EmployeeCode NVARCHAR(20),
    LicenseNumber NVARCHAR(50),
    Title NVARCHAR(50),
    Degree NVARCHAR(50),
    Specialty NVARCHAR(100),
    SignaturePath NVARCHAR(255),
    DepartmentId UNIQUEIDENTIFIER,
    IsActive BIT DEFAULT 1,
    LastLoginAt DATETIME,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0
);

CREATE TABLE Roles (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoleCode NVARCHAR(50) NOT NULL UNIQUE,
    RoleName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0
);

CREATE TABLE UserRoles (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    RoleId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (RoleId) REFERENCES Roles(Id)
);

CREATE TABLE Permissions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PermissionCode NVARCHAR(50) NOT NULL UNIQUE,
    PermissionName NVARCHAR(100) NOT NULL,
    Module NVARCHAR(50),
    Description NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0
);

CREATE TABLE RolePermissions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoleId UNIQUEIDENTIFIER NOT NULL,
    PermissionId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (RoleId) REFERENCES Roles(Id),
    FOREIGN KEY (PermissionId) REFERENCES Permissions(Id)
);

-- Departments & Rooms
CREATE TABLE Departments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    DepartmentCode NVARCHAR(20) NOT NULL UNIQUE,
    DepartmentName NVARCHAR(100) NOT NULL,
    DepartmentCodeBYT NVARCHAR(20),
    DepartmentType INT DEFAULT 1, -- 1-LS, 2-CLS, 3-HC
    Description NVARCHAR(255),
    Location NVARCHAR(100),
    PhoneNumber NVARCHAR(20),
    IsActive BIT DEFAULT 1,
    DisplayOrder INT DEFAULT 0,
    ParentId UNIQUEIDENTIFIER,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (ParentId) REFERENCES Departments(Id)
);

ALTER TABLE Users ADD FOREIGN KEY (DepartmentId) REFERENCES Departments(Id);

CREATE TABLE Rooms (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    RoomCode NVARCHAR(20) NOT NULL,
    RoomName NVARCHAR(100) NOT NULL,
    RoomCodeBYT NVARCHAR(20),
    RoomType INT DEFAULT 1, -- 1-PK, 2-PB, 3-PM, 4-PXN
    Location NVARCHAR(100),
    MaxPatients INT DEFAULT 100,
    MaxInsurancePatients INT DEFAULT 50,
    IsActive BIT DEFAULT 1,
    DisplayOrder INT DEFAULT 0,
    DepartmentId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id)
);

CREATE TABLE Beds (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    BedCode NVARCHAR(20) NOT NULL,
    BedName NVARCHAR(50) NOT NULL,
    BedType INT DEFAULT 1,
    DailyPrice DECIMAL(18,2) DEFAULT 0,
    Status INT DEFAULT 0, -- 0-Empty, 1-InUse, 2-Maintenance
    IsActive BIT DEFAULT 1,
    RoomId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (RoomId) REFERENCES Rooms(Id)
);

-- Patients
CREATE TABLE Patients (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PatientCode NVARCHAR(20) NOT NULL UNIQUE,
    FullName NVARCHAR(100) NOT NULL,
    DateOfBirth DATE,
    YearOfBirth INT,
    Gender INT DEFAULT 1, -- 1-Male, 2-Female, 3-Other
    IdentityNumber NVARCHAR(20),
    PhoneNumber NVARCHAR(20),
    Email NVARCHAR(100),
    Address NVARCHAR(255),
    WardCode NVARCHAR(10),
    WardName NVARCHAR(50),
    DistrictCode NVARCHAR(10),
    DistrictName NVARCHAR(50),
    ProvinceCode NVARCHAR(10),
    ProvinceName NVARCHAR(50),
    CountryCode NVARCHAR(10),
    Occupation NVARCHAR(100),
    Workplace NVARCHAR(200),
    EthnicCode NVARCHAR(10),
    EthnicName NVARCHAR(50),
    NationalityCode NVARCHAR(10),
    NationalityName NVARCHAR(50),
    InsuranceNumber NVARCHAR(15),
    InsuranceExpireDate DATE,
    InsuranceFacilityCode NVARCHAR(10),
    InsuranceFacilityName NVARCHAR(100),
    GuardianName NVARCHAR(100),
    GuardianPhone NVARCHAR(20),
    GuardianRelationship NVARCHAR(50),
    MedicalHistory NVARCHAR(MAX),
    AllergyHistory NVARCHAR(MAX),
    FamilyHistory NVARCHAR(MAX),
    PhotoPath NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0
);

-- Medical Records
CREATE TABLE MedicalRecords (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MedicalRecordCode NVARCHAR(20) NOT NULL,
    InpatientCode NVARCHAR(20),
    ArchiveCode NVARCHAR(20),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    AdmissionDate DATETIME NOT NULL,
    DischargeDate DATETIME,
    PatientType INT DEFAULT 1, -- 1-BHYT, 2-VP, 3-DV
    TreatmentType INT DEFAULT 1, -- 1-OPD, 2-IPD, 3-ER
    InsuranceNumber NVARCHAR(15),
    InsuranceExpireDate DATE,
    InsuranceFacilityCode NVARCHAR(10),
    InsuranceRightRoute INT DEFAULT 1, -- 1-Đúng tuyến, 2-Trái tuyến, 3-Thông tuyến
    InitialDiagnosis NVARCHAR(500),
    MainDiagnosis NVARCHAR(500),
    MainIcdCode NVARCHAR(10),
    SubDiagnosis NVARCHAR(1000),
    SubIcdCodes NVARCHAR(500),
    ExternalCause NVARCHAR(200),
    TreatmentResult INT,
    DischargeType INT,
    DischargeNote NVARCHAR(500),
    DepartmentId UNIQUEIDENTIFIER,
    RoomId UNIQUEIDENTIFIER,
    BedId UNIQUEIDENTIFIER,
    DoctorId UNIQUEIDENTIFIER,
    Status INT DEFAULT 0, -- 0-Wait, 1-InProgress, 2-WaitConclusion, 3-Done
    IsClosed BIT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (PatientId) REFERENCES Patients(Id),
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
    FOREIGN KEY (RoomId) REFERENCES Rooms(Id),
    FOREIGN KEY (BedId) REFERENCES Beds(Id),
    FOREIGN KEY (DoctorId) REFERENCES Users(Id)
);

-- Examinations
CREATE TABLE Examinations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    MedicalRecordId UNIQUEIDENTIFIER NOT NULL,
    ExaminationType INT DEFAULT 1,
    QueueNumber INT DEFAULT 0,
    StartTime DATETIME,
    EndTime DATETIME,
    DepartmentId UNIQUEIDENTIFIER NOT NULL,
    RoomId UNIQUEIDENTIFIER NOT NULL,
    DoctorId UNIQUEIDENTIFIER,
    ChiefComplaint NVARCHAR(500),
    PresentIllness NVARCHAR(MAX),
    PhysicalExamination NVARCHAR(MAX),
    SystemsReview NVARCHAR(MAX),
    Temperature DECIMAL(4,1),
    Pulse INT,
    BloodPressureSystolic INT,
    BloodPressureDiastolic INT,
    RespiratoryRate INT,
    Height DECIMAL(5,1),
    Weight DECIMAL(5,1),
    SpO2 DECIMAL(4,1),
    BMI DECIMAL(4,1),
    InitialDiagnosis NVARCHAR(500),
    MainDiagnosis NVARCHAR(500),
    MainIcdCode NVARCHAR(10),
    SubDiagnosis NVARCHAR(1000),
    SubIcdCodes NVARCHAR(500),
    ConclusionType INT,
    ConclusionNote NVARCHAR(500),
    FollowUpDate DATE,
    Status INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id),
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
    FOREIGN KEY (RoomId) REFERENCES Rooms(Id),
    FOREIGN KEY (DoctorId) REFERENCES Users(Id)
);

-- Queues
CREATE TABLE Queues (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    QueueDate DATE NOT NULL,
    QueueNumber INT NOT NULL,
    QueueCode NVARCHAR(10),
    PatientId UNIQUEIDENTIFIER NOT NULL,
    MedicalRecordId UNIQUEIDENTIFIER,
    QueueType INT DEFAULT 1, -- 1-Reception, 2-Examination, 3-Lab, 4-Payment
    DepartmentId UNIQUEIDENTIFIER,
    RoomId UNIQUEIDENTIFIER,
    Priority INT DEFAULT 0, -- 0-Normal, 1-Priority, 2-Emergency
    Status INT DEFAULT 0, -- 0-Wait, 1-Calling, 2-In, 3-Skip
    CalledAt DATETIME,
    StartedAt DATETIME,
    CompletedAt DATETIME,
    CalledCount INT DEFAULT 0,
    Counter NVARCHAR(20),
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (PatientId) REFERENCES Patients(Id),
    FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id),
    FOREIGN KEY (DepartmentId) REFERENCES Departments(Id),
    FOREIGN KEY (RoomId) REFERENCES Rooms(Id)
);

-- Service Groups
CREATE TABLE ServiceGroups (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    GroupCode NVARCHAR(20) NOT NULL UNIQUE,
    GroupName NVARCHAR(100) NOT NULL,
    GroupType INT DEFAULT 1,
    Description NVARCHAR(255),
    DisplayOrder INT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    ParentId UNIQUEIDENTIFIER,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (ParentId) REFERENCES ServiceGroups(Id)
);

-- Services
CREATE TABLE Services (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    ServiceCode NVARCHAR(20) NOT NULL UNIQUE,
    ServiceName NVARCHAR(200) NOT NULL,
    ServiceCodeBYT NVARCHAR(20),
    ServiceCodeBHYT NVARCHAR(20),
    ServiceGroupId UNIQUEIDENTIFIER NOT NULL,
    UnitPrice DECIMAL(18,2) DEFAULT 0,
    InsurancePrice DECIMAL(18,2) DEFAULT 0,
    ServicePrice DECIMAL(18,2) DEFAULT 0,
    Unit NVARCHAR(20),
    ServiceType INT DEFAULT 1,
    SurgeryType INT DEFAULT 0,
    IsInsuranceCovered BIT DEFAULT 1,
    InsurancePaymentRate INT DEFAULT 100,
    RequiresResult BIT DEFAULT 0,
    RequiresSample BIT DEFAULT 0,
    EstimatedMinutes INT DEFAULT 0,
    Note NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    DisplayOrder INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0,
    FOREIGN KEY (ServiceGroupId) REFERENCES ServiceGroups(Id)
);

-- ICD Codes
CREATE TABLE IcdCodes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(10) NOT NULL UNIQUE,
    Name NVARCHAR(500) NOT NULL,
    NameEnglish NVARCHAR(500),
    ChapterCode NVARCHAR(10),
    ChapterName NVARCHAR(200),
    GroupCode NVARCHAR(10),
    GroupName NVARCHAR(200),
    IcdType INT DEFAULT 1,
    IsNotifiable BIT DEFAULT 0,
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0
);

-- Audit Logs
CREATE TABLE AuditLogs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TableName NVARCHAR(100) NOT NULL,
    RecordId UNIQUEIDENTIFIER NOT NULL,
    Action NVARCHAR(20) NOT NULL,
    OldValues NVARCHAR(MAX),
    NewValues NVARCHAR(MAX),
    IpAddress NVARCHAR(50),
    UserAgent NVARCHAR(500),
    UserId UNIQUEIDENTIFIER,
    Username NVARCHAR(50),
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(50),
    UpdatedAt DATETIME,
    UpdatedBy NVARCHAR(50),
    IsDeleted BIT DEFAULT 0
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IX_Patients_PatientCode ON Patients(PatientCode);
CREATE INDEX IX_Patients_IdentityNumber ON Patients(IdentityNumber);
CREATE INDEX IX_Patients_InsuranceNumber ON Patients(InsuranceNumber);
CREATE INDEX IX_Patients_PhoneNumber ON Patients(PhoneNumber);
CREATE INDEX IX_MedicalRecords_PatientId ON MedicalRecords(PatientId);
CREATE INDEX IX_MedicalRecords_AdmissionDate ON MedicalRecords(AdmissionDate);
CREATE INDEX IX_MedicalRecords_Status ON MedicalRecords(Status);
CREATE INDEX IX_Queues_QueueDate_RoomId ON Queues(QueueDate, RoomId);
CREATE INDEX IX_Users_Username ON Users(Username);

PRINT 'Database HIS created successfully!';
GO
