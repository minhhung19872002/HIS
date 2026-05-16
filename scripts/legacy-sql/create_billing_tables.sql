-- Create missing billing tables for HIS
-- Tables: CashBooks, Deposits, Receipts, ReceiptDetails, InvoiceSummaries

-- 1. CashBooks
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashBooks')
BEGIN
    CREATE TABLE CashBooks (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        BookCode NVARCHAR(50) NOT NULL,
        BookName NVARCHAR(200) NOT NULL,
        BookType INT NOT NULL DEFAULT 1, -- 1-Thu tien, 2-Tam ung
        StartDate DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        EndDate DATETIME2(7) NULL,
        CashierId UNIQUEIDENTIFIER NOT NULL,
        OpeningBalance DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalReceipt DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalRefund DECIMAL(18,2) NOT NULL DEFAULT 0,
        ClosingBalance DECIMAL(18,2) NOT NULL DEFAULT 0,
        IsClosed BIT NOT NULL DEFAULT 0,
        ClosedAt DATETIME2(7) NULL,
        Note NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2(7) NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_CashBooks_Users_CashierId FOREIGN KEY (CashierId) REFERENCES Users(Id)
    );
    PRINT 'Created CashBooks table';
END
GO

-- 2. Receipts
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Receipts')
BEGIN
    CREATE TABLE Receipts (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        ReceiptCode NVARCHAR(50) NOT NULL,
        ReceiptDate DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        PatientId UNIQUEIDENTIFIER NOT NULL,
        MedicalRecordId UNIQUEIDENTIFIER NULL,
        ReceiptType INT NOT NULL DEFAULT 1, -- 1-Tam ung, 2-Thanh toan, 3-Hoan tra
        PaymentMethod INT NOT NULL DEFAULT 1, -- 1-Tien mat, 2-Chuyen khoan, 3-The, 4-Vi dien tu
        Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        Discount DECIMAL(18,2) NOT NULL DEFAULT 0,
        FinalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        Note NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 1, -- 1-Da thu, 2-Da huy
        CashierId UNIQUEIDENTIFIER NOT NULL,
        CashBookId UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2(7) NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_Receipts_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_Receipts_MedicalRecords FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id),
        CONSTRAINT FK_Receipts_Users_Cashier FOREIGN KEY (CashierId) REFERENCES Users(Id),
        CONSTRAINT FK_Receipts_CashBooks FOREIGN KEY (CashBookId) REFERENCES CashBooks(Id)
    );
    PRINT 'Created Receipts table';
END
GO

-- 3. ReceiptDetails
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ReceiptDetails')
BEGIN
    CREATE TABLE ReceiptDetails (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        ReceiptId UNIQUEIDENTIFIER NOT NULL,
        ServiceRequestDetailId UNIQUEIDENTIFIER NULL,
        PrescriptionDetailId UNIQUEIDENTIFIER NULL,
        ItemCode NVARCHAR(50) NULL,
        ItemName NVARCHAR(200) NULL,
        ItemType INT NOT NULL DEFAULT 1, -- 1-Dich vu, 2-Thuoc, 3-Vat tu
        Quantity DECIMAL(18,2) NOT NULL DEFAULT 0,
        UnitPrice DECIMAL(18,2) NOT NULL DEFAULT 0,
        Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        Discount DECIMAL(18,2) NOT NULL DEFAULT 0,
        FinalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2(7) NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_ReceiptDetails_Receipts FOREIGN KEY (ReceiptId) REFERENCES Receipts(Id)
    );
    PRINT 'Created ReceiptDetails table';
END
GO

-- 4. Deposits
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Deposits')
BEGIN
    CREATE TABLE Deposits (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        ReceiptNumber NVARCHAR(50) NOT NULL,
        ReceiptDate DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        PatientId UNIQUEIDENTIFIER NULL,
        MedicalRecordId UNIQUEIDENTIFIER NULL,
        Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
        PaymentMethod INT NOT NULL DEFAULT 1, -- 1-Tien mat, 2-Chuyen khoan, 3-The, 4-QR
        TransactionReference NVARCHAR(200) NULL,
        Notes NVARCHAR(MAX) NULL,
        ReceivedByUserId UNIQUEIDENTIFIER NOT NULL,
        Status INT NOT NULL DEFAULT 1, -- 1-Active, 2-Used, 3-Refunded
        UsedAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        RemainingAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2(7) NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_Deposits_Patients FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_Deposits_MedicalRecords FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id),
        CONSTRAINT FK_Deposits_Users FOREIGN KEY (ReceivedByUserId) REFERENCES Users(Id)
    );
    PRINT 'Created Deposits table';
END
GO

-- 5. InvoiceSummaries
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'InvoiceSummaries')
BEGIN
    CREATE TABLE InvoiceSummaries (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        InvoiceCode NVARCHAR(50) NOT NULL,
        InvoiceDate DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        MedicalRecordId UNIQUEIDENTIFIER NOT NULL,
        TotalServiceAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalMedicineAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalSupplyAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalBedAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        InsuranceAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        PatientCoPayment DECIMAL(18,2) NOT NULL DEFAULT 0,
        OutOfPocket DECIMAL(18,2) NOT NULL DEFAULT 0,
        DepositAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        PaidAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        RefundAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        RemainingAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        DiscountAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        DiscountReason NVARCHAR(MAX) NULL,
        Status INT NOT NULL DEFAULT 0, -- 0-Chua thanh toan, 1-Da thanh toan, 2-Da quyet toan
        IsApprovedByAccountant BIT NOT NULL DEFAULT 0,
        ApprovedAt DATETIME2(7) NULL,
        ApprovedBy UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2(7) NOT NULL DEFAULT GETDATE(),
        CreatedBy NVARCHAR(200) NULL,
        UpdatedAt DATETIME2(7) NULL,
        UpdatedBy NVARCHAR(200) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_InvoiceSummaries_MedicalRecords FOREIGN KEY (MedicalRecordId) REFERENCES MedicalRecords(Id)
    );
    PRINT 'Created InvoiceSummaries table';
END
GO

-- Verify
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('CashBooks','Receipts','ReceiptDetails','Deposits','InvoiceSummaries')
ORDER BY TABLE_NAME;
GO
