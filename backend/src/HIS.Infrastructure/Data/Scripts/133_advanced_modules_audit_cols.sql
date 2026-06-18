-- ============================================================
-- 133_advanced_modules_audit_cols.sql
-- Bổ sung cột audit (CreatedAt/CreatedBy/UpdatedAt/UpdatedBy)
-- cho các bảng mảng advanced còn thiếu:
--   CommunityHealth, PublicHealth, Forensic modules
-- Idempotent: dùng IF COL_LENGTH IS NULL guard
-- NVARCHAR(450) theo pattern migration 112
-- ============================================================

-- ============================================================
-- COMMUNITY HEALTH MODULE
-- ============================================================

-- HouseholdHealthRecords
IF COL_LENGTH('HouseholdHealthRecords', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE HouseholdHealthRecords ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ HouseholdHealthRecords.CreatedAt added';
END;
IF COL_LENGTH('HouseholdHealthRecords', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE HouseholdHealthRecords ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ HouseholdHealthRecords.CreatedBy added';
END;
IF COL_LENGTH('HouseholdHealthRecords', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE HouseholdHealthRecords ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ HouseholdHealthRecords.UpdatedAt added';
END;
IF COL_LENGTH('HouseholdHealthRecords', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE HouseholdHealthRecords ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ HouseholdHealthRecords.UpdatedBy added';
END;

-- NcdScreenings
IF COL_LENGTH('NcdScreenings', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE NcdScreenings ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ NcdScreenings.CreatedAt added';
END;
IF COL_LENGTH('NcdScreenings', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE NcdScreenings ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ NcdScreenings.CreatedBy added';
END;
IF COL_LENGTH('NcdScreenings', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE NcdScreenings ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ NcdScreenings.UpdatedAt added';
END;
IF COL_LENGTH('NcdScreenings', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE NcdScreenings ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ NcdScreenings.UpdatedBy added';
END;

-- CommunityHealthTeams
IF COL_LENGTH('CommunityHealthTeams', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE CommunityHealthTeams ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ CommunityHealthTeams.CreatedAt added';
END;
IF COL_LENGTH('CommunityHealthTeams', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE CommunityHealthTeams ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ CommunityHealthTeams.CreatedBy added';
END;
IF COL_LENGTH('CommunityHealthTeams', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE CommunityHealthTeams ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ CommunityHealthTeams.UpdatedAt added';
END;
IF COL_LENGTH('CommunityHealthTeams', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE CommunityHealthTeams ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ CommunityHealthTeams.UpdatedBy added';
END;

-- ============================================================
-- PUBLIC HEALTH MODULE
-- ============================================================

-- HealthCheckups (CreatedAt có thể đã có từ BaseEntity migration cũ, guard bảo vệ)
IF COL_LENGTH('HealthCheckups', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE HealthCheckups ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ HealthCheckups.CreatedAt added';
END;
IF COL_LENGTH('HealthCheckups', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE HealthCheckups ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ HealthCheckups.CreatedBy added';
END;
IF COL_LENGTH('HealthCheckups', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE HealthCheckups ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ HealthCheckups.UpdatedAt added';
END;
IF COL_LENGTH('HealthCheckups', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE HealthCheckups ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ HealthCheckups.UpdatedBy added';
END;

-- VaccinationRecords
IF COL_LENGTH('VaccinationRecords', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE VaccinationRecords ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ VaccinationRecords.CreatedAt added';
END;
IF COL_LENGTH('VaccinationRecords', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE VaccinationRecords ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ VaccinationRecords.CreatedBy added';
END;
IF COL_LENGTH('VaccinationRecords', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE VaccinationRecords ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ VaccinationRecords.UpdatedAt added';
END;
IF COL_LENGTH('VaccinationRecords', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE VaccinationRecords ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ VaccinationRecords.UpdatedBy added';
END;

-- VaccinationCampaigns
IF COL_LENGTH('VaccinationCampaigns', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE VaccinationCampaigns ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ VaccinationCampaigns.CreatedAt added';
END;
IF COL_LENGTH('VaccinationCampaigns', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE VaccinationCampaigns ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ VaccinationCampaigns.CreatedBy added';
END;
IF COL_LENGTH('VaccinationCampaigns', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE VaccinationCampaigns ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ VaccinationCampaigns.UpdatedAt added';
END;
IF COL_LENGTH('VaccinationCampaigns', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE VaccinationCampaigns ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ VaccinationCampaigns.UpdatedBy added';
END;

-- DiseaseReports
IF COL_LENGTH('DiseaseReports', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE DiseaseReports ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ DiseaseReports.CreatedAt added';
END;
IF COL_LENGTH('DiseaseReports', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE DiseaseReports ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ DiseaseReports.CreatedBy added';
END;
IF COL_LENGTH('DiseaseReports', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE DiseaseReports ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ DiseaseReports.UpdatedAt added';
END;
IF COL_LENGTH('DiseaseReports', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE DiseaseReports ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ DiseaseReports.UpdatedBy added';
END;

-- OutbreakEvents
IF COL_LENGTH('OutbreakEvents', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE OutbreakEvents ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ OutbreakEvents.CreatedAt added';
END;
IF COL_LENGTH('OutbreakEvents', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE OutbreakEvents ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ OutbreakEvents.CreatedBy added';
END;
IF COL_LENGTH('OutbreakEvents', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE OutbreakEvents ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ OutbreakEvents.UpdatedAt added';
END;
IF COL_LENGTH('OutbreakEvents', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE OutbreakEvents ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ OutbreakEvents.UpdatedBy added';
END;

-- SchoolHealthExams
IF COL_LENGTH('SchoolHealthExams', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE SchoolHealthExams ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ SchoolHealthExams.CreatedAt added';
END;
IF COL_LENGTH('SchoolHealthExams', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE SchoolHealthExams ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ SchoolHealthExams.CreatedBy added';
END;
IF COL_LENGTH('SchoolHealthExams', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE SchoolHealthExams ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ SchoolHealthExams.UpdatedAt added';
END;
IF COL_LENGTH('SchoolHealthExams', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE SchoolHealthExams ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ SchoolHealthExams.UpdatedBy added';
END;

-- OccupationalHealthExams
IF COL_LENGTH('OccupationalHealthExams', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE OccupationalHealthExams ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ OccupationalHealthExams.CreatedAt added';
END;
IF COL_LENGTH('OccupationalHealthExams', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE OccupationalHealthExams ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ OccupationalHealthExams.CreatedBy added';
END;
IF COL_LENGTH('OccupationalHealthExams', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE OccupationalHealthExams ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ OccupationalHealthExams.UpdatedAt added';
END;
IF COL_LENGTH('OccupationalHealthExams', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE OccupationalHealthExams ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ OccupationalHealthExams.UpdatedBy added';
END;

-- MethadonePatients
IF COL_LENGTH('MethadonePatients', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE MethadonePatients ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ MethadonePatients.CreatedAt added';
END;
IF COL_LENGTH('MethadonePatients', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE MethadonePatients ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ MethadonePatients.CreatedBy added';
END;
IF COL_LENGTH('MethadonePatients', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE MethadonePatients ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ MethadonePatients.UpdatedAt added';
END;
IF COL_LENGTH('MethadonePatients', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE MethadonePatients ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ MethadonePatients.UpdatedBy added';
END;

-- MethadoneDosingRecords
IF COL_LENGTH('MethadoneDosingRecords', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE MethadoneDosingRecords ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ MethadoneDosingRecords.CreatedAt added';
END;
IF COL_LENGTH('MethadoneDosingRecords', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE MethadoneDosingRecords ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ MethadoneDosingRecords.CreatedBy added';
END;
IF COL_LENGTH('MethadoneDosingRecords', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE MethadoneDosingRecords ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ MethadoneDosingRecords.UpdatedAt added';
END;
IF COL_LENGTH('MethadoneDosingRecords', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE MethadoneDosingRecords ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ MethadoneDosingRecords.UpdatedBy added';
END;

-- MethadoneUrineTests
IF COL_LENGTH('MethadoneUrineTests', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE MethadoneUrineTests ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ MethadoneUrineTests.CreatedAt added';
END;
IF COL_LENGTH('MethadoneUrineTests', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE MethadoneUrineTests ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ MethadoneUrineTests.CreatedBy added';
END;
IF COL_LENGTH('MethadoneUrineTests', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE MethadoneUrineTests ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ MethadoneUrineTests.UpdatedAt added';
END;
IF COL_LENGTH('MethadoneUrineTests', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE MethadoneUrineTests ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ MethadoneUrineTests.UpdatedBy added';
END;

-- ============================================================
-- FORENSIC MODULE
-- ============================================================

-- ForensicCases
IF COL_LENGTH('ForensicCases', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE ForensicCases ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ ForensicCases.CreatedAt added';
END;
IF COL_LENGTH('ForensicCases', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE ForensicCases ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ ForensicCases.CreatedBy added';
END;
IF COL_LENGTH('ForensicCases', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE ForensicCases ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ ForensicCases.UpdatedAt added';
END;
IF COL_LENGTH('ForensicCases', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE ForensicCases ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ ForensicCases.UpdatedBy added';
END;

-- ForensicExaminations
IF COL_LENGTH('ForensicExaminations', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE ForensicExaminations ADD CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME();
    PRINT '+ ForensicExaminations.CreatedAt added';
END;
IF COL_LENGTH('ForensicExaminations', 'CreatedBy') IS NULL
BEGIN
    ALTER TABLE ForensicExaminations ADD CreatedBy NVARCHAR(450) NULL;
    PRINT '+ ForensicExaminations.CreatedBy added';
END;
IF COL_LENGTH('ForensicExaminations', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE ForensicExaminations ADD UpdatedAt DATETIME2 NULL;
    PRINT '+ ForensicExaminations.UpdatedAt added';
END;
IF COL_LENGTH('ForensicExaminations', 'UpdatedBy') IS NULL
BEGIN
    ALTER TABLE ForensicExaminations ADD UpdatedBy NVARCHAR(450) NULL;
    PRINT '+ ForensicExaminations.UpdatedBy added';
END;
