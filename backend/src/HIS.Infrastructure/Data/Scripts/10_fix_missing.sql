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
-- 4-6. LabRequests / LabRequestItems / LabResults — #14e (2026-06-11): ĐÃ GỠ.
-- Model 2 CLS chết; bảng bị drop ở 91_drop_lab_model2_tables.sql. KHÔNG tái tạo ở đây
-- (script chạy lại mỗi startup — tái tạo rồi 91 drop lại là lãng phí + dễ nhầm lẫn).
-- =============================================================================

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
