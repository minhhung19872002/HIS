-- Create SatisfactionSurveyTemplates, SatisfactionSurveyResults, NurseShiftHandovers tables
-- Idempotent: IF NOT EXISTS

USE HIS;
GO

-- SatisfactionSurveyTemplates
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SatisfactionSurveyTemplates')
BEGIN
    CREATE TABLE SatisfactionSurveyTemplates (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(200) NOT NULL,
        Description NVARCHAR(1000) NULL,
        Category NVARCHAR(50) NULL,
        Questions NVARCHAR(MAX) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        SortOrder INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created SatisfactionSurveyTemplates table';
END
ELSE
    PRINT 'SatisfactionSurveyTemplates table already exists';
GO

-- SatisfactionSurveyResults
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SatisfactionSurveyResults')
BEGIN
    CREATE TABLE SatisfactionSurveyResults (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        TemplateId UNIQUEIDENTIFIER NULL,
        TemplateName NVARCHAR(200) NULL,
        PatientId UNIQUEIDENTIFIER NULL,
        PatientName NVARCHAR(200) NULL,
        PatientCode NVARCHAR(50) NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        DepartmentName NVARCHAR(200) NULL,
        OverallScore FLOAT NOT NULL DEFAULT 0,
        Answers NVARCHAR(MAX) NULL,
        Comment NVARCHAR(2000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_SatisfactionSurveyResults_CreatedAt ON SatisfactionSurveyResults(CreatedAt);
    CREATE INDEX IX_SatisfactionSurveyResults_DepartmentId ON SatisfactionSurveyResults(DepartmentId);
    PRINT 'Created SatisfactionSurveyResults table';
END
ELSE
    PRINT 'SatisfactionSurveyResults table already exists';
GO

-- NurseShiftHandovers
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'NurseShiftHandovers')
BEGIN
    CREATE TABLE NurseShiftHandovers (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        DepartmentId UNIQUEIDENTIFIER NOT NULL,
        DepartmentName NVARCHAR(200) NULL,
        ShiftType NVARCHAR(20) NOT NULL,
        ShiftDate DATETIME2 NOT NULL,
        HandoverFromUserId UNIQUEIDENTIFIER NOT NULL,
        HandoverFromName NVARCHAR(200) NULL,
        HandoverToUserId UNIQUEIDENTIFIER NULL,
        HandoverToName NVARCHAR(200) NULL,
        TotalPatients INT NOT NULL DEFAULT 0,
        CriticalPatients INT NOT NULL DEFAULT 0,
        NewAdmissions INT NOT NULL DEFAULT 0,
        Discharges INT NOT NULL DEFAULT 0,
        PendingOrders NVARCHAR(MAX) NULL,
        SpecialNotes NVARCHAR(MAX) NULL,
        IncidentNotes NVARCHAR(MAX) NULL,
        IsAcknowledged BIT NOT NULL DEFAULT 0,
        AcknowledgedAt DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAt DATETIME2 NULL,
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_NurseShiftHandovers_DepartmentId ON NurseShiftHandovers(DepartmentId);
    CREATE INDEX IX_NurseShiftHandovers_ShiftDate ON NurseShiftHandovers(ShiftDate);
    PRINT 'Created NurseShiftHandovers table';
END
ELSE
    PRINT 'NurseShiftHandovers table already exists';
GO
