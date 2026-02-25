-- Create ServiceRequests table (missing from DB despite migration)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ServiceRequests')
BEGIN
    CREATE TABLE [ServiceRequests] (
        [Id] uniqueidentifier NOT NULL,
        [RequestCode] nvarchar(max) NOT NULL,
        [RequestDate] datetime2 NOT NULL,
        [MedicalRecordId] uniqueidentifier NOT NULL,
        [ExaminationId] uniqueidentifier NULL,
        [DoctorId] uniqueidentifier NOT NULL,
        [DepartmentId] uniqueidentifier NOT NULL,
        [ExecuteDepartmentId] uniqueidentifier NULL,
        [ExecuteRoomId] uniqueidentifier NULL,
        [Diagnosis] nvarchar(max) NULL,
        [IcdCode] nvarchar(max) NULL,
        [RequestType] int NOT NULL,
        [IsEmergency] bit NOT NULL,
        [IsPriority] bit NOT NULL,
        [Note] nvarchar(max) NULL,
        [Notes] nvarchar(max) NULL,
        [Status] int NOT NULL,
        [ServiceId] uniqueidentifier NULL,
        [RoomId] uniqueidentifier NULL,
        [Quantity] int NOT NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [TotalPrice] decimal(18,2) NOT NULL,
        [RequestedDate] datetime2 NULL,
        [RequestedByUserId] uniqueidentifier NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [InsuranceAmount] decimal(18,2) NOT NULL,
        [PatientAmount] decimal(18,2) NOT NULL,
        [IsPaid] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ServiceRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ServiceRequests_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ServiceRequests_MedicalRecords_MedicalRecordId] FOREIGN KEY ([MedicalRecordId]) REFERENCES [MedicalRecords]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ServiceRequests_Users_DoctorId] FOREIGN KEY ([DoctorId]) REFERENCES [Users]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Created ServiceRequests table';
END;

-- Create ServiceRequestDetails table if not exists
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ServiceRequestDetails')
BEGIN
    CREATE TABLE [ServiceRequestDetails] (
        [Id] uniqueidentifier NOT NULL,
        [ServiceRequestId] uniqueidentifier NOT NULL,
        [ServiceId] uniqueidentifier NOT NULL,
        [Quantity] int NOT NULL DEFAULT 1,
        [UnitPrice] decimal(18,2) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [InsuranceAmount] decimal(18,2) NOT NULL,
        [PatientAmount] decimal(18,2) NOT NULL,
        [PatientType] int NOT NULL,
        [InsurancePaymentRate] int NOT NULL,
        [Result] nvarchar(max) NULL,
        [ResultDescription] nvarchar(max) NULL,
        [Conclusion] nvarchar(max) NULL,
        [ResultDate] datetime2 NULL,
        [ResultUserId] uniqueidentifier NULL,
        [Status] int NOT NULL,
        [IsSampleCollected] bit NOT NULL,
        [SampleCollectedAt] datetime2 NULL,
        [SampleBarcode] nvarchar(max) NULL,
        [Note] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ServiceRequestDetails] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ServiceRequestDetails_ServiceRequests_ServiceRequestId] FOREIGN KEY ([ServiceRequestId]) REFERENCES [ServiceRequests]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ServiceRequestDetails_Services_ServiceId] FOREIGN KEY ([ServiceId]) REFERENCES [Services]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created ServiceRequestDetails table';
END;
GO
