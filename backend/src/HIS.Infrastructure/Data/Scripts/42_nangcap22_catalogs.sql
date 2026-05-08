-- NangCap22: 13 master catalogs for BV Đắk Nông tender doc
-- Idempotent: IF NOT EXISTS guards on every table + index + seed
SET QUOTED_IDENTIFIER ON;
GO

-- #1 Manufacturers
IF OBJECT_ID('dbo.Manufacturers', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Manufacturers] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [Country] NVARCHAR(100) NULL,
        [Address] NVARCHAR(500) NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_Manufacturers_Code ON dbo.Manufacturers(Code) WHERE IsDeleted = 0;
END
GO

-- #2 MedicationRoutes
IF OBJECT_ID('dbo.MedicationRoutes', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MedicationRoutes] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [BhxhCode] NVARCHAR(20) NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_MedicationRoutes_Code ON dbo.MedicationRoutes(Code) WHERE IsDeleted = 0;
END
GO

-- #3 AdditionalCharges (phụ thu)
IF OBJECT_ID('dbo.AdditionalCharges', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AdditionalCharges] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [Price] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [EffectiveFrom] DATETIME2 NULL,
        [EffectiveTo] DATETIME2 NULL,
        [Unit] NVARCHAR(50) NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_AdditionalCharges_Code ON dbo.AdditionalCharges(Code) WHERE IsDeleted = 0;
END
GO

-- #4 OtherIncomes (thu khác)
IF OBJECT_ID('dbo.OtherIncomes', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[OtherIncomes] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [Price] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [EffectiveFrom] DATETIME2 NULL,
        [EffectiveTo] DATETIME2 NULL,
        [Unit] NVARCHAR(50) NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_OtherIncomes_Code ON dbo.OtherIncomes(Code) WHERE IsDeleted = 0;
END
GO

-- #5 TransportServices (vận chuyển BN)
IF OBJECT_ID('dbo.TransportServices', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TransportServices] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [CalculationType] INT NOT NULL DEFAULT 1,  -- 1=km, 2=lượt
        [UnitPrice] DECIMAL(18,2) NOT NULL DEFAULT 0,
        [GasolineFactor] DECIMAL(18,4) NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_TransportServices_Code ON dbo.TransportServices(Code) WHERE IsDeleted = 0;
END
GO

-- #6 GasolinePrices (giá xăng theo chu kỳ)
IF OBJECT_ID('dbo.GasolinePrices', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GasolinePrices] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [FuelType] NVARCHAR(50) NOT NULL,
        [PricePerLitre] DECIMAL(18,2) NOT NULL,
        [EffectiveFrom] DATETIME2 NOT NULL,
        [IssuedBy] NVARCHAR(255) NULL,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_GasolinePrices_Fuel_Effective ON dbo.GasolinePrices(FuelType, EffectiveFrom DESC) WHERE IsDeleted = 0;
END
GO

-- #7 MachineCodes (mã máy gửi BHXH)
IF OBJECT_ID('dbo.MachineCodes', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MachineCodes] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [Manufacturer] NVARCHAR(255) NULL,
        [Model] NVARCHAR(255) NULL,
        [SerialNumber] NVARCHAR(100) NULL,
        [DepartmentId] UNIQUEIDENTIFIER NULL,
        [RoomId] UNIQUEIDENTIFIER NULL,
        [BhxhCode] NVARCHAR(20) NULL,
        [Note] NVARCHAR(500) NULL,
        [IsLocked] BIT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_MachineCodes_Code ON dbo.MachineCodes(Code) WHERE IsDeleted = 0;
END
GO

-- #8 MachineServices (mapping mã máy ↔ dịch vụ)
IF OBJECT_ID('dbo.MachineServices', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MachineServices] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [MachineCodeId] UNIQUEIDENTIFIER NOT NULL,
        [ServiceId] UNIQUEIDENTIFIER NOT NULL,
        [IsDefault] BIT NOT NULL DEFAULT 0,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_MachineServices_MachineService ON dbo.MachineServices(MachineCodeId, ServiceId) WHERE IsDeleted = 0;
END
GO

-- #9 InspectionCommittees + Members
IF OBJECT_ID('dbo.InspectionCommittees', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[InspectionCommittees] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [Description] NVARCHAR(1000) NULL,
        [EffectiveFrom] DATETIME2 NULL,
        [EffectiveTo] DATETIME2 NULL,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_InspectionCommittees_Code ON dbo.InspectionCommittees(Code) WHERE IsDeleted = 0;
END
GO

IF OBJECT_ID('dbo.InspectionCommitteeMembers', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[InspectionCommitteeMembers] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [CommitteeId] UNIQUEIDENTIFIER NOT NULL,
        [UserId] UNIQUEIDENTIFIER NULL,
        [FullName] NVARCHAR(255) NOT NULL,
        [Title] NVARCHAR(100) NULL,
        [Role] NVARCHAR(50) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_InspectionCommitteeMembers_CommitteeId ON dbo.InspectionCommitteeMembers(CommitteeId) WHERE IsDeleted = 0;
END
GO

-- #10 NursingCareLevels
IF OBJECT_ID('dbo.NursingCareLevels', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NursingCareLevels] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [Level] INT NOT NULL DEFAULT 1,
        [Description] NVARCHAR(1000) NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_NursingCareLevels_Code ON dbo.NursingCareLevels(Code) WHERE IsDeleted = 0;
END
GO

-- #11 MedicalRecordTypes (loại bệnh án catalog)
IF OBJECT_ID('dbo.MedicalRecordTypes', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MedicalRecordTypes] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [Category] INT NOT NULL DEFAULT 1,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [IsLocked] BIT NOT NULL DEFAULT 0,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_MedicalRecordTypes_Code ON dbo.MedicalRecordTypes(Code) WHERE IsDeleted = 0;
END
GO

-- #12 ParaclinicalRoomPriorities
IF OBJECT_ID('dbo.ParaclinicalRoomPriorities', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ParaclinicalRoomPriorities] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [ServiceId] UNIQUEIDENTIFIER NOT NULL,
        [RoomId] UNIQUEIDENTIFIER NULL,
        [DepartmentId] UNIQUEIDENTIFIER NULL,
        [PriorityLevel] INT NOT NULL DEFAULT 1,
        [Sequence] INT NOT NULL DEFAULT 0,
        [Note] NVARCHAR(500) NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_ParaclinicalRoomPriorities_ServiceId ON dbo.ParaclinicalRoomPriorities(ServiceId) WHERE IsDeleted = 0;
END
GO

-- #13 ReportServiceGroupTypes + ReportServiceGroups
IF OBJECT_ID('dbo.ReportServiceGroupTypes', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ReportServiceGroupTypes] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [ReportLabel] NVARCHAR(255) NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_ReportServiceGroupTypes_Code ON dbo.ReportServiceGroupTypes(Code) WHERE IsDeleted = 0;
END
GO

IF OBJECT_ID('dbo.ReportServiceGroups', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ReportServiceGroups] (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        [GroupTypeId] UNIQUEIDENTIFIER NOT NULL,
        [Code] NVARCHAR(50) NOT NULL,
        [Name] NVARCHAR(255) NOT NULL,
        [Note] NVARCHAR(500) NULL,
        [SortOrder] INT NOT NULL DEFAULT 0,
        [IsActive] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        [CreatedBy] NVARCHAR(450) NULL,
        [UpdatedAt] DATETIME2 NULL,
        [UpdatedBy] NVARCHAR(450) NULL,
        [IsDeleted] BIT NOT NULL DEFAULT 0
    );
    CREATE INDEX IX_ReportServiceGroups_GroupTypeId ON dbo.ReportServiceGroups(GroupTypeId) WHERE IsDeleted = 0;
END
GO

-- ───────────── SEED ROUTINE: standard medication routes (TT 52/2017) ─────────────
IF NOT EXISTS (SELECT 1 FROM dbo.MedicationRoutes WHERE Code IN ('PO','IV','IM'))
BEGIN
    INSERT INTO dbo.MedicationRoutes (Code, Name, BhxhCode, SortOrder) VALUES
        ('PO', N'Uống', '01', 10),
        ('SL', N'Ngậm dưới lưỡi', '02', 20),
        ('TOPI', N'Bôi ngoài da', '03', 30),
        ('IM', N'Tiêm bắp', '04', 40),
        ('IV', N'Tiêm tĩnh mạch', '05', 50),
        ('SC', N'Tiêm dưới da', '06', 60),
        ('IT', N'Tiêm tủy sống', '07', 70),
        ('TRH', N'Truyền tĩnh mạch', '08', 80),
        ('PR', N'Đặt hậu môn', '09', 90),
        ('VAG', N'Đặt âm đạo', '10', 100),
        ('INH', N'Hít/Khí dung', '11', 110),
        ('NEB', N'Khí dung', '12', 120),
        ('OPH', N'Nhỏ mắt', '13', 130),
        ('OTI', N'Nhỏ tai', '14', 140),
        ('NAS', N'Nhỏ mũi', '15', 150);
END
GO

-- Seed nursing care levels (chế độ chăm sóc cấp 1-3)
IF NOT EXISTS (SELECT 1 FROM dbo.NursingCareLevels WHERE Code IN ('CS1','CS2','CS3'))
BEGIN
    INSERT INTO dbo.NursingCareLevels (Code, Name, Level, Description, SortOrder) VALUES
        ('CS1', N'Cấp 1 - Chăm sóc toàn diện', 1, N'BN nặng, nguy kịch, không tự phục vụ. ĐD theo dõi liên tục.', 10),
        ('CS2', N'Cấp 2 - Chăm sóc một phần', 2, N'BN cần hỗ trợ một phần. ĐD theo dõi định kỳ.', 20),
        ('CS3', N'Cấp 3 - Tự chăm sóc', 3, N'BN ổn định, tự phục vụ. ĐD theo dõi 1 lần/ca.', 30);
END
GO

-- Seed medical record types (loại bệnh án TT 32/2023)
IF NOT EXISTS (SELECT 1 FROM dbo.MedicalRecordTypes WHERE Code IN ('NOITRU','NGOAITRU','CC'))
BEGIN
    INSERT INTO dbo.MedicalRecordTypes (Code, Name, Category, SortOrder) VALUES
        ('NGOAITRU', N'Bệnh án ngoại trú', 1, 10),
        ('NOITRU', N'Bệnh án nội trú', 2, 20),
        ('CC', N'Bệnh án cấp cứu', 3, 30),
        ('KSK', N'Bệnh án khám sức khỏe', 4, 40),
        ('YHCT', N'Bệnh án YHCT', 5, 50),
        ('SAN', N'Bệnh án sản khoa', 6, 60),
        ('NHI', N'Bệnh án nhi khoa', 7, 70),
        ('BONG', N'Bệnh án bỏng', 8, 80),
        ('PHCN', N'Bệnh án phục hồi chức năng', 9, 90),
        ('TT', N'Bệnh án tâm thần', 10, 100);
END
GO

-- Seed sample manufacturer entries (frequently-encountered VN/global)
IF NOT EXISTS (SELECT 1 FROM dbo.Manufacturers WHERE Code IN ('PFIZER','TRAPHACO','MEKOPHAR'))
BEGIN
    INSERT INTO dbo.Manufacturers (Code, Name, Country, SortOrder) VALUES
        ('PFIZER', N'Pfizer', N'Hoa Kỳ', 10),
        ('NOVARTIS', N'Novartis', N'Thụy Sỹ', 20),
        ('SANOFI', N'Sanofi', N'Pháp', 30),
        ('BAYER', N'Bayer', N'Đức', 40),
        ('GSK', N'GlaxoSmithKline', N'Anh', 50),
        ('TRAPHACO', N'Traphaco', N'Việt Nam', 60),
        ('MEKOPHAR', N'Mekophar', N'Việt Nam', 70),
        ('IMEXPHARM', N'Imexpharm', N'Việt Nam', 80),
        ('DOMESCO', N'Domesco', N'Việt Nam', 90),
        ('OPCPHARMA', N'OPC Pharma', N'Việt Nam', 100);
END
GO

-- Seed gasoline price baseline (placeholder, BV admin updates monthly)
IF NOT EXISTS (SELECT 1 FROM dbo.GasolinePrices)
BEGIN
    INSERT INTO dbo.GasolinePrices (FuelType, PricePerLitre, EffectiveFrom, IssuedBy) VALUES
        (N'RON 95-III', 22500, SYSUTCDATETIME(), N'Liên Bộ Công Thương - Tài chính'),
        (N'E5 RON 92-II', 21500, SYSUTCDATETIME(), N'Liên Bộ Công Thương - Tài chính'),
        (N'Diesel 0.05S-II', 20800, SYSUTCDATETIME(), N'Liên Bộ Công Thương - Tài chính');
END
GO

-- Seed report service group types
IF NOT EXISTS (SELECT 1 FROM dbo.ReportServiceGroupTypes WHERE Code IN ('BHXH','PHATLOAI'))
BEGIN
    INSERT INTO dbo.ReportServiceGroupTypes (Code, Name, ReportLabel, SortOrder) VALUES
        ('BHXH', N'Theo nhóm BHXH', N'BHXH', 10),
        ('PHATLOAI', N'Theo phân loại nội bộ', N'Nội bộ', 20),
        ('CHUYENKHOA', N'Theo chuyên khoa', N'Chuyên khoa', 30);
END
GO

PRINT '[42_nangcap22_catalogs.sql] OK';
GO
