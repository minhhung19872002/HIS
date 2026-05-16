-- NangCap15 Tables: HospitalBranches + RemotePacsServers
-- Idempotent: uses IF NOT EXISTS

-- 1. HospitalBranches - Chi nhánh / Cơ sở bệnh viện (NangCap15 1.21)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HospitalBranches')
BEGIN
    CREATE TABLE HospitalBranches (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        BranchCode NVARCHAR(50) NOT NULL,
        BranchName NVARCHAR(200) NOT NULL,
        Address NVARCHAR(500) NULL,
        PhoneNumber NVARCHAR(50) NULL,
        Email NVARCHAR(200) NULL,
        ParentBranchId UNIQUEIDENTIFIER NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        IsHeadquarters BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0,
        CONSTRAINT FK_HospitalBranches_ParentBranch FOREIGN KEY (ParentBranchId)
            REFERENCES HospitalBranches(Id)
    );

    CREATE INDEX IX_HospitalBranches_BranchCode ON HospitalBranches(BranchCode);
    CREATE INDEX IX_HospitalBranches_ParentBranchId ON HospitalBranches(ParentBranchId);
    CREATE INDEX IX_HospitalBranches_IsActive ON HospitalBranches(IsActive) WHERE IsDeleted = 0;

    PRINT 'Created table: HospitalBranches';
END
ELSE
    PRINT 'Table HospitalBranches already exists';

-- 2. RemotePacsServers - PACS Server từ xa (NangCap15 PACS 3/4)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RemotePacsServers')
BEGIN
    CREATE TABLE RemotePacsServers (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(200) NOT NULL,
        AeTitle NVARCHAR(64) NOT NULL,
        Host NVARCHAR(255) NOT NULL,
        Port INT NOT NULL DEFAULT 4242,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    CREATE INDEX IX_RemotePacsServers_AeTitle ON RemotePacsServers(AeTitle);
    CREATE INDEX IX_RemotePacsServers_IsActive ON RemotePacsServers(IsActive) WHERE IsDeleted = 0;

    PRINT 'Created table: RemotePacsServers';
END
ELSE
    PRINT 'Table RemotePacsServers already exists';

-- Seed sample data for HospitalBranches
IF NOT EXISTS (SELECT 1 FROM HospitalBranches)
BEGIN
    DECLARE @hqId UNIQUEIDENTIFIER = NEWID();
    INSERT INTO HospitalBranches (Id, BranchCode, BranchName, Address, PhoneNumber, Email, IsActive, IsHeadquarters)
    VALUES (@hqId, 'HQ', N'Trụ sở chính', N'123 Đường Nguyễn Trãi, Quận 1, TP.HCM', '028-1234-5678', 'info@hospital.vn', 1, 1);

    INSERT INTO HospitalBranches (BranchCode, BranchName, Address, PhoneNumber, ParentBranchId, IsActive, IsHeadquarters)
    VALUES ('BR01', N'Chi nhánh 1 - Quận 7', N'456 Đường Nguyễn Hữu Thọ, Quận 7, TP.HCM', '028-9876-5432', @hqId, 1, 0);

    INSERT INTO HospitalBranches (BranchCode, BranchName, Address, PhoneNumber, ParentBranchId, IsActive, IsHeadquarters)
    VALUES ('BR02', N'Phòng khám vệ tinh - Bình Thạnh', N'789 Điện Biên Phủ, Bình Thạnh, TP.HCM', '028-5555-1234', @hqId, 1, 0);

    PRINT 'Seeded HospitalBranches: 3 rows (1 HQ + 2 branches)';
END

-- Seed sample remote PACS server
IF NOT EXISTS (SELECT 1 FROM RemotePacsServers)
BEGIN
    INSERT INTO RemotePacsServers (Name, AeTitle, Host, Port, Description, IsActive)
    VALUES (N'PACS Server Bệnh viện tuyến trên', 'UPPER_HOSP_PACS', '10.0.0.100', 4242, N'PACS server bệnh viện tuyến trên để chuyển hình ảnh hội chẩn từ xa', 1);

    INSERT INTO RemotePacsServers (Name, AeTitle, Host, Port, Description, IsActive)
    VALUES (N'Cloud PACS Backup', 'CLOUD_PACS', 'pacs.cloudbackup.vn', 11112, N'Cloud PACS để backup hình ảnh DICOM', 1);

    PRINT 'Seeded RemotePacsServers: 2 rows';
END

PRINT 'NangCap15 tables setup complete.';
