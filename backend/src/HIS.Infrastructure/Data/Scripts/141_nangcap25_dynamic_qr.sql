-- NangCap25: QR dong Vietcombank ket noi vien phi (BV VN-Thuy Dien Uong Bi)
-- 1) PaymentTransactions: them cot lien ket nguon nghiep vu cua QR dong
-- 2) RefundDisbursements: chi ho hoan tien thua cho benh nhan qua ngan hang
-- Idempotent: IF NOT EXISTS guards — ProductionSchemaRepairRunner chay lai an toan.

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PaymentTransactions') AND name = 'ReferenceType')
    ALTER TABLE [dbo].[PaymentTransactions] ADD [ReferenceType] NVARCHAR(30) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PaymentTransactions') AND name = 'ReferenceId')
    ALTER TABLE [dbo].[PaymentTransactions] ADD [ReferenceId] UNIQUEIDENTIFIER NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PaymentTransactions') AND name = 'ReferenceData')
    ALTER TABLE [dbo].[PaymentTransactions] ADD [ReferenceData] NVARCHAR(MAX) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PaymentTransactions_Reference' AND object_id = OBJECT_ID('dbo.PaymentTransactions'))
    CREATE INDEX [IX_PaymentTransactions_Reference] ON [dbo].[PaymentTransactions]([ReferenceType], [ReferenceId]);
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RefundDisbursements')
BEGIN
    CREATE TABLE [dbo].[RefundDisbursements] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [DisbursementCode] NVARCHAR(30) NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [MedicalRecordId] UNIQUEIDENTIFIER NULL,
        [PaymentTransactionId] UNIQUEIDENTIFIER NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [BankBin] NVARCHAR(10) NOT NULL,
        [BankName] NVARCHAR(100) NOT NULL,
        [AccountNumber] NVARCHAR(30) NOT NULL,
        [AccountHolder] NVARCHAR(100) NOT NULL,
        [Reason] NVARCHAR(500) NULL,
        [Status] INT NOT NULL DEFAULT 0,
        [TransferRef] NVARCHAR(100) NULL,
        [TransferredAt] DATETIME2 NULL,
        [FailureReason] NVARCHAR(500) NULL,
        [ResponseRaw] NVARCHAR(MAX) NULL,
        [RequestedBy] UNIQUEIDENTIFIER NOT NULL,
        [ApprovedBy] UNIQUEIDENTIFIER NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_RefundDisbursements_PatientId] ON [dbo].[RefundDisbursements]([PatientId]);
    CREATE INDEX [IX_RefundDisbursements_Status] ON [dbo].[RefundDisbursements]([Status]);
    CREATE INDEX [IX_RefundDisbursements_CreatedAt] ON [dbo].[RefundDisbursements]([CreatedAt] DESC);
END
GO
