-- Sprint 2 Item 1.2: Pharmacy approval workflow — 3 tables
-- Idempotent; safe for ProductionSchemaRepairRunner to replay.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PharmacyApprovals')
BEGIN
    CREATE TABLE [dbo].[PharmacyApprovals] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [ApprovalCode] NVARCHAR(50) NOT NULL,
        [ApprovalType] INT NOT NULL,
        [FromDepartmentId] UNIQUEIDENTIFIER NULL,
        [ToWarehouseId] UNIQUEIDENTIFIER NULL,
        [FromWarehouseId] UNIQUEIDENTIFIER NULL,
        [PatientId] UNIQUEIDENTIFIER NULL,
        [MedicalRecordId] UNIQUEIDENTIFIER NULL,
        [LockedObject] NVARCHAR(30) NULL,
        [RequestDate] DATETIME2 NOT NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [RequestedBy] UNIQUEIDENTIFIER NULL,
        [RequestedAt] DATETIME2 NULL,
        [SubmittedBy] UNIQUEIDENTIFIER NULL,
        [SubmittedAt] DATETIME2 NULL,
        [ApprovedBy] UNIQUEIDENTIFIER NULL,
        [ApprovedAt] DATETIME2 NULL,
        [RevokedBy] UNIQUEIDENTIFIER NULL,
        [RevokedAt] DATETIME2 NULL,
        [RevokeReason] NVARCHAR(500) NULL,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_PharmacyApprovals_ApprovalCode] ON [dbo].[PharmacyApprovals]([ApprovalCode]);
    CREATE INDEX [IX_PharmacyApprovals_Status] ON [dbo].[PharmacyApprovals]([Status]);
    CREATE INDEX [IX_PharmacyApprovals_ApprovalType_Status] ON [dbo].[PharmacyApprovals]([ApprovalType], [Status]);
    CREATE INDEX [IX_PharmacyApprovals_PatientId] ON [dbo].[PharmacyApprovals]([PatientId]) WHERE [PatientId] IS NOT NULL;
    CREATE INDEX [IX_PharmacyApprovals_RequestDate] ON [dbo].[PharmacyApprovals]([RequestDate] DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PharmacyApprovalItems')
BEGIN
    CREATE TABLE [dbo].[PharmacyApprovalItems] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [PharmacyApprovalId] UNIQUEIDENTIFIER NOT NULL,
        [MedicineId] UNIQUEIDENTIFIER NULL,
        [SupplyId] UNIQUEIDENTIFIER NULL,
        [InventoryItemId] UNIQUEIDENTIFIER NULL,
        [BatchNumber] NVARCHAR(50) NULL,
        [ExpiryDate] DATE NULL,
        [RequestedQuantity] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [ApprovedQuantity] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Unit] NVARCHAR(20) NULL,
        [UnitPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Amount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [ObjectType] NVARCHAR(30) NULL,
        [UsageInstruction] NVARCHAR(500) NULL,
        [Note] NVARCHAR(500) NULL,
        [IsExcluded] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_PharmacyApprovalItems_ApprovalId] ON [dbo].[PharmacyApprovalItems]([PharmacyApprovalId]);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PharmacyApprovalLogs')
BEGIN
    CREATE TABLE [dbo].[PharmacyApprovalLogs] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [PharmacyApprovalId] UNIQUEIDENTIFIER NOT NULL,
        [FromStatus] INT NOT NULL,
        [ToStatus] INT NOT NULL,
        [Action] NVARCHAR(50) NOT NULL,
        [ActorId] UNIQUEIDENTIFIER NOT NULL,
        [ActedAt] DATETIME2 NOT NULL,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_PharmacyApprovalLogs_ApprovalId] ON [dbo].[PharmacyApprovalLogs]([PharmacyApprovalId]);
END
GO
