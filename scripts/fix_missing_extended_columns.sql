-- =============================================================================
-- Fix Missing Columns for Extended Workflow Tables
-- Idempotent: uses COL_LENGTH IS NULL checks on each column
--
-- Tables covered:
--   1. HAICases
--   2. IsolationOrders
--   3. RehabReferrals
--   4. RepairRequests
--   5. IncidentReports
--   6. CAPAs
--   7. NutritionScreenings
--   8. RehabSessions
--   9. RehabTreatmentPlans
--  10. Outbreaks (dependency of HAICases)
--  11. HandHygieneObservations
--  12. AntibioticStewardships
--  13. FunctionalAssessments
--  14. MedicalEquipments
--  15. MaintenanceRecords
--  16. CalibrationRecords
--  17. QualityIndicators
--  18. QualityIndicatorValues
--  19. AuditPlans
--  20. SatisfactionSurveys
--  21. OutbreakCases
-- =============================================================================

USE [HIS];
GO

PRINT '=== Starting fix_missing_extended_columns.sql ===';
GO

-- =============================================================================
-- 1. HAICases - All entity properties
-- Entity: HAICase : BaseEntity
-- =============================================================================
PRINT '-- Checking HAICases columns...';
IF COL_LENGTH('dbo.HAICases', 'CaseCode') IS NULL
    ALTER TABLE dbo.HAICases ADD CaseCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.HAICases', 'AdmissionId') IS NULL
    ALTER TABLE dbo.HAICases ADD AdmissionId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HAICases', 'PatientId') IS NULL
    ALTER TABLE dbo.HAICases ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HAICases', 'OnsetDate') IS NULL
    ALTER TABLE dbo.HAICases ADD OnsetDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.HAICases', 'ReportedById') IS NULL
    ALTER TABLE dbo.HAICases ADD ReportedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HAICases', 'InfectionType') IS NULL
    ALTER TABLE dbo.HAICases ADD InfectionType NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.HAICases', 'InfectionSite') IS NULL
    ALTER TABLE dbo.HAICases ADD InfectionSite NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.HAICases', 'Organism') IS NULL
    ALTER TABLE dbo.HAICases ADD Organism NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HAICases', 'IsMDRO') IS NULL
    ALTER TABLE dbo.HAICases ADD IsMDRO BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.HAICases', 'ResistancePattern') IS NULL
    ALTER TABLE dbo.HAICases ADD ResistancePattern NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.HAICases', 'IsDeviceAssociated') IS NULL
    ALTER TABLE dbo.HAICases ADD IsDeviceAssociated BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.HAICases', 'DeviceType') IS NULL
    ALTER TABLE dbo.HAICases ADD DeviceType NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HAICases', 'DeviceDays') IS NULL
    ALTER TABLE dbo.HAICases ADD DeviceDays INT NULL DEFAULT 0;
IF COL_LENGTH('dbo.HAICases', 'Status') IS NULL
    ALTER TABLE dbo.HAICases ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Suspected';
IF COL_LENGTH('dbo.HAICases', 'ConfirmedDate') IS NULL
    ALTER TABLE dbo.HAICases ADD ConfirmedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.HAICases', 'ResolvedDate') IS NULL
    ALTER TABLE dbo.HAICases ADD ResolvedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.HAICases', 'Outcome') IS NULL
    ALTER TABLE dbo.HAICases ADD Outcome NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.HAICases', 'Notes') IS NULL
    ALTER TABLE dbo.HAICases ADD Notes NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.HAICases', 'IsInvestigated') IS NULL
    ALTER TABLE dbo.HAICases ADD IsInvestigated BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.HAICases', 'RootCause') IS NULL
    ALTER TABLE dbo.HAICases ADD RootCause NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.HAICases', 'ContributingFactors') IS NULL
    ALTER TABLE dbo.HAICases ADD ContributingFactors NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.HAICases', 'PreventiveMeasures') IS NULL
    ALTER TABLE dbo.HAICases ADD PreventiveMeasures NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.HAICases', 'OutbreakId') IS NULL
    ALTER TABLE dbo.HAICases ADD OutbreakId UNIQUEIDENTIFIER NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.HAICases', 'CreatedAt') IS NULL
    ALTER TABLE dbo.HAICases ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.HAICases', 'CreatedBy') IS NULL
    ALTER TABLE dbo.HAICases ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HAICases', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.HAICases ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.HAICases', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.HAICases ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HAICases', 'IsDeleted') IS NULL
    ALTER TABLE dbo.HAICases ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'HAICases columns checked/added';
GO

-- =============================================================================
-- 2. IsolationOrders - All entity properties
-- Entity: IsolationOrder : BaseEntity
-- =============================================================================
PRINT '-- Checking IsolationOrders columns...';
IF COL_LENGTH('dbo.IsolationOrders', 'OrderCode') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD OrderCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.IsolationOrders', 'HAICaseId') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD HAICaseId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'AdmissionId') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD AdmissionId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'PatientId') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'OrderedById') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD OrderedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'IsolationType') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD IsolationType NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.IsolationOrders', 'Precautions') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD Precautions NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'Reason') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD Reason NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.IsolationOrders', 'StartDate') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD StartDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.IsolationOrders', 'EndDate') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD EndDate DATETIME2 NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'Status') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Active';
IF COL_LENGTH('dbo.IsolationOrders', 'RequiresGown') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD RequiresGown BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.IsolationOrders', 'RequiresGloves') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD RequiresGloves BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.IsolationOrders', 'RequiresMask') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD RequiresMask BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.IsolationOrders', 'RequiresN95') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD RequiresN95 BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.IsolationOrders', 'RequiresEyeProtection') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD RequiresEyeProtection BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.IsolationOrders', 'RequiresNegativePressure') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD RequiresNegativePressure BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.IsolationOrders', 'SpecialInstructions') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD SpecialInstructions NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'DiscontinuationReason') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD DiscontinuationReason NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.IsolationOrders', 'CreatedAt') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.IsolationOrders', 'CreatedBy') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IsolationOrders', 'IsDeleted') IS NULL
    ALTER TABLE dbo.IsolationOrders ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'IsolationOrders columns checked/added';
GO

-- =============================================================================
-- 3. RehabReferrals - All entity properties
-- Entity: RehabReferral : BaseEntity
-- =============================================================================
PRINT '-- Checking RehabReferrals columns...';
IF COL_LENGTH('dbo.RehabReferrals', 'ReferralCode') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD ReferralCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RehabReferrals', 'PatientId') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'AdmissionId') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD AdmissionId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'ExaminationId') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD ExaminationId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'ReferredById') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD ReferredById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'AcceptedById') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD AcceptedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'RehabType') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD RehabType NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RehabReferrals', 'Diagnosis') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD Diagnosis NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RehabReferrals', 'IcdCode') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD IcdCode NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'Reason') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD Reason NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RehabReferrals', 'Goals') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD Goals NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'Precautions') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD Precautions NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'Status') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Pending';
IF COL_LENGTH('dbo.RehabReferrals', 'AcceptedDate') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD AcceptedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'DeclineReason') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD DeclineReason NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.RehabReferrals', 'CreatedAt') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.RehabReferrals', 'CreatedBy') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabReferrals', 'IsDeleted') IS NULL
    ALTER TABLE dbo.RehabReferrals ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'RehabReferrals columns checked/added';
GO

-- =============================================================================
-- 4. RepairRequests - All entity properties
-- Entity: RepairRequest : BaseEntity
-- =============================================================================
PRINT '-- Checking RepairRequests columns...';
IF COL_LENGTH('dbo.RepairRequests', 'RequestCode') IS NULL
    ALTER TABLE dbo.RepairRequests ADD RequestCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RepairRequests', 'EquipmentId') IS NULL
    ALTER TABLE dbo.RepairRequests ADD EquipmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RepairRequests', 'RequestedById') IS NULL
    ALTER TABLE dbo.RepairRequests ADD RequestedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RepairRequests', 'DepartmentId') IS NULL
    ALTER TABLE dbo.RepairRequests ADD DepartmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RepairRequests', 'RequestDate') IS NULL
    ALTER TABLE dbo.RepairRequests ADD RequestDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.RepairRequests', 'ProblemDescription') IS NULL
    ALTER TABLE dbo.RepairRequests ADD ProblemDescription NVARCHAR(MAX) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RepairRequests', 'Priority') IS NULL
    ALTER TABLE dbo.RepairRequests ADD Priority NVARCHAR(500) NOT NULL DEFAULT 'Normal';
IF COL_LENGTH('dbo.RepairRequests', 'Status') IS NULL
    ALTER TABLE dbo.RepairRequests ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Pending';
IF COL_LENGTH('dbo.RepairRequests', 'AssignedToId') IS NULL
    ALTER TABLE dbo.RepairRequests ADD AssignedToId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RepairRequests', 'AssignedDate') IS NULL
    ALTER TABLE dbo.RepairRequests ADD AssignedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.RepairRequests', 'StartedDate') IS NULL
    ALTER TABLE dbo.RepairRequests ADD StartedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.RepairRequests', 'CompletedDate') IS NULL
    ALTER TABLE dbo.RepairRequests ADD CompletedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.RepairRequests', 'DiagnosisFindings') IS NULL
    ALTER TABLE dbo.RepairRequests ADD DiagnosisFindings NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RepairRequests', 'RepairActions') IS NULL
    ALTER TABLE dbo.RepairRequests ADD RepairActions NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RepairRequests', 'PartsUsed') IS NULL
    ALTER TABLE dbo.RepairRequests ADD PartsUsed NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RepairRequests', 'PartsCost') IS NULL
    ALTER TABLE dbo.RepairRequests ADD PartsCost DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.RepairRequests', 'LaborCost') IS NULL
    ALTER TABLE dbo.RepairRequests ADD LaborCost DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.RepairRequests', 'ExternalServiceCost') IS NULL
    ALTER TABLE dbo.RepairRequests ADD ExternalServiceCost DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.RepairRequests', 'TotalCost') IS NULL
    ALTER TABLE dbo.RepairRequests ADD TotalCost DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.RepairRequests', 'IsRepaired') IS NULL
    ALTER TABLE dbo.RepairRequests ADD IsRepaired BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.RepairRequests', 'UnrepairableReason') IS NULL
    ALTER TABLE dbo.RepairRequests ADD UnrepairableReason NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RepairRequests', 'RecommendReplacement') IS NULL
    ALTER TABLE dbo.RepairRequests ADD RecommendReplacement BIT NOT NULL DEFAULT 0;
-- BaseEntity fields
IF COL_LENGTH('dbo.RepairRequests', 'CreatedAt') IS NULL
    ALTER TABLE dbo.RepairRequests ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.RepairRequests', 'CreatedBy') IS NULL
    ALTER TABLE dbo.RepairRequests ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RepairRequests', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.RepairRequests ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.RepairRequests', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.RepairRequests ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RepairRequests', 'IsDeleted') IS NULL
    ALTER TABLE dbo.RepairRequests ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'RepairRequests columns checked/added';
GO

-- =============================================================================
-- 5. IncidentReports - All entity properties
-- Entity: IncidentReport : BaseEntity
-- =============================================================================
PRINT '-- Checking IncidentReports columns...';
IF COL_LENGTH('dbo.IncidentReports', 'ReportCode') IS NULL
    ALTER TABLE dbo.IncidentReports ADD ReportCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.IncidentReports', 'IncidentDate') IS NULL
    ALTER TABLE dbo.IncidentReports ADD IncidentDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.IncidentReports', 'ReportDate') IS NULL
    ALTER TABLE dbo.IncidentReports ADD ReportDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.IncidentReports', 'ReportedById') IS NULL
    ALTER TABLE dbo.IncidentReports ADD ReportedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IncidentReports', 'DepartmentId') IS NULL
    ALTER TABLE dbo.IncidentReports ADD DepartmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IncidentReports', 'PatientId') IS NULL
    ALTER TABLE dbo.IncidentReports ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IncidentReports', 'IncidentType') IS NULL
    ALTER TABLE dbo.IncidentReports ADD IncidentType NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.IncidentReports', 'Severity') IS NULL
    ALTER TABLE dbo.IncidentReports ADD Severity NVARCHAR(500) NOT NULL DEFAULT 'Minor';
IF COL_LENGTH('dbo.IncidentReports', 'HarmLevel') IS NULL
    ALTER TABLE dbo.IncidentReports ADD HarmLevel NVARCHAR(500) NOT NULL DEFAULT 'None';
IF COL_LENGTH('dbo.IncidentReports', 'Description') IS NULL
    ALTER TABLE dbo.IncidentReports ADD Description NVARCHAR(MAX) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.IncidentReports', 'ImmediateActions') IS NULL
    ALTER TABLE dbo.IncidentReports ADD ImmediateActions NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.IncidentReports', 'ContributingFactors') IS NULL
    ALTER TABLE dbo.IncidentReports ADD ContributingFactors NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.IncidentReports', 'Status') IS NULL
    ALTER TABLE dbo.IncidentReports ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Reported';
IF COL_LENGTH('dbo.IncidentReports', 'InvestigatorId') IS NULL
    ALTER TABLE dbo.IncidentReports ADD InvestigatorId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IncidentReports', 'InvestigationStartDate') IS NULL
    ALTER TABLE dbo.IncidentReports ADD InvestigationStartDate DATETIME2 NULL;
IF COL_LENGTH('dbo.IncidentReports', 'InvestigationEndDate') IS NULL
    ALTER TABLE dbo.IncidentReports ADD InvestigationEndDate DATETIME2 NULL;
IF COL_LENGTH('dbo.IncidentReports', 'RootCause') IS NULL
    ALTER TABLE dbo.IncidentReports ADD RootCause NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.IncidentReports', 'RCAMethod') IS NULL
    ALTER TABLE dbo.IncidentReports ADD RCAMethod NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.IncidentReports', 'IsAnonymous') IS NULL
    ALTER TABLE dbo.IncidentReports ADD IsAnonymous BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.IncidentReports', 'ReportedToAuthority') IS NULL
    ALTER TABLE dbo.IncidentReports ADD ReportedToAuthority BIT NOT NULL DEFAULT 0;
-- BaseEntity fields
IF COL_LENGTH('dbo.IncidentReports', 'CreatedAt') IS NULL
    ALTER TABLE dbo.IncidentReports ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.IncidentReports', 'CreatedBy') IS NULL
    ALTER TABLE dbo.IncidentReports ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IncidentReports', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.IncidentReports ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.IncidentReports', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.IncidentReports ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.IncidentReports', 'IsDeleted') IS NULL
    ALTER TABLE dbo.IncidentReports ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'IncidentReports columns checked/added';
GO

-- =============================================================================
-- 6. CAPAs - All entity properties
-- Entity: CAPA : BaseEntity
-- =============================================================================
PRINT '-- Checking CAPAs columns...';
IF COL_LENGTH('dbo.CAPAs', 'CAPACode') IS NULL
    ALTER TABLE dbo.CAPAs ADD CAPACode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.CAPAs', 'IncidentReportId') IS NULL
    ALTER TABLE dbo.CAPAs ADD IncidentReportId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CAPAs', 'AuditFindingId') IS NULL
    ALTER TABLE dbo.CAPAs ADD AuditFindingId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CAPAs', 'Source') IS NULL
    ALTER TABLE dbo.CAPAs ADD Source NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.CAPAs', 'Type') IS NULL
    ALTER TABLE dbo.CAPAs ADD Type NVARCHAR(500) NOT NULL DEFAULT 'Corrective';
IF COL_LENGTH('dbo.CAPAs', 'ActionDescription') IS NULL
    ALTER TABLE dbo.CAPAs ADD ActionDescription NVARCHAR(MAX) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.CAPAs', 'ExpectedOutcome') IS NULL
    ALTER TABLE dbo.CAPAs ADD ExpectedOutcome NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.CAPAs', 'AssignedToId') IS NULL
    ALTER TABLE dbo.CAPAs ADD AssignedToId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CAPAs', 'DueDate') IS NULL
    ALTER TABLE dbo.CAPAs ADD DueDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.CAPAs', 'CompletedDate') IS NULL
    ALTER TABLE dbo.CAPAs ADD CompletedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.CAPAs', 'Status') IS NULL
    ALTER TABLE dbo.CAPAs ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Open';
IF COL_LENGTH('dbo.CAPAs', 'Priority') IS NULL
    ALTER TABLE dbo.CAPAs ADD Priority NVARCHAR(500) NOT NULL DEFAULT 'Medium';
IF COL_LENGTH('dbo.CAPAs', 'IsEffective') IS NULL
    ALTER TABLE dbo.CAPAs ADD IsEffective BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.CAPAs', 'VerifiedById') IS NULL
    ALTER TABLE dbo.CAPAs ADD VerifiedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CAPAs', 'VerifiedDate') IS NULL
    ALTER TABLE dbo.CAPAs ADD VerifiedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.CAPAs', 'VerificationNotes') IS NULL
    ALTER TABLE dbo.CAPAs ADD VerificationNotes NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.CAPAs', 'CreatedAt') IS NULL
    ALTER TABLE dbo.CAPAs ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.CAPAs', 'CreatedBy') IS NULL
    ALTER TABLE dbo.CAPAs ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CAPAs', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.CAPAs ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.CAPAs', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.CAPAs ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CAPAs', 'IsDeleted') IS NULL
    ALTER TABLE dbo.CAPAs ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'CAPAs columns checked/added';
GO

-- =============================================================================
-- 7. NutritionScreenings - All entity properties
-- Entity: NutritionScreening : BaseEntity
-- =============================================================================
PRINT '-- Checking NutritionScreenings columns...';
IF COL_LENGTH('dbo.NutritionScreenings', 'AdmissionId') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD AdmissionId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'PatientId') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'ScreeningDate') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD ScreeningDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.NutritionScreenings', 'ScreenedById') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD ScreenedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'Weight') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD Weight DECIMAL(18,2) NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.NutritionScreenings', 'Height') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD Height DECIMAL(18,2) NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.NutritionScreenings', 'BMI') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD BMI DECIMAL(18,2) NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.NutritionScreenings', 'WeightLossPercent') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD WeightLossPercent DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'WeightLossPeriodWeeks') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD WeightLossPeriodWeeks INT NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'NutritionScore') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD NutritionScore INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.NutritionScreenings', 'DiseaseScore') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD DiseaseScore INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.NutritionScreenings', 'AgeScore') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD AgeScore INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.NutritionScreenings', 'TotalScore') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD TotalScore INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.NutritionScreenings', 'SGACategory') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD SGACategory NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'RiskLevel') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD RiskLevel NVARCHAR(500) NOT NULL DEFAULT 'Low';
IF COL_LENGTH('dbo.NutritionScreenings', 'RequiresIntervention') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD RequiresIntervention BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.NutritionScreenings', 'Notes') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD Notes NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.NutritionScreenings', 'CreatedAt') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.NutritionScreenings', 'CreatedBy') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.NutritionScreenings', 'IsDeleted') IS NULL
    ALTER TABLE dbo.NutritionScreenings ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'NutritionScreenings columns checked/added';
GO

-- =============================================================================
-- 8. RehabSessions - All entity properties
-- Entity: RehabSession : BaseEntity
-- =============================================================================
PRINT '-- Checking RehabSessions columns...';
IF COL_LENGTH('dbo.RehabSessions', 'TreatmentPlanId') IS NULL
    ALTER TABLE dbo.RehabSessions ADD TreatmentPlanId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabSessions', 'SessionNumber') IS NULL
    ALTER TABLE dbo.RehabSessions ADD SessionNumber INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.RehabSessions', 'SessionDate') IS NULL
    ALTER TABLE dbo.RehabSessions ADD SessionDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.RehabSessions', 'StartTime') IS NULL
    ALTER TABLE dbo.RehabSessions ADD StartTime TIME NOT NULL DEFAULT '00:00:00';
IF COL_LENGTH('dbo.RehabSessions', 'EndTime') IS NULL
    ALTER TABLE dbo.RehabSessions ADD EndTime TIME NULL;
IF COL_LENGTH('dbo.RehabSessions', 'DurationMinutes') IS NULL
    ALTER TABLE dbo.RehabSessions ADD DurationMinutes INT NULL;
IF COL_LENGTH('dbo.RehabSessions', 'TherapistId') IS NULL
    ALTER TABLE dbo.RehabSessions ADD TherapistId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabSessions', 'Status') IS NULL
    ALTER TABLE dbo.RehabSessions ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Scheduled';
IF COL_LENGTH('dbo.RehabSessions', 'InterventionsProvided') IS NULL
    ALTER TABLE dbo.RehabSessions ADD InterventionsProvided NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabSessions', 'ExercisesPerformed') IS NULL
    ALTER TABLE dbo.RehabSessions ADD ExercisesPerformed NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabSessions', 'ModalitiesUsed') IS NULL
    ALTER TABLE dbo.RehabSessions ADD ModalitiesUsed NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.RehabSessions', 'PatientResponse') IS NULL
    ALTER TABLE dbo.RehabSessions ADD PatientResponse NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabSessions', 'ProgressNotes') IS NULL
    ALTER TABLE dbo.RehabSessions ADD ProgressNotes NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabSessions', 'GoalProgress') IS NULL
    ALTER TABLE dbo.RehabSessions ADD GoalProgress NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.RehabSessions', 'CancellationReason') IS NULL
    ALTER TABLE dbo.RehabSessions ADD CancellationReason NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabSessions', 'HomeExercises') IS NULL
    ALTER TABLE dbo.RehabSessions ADD HomeExercises NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.RehabSessions', 'CreatedAt') IS NULL
    ALTER TABLE dbo.RehabSessions ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.RehabSessions', 'CreatedBy') IS NULL
    ALTER TABLE dbo.RehabSessions ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabSessions', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.RehabSessions ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.RehabSessions', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.RehabSessions ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabSessions', 'IsDeleted') IS NULL
    ALTER TABLE dbo.RehabSessions ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'RehabSessions columns checked/added';
GO

-- =============================================================================
-- 9. RehabTreatmentPlans - All entity properties
-- Entity: RehabTreatmentPlan : BaseEntity
-- =============================================================================
PRINT '-- Checking RehabTreatmentPlans columns...';
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'PlanCode') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD PlanCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'ReferralId') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD ReferralId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'CreatedById') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD CreatedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'RehabType') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD RehabType NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'PlannedSessions') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD PlannedSessions INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'CompletedSessions') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD CompletedSessions INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'Frequency') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD Frequency NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'DurationMinutesPerSession') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD DurationMinutesPerSession INT NOT NULL DEFAULT 45;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'StartDate') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD StartDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'ExpectedEndDate') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD ExpectedEndDate DATETIME2 NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'ActualEndDate') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD ActualEndDate DATETIME2 NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'Status') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Active';
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'ShortTermGoals') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD ShortTermGoals NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'LongTermGoals') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD LongTermGoals NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'Interventions') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD Interventions NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'Precautions') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD Precautions NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'DiscontinuationReason') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD DiscontinuationReason NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'DischargeSummary') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD DischargeSummary NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'CreatedAt') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'CreatedBy') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.RehabTreatmentPlans', 'IsDeleted') IS NULL
    ALTER TABLE dbo.RehabTreatmentPlans ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'RehabTreatmentPlans columns checked/added';
GO

-- =============================================================================
-- 10. Outbreaks - All entity properties
-- Entity: Outbreak : BaseEntity
-- =============================================================================
PRINT '-- Checking Outbreaks columns...';
IF COL_LENGTH('dbo.Outbreaks', 'OutbreakCode') IS NULL
    ALTER TABLE dbo.Outbreaks ADD OutbreakCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.Outbreaks', 'DetectionDate') IS NULL
    ALTER TABLE dbo.Outbreaks ADD DetectionDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.Outbreaks', 'DetectedById') IS NULL
    ALTER TABLE dbo.Outbreaks ADD DetectedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.Outbreaks', 'Organism') IS NULL
    ALTER TABLE dbo.Outbreaks ADD Organism NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.Outbreaks', 'SourceSuspected') IS NULL
    ALTER TABLE dbo.Outbreaks ADD SourceSuspected NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.Outbreaks', 'AffectedAreas') IS NULL
    ALTER TABLE dbo.Outbreaks ADD AffectedAreas NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.Outbreaks', 'InitialCases') IS NULL
    ALTER TABLE dbo.Outbreaks ADD InitialCases INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.Outbreaks', 'TotalCases') IS NULL
    ALTER TABLE dbo.Outbreaks ADD TotalCases INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.Outbreaks', 'Deaths') IS NULL
    ALTER TABLE dbo.Outbreaks ADD Deaths INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.Outbreaks', 'Status') IS NULL
    ALTER TABLE dbo.Outbreaks ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Active';
IF COL_LENGTH('dbo.Outbreaks', 'ContainedDate') IS NULL
    ALTER TABLE dbo.Outbreaks ADD ContainedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.Outbreaks', 'ResolvedDate') IS NULL
    ALTER TABLE dbo.Outbreaks ADD ResolvedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.Outbreaks', 'ReportedToAuthority') IS NULL
    ALTER TABLE dbo.Outbreaks ADD ReportedToAuthority BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.Outbreaks', 'ReportedDate') IS NULL
    ALTER TABLE dbo.Outbreaks ADD ReportedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.Outbreaks', 'ControlMeasures') IS NULL
    ALTER TABLE dbo.Outbreaks ADD ControlMeasures NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.Outbreaks', 'LessonsLearned') IS NULL
    ALTER TABLE dbo.Outbreaks ADD LessonsLearned NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.Outbreaks', 'CreatedAt') IS NULL
    ALTER TABLE dbo.Outbreaks ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.Outbreaks', 'CreatedBy') IS NULL
    ALTER TABLE dbo.Outbreaks ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.Outbreaks', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.Outbreaks ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.Outbreaks', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.Outbreaks ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.Outbreaks', 'IsDeleted') IS NULL
    ALTER TABLE dbo.Outbreaks ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'Outbreaks columns checked/added';
GO

-- =============================================================================
-- 11. HandHygieneObservations - All entity properties
-- Entity: HandHygieneObservation : BaseEntity
-- =============================================================================
PRINT '-- Checking HandHygieneObservations columns...';
IF COL_LENGTH('dbo.HandHygieneObservations', 'ObservationDate') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD ObservationDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.HandHygieneObservations', 'DepartmentId') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD DepartmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'ObservedById') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD ObservedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'TotalOpportunities') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD TotalOpportunities INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.HandHygieneObservations', 'ComplianceCount') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD ComplianceCount INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.HandHygieneObservations', 'ComplianceRate') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD ComplianceRate DECIMAL(18,2) NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.HandHygieneObservations', 'BeforePatientContact') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD BeforePatientContact INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'BeforeAseptic') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD BeforeAseptic INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'AfterBodyFluid') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD AfterBodyFluid INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'AfterPatientContact') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD AfterPatientContact INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'AfterEnvironment') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD AfterEnvironment INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'DoctorOpportunities') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD DoctorOpportunities INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'DoctorCompliance') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD DoctorCompliance INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'NurseOpportunities') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD NurseOpportunities INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'NurseCompliance') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD NurseCompliance INT NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'Notes') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD Notes NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.HandHygieneObservations', 'CreatedAt') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.HandHygieneObservations', 'CreatedBy') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.HandHygieneObservations', 'IsDeleted') IS NULL
    ALTER TABLE dbo.HandHygieneObservations ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'HandHygieneObservations columns checked/added';
GO

-- =============================================================================
-- 12. AntibioticStewardships - All entity properties
-- Entity: AntibioticStewardship : BaseEntity
-- =============================================================================
PRINT '-- Checking AntibioticStewardships columns...';
IF COL_LENGTH('dbo.AntibioticStewardships', 'AdmissionId') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD AdmissionId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'PatientId') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'PrescriptionDetailId') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD PrescriptionDetailId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'AntibioticName') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD AntibioticName NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.AntibioticStewardships', 'StartDate') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD StartDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.AntibioticStewardships', 'DayOfTherapy') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD DayOfTherapy INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.AntibioticStewardships', 'RequiresReview') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD RequiresReview BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.AntibioticStewardships', 'ReviewReason') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD ReviewReason NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'ReviewDate') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD ReviewDate DATETIME2 NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'ReviewedById') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD ReviewedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'ReviewOutcome') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD ReviewOutcome NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'ReviewNotes') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD ReviewNotes NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.AntibioticStewardships', 'CreatedAt') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.AntibioticStewardships', 'CreatedBy') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AntibioticStewardships', 'IsDeleted') IS NULL
    ALTER TABLE dbo.AntibioticStewardships ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'AntibioticStewardships columns checked/added';
GO

-- =============================================================================
-- 13. FunctionalAssessments - All entity properties
-- Entity: FunctionalAssessment : BaseEntity
-- =============================================================================
PRINT '-- Checking FunctionalAssessments columns...';
IF COL_LENGTH('dbo.FunctionalAssessments', 'ReferralId') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD ReferralId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'AssessmentDate') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD AssessmentDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.FunctionalAssessments', 'AssessedById') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD AssessedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'BarthelIndex') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD BarthelIndex INT NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'FIMScore') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD FIMScore INT NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'MoCAScore') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD MoCAScore INT NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'BergBalanceScale') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD BergBalanceScale INT NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'TinettiFallRisk') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD TinettiFallRisk INT NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'MobilityStatus') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD MobilityStatus NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'GaitPattern') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD GaitPattern NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'RequiresAssistiveDevice') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD RequiresAssistiveDevice BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.FunctionalAssessments', 'AssistiveDeviceType') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD AssistiveDeviceType NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'ROMFindings') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD ROMFindings NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'StrengthFindings') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD StrengthFindings NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'SensoryFindings') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD SensoryFindings NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'SpeechStatus') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD SpeechStatus NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'SwallowingStatus') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD SwallowingStatus NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'CognitiveStatus') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD CognitiveStatus NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'ADLStatus') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD ADLStatus NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'IADLStatus') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD IADLStatus NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'ShortTermGoals') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD ShortTermGoals NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'LongTermGoals') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD LongTermGoals NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'PlanSummary') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD PlanSummary NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.FunctionalAssessments', 'CreatedAt') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.FunctionalAssessments', 'CreatedBy') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.FunctionalAssessments', 'IsDeleted') IS NULL
    ALTER TABLE dbo.FunctionalAssessments ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'FunctionalAssessments columns checked/added';
GO

-- =============================================================================
-- 14. MedicalEquipments - Additional entity properties not in previous fix scripts
-- Entity: MedicalEquipment : BaseEntity
-- =============================================================================
PRINT '-- Checking MedicalEquipments additional columns...';
IF COL_LENGTH('dbo.MedicalEquipments', 'EquipmentCode') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD EquipmentCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.MedicalEquipments', 'EquipmentName') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD EquipmentName NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.MedicalEquipments', 'Category') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD Category NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.MedicalEquipments', 'SerialNumber') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD SerialNumber NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'Manufacturer') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD Manufacturer NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'DepartmentId') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD DepartmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'Location') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD Location NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'Status') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Active';
IF COL_LENGTH('dbo.MedicalEquipments', 'NextCalibrationDate') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD NextCalibrationDate DATETIME2 NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'DecommissionDate') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD DecommissionDate DATETIME2 NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'DecommissionReason') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD DecommissionReason NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'IsDeleted') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD IsDeleted BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.MedicalEquipments', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.MedicalEquipments', 'CreatedBy') IS NULL
    ALTER TABLE dbo.MedicalEquipments ADD CreatedBy UNIQUEIDENTIFIER NULL;
GO
PRINT 'MedicalEquipments additional columns checked/added';
GO

-- =============================================================================
-- 15. MaintenanceRecords - All entity properties
-- Entity: MaintenanceRecord : BaseEntity
-- =============================================================================
PRINT '-- Checking MaintenanceRecords columns...';
IF COL_LENGTH('dbo.MaintenanceRecords', 'EquipmentId') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD EquipmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'MaintenanceType') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD MaintenanceType NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.MaintenanceRecords', 'ScheduledDate') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD ScheduledDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.MaintenanceRecords', 'PerformedDate') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD PerformedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'PerformedById') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD PerformedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'Status') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Scheduled';
IF COL_LENGTH('dbo.MaintenanceRecords', 'WorkDescription') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD WorkDescription NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'PartsReplaced') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD PartsReplaced NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'PartsCost') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD PartsCost DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'LaborCost') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD LaborCost DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'TotalCost') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD TotalCost DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'IsInternal') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD IsInternal BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.MaintenanceRecords', 'VendorName') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD VendorName NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'ServiceReportNumber') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD ServiceReportNumber NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'Findings') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD Findings NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'Recommendations') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD Recommendations NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'NextMaintenanceDate') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD NextMaintenanceDate DATETIME2 NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.MaintenanceRecords', 'CreatedAt') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.MaintenanceRecords', 'CreatedBy') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.MaintenanceRecords', 'IsDeleted') IS NULL
    ALTER TABLE dbo.MaintenanceRecords ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'MaintenanceRecords columns checked/added';
GO

-- =============================================================================
-- 16. CalibrationRecords - All entity properties
-- Entity: CalibrationRecord : BaseEntity
-- =============================================================================
PRINT '-- Checking CalibrationRecords columns...';
IF COL_LENGTH('dbo.CalibrationRecords', 'EquipmentId') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD EquipmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'ScheduledDate') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD ScheduledDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.CalibrationRecords', 'PerformedDate') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD PerformedDate DATETIME2 NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'PerformedBy') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD PerformedBy NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'Status') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Scheduled';
IF COL_LENGTH('dbo.CalibrationRecords', 'CertificateNumber') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD CertificateNumber NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'CalibrationStandard') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD CalibrationStandard NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'PassedCalibration') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD PassedCalibration BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.CalibrationRecords', 'DeviationFindings') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD DeviationFindings NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'AdjustmentsMade') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD AdjustmentsMade NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'CalibrationCost') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD CalibrationCost DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'ValidFrom') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD ValidFrom DATETIME2 NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'ValidUntil') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD ValidUntil DATETIME2 NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'NextCalibrationDate') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD NextCalibrationDate DATETIME2 NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'Notes') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD Notes NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.CalibrationRecords', 'CreatedAt') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.CalibrationRecords', 'CreatedBy') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.CalibrationRecords', 'IsDeleted') IS NULL
    ALTER TABLE dbo.CalibrationRecords ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'CalibrationRecords columns checked/added';
GO

-- =============================================================================
-- 17. QualityIndicators - All entity properties
-- Entity: QualityIndicator : BaseEntity
-- =============================================================================
PRINT '-- Checking QualityIndicators columns...';
IF COL_LENGTH('dbo.QualityIndicators', 'IndicatorCode') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD IndicatorCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.QualityIndicators', 'Name') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD Name NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.QualityIndicators', 'Category') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD Category NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.QualityIndicators', 'Description') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD Description NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'MeasurementType') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD MeasurementType NVARCHAR(500) NOT NULL DEFAULT 'Percentage';
IF COL_LENGTH('dbo.QualityIndicators', 'NumeratorDefinition') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD NumeratorDefinition NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'DenominatorDefinition') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD DenominatorDefinition NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'MeasurementFrequency') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD MeasurementFrequency NVARCHAR(500) NOT NULL DEFAULT 'Monthly';
IF COL_LENGTH('dbo.QualityIndicators', 'TargetValue') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD TargetValue DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'ThresholdLow') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD ThresholdLow DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'ThresholdHigh') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD ThresholdHigh DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'ThresholdDirection') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD ThresholdDirection NVARCHAR(500) NOT NULL DEFAULT 'HigherIsBetter';
IF COL_LENGTH('dbo.QualityIndicators', 'StandardReference') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD StandardReference NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'IsActive') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD IsActive BIT NOT NULL DEFAULT 1;
-- BaseEntity fields
IF COL_LENGTH('dbo.QualityIndicators', 'CreatedAt') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.QualityIndicators', 'CreatedBy') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.QualityIndicators', 'IsDeleted') IS NULL
    ALTER TABLE dbo.QualityIndicators ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'QualityIndicators columns checked/added';
GO

-- =============================================================================
-- 18. QualityIndicatorValues - All entity properties
-- Entity: QualityIndicatorValue : BaseEntity
-- =============================================================================
PRINT '-- Checking QualityIndicatorValues columns...';
IF COL_LENGTH('dbo.QualityIndicatorValues', 'IndicatorId') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD IndicatorId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'DepartmentId') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD DepartmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'PeriodStart') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD PeriodStart DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.QualityIndicatorValues', 'PeriodEnd') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD PeriodEnd DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.QualityIndicatorValues', 'Numerator') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD Numerator DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'Denominator') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD Denominator DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'Value') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD Value DECIMAL(18,2) NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'Status') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Normal';
IF COL_LENGTH('dbo.QualityIndicatorValues', 'Trend') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD Trend DECIMAL(18,2) NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'RecordedById') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD RecordedById UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'Notes') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD Notes NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.QualityIndicatorValues', 'CreatedAt') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.QualityIndicatorValues', 'CreatedBy') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.QualityIndicatorValues', 'IsDeleted') IS NULL
    ALTER TABLE dbo.QualityIndicatorValues ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'QualityIndicatorValues columns checked/added';
GO

-- =============================================================================
-- 19. AuditPlans - All entity properties
-- Entity: AuditPlan : BaseEntity
-- =============================================================================
PRINT '-- Checking AuditPlans columns...';
IF COL_LENGTH('dbo.AuditPlans', 'AuditCode') IS NULL
    ALTER TABLE dbo.AuditPlans ADD AuditCode NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.AuditPlans', 'AuditName') IS NULL
    ALTER TABLE dbo.AuditPlans ADD AuditName NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.AuditPlans', 'AuditType') IS NULL
    ALTER TABLE dbo.AuditPlans ADD AuditType NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.AuditPlans', 'Standard') IS NULL
    ALTER TABLE dbo.AuditPlans ADD Standard NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.AuditPlans', 'Year') IS NULL
    ALTER TABLE dbo.AuditPlans ADD [Year] INT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.AuditPlans', 'PlannedStartDate') IS NULL
    ALTER TABLE dbo.AuditPlans ADD PlannedStartDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.AuditPlans', 'PlannedEndDate') IS NULL
    ALTER TABLE dbo.AuditPlans ADD PlannedEndDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.AuditPlans', 'ActualStartDate') IS NULL
    ALTER TABLE dbo.AuditPlans ADD ActualStartDate DATETIME2 NULL;
IF COL_LENGTH('dbo.AuditPlans', 'ActualEndDate') IS NULL
    ALTER TABLE dbo.AuditPlans ADD ActualEndDate DATETIME2 NULL;
IF COL_LENGTH('dbo.AuditPlans', 'Status') IS NULL
    ALTER TABLE dbo.AuditPlans ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Planned';
IF COL_LENGTH('dbo.AuditPlans', 'LeadAuditorId') IS NULL
    ALTER TABLE dbo.AuditPlans ADD LeadAuditorId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AuditPlans', 'AuditTeam') IS NULL
    ALTER TABLE dbo.AuditPlans ADD AuditTeam NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.AuditPlans', 'ScopeDescription') IS NULL
    ALTER TABLE dbo.AuditPlans ADD ScopeDescription NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.AuditPlans', 'DepartmentsAudited') IS NULL
    ALTER TABLE dbo.AuditPlans ADD DepartmentsAudited NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.AuditPlans', 'TotalFindings') IS NULL
    ALTER TABLE dbo.AuditPlans ADD TotalFindings INT NULL;
IF COL_LENGTH('dbo.AuditPlans', 'MajorNonconformities') IS NULL
    ALTER TABLE dbo.AuditPlans ADD MajorNonconformities INT NULL;
IF COL_LENGTH('dbo.AuditPlans', 'MinorNonconformities') IS NULL
    ALTER TABLE dbo.AuditPlans ADD MinorNonconformities INT NULL;
IF COL_LENGTH('dbo.AuditPlans', 'Observations') IS NULL
    ALTER TABLE dbo.AuditPlans ADD Observations INT NULL;
IF COL_LENGTH('dbo.AuditPlans', 'SummaryReport') IS NULL
    ALTER TABLE dbo.AuditPlans ADD SummaryReport NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.AuditPlans', 'CreatedAt') IS NULL
    ALTER TABLE dbo.AuditPlans ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.AuditPlans', 'CreatedBy') IS NULL
    ALTER TABLE dbo.AuditPlans ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AuditPlans', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.AuditPlans ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.AuditPlans', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.AuditPlans ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.AuditPlans', 'IsDeleted') IS NULL
    ALTER TABLE dbo.AuditPlans ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'AuditPlans columns checked/added';
GO

-- =============================================================================
-- 20. SatisfactionSurveys - All entity properties
-- Entity: SatisfactionSurvey : BaseEntity
-- =============================================================================
PRINT '-- Checking SatisfactionSurveys columns...';
IF COL_LENGTH('dbo.SatisfactionSurveys', 'PatientId') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'VisitId') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD VisitId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'SurveyType') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD SurveyType NVARCHAR(500) NOT NULL DEFAULT '';
IF COL_LENGTH('dbo.SatisfactionSurveys', 'DepartmentId') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD DepartmentId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'SurveyDate') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD SurveyDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.SatisfactionSurveys', 'OverallRating') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD OverallRating INT NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'WaitTimeRating') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD WaitTimeRating INT NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'StaffCourtesyRating') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD StaffCourtesyRating INT NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'CommunicationRating') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD CommunicationRating INT NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'CleanlinessRating') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD CleanlinessRating INT NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'FacilitiesRating') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD FacilitiesRating INT NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'WouldRecommend') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD WouldRecommend BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'PositiveFeedback') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD PositiveFeedback NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'NegativeFeedback') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD NegativeFeedback NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'Suggestions') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD Suggestions NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'IsAnonymous') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD IsAnonymous BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'RequiresFollowUp') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD RequiresFollowUp BIT NOT NULL DEFAULT 0;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'FollowedUp') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD FollowedUp BIT NOT NULL DEFAULT 0;
-- BaseEntity fields
IF COL_LENGTH('dbo.SatisfactionSurveys', 'CreatedAt') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.SatisfactionSurveys', 'CreatedBy') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.SatisfactionSurveys', 'IsDeleted') IS NULL
    ALTER TABLE dbo.SatisfactionSurveys ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'SatisfactionSurveys columns checked/added';
GO

-- =============================================================================
-- 21. OutbreakCases - All entity properties
-- Entity: OutbreakCase : BaseEntity
-- =============================================================================
PRINT '-- Checking OutbreakCases columns...';
IF COL_LENGTH('dbo.OutbreakCases', 'OutbreakId') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD OutbreakId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.OutbreakCases', 'PatientId') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD PatientId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.OutbreakCases', 'AdmissionId') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD AdmissionId UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.OutbreakCases', 'OnsetDate') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD OnsetDate DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.OutbreakCases', 'Status') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD Status NVARCHAR(500) NOT NULL DEFAULT 'Active';
IF COL_LENGTH('dbo.OutbreakCases', 'Notes') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD Notes NVARCHAR(MAX) NULL;
-- BaseEntity fields
IF COL_LENGTH('dbo.OutbreakCases', 'CreatedAt') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETDATE();
IF COL_LENGTH('dbo.OutbreakCases', 'CreatedBy') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD CreatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.OutbreakCases', 'UpdatedAt') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD UpdatedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.OutbreakCases', 'UpdatedBy') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD UpdatedBy UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.OutbreakCases', 'IsDeleted') IS NULL
    ALTER TABLE dbo.OutbreakCases ADD IsDeleted BIT NOT NULL DEFAULT 0;
GO
PRINT 'OutbreakCases columns checked/added';
GO

PRINT '=== fix_missing_extended_columns.sql completed successfully ===';
GO
