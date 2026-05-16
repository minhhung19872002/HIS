-- Create missing billing and warehouse tables from InitialCreate migration.
-- Order matters because of FK dependencies.

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MedicalSupplies')
BEGIN
    CREATE TABLE [MedicalSupplies] (
        [Id] uniqueidentifier NOT NULL,
        [SupplyCode] nvarchar(max) NOT NULL,
        [SupplyName] nvarchar(max) NOT NULL,
        [SupplyCodeBYT] nvarchar(max) NULL,
        [RegistrationNumber] nvarchar(max) NULL,
        [SupplyType] int NOT NULL,
        [SupplyGroupCode] nvarchar(max) NULL,
        [Unit] nvarchar(max) NULL,
        [Specification] nvarchar(max) NULL,
        [Manufacturer] nvarchar(max) NULL,
        [ManufacturerCountry] nvarchar(max) NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [InsurancePrice] decimal(18,2) NOT NULL,
        [IsInsuranceCovered] bit NOT NULL,
        [InsurancePaymentRate] int NOT NULL,
        [IsReusable] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_MedicalSupplies] PRIMARY KEY ([Id])
    );
    PRINT 'Created MedicalSupplies table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Warehouses')
BEGIN
    CREATE TABLE [Warehouses] (
        [Id] uniqueidentifier NOT NULL,
        [WarehouseCode] nvarchar(max) NOT NULL,
        [WarehouseName] nvarchar(max) NOT NULL,
        [WarehouseType] int NOT NULL,
        [Location] nvarchar(max) NULL,
        [DepartmentId] uniqueidentifier NULL,
        [ParentWarehouseId] uniqueidentifier NULL,
        [IsPharmacy] bit NOT NULL,
        [IsCabinet] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Warehouses] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Warehouses_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Warehouses_Warehouses_ParentWarehouseId] FOREIGN KEY ([ParentWarehouseId]) REFERENCES [Warehouses]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Created Warehouses table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashBooks')
BEGIN
    CREATE TABLE [CashBooks] (
        [Id] uniqueidentifier NOT NULL,
        [BookCode] nvarchar(max) NOT NULL,
        [BookName] nvarchar(max) NOT NULL,
        [BookType] int NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NULL,
        [CashierId] uniqueidentifier NOT NULL,
        [OpeningBalance] decimal(18,2) NOT NULL,
        [TotalReceipt] decimal(18,2) NOT NULL,
        [TotalRefund] decimal(18,2) NOT NULL,
        [ClosingBalance] decimal(18,2) NOT NULL,
        [IsClosed] bit NOT NULL,
        [ClosedAt] datetime2 NULL,
        [Note] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_CashBooks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CashBooks_Users_CashierId] FOREIGN KEY ([CashierId]) REFERENCES [Users]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created CashBooks table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExportReceipts')
BEGIN
    CREATE TABLE [ExportReceipts] (
        [Id] uniqueidentifier NOT NULL,
        [ReceiptCode] nvarchar(max) NOT NULL,
        [ReceiptDate] datetime2 NOT NULL,
        [WarehouseId] uniqueidentifier NOT NULL,
        [ExportType] int NOT NULL,
        [PatientId] uniqueidentifier NULL,
        [MedicalRecordId] uniqueidentifier NULL,
        [PrescriptionId] uniqueidentifier NULL,
        [ToDepartmentId] uniqueidentifier NULL,
        [ToWarehouseId] uniqueidentifier NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [Note] nvarchar(max) NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ExportReceipts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExportReceipts_Warehouses_WarehouseId] FOREIGN KEY ([WarehouseId]) REFERENCES [Warehouses]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created ExportReceipts table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ImportReceipts')
BEGIN
    CREATE TABLE [ImportReceipts] (
        [Id] uniqueidentifier NOT NULL,
        [ReceiptCode] nvarchar(max) NOT NULL,
        [ReceiptDate] datetime2 NOT NULL,
        [WarehouseId] uniqueidentifier NOT NULL,
        [ImportType] int NOT NULL,
        [SupplierCode] nvarchar(max) NULL,
        [SupplierName] nvarchar(max) NULL,
        [InvoiceNumber] nvarchar(max) NULL,
        [InvoiceDate] datetime2 NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [Discount] decimal(18,2) NOT NULL,
        [Vat] decimal(18,2) NOT NULL,
        [FinalAmount] decimal(18,2) NOT NULL,
        [Note] nvarchar(max) NULL,
        [Status] int NOT NULL,
        [ApprovedBy] uniqueidentifier NULL,
        [ApprovedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ImportReceipts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ImportReceipts_Warehouses_WarehouseId] FOREIGN KEY ([WarehouseId]) REFERENCES [Warehouses]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created ImportReceipts table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InventoryItems')
BEGIN
    CREATE TABLE [InventoryItems] (
        [Id] uniqueidentifier NOT NULL,
        [WarehouseId] uniqueidentifier NOT NULL,
        [ItemId] uniqueidentifier NULL,
        [ItemType] nvarchar(max) NOT NULL,
        [MedicineId] uniqueidentifier NULL,
        [SupplyId] uniqueidentifier NULL,
        [BatchNumber] nvarchar(max) NULL,
        [ExpiryDate] datetime2 NULL,
        [ManufactureDate] datetime2 NULL,
        [Quantity] decimal(18,2) NOT NULL,
        [ReservedQuantity] decimal(18,2) NOT NULL,
        [ImportPrice] decimal(18,2) NOT NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [IsLocked] bit NOT NULL,
        [LockReason] nvarchar(max) NULL,
        [SourceType] nvarchar(max) NULL,
        [SourceCode] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_InventoryItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InventoryItems_MedicalSupplies_SupplyId] FOREIGN KEY ([SupplyId]) REFERENCES [MedicalSupplies]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InventoryItems_Medicines_MedicineId] FOREIGN KEY ([MedicineId]) REFERENCES [Medicines]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_InventoryItems_Warehouses_WarehouseId] FOREIGN KEY ([WarehouseId]) REFERENCES [Warehouses]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created InventoryItems table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'WarehouseTransfers')
BEGIN
    CREATE TABLE [WarehouseTransfers] (
        [Id] uniqueidentifier NOT NULL,
        [TransferCode] nvarchar(max) NOT NULL,
        [FromWarehouseId] uniqueidentifier NOT NULL,
        [ToWarehouseId] uniqueidentifier NOT NULL,
        [TransferDate] datetime2 NOT NULL,
        [Status] int NOT NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [RequestedBy] nvarchar(max) NULL,
        [ApprovedAt] datetime2 NULL,
        [ApprovedBy] uniqueidentifier NULL,
        [DeliveredAt] datetime2 NULL,
        [DeliveredBy] uniqueidentifier NULL,
        [ReceivedAt] datetime2 NULL,
        [ReceivedBy] uniqueidentifier NULL,
        [Notes] nvarchar(max) NULL,
        [CancellationReason] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_WarehouseTransfers] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WarehouseTransfers_Warehouses_FromWarehouseId] FOREIGN KEY ([FromWarehouseId]) REFERENCES [Warehouses]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_WarehouseTransfers_Warehouses_ToWarehouseId] FOREIGN KEY ([ToWarehouseId]) REFERENCES [Warehouses]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Created WarehouseTransfers table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Deposits')
BEGIN
    CREATE TABLE [Deposits] (
        [Id] uniqueidentifier NOT NULL,
        [ReceiptNumber] nvarchar(max) NOT NULL,
        [ReceiptDate] datetime2 NOT NULL,
        [PatientId] uniqueidentifier NULL,
        [MedicalRecordId] uniqueidentifier NULL,
        [Amount] decimal(18,2) NOT NULL,
        [PaymentMethod] int NOT NULL,
        [TransactionReference] nvarchar(max) NULL,
        [Notes] nvarchar(max) NULL,
        [ReceivedByUserId] uniqueidentifier NOT NULL,
        [ReceivedById] uniqueidentifier NOT NULL,
        [Status] int NOT NULL,
        [UsedAmount] decimal(18,2) NOT NULL,
        [RemainingAmount] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Deposits] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Deposits_MedicalRecords_MedicalRecordId] FOREIGN KEY ([MedicalRecordId]) REFERENCES [MedicalRecords]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Deposits_Patients_PatientId] FOREIGN KEY ([PatientId]) REFERENCES [Patients]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Deposits_Users_ReceivedById] FOREIGN KEY ([ReceivedById]) REFERENCES [Users]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created Deposits table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ImportReceiptDetails')
BEGIN
    CREATE TABLE [ImportReceiptDetails] (
        [Id] uniqueidentifier NOT NULL,
        [ImportReceiptId] uniqueidentifier NOT NULL,
        [MedicineId] uniqueidentifier NULL,
        [SupplyId] uniqueidentifier NULL,
        [BatchNumber] nvarchar(max) NULL,
        [ExpiryDate] datetime2 NULL,
        [ManufactureDate] datetime2 NULL,
        [Quantity] decimal(18,2) NOT NULL,
        [Unit] nvarchar(max) NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Vat] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ImportReceiptDetails] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ImportReceiptDetails_ImportReceipts_ImportReceiptId] FOREIGN KEY ([ImportReceiptId]) REFERENCES [ImportReceipts]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ImportReceiptDetails_MedicalSupplies_SupplyId] FOREIGN KEY ([SupplyId]) REFERENCES [MedicalSupplies]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ImportReceiptDetails_Medicines_MedicineId] FOREIGN KEY ([MedicineId]) REFERENCES [Medicines]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Created ImportReceiptDetails table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExportReceiptDetails')
BEGIN
    CREATE TABLE [ExportReceiptDetails] (
        [Id] uniqueidentifier NOT NULL,
        [ExportReceiptId] uniqueidentifier NOT NULL,
        [MedicineId] uniqueidentifier NULL,
        [SupplyId] uniqueidentifier NULL,
        [InventoryItemId] uniqueidentifier NULL,
        [BatchNumber] nvarchar(max) NULL,
        [ExpiryDate] datetime2 NULL,
        [Quantity] decimal(18,2) NOT NULL,
        [Unit] nvarchar(max) NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ExportReceiptDetails] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExportReceiptDetails_ExportReceipts_ExportReceiptId] FOREIGN KEY ([ExportReceiptId]) REFERENCES [ExportReceipts]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ExportReceiptDetails_InventoryItems_InventoryItemId] FOREIGN KEY ([InventoryItemId]) REFERENCES [InventoryItems]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ExportReceiptDetails_MedicalSupplies_SupplyId] FOREIGN KEY ([SupplyId]) REFERENCES [MedicalSupplies]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ExportReceiptDetails_Medicines_MedicineId] FOREIGN KEY ([MedicineId]) REFERENCES [Medicines]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Created ExportReceiptDetails table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InvoiceSummaries')
BEGIN
    CREATE TABLE [InvoiceSummaries] (
        [Id] uniqueidentifier NOT NULL,
        [InvoiceCode] nvarchar(max) NOT NULL,
        [InvoiceDate] datetime2 NOT NULL,
        [MedicalRecordId] uniqueidentifier NOT NULL,
        [TotalServiceAmount] decimal(18,2) NOT NULL,
        [TotalMedicineAmount] decimal(18,2) NOT NULL,
        [TotalSupplyAmount] decimal(18,2) NOT NULL,
        [TotalBedAmount] decimal(18,2) NOT NULL,
        [TotalAmount] decimal(18,2) NOT NULL,
        [InsuranceAmount] decimal(18,2) NOT NULL,
        [PatientCoPayment] decimal(18,2) NOT NULL,
        [OutOfPocket] decimal(18,2) NOT NULL,
        [DepositAmount] decimal(18,2) NOT NULL,
        [PaidAmount] decimal(18,2) NOT NULL,
        [RefundAmount] decimal(18,2) NOT NULL,
        [RemainingAmount] decimal(18,2) NOT NULL,
        [DiscountAmount] decimal(18,2) NOT NULL,
        [DiscountReason] nvarchar(max) NULL,
        [Status] int NOT NULL,
        [IsApprovedByAccountant] bit NOT NULL,
        [ApprovedAt] datetime2 NULL,
        [ApprovedBy] uniqueidentifier NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_InvoiceSummaries] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InvoiceSummaries_MedicalRecords_MedicalRecordId] FOREIGN KEY ([MedicalRecordId]) REFERENCES [MedicalRecords]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created InvoiceSummaries table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Receipts')
BEGIN
    CREATE TABLE [Receipts] (
        [Id] uniqueidentifier NOT NULL,
        [ReceiptCode] nvarchar(max) NOT NULL,
        [ReceiptDate] datetime2 NOT NULL,
        [PatientId] uniqueidentifier NOT NULL,
        [MedicalRecordId] uniqueidentifier NULL,
        [ReceiptType] int NOT NULL,
        [PaymentMethod] int NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Discount] decimal(18,2) NOT NULL,
        [FinalAmount] decimal(18,2) NOT NULL,
        [Note] nvarchar(max) NULL,
        [Status] int NOT NULL,
        [CashierId] uniqueidentifier NOT NULL,
        [CashBookId] uniqueidentifier NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_Receipts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Receipts_CashBooks_CashBookId] FOREIGN KEY ([CashBookId]) REFERENCES [CashBooks]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Receipts_MedicalRecords_MedicalRecordId] FOREIGN KEY ([MedicalRecordId]) REFERENCES [MedicalRecords]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Receipts_Patients_PatientId] FOREIGN KEY ([PatientId]) REFERENCES [Patients]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_Receipts_Users_CashierId] FOREIGN KEY ([CashierId]) REFERENCES [Users]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created Receipts table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'WarehouseTransferItems')
BEGIN
    CREATE TABLE [WarehouseTransferItems] (
        [Id] uniqueidentifier NOT NULL,
        [WarehouseTransferId] uniqueidentifier NOT NULL,
        [MedicineId] uniqueidentifier NOT NULL,
        [InventoryItemId] uniqueidentifier NULL,
        [BatchNumber] nvarchar(max) NULL,
        [ExpiryDate] datetime2 NULL,
        [RequestedQuantity] decimal(18,2) NOT NULL,
        [DeliveredQuantity] decimal(18,2) NULL,
        [ReceivedQuantity] decimal(18,2) NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_WarehouseTransferItems] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_WarehouseTransferItems_InventoryItems_InventoryItemId] FOREIGN KEY ([InventoryItemId]) REFERENCES [InventoryItems]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_WarehouseTransferItems_Medicines_MedicineId] FOREIGN KEY ([MedicineId]) REFERENCES [Medicines]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_WarehouseTransferItems_WarehouseTransfers_WarehouseTransferId] FOREIGN KEY ([WarehouseTransferId]) REFERENCES [WarehouseTransfers]([Id]) ON DELETE CASCADE
    );
    PRINT 'Created WarehouseTransferItems table';
END;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ReceiptDetails')
BEGIN
    CREATE TABLE [ReceiptDetails] (
        [Id] uniqueidentifier NOT NULL,
        [ReceiptId] uniqueidentifier NOT NULL,
        [ServiceRequestDetailId] uniqueidentifier NULL,
        [PrescriptionDetailId] uniqueidentifier NULL,
        [ItemCode] nvarchar(max) NULL,
        [ItemName] nvarchar(max) NULL,
        [ItemType] int NOT NULL,
        [Quantity] decimal(18,2) NOT NULL,
        [UnitPrice] decimal(18,2) NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Discount] decimal(18,2) NOT NULL,
        [FinalAmount] decimal(18,2) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedBy] nvarchar(max) NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedBy] nvarchar(max) NULL,
        [IsDeleted] bit NOT NULL,
        CONSTRAINT [PK_ReceiptDetails] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReceiptDetails_PrescriptionDetails_PrescriptionDetailId] FOREIGN KEY ([PrescriptionDetailId]) REFERENCES [PrescriptionDetails]([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_ReceiptDetails_Receipts_ReceiptId] FOREIGN KEY ([ReceiptId]) REFERENCES [Receipts]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ReceiptDetails_ServiceRequestDetails_ServiceRequestDetailId] FOREIGN KEY ([ServiceRequestDetailId]) REFERENCES [ServiceRequestDetails]([Id]) ON DELETE NO ACTION
    );
    PRINT 'Created ReceiptDetails table';
END;
GO
