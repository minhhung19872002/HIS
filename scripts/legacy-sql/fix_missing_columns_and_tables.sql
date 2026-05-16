-- =============================================================================
-- Fix Missing Columns and Tables for 5 Failing API Endpoints
-- Idempotent: uses IF NOT EXISTS / COL_LENGTH checks
--
-- Fixes:
-- 1. DietOrders - missing 13 columns
-- 2. MedicalEquipments - missing 17 columns
-- 3. MedicalStaffs - missing 14 columns
-- 4. LabResults - missing table
-- 5. Notifications - missing table
-- 6. LabRequests / LabRequestItems - missing tables (needed by LabResults FK)
-- =============================================================================

-- =============================================================================
-- 1. DietOrders - Add missing columns
-- =============================================================================
IF COL_LENGTH('DietOrders', 'OrderCode') IS NULL
    ALTER TABLE DietOrders ADD OrderCode NVARCHAR(500) NULL;
IF COL_LENGTH('DietOrders', 'PatientId') IS NULL
    ALTER TABLE DietOrders ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('DietOrders', 'OrderedById') IS NULL
    ALTER TABLE DietOrders ADD OrderedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('DietOrders', 'TextureModification') IS NULL
    ALTER TABLE DietOrders ADD TextureModification NVARCHAR(500) NULL;
IF COL_LENGTH('DietOrders', 'FluidConsistency') IS NULL
    ALTER TABLE DietOrders ADD FluidConsistency NVARCHAR(500) NULL;
IF COL_LENGTH('DietOrders', 'Allergies') IS NULL
    ALTER TABLE DietOrders ADD Allergies NVARCHAR(MAX) NULL;
IF COL_LENGTH('DietOrders', 'FoodPreferences') IS NULL
    ALTER TABLE DietOrders ADD FoodPreferences NVARCHAR(MAX) NULL;
IF COL_LENGTH('DietOrders', 'Restrictions') IS NULL
    ALTER TABLE DietOrders ADD Restrictions NVARCHAR(MAX) NULL;
IF COL_LENGTH('DietOrders', 'TargetCalories') IS NULL
    ALTER TABLE DietOrders ADD TargetCalories DECIMAL(18,2) NULL;
IF COL_LENGTH('DietOrders', 'TargetProtein') IS NULL
    ALTER TABLE DietOrders ADD TargetProtein DECIMAL(18,2) NULL;
IF COL_LENGTH('DietOrders', 'SpecialInstructions') IS NULL
    ALTER TABLE DietOrders ADD SpecialInstructions NVARCHAR(MAX) NULL;
IF COL_LENGTH('DietOrders', 'DiscontinuationReason') IS NULL
    ALTER TABLE DietOrders ADD DiscontinuationReason NVARCHAR(MAX) NULL;
IF COL_LENGTH('DietOrders', 'CreatedAt') IS NULL
    ALTER TABLE DietOrders ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
GO
PRINT 'DietOrders columns added';
GO

-- =============================================================================
-- 2. MedicalEquipments - Add missing columns
-- =============================================================================
IF COL_LENGTH('MedicalEquipments', 'NameEnglish') IS NULL
    ALTER TABLE MedicalEquipments ADD NameEnglish NVARCHAR(500) NULL;
IF COL_LENGTH('MedicalEquipments', 'RiskClass') IS NULL
    ALTER TABLE MedicalEquipments ADD RiskClass NVARCHAR(50) NULL;
IF COL_LENGTH('MedicalEquipments', 'Model') IS NULL
    ALTER TABLE MedicalEquipments ADD Model NVARCHAR(500) NULL;
IF COL_LENGTH('MedicalEquipments', 'CountryOfOrigin') IS NULL
    ALTER TABLE MedicalEquipments ADD CountryOfOrigin NVARCHAR(500) NULL;
IF COL_LENGTH('MedicalEquipments', 'YearOfManufacture') IS NULL
    ALTER TABLE MedicalEquipments ADD YearOfManufacture INT NULL;
IF COL_LENGTH('MedicalEquipments', 'PurchaseDate') IS NULL
    ALTER TABLE MedicalEquipments ADD PurchaseDate DATETIME2 NULL;
IF COL_LENGTH('MedicalEquipments', 'PurchasePrice') IS NULL
    ALTER TABLE MedicalEquipments ADD PurchasePrice DECIMAL(18,2) NULL;
IF COL_LENGTH('MedicalEquipments', 'PurchaseSource') IS NULL
    ALTER TABLE MedicalEquipments ADD PurchaseSource NVARCHAR(500) NULL;
IF COL_LENGTH('MedicalEquipments', 'WarrantyExpiry') IS NULL
    ALTER TABLE MedicalEquipments ADD WarrantyExpiry DATETIME2 NULL;
IF COL_LENGTH('MedicalEquipments', 'StatusReason') IS NULL
    ALTER TABLE MedicalEquipments ADD StatusReason NVARCHAR(MAX) NULL;
IF COL_LENGTH('MedicalEquipments', 'LastMaintenanceDate') IS NULL
    ALTER TABLE MedicalEquipments ADD LastMaintenanceDate DATETIME2 NULL;
IF COL_LENGTH('MedicalEquipments', 'NextMaintenanceDate') IS NULL
    ALTER TABLE MedicalEquipments ADD NextMaintenanceDate DATETIME2 NULL;
IF COL_LENGTH('MedicalEquipments', 'LastCalibrationDate') IS NULL
    ALTER TABLE MedicalEquipments ADD LastCalibrationDate DATETIME2 NULL;
IF COL_LENGTH('MedicalEquipments', 'TotalRuntimeHours') IS NULL
    ALTER TABLE MedicalEquipments ADD TotalRuntimeHours INT NULL;
IF COL_LENGTH('MedicalEquipments', 'UsageCount') IS NULL
    ALTER TABLE MedicalEquipments ADD UsageCount INT NULL;
IF COL_LENGTH('MedicalEquipments', 'ExpectedLifeYears') IS NULL
    ALTER TABLE MedicalEquipments ADD ExpectedLifeYears INT NULL;
IF COL_LENGTH('MedicalEquipments', 'CreatedAt') IS NULL
    ALTER TABLE MedicalEquipments ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
GO
PRINT 'MedicalEquipments columns added';
GO

-- =============================================================================
-- 3. MedicalStaffs - Add missing columns
-- =============================================================================
IF COL_LENGTH('MedicalStaffs', 'UserId') IS NULL
    ALTER TABLE MedicalStaffs ADD UserId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('MedicalStaffs', 'HighestDegree') IS NULL
    ALTER TABLE MedicalStaffs ADD HighestDegree NVARCHAR(500) NULL;
IF COL_LENGTH('MedicalStaffs', 'SubSpecialty') IS NULL
    ALTER TABLE MedicalStaffs ADD SubSpecialty NVARCHAR(500) NULL;
IF COL_LENGTH('MedicalStaffs', 'YearsOfExperience') IS NULL
    ALTER TABLE MedicalStaffs ADD YearsOfExperience INT NULL;
IF COL_LENGTH('MedicalStaffs', 'LicenseIssueDate') IS NULL
    ALTER TABLE MedicalStaffs ADD LicenseIssueDate DATE NULL;
IF COL_LENGTH('MedicalStaffs', 'LicenseIssuedBy') IS NULL
    ALTER TABLE MedicalStaffs ADD LicenseIssuedBy NVARCHAR(500) NULL;
IF COL_LENGTH('MedicalStaffs', 'LicenseActive') IS NULL
    ALTER TABLE MedicalStaffs ADD LicenseActive BIT NOT NULL DEFAULT 1;
IF COL_LENGTH('MedicalStaffs', 'SecondaryDepartmentId') IS NULL
    ALTER TABLE MedicalStaffs ADD SecondaryDepartmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('MedicalStaffs', 'PersonalPhone') IS NULL
    ALTER TABLE MedicalStaffs ADD PersonalPhone NVARCHAR(50) NULL;
IF COL_LENGTH('MedicalStaffs', 'WorkPhone') IS NULL
    ALTER TABLE MedicalStaffs ADD WorkPhone NVARCHAR(50) NULL;
IF COL_LENGTH('MedicalStaffs', 'PersonalEmail') IS NULL
    ALTER TABLE MedicalStaffs ADD PersonalEmail NVARCHAR(500) NULL;
IF COL_LENGTH('MedicalStaffs', 'JoinDate') IS NULL
    ALTER TABLE MedicalStaffs ADD JoinDate DATETIME2 NULL;
IF COL_LENGTH('MedicalStaffs', 'TerminationDate') IS NULL
    ALTER TABLE MedicalStaffs ADD TerminationDate DATETIME2 NULL;
IF COL_LENGTH('MedicalStaffs', 'CreatedAt') IS NULL
    ALTER TABLE MedicalStaffs ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
GO
PRINT 'MedicalStaffs columns added';
GO

-- =============================================================================
-- 4. LabRequests - Create table if missing (needed by LabResults FK)
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LabRequests')
BEGIN
    CREATE TABLE LabRequests (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        RequestCode NVARCHAR(500) NOT NULL DEFAULT '',
        ExaminationId UNIQUEIDENTIFIER NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        MedicalRecordId UNIQUEIDENTIFIER NULL,
        RequestingDoctorId UNIQUEIDENTIFIER NOT NULL,
        RoomId UNIQUEIDENTIFIER NULL,
        DepartmentId UNIQUEIDENTIFIER NULL,
        RequestDate DATETIME2 NOT NULL DEFAULT GETDATE(),
        Priority INT NOT NULL DEFAULT 1,
        Status INT NOT NULL DEFAULT 0,
        DiagnosisCode NVARCHAR(500) NULL,
        DiagnosisName NVARCHAR(500) NULL,
        ClinicalInfo NVARCHAR(MAX) NULL,
        PatientType INT NOT NULL DEFAULT 1,
        InsuranceNumber NVARCHAR(500) NULL,
        TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        InsuranceAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        PatientAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        IsPaid BIT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        CancelledBy NVARCHAR(500) NULL,
        CancelledAt DATETIME2 NULL,
        CancellationReason NVARCHAR(MAX) NULL,
        ApprovedAt DATETIME2 NULL,
        ApprovedBy UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created LabRequests table';
END
ELSE
    PRINT 'LabRequests table already exists';
GO

-- =============================================================================
-- 5. LabRequestItems - Create table if missing (needed by LabResults FK)
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LabRequestItems')
BEGIN
    CREATE TABLE LabRequestItems (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        LabRequestId UNIQUEIDENTIFIER NOT NULL,
        ServiceId UNIQUEIDENTIFIER NOT NULL,
        TestCode NVARCHAR(500) NOT NULL DEFAULT '',
        TestName NVARCHAR(500) NOT NULL DEFAULT '',
        SampleType NVARCHAR(500) NULL,
        SampleBarcode NVARCHAR(500) NULL,
        SampleLocation NVARCHAR(500) NULL,
        SampleCondition NVARCHAR(500) NULL,
        SampleCollectedAt DATETIME2 NULL,
        SampleCollectedBy UNIQUEIDENTIFIER NULL,
        ProcessingStartAt DATETIME2 NULL,
        ProcessingEndAt DATETIME2 NULL,
        ProcessedBy UNIQUEIDENTIFIER NULL,
        Status INT NOT NULL DEFAULT 0,
        UnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
        InsurancePrice DECIMAL(18,2) NOT NULL DEFAULT 0,
        PatientPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
        ApprovedAt DATETIME2 NULL,
        ApprovedBy UNIQUEIDENTIFIER NULL,
        RejectedAt DATETIME2 NULL,
        RejectedBy UNIQUEIDENTIFIER NULL,
        RejectionReason NVARCHAR(MAX) NULL,
        Notes NVARCHAR(MAX) NULL,
        TechnicianNote NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_LabRequestItems_LabRequests FOREIGN KEY (LabRequestId) REFERENCES LabRequests(Id)
    );
    PRINT 'Created LabRequestItems table';
END
ELSE
    PRINT 'LabRequestItems table already exists';
GO

-- =============================================================================
-- 6. LabResults - Create table if missing
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LabResults')
BEGIN
    CREATE TABLE LabResults (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        LabRequestItemId UNIQUEIDENTIFIER NOT NULL,
        ParameterCode NVARCHAR(500) NOT NULL DEFAULT '',
        ParameterName NVARCHAR(500) NOT NULL DEFAULT '',
        SequenceNumber INT NOT NULL DEFAULT 0,
        Result NVARCHAR(MAX) NULL,
        ResultValue NVARCHAR(500) NULL,
        ResultDate DATETIME2 NULL,
        Status INT NOT NULL DEFAULT 0,
        NumericResult DECIMAL(18,4) NULL,
        TextResult NVARCHAR(MAX) NULL,
        Unit NVARCHAR(500) NULL,
        ReferenceMin DECIMAL(18,4) NULL,
        ReferenceMax DECIMAL(18,4) NULL,
        ReferenceRange NVARCHAR(500) NULL,
        ReferenceText NVARCHAR(MAX) NULL,
        IsAbnormal BIT NOT NULL DEFAULT 0,
        AbnormalType INT NULL,
        MachineCode NVARCHAR(500) NULL,
        MachineName NVARCHAR(500) NULL,
        MethodName NVARCHAR(500) NULL,
        ResultedAt DATETIME2 NULL,
        ResultedBy UNIQUEIDENTIFIER NULL,
        ApprovedAt DATETIME2 NULL,
        ApprovedBy UNIQUEIDENTIFIER NULL,
        IsCritical BIT NOT NULL DEFAULT 0,
        RequiresFollowUp BIT NOT NULL DEFAULT 0,
        Notes NVARCHAR(MAX) NULL,
        InterpretationNote NVARCHAR(MAX) NULL,
        PreviousResult NVARCHAR(500) NULL,
        PreviousResultDate DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_LabResults_LabRequestItems FOREIGN KEY (LabRequestItemId) REFERENCES LabRequestItems(Id)
    );
    PRINT 'Created LabResults table';
END
ELSE
    PRINT 'LabResults table already exists';
GO

-- =============================================================================
-- 7. Notifications - Create table if missing (used by Portal dashboard)
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
BEGIN
    CREATE TABLE Notifications (
        Id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
        Title NVARCHAR(500) NOT NULL DEFAULT '',
        Content NVARCHAR(MAX) NOT NULL DEFAULT '',
        NotificationType NVARCHAR(500) NOT NULL DEFAULT 'Info',
        TargetUserId UNIQUEIDENTIFIER NULL,
        TargetRoleId UNIQUEIDENTIFIER NULL,
        IsRead BIT NOT NULL DEFAULT 0,
        ReadAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE(),
        CreatedBy UNIQUEIDENTIFIER NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy UNIQUEIDENTIFIER NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    PRINT 'Created Notifications table';
END
ELSE
    PRINT 'Notifications table already exists';
GO

PRINT 'All missing columns and tables have been created successfully.';
GO
