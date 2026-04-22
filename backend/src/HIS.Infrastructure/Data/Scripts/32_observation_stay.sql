-- N1.07: Phòng lưu / Observation short-stay

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ObservationStays')
BEGIN
    CREATE TABLE [dbo].[ObservationStays] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [StayCode] NVARCHAR(30) NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [MedicalRecordId] UNIQUEIDENTIFIER NULL,
        [DepartmentId] UNIQUEIDENTIFIER NULL,
        [RoomId] UNIQUEIDENTIFIER NULL,
        [BedId] UNIQUEIDENTIFIER NULL,
        [DoctorId] UNIQUEIDENTIFIER NULL,
        [AdmittedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [DischargedAt] DATETIME2 NULL,
        [ChiefComplaint] NVARCHAR(500) NULL,
        [InitialDiagnosis] NVARCHAR(500) NULL,
        [FinalDiagnosis] NVARCHAR(500) NULL,
        [Status] INT NOT NULL DEFAULT 1,
        [DischargeReason] NVARCHAR(500) NULL,
        [Notes] NVARCHAR(MAX) NULL,
        [EwsScore] INT NULL,
        [EscalatedToAdmissionId] UNIQUEIDENTIFIER NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX [IX_ObservationStays_StayCode] ON [dbo].[ObservationStays]([StayCode]);
    CREATE INDEX [IX_ObservationStays_Patient] ON [dbo].[ObservationStays]([PatientId]);
    CREATE INDEX [IX_ObservationStays_Status] ON [dbo].[ObservationStays]([Status]);
    CREATE INDEX [IX_ObservationStays_AdmittedAt] ON [dbo].[ObservationStays]([AdmittedAt]);
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ObservationVitals')
BEGIN
    CREATE TABLE [dbo].[ObservationVitals] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ObservationStayId] UNIQUEIDENTIFIER NOT NULL,
        [RecordedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [Temperature] DECIMAL(4,1) NULL,
        [HeartRate] INT NULL,
        [RespirationRate] INT NULL,
        [BloodPressure] NVARCHAR(20) NULL,
        [SpO2] INT NULL,
        [Consciousness] INT NULL,
        [NurseNote] NVARCHAR(1000) NULL,
        [DoctorNote] NVARCHAR(1000) NULL,
        [RecordedByUserId] UNIQUEIDENTIFIER NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX [IX_ObservationVitals_Stay] ON [dbo].[ObservationVitals]([ObservationStayId]);
    CREATE INDEX [IX_ObservationVitals_Recorded] ON [dbo].[ObservationVitals]([RecordedAt]);
END
