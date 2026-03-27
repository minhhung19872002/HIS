-- =============================================================
-- Create Supplementary Module Tables (9 modules)
-- Idempotent: IF NOT EXISTS pattern
-- Created: 2026-03-27
-- =============================================================

SET QUOTED_IDENTIFIER ON;
GO

USE [HIS];
GO

-- ======= Module 1: FollowUp (Tai kham) =======

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'FollowUpAppointments')
BEGIN
    CREATE TABLE [dbo].[FollowUpAppointments] (
        [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [PatientId]         UNIQUEIDENTIFIER NOT NULL,
        [ExaminationId]     UNIQUEIDENTIFIER NULL,
        [ScheduledDate]     DATETIME2        NOT NULL,
        [ActualDate]        DATETIME2        NULL,
        [Status]            INT              NOT NULL DEFAULT 0,  -- 0=Scheduled, 1=Completed, 2=Missed, 3=Cancelled
        [ReminderSent]      BIT              NOT NULL DEFAULT 0,
        [Notes]             NVARCHAR(MAX)    NULL,
        [DoctorId]          UNIQUEIDENTIFIER NULL,
        [DepartmentId]      UNIQUEIDENTIFIER NULL,
        [Reason]            NVARCHAR(500)    NULL,
        [Diagnosis]         NVARCHAR(500)    NULL,
        [ReminderDaysBefore] INT             NULL,
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]         NVARCHAR(450)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(450)    NULL,
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_FollowUpAppointments] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FollowUpAppointments_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]),
        CONSTRAINT [FK_FollowUpAppointments_Examinations] FOREIGN KEY ([ExaminationId]) REFERENCES [dbo].[Examinations]([Id]),
        CONSTRAINT [FK_FollowUpAppointments_Users_Doctor] FOREIGN KEY ([DoctorId]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_FollowUpAppointments_Departments] FOREIGN KEY ([DepartmentId]) REFERENCES [dbo].[Departments]([Id])
    );

    CREATE INDEX [IX_FollowUpAppointments_PatientId] ON [dbo].[FollowUpAppointments]([PatientId]);
    CREATE INDEX [IX_FollowUpAppointments_ScheduledDate] ON [dbo].[FollowUpAppointments]([ScheduledDate]);
    CREATE INDEX [IX_FollowUpAppointments_Status] ON [dbo].[FollowUpAppointments]([Status]);
    CREATE INDEX [IX_FollowUpAppointments_DoctorId] ON [dbo].[FollowUpAppointments]([DoctorId]);
    CREATE INDEX [IX_FollowUpAppointments_DepartmentId] ON [dbo].[FollowUpAppointments]([DepartmentId]);

    PRINT 'Created table: FollowUpAppointments';
END
ELSE
    PRINT 'Table FollowUpAppointments already exists - skipped';
GO

-- ======= Module 2: Procurement (Du tru mua sam) =======

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProcurementRequests')
BEGIN
    CREATE TABLE [dbo].[ProcurementRequests] (
        [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [RequestCode]       NVARCHAR(50)     NOT NULL,
        [RequestDate]       DATETIME2        NOT NULL,
        [DepartmentId]      UNIQUEIDENTIFIER NULL,
        [RequestedById]     UNIQUEIDENTIFIER NULL,
        [Status]            INT              NOT NULL DEFAULT 0,  -- 0=Draft, 1=Pending, 2=Approved, 3=Rejected, 4=Completed
        [TotalAmount]       DECIMAL(18,2)    NOT NULL DEFAULT 0,
        [Notes]             NVARCHAR(MAX)    NULL,
        [ApprovedById]      UNIQUEIDENTIFIER NULL,
        [ApprovedDate]      DATETIME2        NULL,
        [RejectReason]      NVARCHAR(500)    NULL,
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]         NVARCHAR(450)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(450)    NULL,
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_ProcurementRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProcurementRequests_Departments] FOREIGN KEY ([DepartmentId]) REFERENCES [dbo].[Departments]([Id]),
        CONSTRAINT [FK_ProcurementRequests_Users_Requested] FOREIGN KEY ([RequestedById]) REFERENCES [dbo].[Users]([Id]),
        CONSTRAINT [FK_ProcurementRequests_Users_Approved] FOREIGN KEY ([ApprovedById]) REFERENCES [dbo].[Users]([Id])
    );

    CREATE UNIQUE INDEX [IX_ProcurementRequests_RequestCode] ON [dbo].[ProcurementRequests]([RequestCode]) WHERE [IsDeleted] = 0;
    CREATE INDEX [IX_ProcurementRequests_Status] ON [dbo].[ProcurementRequests]([Status]);
    CREATE INDEX [IX_ProcurementRequests_DepartmentId] ON [dbo].[ProcurementRequests]([DepartmentId]);
    CREATE INDEX [IX_ProcurementRequests_RequestDate] ON [dbo].[ProcurementRequests]([RequestDate]);

    PRINT 'Created table: ProcurementRequests';
END
ELSE
    PRINT 'Table ProcurementRequests already exists - skipped';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProcurementRequestItems')
BEGIN
    CREATE TABLE [dbo].[ProcurementRequestItems] (
        [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [ProcurementRequestId]  UNIQUEIDENTIFIER NOT NULL,
        [ItemId]                UNIQUEIDENTIFIER NULL,
        [ItemName]              NVARCHAR(200)    NOT NULL,
        [ItemCode]              NVARCHAR(50)     NULL,
        [Unit]                  NVARCHAR(50)     NULL,
        [RequestedQuantity]     INT              NOT NULL DEFAULT 0,
        [CurrentStock]          INT              NOT NULL DEFAULT 0,
        [MinimumStock]          INT              NOT NULL DEFAULT 0,
        [EstimatedPrice]        DECIMAL(18,2)    NOT NULL DEFAULT 0,
        [Notes]                 NVARCHAR(500)    NULL,
        [Specification]         NVARCHAR(500)    NULL,
        [CreatedAt]             DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]             NVARCHAR(450)    NULL,
        [UpdatedAt]             DATETIME2        NULL,
        [UpdatedBy]             NVARCHAR(450)    NULL,
        [IsDeleted]             BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_ProcurementRequestItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProcurementRequestItems_Request] FOREIGN KEY ([ProcurementRequestId]) REFERENCES [dbo].[ProcurementRequests]([Id])
    );

    CREATE INDEX [IX_ProcurementRequestItems_RequestId] ON [dbo].[ProcurementRequestItems]([ProcurementRequestId]);

    PRINT 'Created table: ProcurementRequestItems';
END
ELSE
    PRINT 'Table ProcurementRequestItems already exists - skipped';
GO

-- ======= Module 3: Immunization (Tiem chung - batch tracking) =======

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ImmunizationBatches')
BEGIN
    CREATE TABLE [dbo].[ImmunizationBatches] (
        [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [BatchCode]         NVARCHAR(50)     NOT NULL,
        [VaccineName]       NVARCHAR(200)    NOT NULL,
        [VaccineCode]       NVARCHAR(50)     NULL,
        [Manufacturer]      NVARCHAR(200)    NULL,
        [LotNumber]         NVARCHAR(50)     NULL,
        [ManufactureDate]   DATETIME2        NOT NULL,
        [ExpiryDate]        DATETIME2        NOT NULL,
        [InitialQuantity]   INT              NOT NULL DEFAULT 0,
        [RemainingQuantity] INT              NOT NULL DEFAULT 0,
        [StorageCondition]  NVARCHAR(100)    NULL,
        [Status]            INT              NOT NULL DEFAULT 0,  -- 0=InStock, 1=InUse, 2=Expired, 3=Recalled
        [WarehouseId]       UNIQUEIDENTIFIER NULL,
        [Notes]             NVARCHAR(MAX)    NULL,
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]         NVARCHAR(450)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(450)    NULL,
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_ImmunizationBatches] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ImmunizationBatches_Warehouses] FOREIGN KEY ([WarehouseId]) REFERENCES [dbo].[Warehouses]([Id])
    );

    CREATE UNIQUE INDEX [IX_ImmunizationBatches_BatchCode] ON [dbo].[ImmunizationBatches]([BatchCode]) WHERE [IsDeleted] = 0;
    CREATE INDEX [IX_ImmunizationBatches_ExpiryDate] ON [dbo].[ImmunizationBatches]([ExpiryDate]);
    CREATE INDEX [IX_ImmunizationBatches_Status] ON [dbo].[ImmunizationBatches]([Status]);
    CREATE INDEX [IX_ImmunizationBatches_WarehouseId] ON [dbo].[ImmunizationBatches]([WarehouseId]);

    PRINT 'Created table: ImmunizationBatches';
END
ELSE
    PRINT 'Table ImmunizationBatches already exists - skipped';
GO

-- ======= Module 4: HealthCheckup (Kham suc khoe dinh ky) =======

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HealthCheckupCampaigns')
BEGIN
    CREATE TABLE [dbo].[HealthCheckupCampaigns] (
        [Id]                 UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [CampaignCode]       NVARCHAR(50)     NOT NULL,
        [CampaignName]       NVARCHAR(200)    NOT NULL,
        [OrganizationName]   NVARCHAR(200)    NULL,
        [ContactPerson]      NVARCHAR(100)    NULL,
        [ContactPhone]       NVARCHAR(20)     NULL,
        [StartDate]          DATETIME2        NOT NULL,
        [EndDate]            DATETIME2        NOT NULL,
        [Status]             INT              NOT NULL DEFAULT 0,  -- 0=Planning, 1=Active, 2=Completed, 3=Cancelled
        [TotalRegistered]    INT              NOT NULL DEFAULT 0,
        [TotalCompleted]     INT              NOT NULL DEFAULT 0,
        [Notes]              NVARCHAR(MAX)    NULL,
        [PackageDescription] NVARCHAR(MAX)    NULL,
        [ContractAmount]     DECIMAL(18,2)    NULL,
        [CreatedAt]          DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]          NVARCHAR(450)    NULL,
        [UpdatedAt]          DATETIME2        NULL,
        [UpdatedBy]          NVARCHAR(450)    NULL,
        [IsDeleted]          BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_HealthCheckupCampaigns] PRIMARY KEY ([Id])
    );

    CREATE UNIQUE INDEX [IX_HealthCheckupCampaigns_Code] ON [dbo].[HealthCheckupCampaigns]([CampaignCode]) WHERE [IsDeleted] = 0;
    CREATE INDEX [IX_HealthCheckupCampaigns_Status] ON [dbo].[HealthCheckupCampaigns]([Status]);
    CREATE INDEX [IX_HealthCheckupCampaigns_StartDate] ON [dbo].[HealthCheckupCampaigns]([StartDate]);

    PRINT 'Created table: HealthCheckupCampaigns';
END
ELSE
    PRINT 'Table HealthCheckupCampaigns already exists - skipped';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HealthCheckupRecords')
BEGIN
    CREATE TABLE [dbo].[HealthCheckupRecords] (
        [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [CampaignId]            UNIQUEIDENTIFIER NOT NULL,
        [PatientId]             UNIQUEIDENTIFIER NULL,
        [EmployeeName]          NVARCHAR(100)    NULL,
        [EmployeeCode]          NVARCHAR(50)     NULL,
        [Department]            NVARCHAR(100)    NULL,
        [CheckupDate]           DATETIME2        NULL,
        [ResultSummary]         NVARCHAR(MAX)    NULL,
        [CertificateIssued]     BIT              NOT NULL DEFAULT 0,
        [CertificateNumber]     NVARCHAR(50)     NULL,
        [Classification]        NVARCHAR(10)     NULL,  -- A, B, C, D, E
        [DoctorId]              UNIQUEIDENTIFIER NULL,
        [Notes]                 NVARCHAR(MAX)    NULL,
        [BloodPressure]         NVARCHAR(20)     NULL,
        [Height]                REAL             NULL,
        [Weight]                REAL             NULL,
        [BMI]                   REAL             NULL,
        [VisionLeft]            NVARCHAR(20)     NULL,
        [VisionRight]           NVARCHAR(20)     NULL,
        [HearingResult]         NVARCHAR(100)    NULL,
        [LabResultSummary]      NVARCHAR(MAX)    NULL,
        [ImagingResultSummary]  NVARCHAR(MAX)    NULL,
        [CreatedAt]             DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]             NVARCHAR(450)    NULL,
        [UpdatedAt]             DATETIME2        NULL,
        [UpdatedBy]             NVARCHAR(450)    NULL,
        [IsDeleted]             BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_HealthCheckupRecords] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_HealthCheckupRecords_Campaign] FOREIGN KEY ([CampaignId]) REFERENCES [dbo].[HealthCheckupCampaigns]([Id]),
        CONSTRAINT [FK_HealthCheckupRecords_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]),
        CONSTRAINT [FK_HealthCheckupRecords_Users_Doctor] FOREIGN KEY ([DoctorId]) REFERENCES [dbo].[Users]([Id])
    );

    CREATE INDEX [IX_HealthCheckupRecords_CampaignId] ON [dbo].[HealthCheckupRecords]([CampaignId]);
    CREATE INDEX [IX_HealthCheckupRecords_PatientId] ON [dbo].[HealthCheckupRecords]([PatientId]);
    CREATE INDEX [IX_HealthCheckupRecords_CheckupDate] ON [dbo].[HealthCheckupRecords]([CheckupDate]);
    CREATE INDEX [IX_HealthCheckupRecords_Classification] ON [dbo].[HealthCheckupRecords]([Classification]);

    PRINT 'Created table: HealthCheckupRecords';
END
ELSE
    PRINT 'Table HealthCheckupRecords already exists - skipped';
GO

-- ======= Module 5: Epidemiology (Giam sat dich te) =======

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'DiseaseCases')
BEGIN
    CREATE TABLE [dbo].[DiseaseCases] (
        [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [PatientId]         UNIQUEIDENTIFIER NULL,
        [PatientName]       NVARCHAR(100)    NOT NULL,
        [PatientAge]        INT              NULL,
        [PatientGender]     INT              NULL,
        [DiseaseName]       NVARCHAR(200)    NOT NULL,
        [IcdCode]           NVARCHAR(20)     NULL,
        [OnsetDate]         DATETIME2        NULL,
        [ReportDate]        DATETIME2        NOT NULL,
        [Classification]    INT              NOT NULL DEFAULT 0,  -- 0=Suspected, 1=Probable, 2=Confirmed
        [Outcome]           INT              NOT NULL DEFAULT 0,  -- 0=Recovering, 1=Recovered, 2=Died, 3=Unknown
        [InvestigatorId]    UNIQUEIDENTIFIER NULL,
        [Location]          NVARCHAR(200)    NULL,
        [Address]           NVARCHAR(500)    NULL,
        [Notes]             NVARCHAR(MAX)    NULL,
        [IsOutbreak]        BIT              NOT NULL DEFAULT 0,
        [OutbreakId]        NVARCHAR(50)     NULL,
        [LabTestResult]     NVARCHAR(500)    NULL,
        [LabTestDate]       DATETIME2        NULL,
        [TreatmentSummary]  NVARCHAR(MAX)    NULL,
        [Hospitalized]      NVARCHAR(200)    NULL,
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]         NVARCHAR(450)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(450)    NULL,
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_DiseaseCases] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DiseaseCases_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]),
        CONSTRAINT [FK_DiseaseCases_Users_Investigator] FOREIGN KEY ([InvestigatorId]) REFERENCES [dbo].[Users]([Id])
    );

    CREATE INDEX [IX_DiseaseCases_PatientId] ON [dbo].[DiseaseCases]([PatientId]);
    CREATE INDEX [IX_DiseaseCases_ReportDate] ON [dbo].[DiseaseCases]([ReportDate]);
    CREATE INDEX [IX_DiseaseCases_Classification] ON [dbo].[DiseaseCases]([Classification]);
    CREATE INDEX [IX_DiseaseCases_DiseaseName] ON [dbo].[DiseaseCases]([DiseaseName]);
    CREATE INDEX [IX_DiseaseCases_IsOutbreak] ON [dbo].[DiseaseCases]([IsOutbreak]);

    PRINT 'Created table: DiseaseCases';
END
ELSE
    PRINT 'Table DiseaseCases already exists - skipped';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ContactTraces')
BEGIN
    CREATE TABLE [dbo].[ContactTraces] (
        [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [DiseaseCaseId]         UNIQUEIDENTIFIER NOT NULL,
        [ContactName]           NVARCHAR(100)    NOT NULL,
        [ContactPhone]          NVARCHAR(20)     NULL,
        [Relationship]          NVARCHAR(50)     NULL,
        [ExposureDate]          DATETIME2        NULL,
        [ExposureType]          NVARCHAR(50)     NULL,  -- Close, Casual, Household
        [QuarantineStatus]      INT              NOT NULL DEFAULT 0,  -- 0=None, 1=HomeQuarantine, 2=FacilityQuarantine, 3=Completed
        [TestResult]            NVARCHAR(100)    NULL,
        [TestDate]              DATETIME2        NULL,
        [Address]               NVARCHAR(500)    NULL,
        [Notes]                 NVARCHAR(MAX)    NULL,
        [IsSymptomDeveloped]    BIT              NOT NULL DEFAULT 0,
        [SymptomOnsetDate]      DATETIME2        NULL,
        [CreatedAt]             DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]             NVARCHAR(450)    NULL,
        [UpdatedAt]             DATETIME2        NULL,
        [UpdatedBy]             NVARCHAR(450)    NULL,
        [IsDeleted]             BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_ContactTraces] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContactTraces_DiseaseCases] FOREIGN KEY ([DiseaseCaseId]) REFERENCES [dbo].[DiseaseCases]([Id])
    );

    CREATE INDEX [IX_ContactTraces_DiseaseCaseId] ON [dbo].[ContactTraces]([DiseaseCaseId]);
    CREATE INDEX [IX_ContactTraces_QuarantineStatus] ON [dbo].[ContactTraces]([QuarantineStatus]);

    PRINT 'Created table: ContactTraces';
END
ELSE
    PRINT 'Table ContactTraces already exists - skipped';
GO

-- ======= Module 9: BHXH Audit (Kiem tra BHXH) =======

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BhxhAuditSessions')
BEGIN
    CREATE TABLE [dbo].[BhxhAuditSessions] (
        [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [SessionCode]       NVARCHAR(50)     NOT NULL,
        [PeriodMonth]       INT              NOT NULL,
        [PeriodYear]        INT              NOT NULL,
        [TotalRecords]      INT              NOT NULL DEFAULT 0,
        [TotalAmount]       DECIMAL(18,2)    NOT NULL DEFAULT 0,
        [ErrorCount]        INT              NOT NULL DEFAULT 0,
        [ErrorAmount]       DECIMAL(18,2)    NOT NULL DEFAULT 0,
        [Status]            INT              NOT NULL DEFAULT 0,  -- 0=Draft, 1=InProgress, 2=Completed, 3=Submitted
        [AuditorId]         UNIQUEIDENTIFIER NULL,
        [Notes]             NVARCHAR(MAX)    NULL,
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]         NVARCHAR(450)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(450)    NULL,
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_BhxhAuditSessions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BhxhAuditSessions_Users_Auditor] FOREIGN KEY ([AuditorId]) REFERENCES [dbo].[Users]([Id])
    );

    CREATE UNIQUE INDEX [IX_BhxhAuditSessions_SessionCode] ON [dbo].[BhxhAuditSessions]([SessionCode]) WHERE [IsDeleted] = 0;
    CREATE INDEX [IX_BhxhAuditSessions_Period] ON [dbo].[BhxhAuditSessions]([PeriodYear], [PeriodMonth]);
    CREATE INDEX [IX_BhxhAuditSessions_Status] ON [dbo].[BhxhAuditSessions]([Status]);

    PRINT 'Created table: BhxhAuditSessions';
END
ELSE
    PRINT 'Table BhxhAuditSessions already exists - skipped';
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BhxhAuditErrors')
BEGIN
    CREATE TABLE [dbo].[BhxhAuditErrors] (
        [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [AuditSessionId]    UNIQUEIDENTIFIER NOT NULL,
        [RecordId]          UNIQUEIDENTIFIER NULL,
        [PatientName]       NVARCHAR(100)    NULL,
        [InsuranceNumber]   NVARCHAR(20)     NULL,
        [ErrorType]         NVARCHAR(50)     NOT NULL,  -- OverCeiling, WrongIcd, WrongObject, DuplicateClaim, WrongService, Other
        [ErrorDescription]  NVARCHAR(MAX)    NULL,
        [OriginalAmount]    DECIMAL(18,2)    NOT NULL DEFAULT 0,
        [AdjustedAmount]    DECIMAL(18,2)    NOT NULL DEFAULT 0,
        [IsFixed]           BIT              NOT NULL DEFAULT 0,
        [FixedBy]           NVARCHAR(450)    NULL,
        [FixedDate]         DATETIME2        NULL,
        [Notes]             NVARCHAR(MAX)    NULL,
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT GETDATE(),
        [CreatedBy]         NVARCHAR(450)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(450)    NULL,
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,
        CONSTRAINT [PK_BhxhAuditErrors] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BhxhAuditErrors_Session] FOREIGN KEY ([AuditSessionId]) REFERENCES [dbo].[BhxhAuditSessions]([Id]),
        CONSTRAINT [FK_BhxhAuditErrors_MedicalRecords] FOREIGN KEY ([RecordId]) REFERENCES [dbo].[MedicalRecords]([Id])
    );

    CREATE INDEX [IX_BhxhAuditErrors_SessionId] ON [dbo].[BhxhAuditErrors]([AuditSessionId]);
    CREATE INDEX [IX_BhxhAuditErrors_ErrorType] ON [dbo].[BhxhAuditErrors]([ErrorType]);
    CREATE INDEX [IX_BhxhAuditErrors_IsFixed] ON [dbo].[BhxhAuditErrors]([IsFixed]);

    PRINT 'Created table: BhxhAuditErrors';
END
ELSE
    PRINT 'Table BhxhAuditErrors already exists - skipped';
GO

PRINT '=== Supplementary tables creation complete ===';
GO
