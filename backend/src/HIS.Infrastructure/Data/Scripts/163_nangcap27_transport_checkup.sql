-- NangCap27 (HSMT Bệnh viện Tâm thần Quảng Ngãi) — đóng 2 gap nghiệp vụ có bảng:
--   G1 Phiếu vận chuyển người bệnh (HSMT 4.1.8/4.1.30, 10.1.9/.11, 11.1.12/.14, 18.2.9/.11, 18.3.12/.14)
--      Danh mục TransportServices + GasolinePrices đã có từ mig 42; migration này bổ sung PHIẾU.
--   G8 Khám sức khỏe theo đoàn: Danh mục công ty + Hợp đồng KSK (HSMT 17.1, 17.2)
-- CreatedBy/UpdatedBy dùng nvarchar(450) để KHÔNG dính ValueConverter Guid↔String (HISDbContext).
-- Idempotent: an toàn cho ProductionSchemaRepairRunner chạy lúc startup.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF OBJECT_ID('dbo.PatientTransportSlips', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.PatientTransportSlips (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_PatientTransportSlips PRIMARY KEY,
        SlipCode nvarchar(32) NOT NULL,
        PatientId uniqueidentifier NOT NULL,
        MedicalRecordId uniqueidentifier NULL,
        ExaminationId uniqueidentifier NULL,
        DepartmentId uniqueidentifier NULL,
        TransportServiceId uniqueidentifier NOT NULL,
        GasolinePriceId uniqueidentifier NULL,
        FuelType nvarchar(64) NULL,
        TransportDate datetime2 NOT NULL,
        FromPlace nvarchar(256) NOT NULL,
        ToPlace nvarchar(256) NOT NULL,
        Reason nvarchar(500) NULL,
        VehiclePlate nvarchar(32) NULL,
        DriverName nvarchar(128) NULL,
        EscortStaff nvarchar(256) NULL,
        -- Snapshot giá tại thời điểm lập phiếu: danh mục đổi giá KHÔNG được làm đổi phiếu đã lập.
        DistanceKm decimal(18,2) NOT NULL CONSTRAINT DF_PatientTransportSlips_DistanceKm DEFAULT (0),
        CalculationType int NOT NULL CONSTRAINT DF_PatientTransportSlips_CalcType DEFAULT (1),
        UnitPrice decimal(18,2) NOT NULL CONSTRAINT DF_PatientTransportSlips_UnitPrice DEFAULT (0),
        GasolineFactor decimal(18,4) NULL,
        FuelPricePerLitre decimal(18,2) NULL,
        ServiceAmount decimal(18,2) NOT NULL CONSTRAINT DF_PatientTransportSlips_ServiceAmount DEFAULT (0),
        FuelAmount decimal(18,2) NOT NULL CONSTRAINT DF_PatientTransportSlips_FuelAmount DEFAULT (0),
        TotalAmount decimal(18,2) NOT NULL CONSTRAINT DF_PatientTransportSlips_TotalAmount DEFAULT (0),
        -- 0=Nháp, 1=Đã duyệt, 2=Hoàn thành, 3=Hủy
        Status int NOT NULL CONSTRAINT DF_PatientTransportSlips_Status DEFAULT (0),
        ApprovedByUserId uniqueidentifier NULL,
        ApprovedAt datetime2 NULL,
        CancelReason nvarchar(500) NULL,
        Note nvarchar(500) NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_PatientTransportSlips_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2 NULL,
        CreatedBy nvarchar(450) NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_PatientTransportSlips_IsDeleted DEFAULT (0),
        CONSTRAINT FK_PatientTransportSlips_Patients FOREIGN KEY (PatientId)
            REFERENCES dbo.Patients (Id),
        CONSTRAINT FK_PatientTransportSlips_TransportServices FOREIGN KEY (TransportServiceId)
            REFERENCES dbo.TransportServices (Id)
    );
END;

IF OBJECT_ID('dbo.CheckupCompanies', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CheckupCompanies (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_CheckupCompanies PRIMARY KEY,
        Code nvarchar(32) NOT NULL,
        Name nvarchar(256) NOT NULL,
        TaxCode nvarchar(32) NULL,
        Address nvarchar(500) NULL,
        Phone nvarchar(32) NULL,
        Email nvarchar(128) NULL,
        ContactPerson nvarchar(128) NULL,
        ContactPhone nvarchar(32) NULL,
        Note nvarchar(500) NULL,
        IsActive bit NOT NULL CONSTRAINT DF_CheckupCompanies_IsActive DEFAULT (1),
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_CheckupCompanies_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2 NULL,
        CreatedBy nvarchar(450) NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_CheckupCompanies_IsDeleted DEFAULT (0)
    );
END;

IF OBJECT_ID('dbo.CheckupContracts', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CheckupContracts (
        Id uniqueidentifier NOT NULL CONSTRAINT PK_CheckupContracts PRIMARY KEY,
        ContractCode nvarchar(64) NOT NULL,
        CheckupCompanyId uniqueidentifier NOT NULL,
        -- Liên kết đợt khám sẵn có (HealthCheckupCampaigns) nếu đã tạo đợt.
        CampaignId uniqueidentifier NULL,
        ContractDate datetime2 NOT NULL,
        EffectiveFrom datetime2 NULL,
        EffectiveTo datetime2 NULL,
        PackageName nvarchar(256) NULL,
        UnitPrice decimal(18,2) NOT NULL CONSTRAINT DF_CheckupContracts_UnitPrice DEFAULT (0),
        ExpectedHeadcount int NOT NULL CONSTRAINT DF_CheckupContracts_Headcount DEFAULT (0),
        TotalAmount decimal(18,2) NOT NULL CONSTRAINT DF_CheckupContracts_TotalAmount DEFAULT (0),
        -- 0=Nháp, 1=Hiệu lực, 2=Hoàn thành, 3=Thanh lý
        Status int NOT NULL CONSTRAINT DF_CheckupContracts_Status DEFAULT (0),
        Note nvarchar(500) NULL,
        CreatedAt datetime2 NOT NULL CONSTRAINT DF_CheckupContracts_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt datetime2 NULL,
        CreatedBy nvarchar(450) NULL,
        UpdatedBy nvarchar(450) NULL,
        IsDeleted bit NOT NULL CONSTRAINT DF_CheckupContracts_IsDeleted DEFAULT (0),
        CONSTRAINT FK_CheckupContracts_Companies FOREIGN KEY (CheckupCompanyId)
            REFERENCES dbo.CheckupCompanies (Id)
    );
END;

GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Bảng đã tạo trước khi bổ sung FuelType (bản nháp nội bộ) → thêm cột tại chỗ.
IF OBJECT_ID('dbo.PatientTransportSlips', 'U') IS NOT NULL
   AND COL_LENGTH('dbo.PatientTransportSlips', 'FuelType') IS NULL
BEGIN
    ALTER TABLE dbo.PatientTransportSlips ADD FuelType nvarchar(64) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_PatientTransportSlips_SlipCode'
      AND object_id = OBJECT_ID('dbo.PatientTransportSlips'))
BEGIN
    CREATE UNIQUE INDEX UX_PatientTransportSlips_SlipCode
        ON dbo.PatientTransportSlips (SlipCode)
        WHERE IsDeleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_PatientTransportSlips_Patient_Date'
      AND object_id = OBJECT_ID('dbo.PatientTransportSlips'))
BEGIN
    CREATE INDEX IX_PatientTransportSlips_Patient_Date
        ON dbo.PatientTransportSlips (PatientId, TransportDate)
        WHERE IsDeleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_PatientTransportSlips_MedicalRecord'
      AND object_id = OBJECT_ID('dbo.PatientTransportSlips'))
BEGIN
    CREATE INDEX IX_PatientTransportSlips_MedicalRecord
        ON dbo.PatientTransportSlips (MedicalRecordId)
        WHERE IsDeleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_CheckupCompanies_Code'
      AND object_id = OBJECT_ID('dbo.CheckupCompanies'))
BEGIN
    CREATE UNIQUE INDEX UX_CheckupCompanies_Code
        ON dbo.CheckupCompanies (Code)
        WHERE IsDeleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UX_CheckupContracts_Code'
      AND object_id = OBJECT_ID('dbo.CheckupContracts'))
BEGIN
    CREATE UNIQUE INDEX UX_CheckupContracts_Code
        ON dbo.CheckupContracts (ContractCode)
        WHERE IsDeleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_CheckupContracts_Company'
      AND object_id = OBJECT_ID('dbo.CheckupContracts'))
BEGIN
    CREATE INDEX IX_CheckupContracts_Company
        ON dbo.CheckupContracts (CheckupCompanyId)
        WHERE IsDeleted = 0;
END;
GO

-- Seed danh mục dịch vụ vận chuyển (mig 42 tạo bảng nhưng KHÔNG seed dòng nào ⇒ màn lập phiếu
-- vận chuyển không có gì để chọn). Chỉ seed khi bảng còn rỗng — không đụng danh mục BV đã nhập.
--
-- ⚠️ ĐƠN GIÁ = 0 CÓ CHỦ Ý: giá dịch vụ vận chuyển do từng bệnh viện quyết định theo bảng giá
-- được phê duyệt. Điền số bịa vào đây sẽ ra tiền SAI trên phiếu thu của người bệnh, nên chỉ tạo
-- sẵn dòng danh mục + ghi chú; bệnh viện phải cập nhật đơn giá và hệ số xăng trước khi dùng.
-- (Khác với GasolinePrices ở mig 42 — giá xăng là số công bố công khai của Liên Bộ nên seed được.)
IF NOT EXISTS (SELECT 1 FROM dbo.TransportServices WHERE IsDeleted = 0)
BEGIN
    INSERT INTO dbo.TransportServices (Code, Name, CalculationType, UnitPrice, GasolineFactor, Note, SortOrder, IsActive) VALUES
        (N'VC-CC-KM',  N'Xe cứu thương chuyển tuyến (tính theo km)', 1, 0, NULL,
            N'CHƯA CÓ GIÁ — nhập đơn giá/km và hệ số xăng (lít/km) theo bảng giá được BV phê duyệt', 1, 1),
        (N'VC-CC-LUOT', N'Xe cứu thương chuyển tuyến (tính theo lượt)', 2, 0, NULL,
            N'CHƯA CÓ GIÁ — nhập đơn giá trọn lượt theo bảng giá được BV phê duyệt', 2, 1),
        (N'VC-NOIVIEN', N'Vận chuyển người bệnh trong viện', 2, 0, NULL,
            N'CHƯA CÓ GIÁ — dùng cho chuyển khoa/chuyển phòng, nhập đơn giá nếu có thu', 3, 1);
END;
