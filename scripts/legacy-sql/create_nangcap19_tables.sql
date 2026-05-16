-- NangCap19: TTYT Quang Hoa - Patient Portal Enhancement Tables
-- 4 new features: Family Members, Medicine Reminders, Health Metrics, Patient Q&A

USE HIS;
GO

-- 1. Family Members
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FamilyMembers')
BEGIN
    CREATE TABLE FamilyMembers (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AccountId UNIQUEIDENTIFIER NOT NULL,
        FullName NVARCHAR(200) NOT NULL,
        Relationship NVARCHAR(50) NOT NULL,
        DateOfBirth NVARCHAR(20) NULL,
        Gender NVARCHAR(10) NULL,
        IdNumber NVARCHAR(20) NULL,
        Phone NVARCHAR(20) NULL,
        InsuranceNumber NVARCHAR(30) NULL,
        LinkedPatientId UNIQUEIDENTIFIER NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_FamilyMembers_AccountId ON FamilyMembers(AccountId);
    PRINT 'Created FamilyMembers table';
END
GO

-- 2. Medicine Reminders
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MedicineReminders')
BEGIN
    CREATE TABLE MedicineReminders (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AccountId UNIQUEIDENTIFIER NOT NULL,
        MedicineName NVARCHAR(200) NOT NULL,
        Dosage NVARCHAR(100) NOT NULL,
        Frequency NVARCHAR(50) NOT NULL,
        Times NVARCHAR(200) NULL,
        Instructions NVARCHAR(500) NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        PrescriptionId NVARCHAR(100) NULL,
        Notes NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_MedicineReminders_AccountId ON MedicineReminders(AccountId);
    CREATE INDEX IX_MedicineReminders_Active ON MedicineReminders(AccountId, IsActive);
    PRINT 'Created MedicineReminders table';
END
GO

-- 3. Health Metrics
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'HealthMetrics')
BEGIN
    CREATE TABLE HealthMetrics (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AccountId UNIQUEIDENTIFIER NOT NULL,
        RecordedAt DATETIME2 NOT NULL,
        BloodPressureSystolic DECIMAL(5,1) NULL,
        BloodPressureDiastolic DECIMAL(5,1) NULL,
        HeartRate DECIMAL(5,1) NULL,
        Weight DECIMAL(5,1) NULL,
        Height DECIMAL(5,1) NULL,
        BMI DECIMAL(5,1) NULL,
        BloodGlucose DECIMAL(5,1) NULL,
        Temperature DECIMAL(4,1) NULL,
        SpO2 DECIMAL(4,1) NULL,
        Notes NVARCHAR(500) NULL,
        Source NVARCHAR(50) NOT NULL DEFAULT 'Manual',
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_HealthMetrics_AccountId ON HealthMetrics(AccountId);
    CREATE INDEX IX_HealthMetrics_AccountId_RecordedAt ON HealthMetrics(AccountId, RecordedAt DESC);
    PRINT 'Created HealthMetrics table';
END
GO

-- 4. Patient Questions
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PatientQuestions')
BEGIN
    CREATE TABLE PatientQuestions (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AccountId UNIQUEIDENTIFIER NOT NULL,
        Subject NVARCHAR(300) NOT NULL,
        Content NVARCHAR(MAX) NOT NULL,
        Category NVARCHAR(100) NULL,
        ImageUrls NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 1,
        AnsweredBy NVARCHAR(100) NULL,
        AnsweredByName NVARCHAR(200) NULL,
        Answer NVARCHAR(MAX) NULL,
        AnsweredAt DATETIME2 NULL,
        IsPublic BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL
    );
    CREATE INDEX IX_PatientQuestions_AccountId ON PatientQuestions(AccountId);
    CREATE INDEX IX_PatientQuestions_Status ON PatientQuestions(Status);
    CREATE INDEX IX_PatientQuestions_AccountId_Status ON PatientQuestions(AccountId, Status);
    PRINT 'Created PatientQuestions table';
END
GO

PRINT 'NangCap19 tables created successfully';
GO
