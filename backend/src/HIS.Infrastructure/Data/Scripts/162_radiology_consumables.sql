-- Định mức tiêu hao + phiếu kê thuốc/vật tư cho ca chụp CĐHA.
-- Trước migration này module 8.4 không có bảng nào: mọi endpoint kê vật tư trả dữ liệu bịa
-- và ném đi dữ liệu người dùng nhập. Idempotent: an toàn cho startup schema repair.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.RadiologyServiceNorms', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RadiologyServiceNorms (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_RadiologyServiceNorms PRIMARY KEY,
        ServiceId uniqueidentifier NOT NULL,
        Note nvarchar(500) NULL,
        IsActive bit NOT NULL CONSTRAINT DF_RadiologyServiceNorms_IsActive DEFAULT (1),
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_RadiologyServiceNorms_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2 NULL,
        CreatedBy nvarchar(450) NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_RadiologyServiceNorms_IsDeleted DEFAULT (0),
        CONSTRAINT FK_RadiologyServiceNorms_Services FOREIGN KEY (ServiceId) REFERENCES dbo.Services (Id)
    );
END;

IF OBJECT_ID('dbo.RadiologyServiceNormItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RadiologyServiceNormItems (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_RadiologyServiceNormItems PRIMARY KEY,
        RadiologyServiceNormId uniqueidentifier NOT NULL,
        ItemId uniqueidentifier NOT NULL,
        ItemType nvarchar(16) NOT NULL CONSTRAINT DF_RadiologyServiceNormItems_ItemType DEFAULT ('Medicine'),
        Quantity decimal(18,3) NOT NULL CONSTRAINT DF_RadiologyServiceNormItems_Quantity DEFAULT (0),
        Unit nvarchar(32) NULL,
        IsRequired bit NOT NULL CONSTRAINT DF_RadiologyServiceNormItems_IsRequired DEFAULT (0),
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_RadiologyServiceNormItems_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2 NULL,
        CreatedBy nvarchar(450) NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_RadiologyServiceNormItems_IsDeleted DEFAULT (0),
        CONSTRAINT FK_RadiologyServiceNormItems_Norm FOREIGN KEY (RadiologyServiceNormId)
            REFERENCES dbo.RadiologyServiceNorms (Id) ON DELETE CASCADE
    );
END;

IF OBJECT_ID('dbo.RadiologyPrescriptions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RadiologyPrescriptions (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_RadiologyPrescriptions PRIMARY KEY,
        RadiologyRequestId uniqueidentifier NOT NULL,
        WarehouseId uniqueidentifier NOT NULL,
        PrescriptionCode nvarchar(32) NOT NULL,
        PrescriptionDate datetime2 NOT NULL,
        PrescribedByUserId uniqueidentifier NULL,
        Status int NOT NULL CONSTRAINT DF_RadiologyPrescriptions_Status DEFAULT (0),
        TotalAmount decimal(18,2) NOT NULL CONSTRAINT DF_RadiologyPrescriptions_TotalAmount DEFAULT (0),
        Note nvarchar(500) NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_RadiologyPrescriptions_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2 NULL,
        CreatedBy nvarchar(450) NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_RadiologyPrescriptions_IsDeleted DEFAULT (0),
        CONSTRAINT FK_RadiologyPrescriptions_Requests FOREIGN KEY (RadiologyRequestId)
            REFERENCES dbo.RadiologyRequests (Id),
        CONSTRAINT FK_RadiologyPrescriptions_Warehouses FOREIGN KEY (WarehouseId)
            REFERENCES dbo.Warehouses (Id)
    );
END;

IF OBJECT_ID('dbo.RadiologyPrescriptionItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RadiologyPrescriptionItems (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_RadiologyPrescriptionItems PRIMARY KEY,
        RadiologyPrescriptionId uniqueidentifier NOT NULL,
        ItemId uniqueidentifier NOT NULL,
        ItemType nvarchar(16) NOT NULL CONSTRAINT DF_RadiologyPrescriptionItems_ItemType DEFAULT ('Medicine'),
        Quantity decimal(18,3) NOT NULL CONSTRAINT DF_RadiologyPrescriptionItems_Quantity DEFAULT (0),
        UnitPrice decimal(18,2) NOT NULL CONSTRAINT DF_RadiologyPrescriptionItems_UnitPrice DEFAULT (0),
        InsurancePrice decimal(18,2) NOT NULL CONSTRAINT DF_RadiologyPrescriptionItems_InsurancePrice DEFAULT (0),
        Amount decimal(18,2) NOT NULL CONSTRAINT DF_RadiologyPrescriptionItems_Amount DEFAULT (0),
        LotNumber nvarchar(64) NULL,
        ExpiryDate datetime2 NULL,
        Note nvarchar(500) NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_RadiologyPrescriptionItems_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2 NULL,
        CreatedBy nvarchar(450) NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_RadiologyPrescriptionItems_IsDeleted DEFAULT (0),
        CONSTRAINT FK_RadiologyPrescriptionItems_Prescription FOREIGN KEY (RadiologyPrescriptionId)
            REFERENCES dbo.RadiologyPrescriptions (Id) ON DELETE CASCADE
    );
END;

GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Mỗi dịch vụ chỉ có một bộ định mức đang hiệu lực.
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_RadiologyServiceNorms_ServiceId'
      AND object_id = OBJECT_ID('dbo.RadiologyServiceNorms'))
BEGIN
    CREATE UNIQUE INDEX UX_RadiologyServiceNorms_ServiceId
        ON dbo.RadiologyServiceNorms (ServiceId)
        WHERE IsDeleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_RadiologyPrescriptions_RequestId'
      AND object_id = OBJECT_ID('dbo.RadiologyPrescriptions'))
BEGIN
    CREATE INDEX IX_RadiologyPrescriptions_RequestId
        ON dbo.RadiologyPrescriptions (RadiologyRequestId)
        WHERE IsDeleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_RadiologyPrescriptions_Code'
      AND object_id = OBJECT_ID('dbo.RadiologyPrescriptions'))
BEGIN
    CREATE UNIQUE INDEX UX_RadiologyPrescriptions_Code
        ON dbo.RadiologyPrescriptions (PrescriptionCode)
        WHERE IsDeleted = 0;
END;
