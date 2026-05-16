-- NangCap17 Module C: Enhanced Hospital Pharmacy tables
-- Idempotent: IF NOT EXISTS

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PharmacyCustomers')
BEGIN
    CREATE TABLE PharmacyCustomers (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CustomerCode NVARCHAR(50) NOT NULL,
        FullName NVARCHAR(200) NOT NULL,
        Phone NVARCHAR(20) NULL,
        Email NVARCHAR(200) NULL,
        [Address] NVARCHAR(500) NULL,
        DateOfBirth DATETIME2 NULL,
        Gender INT NULL,
        CustomerType INT NOT NULL DEFAULT 1,
        CardNumber NVARCHAR(50) NULL,
        TotalPoints INT NOT NULL DEFAULT 0,
        TotalPurchaseAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalPurchaseCount INT NOT NULL DEFAULT 0,
        LastPurchaseDate DATETIME2 NULL,
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_PharmacyCustomers_CustomerCode ON PharmacyCustomers(CustomerCode);
    CREATE INDEX IX_PharmacyCustomers_Phone ON PharmacyCustomers(Phone) WHERE Phone IS NOT NULL;
    CREATE INDEX IX_PharmacyCustomers_CardNumber ON PharmacyCustomers(CardNumber) WHERE CardNumber IS NOT NULL;
    PRINT 'Created PharmacyCustomers table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PharmacyPointTransactions')
BEGIN
    CREATE TABLE PharmacyPointTransactions (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        CustomerId UNIQUEIDENTIFIER NOT NULL,
        TransactionType INT NOT NULL, -- 1=Earn, 2=Redeem
        Points INT NOT NULL,
        SaleId UNIQUEIDENTIFIER NULL,
        [Description] NVARCHAR(500) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        FOREIGN KEY (CustomerId) REFERENCES PharmacyCustomers(Id)
    );
    CREATE INDEX IX_PharmacyPointTransactions_CustomerId ON PharmacyPointTransactions(CustomerId);
    PRINT 'Created PharmacyPointTransactions table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PharmacyShifts')
BEGIN
    CREATE TABLE PharmacyShifts (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        ShiftCode NVARCHAR(50) NOT NULL,
        CashierId UNIQUEIDENTIFIER NOT NULL,
        StartTime DATETIME2 NOT NULL,
        EndTime DATETIME2 NULL,
        OpeningCash DECIMAL(18,2) NOT NULL DEFAULT 0,
        ClosingCash DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalSales DECIMAL(18,2) NOT NULL DEFAULT 0,
        TotalRefunds DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Status] INT NOT NULL DEFAULT 1, -- 1=Open, 2=Closed
        Notes NVARCHAR(1000) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_PharmacyShifts_CashierId ON PharmacyShifts(CashierId);
    CREATE INDEX IX_PharmacyShifts_Status ON PharmacyShifts([Status]);
    PRINT 'Created PharmacyShifts table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PharmacyGppRecords')
BEGIN
    CREATE TABLE PharmacyGppRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        RecordType INT NOT NULL, -- 1=ADR, 2=DrugSuspension, 3=Temperature, 4=Humidity
        RecordDate DATETIME2 NOT NULL,
        [Description] NVARCHAR(2000) NULL,
        MedicineName NVARCHAR(200) NULL,
        BatchNumber NVARCHAR(100) NULL,
        Temperature DECIMAL(5,2) NULL,
        Humidity DECIMAL(5,2) NULL,
        ActionTaken NVARCHAR(2000) NULL,
        RecordedById UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_PharmacyGppRecords_RecordType ON PharmacyGppRecords(RecordType);
    CREATE INDEX IX_PharmacyGppRecords_RecordDate ON PharmacyGppRecords(RecordDate);
    PRINT 'Created PharmacyGppRecords table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PharmacyCommissions')
BEGIN
    CREATE TABLE PharmacyCommissions (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        DoctorId UNIQUEIDENTIFIER NULL,
        DoctorName NVARCHAR(200) NULL,
        SaleId UNIQUEIDENTIFIER NULL,
        SaleDate DATETIME2 NOT NULL,
        MedicineName NVARCHAR(200) NULL,
        Quantity DECIMAL(18,2) NOT NULL DEFAULT 0,
        SaleAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        CommissionRate DECIMAL(5,2) NOT NULL DEFAULT 0,
        CommissionAmount DECIMAL(18,2) NOT NULL DEFAULT 0,
        [Status] INT NOT NULL DEFAULT 1, -- 1=Pending, 2=Paid
        PaidDate DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_PharmacyCommissions_DoctorId ON PharmacyCommissions(DoctorId) WHERE DoctorId IS NOT NULL;
    CREATE INDEX IX_PharmacyCommissions_Status ON PharmacyCommissions([Status]);
    CREATE INDEX IX_PharmacyCommissions_SaleDate ON PharmacyCommissions(SaleDate);
    PRINT 'Created PharmacyCommissions table';
END
GO

PRINT 'NangCap17 Module C: Enhanced Pharmacy tables created successfully';
GO
