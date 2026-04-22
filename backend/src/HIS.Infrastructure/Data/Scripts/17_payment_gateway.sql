-- Sprint 1 Item 1.1: PaymentTransactions table for VNPay/MoMo/ZaloPay
-- Idempotent: uses IF NOT EXISTS guards so startup ProductionSchemaRepairRunner can run this safely.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PaymentTransactions')
BEGIN
    CREATE TABLE [dbo].[PaymentTransactions] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [TxnRef] NVARCHAR(50) NOT NULL,
        [GatewayTxnRef] NVARCHAR(100) NULL,
        [Provider] NVARCHAR(20) NOT NULL,
        [OrderType] NVARCHAR(30) NOT NULL DEFAULT 'other',
        [OrderInfo] NVARCHAR(255) NOT NULL,
        [PatientId] UNIQUEIDENTIFIER NOT NULL,
        [MedicalRecordId] UNIQUEIDENTIFIER NULL,
        [InvoiceSummaryId] UNIQUEIDENTIFIER NULL,
        [ReceiptId] UNIQUEIDENTIFIER NULL,
        [Amount] DECIMAL(18,2) NOT NULL,
        [Currency] NVARCHAR(10) NOT NULL DEFAULT 'VND',
        [Status] INT NOT NULL DEFAULT 0,
        [ResponseCode] INT NULL,
        [ResponseMessage] NVARCHAR(500) NULL,
        [BankCode] NVARCHAR(20) NULL,
        [CardType] NVARCHAR(20) NULL,
        [PayDate] DATETIME2 NULL,
        [PaymentUrl] NVARCHAR(2000) NOT NULL,
        [QrCodeData] NVARCHAR(2000) NULL,
        [SecureHash] NVARCHAR(256) NULL,
        [RequestRaw] NVARCHAR(MAX) NULL,
        [ResponseRaw] NVARCHAR(MAX) NULL,
        [IpnRaw] NVARCHAR(MAX) NULL,
        [IpAddress] NVARCHAR(45) NULL,
        [ExpiresAt] DATETIME2 NOT NULL,
        [CompletedAt] DATETIME2 NULL,
        [RefundedAt] DATETIME2 NULL,
        [RefundedAmount] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [RefundReason] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX [IX_PaymentTransactions_TxnRef] ON [dbo].[PaymentTransactions]([TxnRef]);
    CREATE INDEX [IX_PaymentTransactions_PatientId] ON [dbo].[PaymentTransactions]([PatientId]);
    CREATE INDEX [IX_PaymentTransactions_Status] ON [dbo].[PaymentTransactions]([Status]);
    CREATE INDEX [IX_PaymentTransactions_CreatedAt] ON [dbo].[PaymentTransactions]([CreatedAt] DESC);
    CREATE INDEX [IX_PaymentTransactions_Provider] ON [dbo].[PaymentTransactions]([Provider]);
END
GO
