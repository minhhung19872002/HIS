-- NangCap23 — Gói thầu BV Đa khoa (HSMT 39 phân hệ)
-- Batch 1: National Pharmacy/Prescription Gateways (gap #1 + #2)
-- Batch 2: Đề án 06 — Birth/Death/Driving License (gap #3 + #4 + #6)
-- Batch 3: Linen + Functional Diagnostics (gap #5 + #7)
-- Batch 4: Zalo OA logs (gap #9)
-- All idempotent (IF NOT EXISTS guards)

-- ============================================================================
-- Batch 1
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'NationalPrescriptionSubmissions')
BEGIN
    CREATE TABLE [dbo].[NationalPrescriptionSubmissions] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [PrescriptionId] UNIQUEIDENTIFIER NOT NULL,
        [SubmissionCode] NVARCHAR(60) NOT NULL,
        [FacilityCode] NVARCHAR(30) NOT NULL,
        [DoctorIdNumber] NVARCHAR(20) NOT NULL,
        [DoctorLicenseNumber] NVARCHAR(30) NOT NULL,
        [PatientIdNumber] NVARCHAR(20) NOT NULL,
        [PrescriptionType] NVARCHAR(20) NOT NULL DEFAULT 'Outpatient',
        [PayloadJson] NVARCHAR(MAX) NOT NULL,
        [ResponseJson] NVARCHAR(MAX) NULL,
        [GatewayTransactionId] NVARCHAR(60) NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [ErrorCode] NVARCHAR(20) NULL,
        [ErrorMessage] NVARCHAR(500) NULL,
        [SubmittedAt] DATETIME2 NULL,
        [AcknowledgedAt] DATETIME2 NULL,
        [RetryCount] INT NOT NULL DEFAULT 0,
        [NextRetryAt] DATETIME2 NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_NPS_Code] ON [dbo].[NationalPrescriptionSubmissions]([SubmissionCode]);
    CREATE INDEX [IX_NPS_Prescription] ON [dbo].[NationalPrescriptionSubmissions]([PrescriptionId]);
    CREATE INDEX [IX_NPS_Status_Submitted] ON [dbo].[NationalPrescriptionSubmissions]([Status], [SubmittedAt]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'NationalPharmacyOutboundReports')
BEGIN
    CREATE TABLE [dbo].[NationalPharmacyOutboundReports] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ReportCode] NVARCHAR(60) NOT NULL,
        [ReportType] NVARCHAR(30) NOT NULL DEFAULT 'DailySale',
        [PeriodFrom] DATETIME2 NOT NULL,
        [PeriodTo] DATETIME2 NOT NULL,
        [PharmacyId] UNIQUEIDENTIFIER NULL,
        [ItemCount] INT NOT NULL DEFAULT 0,
        [PayloadXml] NVARCHAR(MAX) NOT NULL,
        [ResponseXml] NVARCHAR(MAX) NULL,
        [GatewayTicketNumber] NVARCHAR(60) NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [ErrorCode] NVARCHAR(20) NULL,
        [ErrorMessage] NVARCHAR(500) NULL,
        [SubmittedAt] DATETIME2 NULL,
        [AcknowledgedAt] DATETIME2 NULL,
        [RetryCount] INT NOT NULL DEFAULT 0,
        [Notes] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_NPOR_Code] ON [dbo].[NationalPharmacyOutboundReports]([ReportCode]);
    CREATE INDEX [IX_NPOR_Period] ON [dbo].[NationalPharmacyOutboundReports]([PeriodFrom], [PeriodTo]);
    CREATE INDEX [IX_NPOR_Status] ON [dbo].[NationalPharmacyOutboundReports]([Status]);
END

-- ============================================================================
-- Batch 2: Đề án 06
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BirthCertificateRecords')
BEGIN
    CREATE TABLE [dbo].[BirthCertificateRecords] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [CertificateNumber] NVARCHAR(40) NOT NULL,
        [MotherPatientId] UNIQUEIDENTIFIER NOT NULL,
        [FatherFullName] NVARCHAR(120) NULL,
        [FatherIdNumber] NVARCHAR(20) NULL,
        [MotherFullName] NVARCHAR(120) NOT NULL,
        [MotherIdNumber] NVARCHAR(20) NOT NULL,
        [BirthDateTime] DATETIME2 NOT NULL,
        [ChildGender] NVARCHAR(10) NOT NULL DEFAULT 'Unknown',
        [ChildName] NVARCHAR(120) NULL,
        [BirthWeight] DECIMAL(5,3) NOT NULL DEFAULT 0,
        [GestationalAgeWeeks] INT NOT NULL DEFAULT 0,
        [BirthMethod] NVARCHAR(20) NOT NULL DEFAULT 'Vaginal',
        [BirthLocation] NVARCHAR(20) NOT NULL DEFAULT 'Hospital',
        [MedicalRecordId] UNIQUEIDENTIFIER NULL,
        [AttendingDoctorId] UNIQUEIDENTIFIER NULL,
        [MidwifeId] UNIQUEIDENTIFIER NULL,
        [IsLiveBirth] BIT NOT NULL DEFAULT 1,
        [SingletonOrMultiple] INT NOT NULL DEFAULT 1,
        [Notes] NVARCHAR(500) NULL,
        [Da06SubmissionId] NVARCHAR(60) NULL,
        [Da06ResponseCode] NVARCHAR(20) NULL,
        [Da06SubmittedAt] DATETIME2 NULL,
        [Da06AcknowledgedAt] DATETIME2 NULL,
        [Da06Status] INT NOT NULL DEFAULT 0,
        [Da06ErrorMessage] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_BCR_Cert] ON [dbo].[BirthCertificateRecords]([CertificateNumber]);
    CREATE INDEX [IX_BCR_Mother] ON [dbo].[BirthCertificateRecords]([MotherPatientId]);
    CREATE INDEX [IX_BCR_Da06Status] ON [dbo].[BirthCertificateRecords]([Da06Status]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DeathCertificateRecords')
BEGIN
    CREATE TABLE [dbo].[DeathCertificateRecords] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [CertificateNumber] NVARCHAR(40) NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [MedicalRecordId] UNIQUEIDENTIFIER NULL,
        [DeathDateTime] DATETIME2 NOT NULL,
        [DeathLocation] NVARCHAR(20) NOT NULL DEFAULT 'Hospital',
        [PrimaryCauseIcd] NVARCHAR(20) NULL,
        [PrimaryCauseDescription] NVARCHAR(500) NULL,
        [SecondaryCauseIcd] NVARCHAR(20) NULL,
        [SecondaryCauseDescription] NVARCHAR(500) NULL,
        [MannerOfDeath] NVARCHAR(20) NOT NULL DEFAULT 'Natural',
        [CertifyingDoctorId] UNIQUEIDENTIFIER NULL,
        [CertifyingDoctorName] NVARCHAR(120) NULL,
        [CertifyingDoctorLicense] NVARCHAR(30) NULL,
        [CertifyingDate] DATETIME2 NOT NULL,
        [InformantFullName] NVARCHAR(120) NULL,
        [InformantIdNumber] NVARCHAR(20) NULL,
        [InformantRelationship] NVARCHAR(60) NULL,
        [Notes] NVARCHAR(500) NULL,
        [Da06SubmissionId] NVARCHAR(60) NULL,
        [Da06ResponseCode] NVARCHAR(20) NULL,
        [Da06SubmittedAt] DATETIME2 NULL,
        [Da06AcknowledgedAt] DATETIME2 NULL,
        [Da06Status] INT NOT NULL DEFAULT 0,
        [Da06ErrorMessage] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_DCR_Cert] ON [dbo].[DeathCertificateRecords]([CertificateNumber]);
    CREATE INDEX [IX_DCR_Patient] ON [dbo].[DeathCertificateRecords]([PatientId]);
    CREATE INDEX [IX_DCR_Da06Status] ON [dbo].[DeathCertificateRecords]([Da06Status]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DrivingLicenseHealthChecks')
BEGIN
    CREATE TABLE [dbo].[DrivingLicenseHealthChecks] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [CertificateNumber] NVARCHAR(40) NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [ExaminationId] UNIQUEIDENTIFIER NULL,
        [LicenseClass] NVARCHAR(4) NOT NULL DEFAULT 'B1',
        [ExamDate] DATETIME2 NOT NULL,
        [HeightCm] DECIMAL(5,2) NOT NULL DEFAULT 0,
        [WeightKg] DECIMAL(5,2) NOT NULL DEFAULT 0,
        [SystolicBp] INT NOT NULL DEFAULT 0,
        [DiastolicBp] INT NOT NULL DEFAULT 0,
        [HeartRate] INT NOT NULL DEFAULT 0,
        [VisionRightWithoutGlasses] NVARCHAR(20) NULL,
        [VisionLeftWithoutGlasses] NVARCHAR(20) NULL,
        [VisionRightWithGlasses] NVARCHAR(20) NULL,
        [VisionLeftWithGlasses] NVARCHAR(20) NULL,
        [ColorBlindNormal] BIT NOT NULL DEFAULT 1,
        [ColorVisionDetail] NVARCHAR(200) NULL,
        [VisionFieldResult] NVARCHAR(200) NULL,
        [HearingNormal] BIT NOT NULL DEFAULT 1,
        [HearingDetail] NVARCHAR(200) NULL,
        [NeurologicalNormal] BIT NOT NULL DEFAULT 1,
        [NeurologicalDetail] NVARCHAR(200) NULL,
        [PsychiatricNormal] BIT NOT NULL DEFAULT 1,
        [PsychiatricDetail] NVARCHAR(200) NULL,
        [CardioRespiratoryConclusion] NVARCHAR(500) NULL,
        [MusculoskeletalConclusion] NVARCHAR(500) NULL,
        [EndocrineConclusion] NVARCHAR(500) NULL,
        [DrugTestPerformed] BIT NOT NULL DEFAULT 0,
        [DrugTestPositive] BIT NOT NULL DEFAULT 0,
        [DrugTestDetail] NVARCHAR(200) NULL,
        [AlcoholTestPerformed] BIT NOT NULL DEFAULT 0,
        [AlcoholLevelMgPercent] DECIMAL(6,3) NULL,
        [EligibleToDrive] BIT NOT NULL DEFAULT 0,
        [Conclusion] NVARCHAR(500) NULL,
        [CertifyingDoctorId] UNIQUEIDENTIFIER NULL,
        [CertifyingDoctorName] NVARCHAR(120) NULL,
        [CertifyingDoctorLicense] NVARCHAR(30) NULL,
        [IssuedAt] DATETIME2 NULL,
        [ExpiresAt] DATETIME2 NULL,
        [Da06SubmissionId] NVARCHAR(60) NULL,
        [Da06ResponseCode] NVARCHAR(20) NULL,
        [Da06SubmittedAt] DATETIME2 NULL,
        [Da06AcknowledgedAt] DATETIME2 NULL,
        [Da06Status] INT NOT NULL DEFAULT 0,
        [Da06ErrorMessage] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_DLHC_Cert] ON [dbo].[DrivingLicenseHealthChecks]([CertificateNumber]);
    CREATE INDEX [IX_DLHC_Patient] ON [dbo].[DrivingLicenseHealthChecks]([PatientId]);
    CREATE INDEX [IX_DLHC_ExamDate] ON [dbo].[DrivingLicenseHealthChecks]([ExamDate]);
    CREATE INDEX [IX_DLHC_Da06Status] ON [dbo].[DrivingLicenseHealthChecks]([Da06Status]);
END

-- ============================================================================
-- Batch 3: Linen + Functional Diagnostics
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LinenItems')
BEGIN
    CREATE TABLE [dbo].[LinenItems] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ItemCode] NVARCHAR(30) NOT NULL,
        [ItemName] NVARCHAR(255) NOT NULL,
        [Category] NVARCHAR(30) NOT NULL DEFAULT 'Bedding',
        [Unit] NVARCHAR(20) NULL,
        [StandardWeightKg] DECIMAL(7,3) NULL,
        [MaxReuseCount] INT NULL,
        [CurrentStock] INT NOT NULL DEFAULT 0,
        [InCleaning] INT NOT NULL DEFAULT 0,
        [InRepair] INT NOT NULL DEFAULT 0,
        [Damaged] INT NOT NULL DEFAULT 0,
        [MinStockAlert] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [Notes] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_LinenItem_Code] ON [dbo].[LinenItems]([ItemCode]);
    CREATE INDEX [IX_LinenItem_Category] ON [dbo].[LinenItems]([Category]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'LinenTransactions')
BEGIN
    CREATE TABLE [dbo].[LinenTransactions] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [TransactionCode] NVARCHAR(40) NOT NULL,
        [TransactionType] NVARCHAR(20) NOT NULL DEFAULT 'Dispatch',
        [TransactionDate] DATETIME2 NOT NULL,
        [FromDepartmentId] UNIQUEIDENTIFIER NULL,
        [ToDepartmentId] UNIQUEIDENTIFIER NULL,
        [DispatcherName] NVARCHAR(120) NULL,
        [ReceiverName] NVARCHAR(120) NULL,
        [TotalItems] INT NOT NULL DEFAULT 0,
        [TotalWeightKg] DECIMAL(8,3) NOT NULL DEFAULT 0,
        [VendorName] NVARCHAR(120) NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [Notes] NVARCHAR(500) NULL,
        [DetailsJson] NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_LinenTx_Code] ON [dbo].[LinenTransactions]([TransactionCode]);
    CREATE INDEX [IX_LinenTx_Date] ON [dbo].[LinenTransactions]([TransactionDate]);
    CREATE INDEX [IX_LinenTx_Status] ON [dbo].[LinenTransactions]([Status]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SterilizationSchedules')
BEGIN
    CREATE TABLE [dbo].[SterilizationSchedules] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ScheduleCode] NVARCHAR(40) NOT NULL,
        [ScheduledAt] DATETIME2 NOT NULL,
        [AreaType] NVARCHAR(30) NOT NULL DEFAULT 'OperatingRoom',
        [RoomId] UNIQUEIDENTIFIER NULL,
        [DepartmentId] UNIQUEIDENTIFIER NULL,
        [AreaCode] NVARCHAR(30) NULL,
        [SterilizationMethod] NVARCHAR(40) NOT NULL DEFAULT 'ChemicalDisinfection',
        [Agent] NVARCHAR(100) NULL,
        [DurationMinutes] INT NOT NULL DEFAULT 0,
        [AssignedStaff] NVARCHAR(200) NULL,
        [StartedAt] DATETIME2 NULL,
        [CompletedAt] DATETIME2 NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [CultureSampleCode] NVARCHAR(40) NULL,
        [CultureResult] NVARCHAR(20) NULL,
        [Notes] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_SterSched_Code] ON [dbo].[SterilizationSchedules]([ScheduleCode]);
    CREATE INDEX [IX_SterSched_Scheduled] ON [dbo].[SterilizationSchedules]([ScheduledAt]);
    CREATE INDEX [IX_SterSched_AreaStatus] ON [dbo].[SterilizationSchedules]([AreaType], [Status]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'FunctionalDiagnosticTests')
BEGIN
    CREATE TABLE [dbo].[FunctionalDiagnosticTests] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [TestCode] NVARCHAR(40) NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [MedicalRecordId] UNIQUEIDENTIFIER NULL,
        [ExaminationId] UNIQUEIDENTIFIER NULL,
        [ServiceRequestDetailId] UNIQUEIDENTIFIER NULL,
        [TestType] NVARCHAR(30) NOT NULL DEFAULT 'ECG',
        [PerformingDoctorId] UNIQUEIDENTIFIER NULL,
        [PerformingDoctorName] NVARCHAR(120) NULL,
        [TechnicianId] UNIQUEIDENTIFIER NULL,
        [PerformedAt] DATETIME2 NULL,
        [DeviceName] NVARCHAR(120) NULL,
        [DeviceSerialNumber] NVARCHAR(60) NULL,
        [ClinicalIndication] NVARCHAR(500) NULL,
        [Findings] NVARCHAR(MAX) NULL,
        [Conclusion] NVARCHAR(MAX) NULL,
        [Recommendation] NVARCHAR(500) NULL,
        [MeasurementsJson] NVARCHAR(MAX) NOT NULL DEFAULT '{}',
        [ImagesJson] NVARCHAR(MAX) NOT NULL DEFAULT '[]',
        [Status] INT NOT NULL DEFAULT 0,
        [VerifiedById] UNIQUEIDENTIFIER NULL,
        [VerifiedAt] DATETIME2 NULL,
        [Notes] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_FDT_Code] ON [dbo].[FunctionalDiagnosticTests]([TestCode]);
    CREATE INDEX [IX_FDT_PatientType] ON [dbo].[FunctionalDiagnosticTests]([PatientId], [TestType]);
    CREATE INDEX [IX_FDT_Status] ON [dbo].[FunctionalDiagnosticTests]([Status], [PerformedAt]);
END

-- ============================================================================
-- Batch 4: Zalo OA logs
-- ============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ZaloNotificationLogs')
BEGIN
    CREATE TABLE [dbo].[ZaloNotificationLogs] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [TemplateId] NVARCHAR(60) NOT NULL,
        [TemplateName] NVARCHAR(200) NOT NULL,
        [TargetPhone] NVARCHAR(20) NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NULL,
        [PatientName] NVARCHAR(200) NULL,
        [RelatedEntityType] NVARCHAR(40) NULL,
        [RelatedEntityId] UNIQUEIDENTIFIER NULL,
        [PayloadJson] NVARCHAR(MAX) NOT NULL DEFAULT '{}',
        [MessageId] NVARCHAR(80) NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [ErrorCode] NVARCHAR(30) NULL,
        [ErrorMessage] NVARCHAR(500) NULL,
        [SentAt] DATETIME2 NULL,
        [DeliveredAt] DATETIME2 NULL,
        [CostVnd] DECIMAL(10,2) NULL,
        [RetryCount] INT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_ZNL_Phone] ON [dbo].[ZaloNotificationLogs]([TargetPhone]);
    CREATE INDEX [IX_ZNL_Status_Created] ON [dbo].[ZaloNotificationLogs]([Status], [CreatedAt]);
    CREATE INDEX [IX_ZNL_Related] ON [dbo].[ZaloNotificationLogs]([RelatedEntityType], [RelatedEntityId]);
END
