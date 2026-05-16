-- Create ElectronicInvoices table for E-Invoice (Hoa don dien tu) management
-- Idempotent: IF NOT EXISTS
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ElectronicInvoices')
BEGIN
    CREATE TABLE [dbo].[ElectronicInvoices] (
        [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
        [InvoiceNumber]     NVARCHAR(50)     NOT NULL,          -- So hoa don (HDDT-YYYYMMDD-NNNN)
        [InvoiceSeries]     NVARCHAR(20)     NOT NULL,          -- Ky hieu hoa don (1C24TAA)
        [InvoiceDate]       DATETIME2        NOT NULL,          -- Ngay phat hanh

        [InvoiceSummaryId]  UNIQUEIDENTIFIER NULL,              -- FK to InvoiceSummaries
        [PatientId]         UNIQUEIDENTIFIER NULL,              -- FK to Patients
        [MedicalRecordId]   UNIQUEIDENTIFIER NULL,              -- FK to MedicalRecords

        [PatientName]       NVARCHAR(200)    NOT NULL DEFAULT '',
        [PatientAddress]    NVARCHAR(500)    NULL,
        [TaxCode]           NVARCHAR(20)     NULL,              -- Ma so thue (MST)
        [BuyerName]         NVARCHAR(200)    NULL,              -- Ten nguoi mua
        [PaymentMethod]     NVARCHAR(20)     NULL,              -- TM/CK/TM-CK

        [SubTotal]          DECIMAL(18,2)    NOT NULL DEFAULT 0, -- Tien truoc thue
        [VatRate]           DECIMAL(5,2)     NOT NULL DEFAULT 8, -- % VAT (medical = 8%)
        [VatAmount]         DECIMAL(18,2)    NOT NULL DEFAULT 0,
        [TotalAmount]       DECIMAL(18,2)    NOT NULL DEFAULT 0, -- Tong tien
        [DiscountAmount]    DECIMAL(18,2)    NOT NULL DEFAULT 0,

        [ItemsJson]         NVARCHAR(MAX)    NULL,              -- JSON line items

        [Status]            INT              NOT NULL DEFAULT 0, -- 0=Draft, 1=Issued, 2=Sent, 3=Cancelled, 4=Replaced

        [ProviderName]      NVARCHAR(50)     NULL,              -- VNInvoice, Misa, etc.
        [ProviderInvoiceId] NVARCHAR(100)    NULL,              -- ID tu nha cung cap
        [LookupCode]        NVARCHAR(50)     NULL,              -- Ma tra cuu
        [LookupUrl]         NVARCHAR(500)    NULL,              -- URL tra cuu

        [CancelReason]      NVARCHAR(500)    NULL,
        [CancelledAt]       DATETIME2        NULL,
        [SentAt]            DATETIME2        NULL,
        [SentTo]            NVARCHAR(200)    NULL,              -- Email/phone
        [SignedBy]          NVARCHAR(200)    NULL,
        [SignatureData]     NVARCHAR(MAX)    NULL,

        -- BaseEntity fields
        [CreatedAt]         DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
        [CreatedBy]         NVARCHAR(100)    NULL,
        [UpdatedAt]         DATETIME2        NULL,
        [UpdatedBy]         NVARCHAR(100)    NULL,
        [IsDeleted]         BIT              NOT NULL DEFAULT 0,

        CONSTRAINT [PK_ElectronicInvoices] PRIMARY KEY CLUSTERED ([Id]),
        CONSTRAINT [FK_ElectronicInvoices_InvoiceSummaries] FOREIGN KEY ([InvoiceSummaryId])
            REFERENCES [dbo].[InvoiceSummaries]([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_ElectronicInvoices_Patients] FOREIGN KEY ([PatientId])
            REFERENCES [dbo].[Patients]([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_ElectronicInvoices_MedicalRecords] FOREIGN KEY ([MedicalRecordId])
            REFERENCES [dbo].[MedicalRecords]([Id]) ON DELETE SET NULL
    );

    -- Indexes for search performance
    CREATE NONCLUSTERED INDEX [IX_ElectronicInvoices_InvoiceDate]
        ON [dbo].[ElectronicInvoices] ([InvoiceDate]) WHERE [IsDeleted] = 0;

    CREATE NONCLUSTERED INDEX [IX_ElectronicInvoices_Status]
        ON [dbo].[ElectronicInvoices] ([Status]) WHERE [IsDeleted] = 0;

    CREATE NONCLUSTERED INDEX [IX_ElectronicInvoices_InvoiceSummaryId]
        ON [dbo].[ElectronicInvoices] ([InvoiceSummaryId]) WHERE [IsDeleted] = 0;

    CREATE NONCLUSTERED INDEX [IX_ElectronicInvoices_PatientId]
        ON [dbo].[ElectronicInvoices] ([PatientId]) WHERE [IsDeleted] = 0;

    CREATE UNIQUE NONCLUSTERED INDEX [IX_ElectronicInvoices_InvoiceNumber]
        ON [dbo].[ElectronicInvoices] ([InvoiceNumber]) WHERE [IsDeleted] = 0;

    CREATE NONCLUSTERED INDEX [IX_ElectronicInvoices_LookupCode]
        ON [dbo].[ElectronicInvoices] ([LookupCode]) WHERE [IsDeleted] = 0;

    PRINT 'Created table ElectronicInvoices with indexes';
END
ELSE
BEGIN
    PRINT 'Table ElectronicInvoices already exists';
END
GO
