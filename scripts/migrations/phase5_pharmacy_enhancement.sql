-- Phase 5: Pharmacy Enhancement — Compounding Orders
-- Date: 2026-06-02
-- Idempotent: safe to run multiple times

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CompoundingOrders')
BEGIN
    CREATE TABLE CompoundingOrders (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        OrderCode NVARCHAR(50) NOT NULL,
        PrescriptionId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        AdmissionId UNIQUEIDENTIFIER NULL,
        DepartmentId UNIQUEIDENTIFIER NOT NULL,
        CompoundingType INT NOT NULL DEFAULT 1,
        Instructions NVARCHAR(MAX) NULL,
        BaseFluid NVARCHAR(200) NULL,
        TotalVolume DECIMAL(18,2) NULL,
        InfusionRate NVARCHAR(100) NULL,
        StabilityNotes NVARCHAR(500) NULL,
        PreparedAt DATETIME2 NULL,
        PreparedById UNIQUEIDENTIFIER NULL,
        CheckedAt DATETIME2 NULL,
        CheckedById UNIQUEIDENTIFIER NULL,
        Status INT NOT NULL DEFAULT 0,
        CancelReason NVARCHAR(500) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL
    );
    PRINT 'Created CompoundingOrders';
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CompoundingOrderItems')
BEGIN
    CREATE TABLE CompoundingOrderItems (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        CompoundingOrderId UNIQUEIDENTIFIER NOT NULL,
        MedicineId UNIQUEIDENTIFIER NOT NULL,
        Quantity DECIMAL(18,4) NOT NULL DEFAULT 0,
        Unit NVARCHAR(50) NULL,
        MixingInstructions NVARCHAR(500) NULL,
        SortOrder INT NOT NULL DEFAULT 0,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        CONSTRAINT FK_CompoundingOrderItems_CompoundingOrders FOREIGN KEY (CompoundingOrderId)
            REFERENCES CompoundingOrders(Id) ON DELETE CASCADE
    );
    PRINT 'Created CompoundingOrderItems';
END

COMMIT TRANSACTION;
PRINT 'Phase 5 migration completed successfully.';
GO
