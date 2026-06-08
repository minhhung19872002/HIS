-- 82: bảng thuốc/vật tư dùng trong ca PTTT (F1 — audit FLOW-FINAL 2026-06-06).
-- Trước đây kê thuốc/vật tư PTTT chỉ in-memory → mất dữ liệu, không vào viện phí, không trừ kho.
-- Idempotent.
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SurgeryMedicineItems')
BEGIN
    CREATE TABLE SurgeryMedicineItems (
        Id               uniqueidentifier NOT NULL CONSTRAINT PK_SurgeryMedicineItems PRIMARY KEY,
        SurgeryId        uniqueidentifier NOT NULL,
        MedicineId       uniqueidentifier NOT NULL,
        Quantity         decimal(18,2)    NOT NULL CONSTRAINT DF_SurgMed_Qty DEFAULT (0),
        UnitPrice        decimal(18,2)    NOT NULL CONSTRAINT DF_SurgMed_Price DEFAULT (0),
        Amount           decimal(18,2)    NOT NULL CONSTRAINT DF_SurgMed_Amount DEFAULT (0),
        PaymentObject    int              NOT NULL CONSTRAINT DF_SurgMed_PayObj DEFAULT (2),
        WarehouseId      uniqueidentifier NULL,
        BatchNumber      nvarchar(100)    NULL,
        IsInPackage      bit              NOT NULL CONSTRAINT DF_SurgMed_InPkg DEFAULT (0),
        UsageInstruction nvarchar(max)    NULL,
        IsStockDeducted  bit              NOT NULL CONSTRAINT DF_SurgMed_Stock DEFAULT (0),
        IsBilled         bit              NOT NULL CONSTRAINT DF_SurgMed_Billed DEFAULT (0),
        CreatedAt        datetime2        NOT NULL,
        CreatedBy        nvarchar(max)    NULL,
        UpdatedAt        datetime2        NULL,
        UpdatedBy        nvarchar(max)    NULL,
        IsDeleted        bit              NOT NULL CONSTRAINT DF_SurgMed_Del DEFAULT (0)
    );
    CREATE INDEX IX_SurgeryMedicineItems_SurgeryId ON SurgeryMedicineItems(SurgeryId);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SurgerySupplyItems')
BEGIN
    CREATE TABLE SurgerySupplyItems (
        Id              uniqueidentifier NOT NULL CONSTRAINT PK_SurgerySupplyItems PRIMARY KEY,
        SurgeryId       uniqueidentifier NOT NULL,
        SupplyId        uniqueidentifier NOT NULL,
        Quantity        decimal(18,2)    NOT NULL CONSTRAINT DF_SurgSup_Qty DEFAULT (0),
        UnitPrice       decimal(18,2)    NOT NULL CONSTRAINT DF_SurgSup_Price DEFAULT (0),
        Amount          decimal(18,2)    NOT NULL CONSTRAINT DF_SurgSup_Amount DEFAULT (0),
        PaymentObject   int              NOT NULL CONSTRAINT DF_SurgSup_PayObj DEFAULT (2),
        WarehouseId     uniqueidentifier NULL,
        BatchNumber     nvarchar(100)    NULL,
        IsInPackage     bit              NOT NULL CONSTRAINT DF_SurgSup_InPkg DEFAULT (0),
        Notes           nvarchar(max)    NULL,
        IsStockDeducted bit              NOT NULL CONSTRAINT DF_SurgSup_Stock DEFAULT (0),
        IsBilled        bit              NOT NULL CONSTRAINT DF_SurgSup_Billed DEFAULT (0),
        CreatedAt       datetime2        NOT NULL,
        CreatedBy       nvarchar(max)    NULL,
        UpdatedAt       datetime2        NULL,
        UpdatedBy       nvarchar(max)    NULL,
        IsDeleted       bit              NOT NULL CONSTRAINT DF_SurgSup_Del DEFAULT (0)
    );
    CREATE INDEX IX_SurgerySupplyItems_SurgeryId ON SurgerySupplyItems(SurgeryId);
END
