-- NangCap26 (TTYT Tinh Bien) muc I.15 + I.16:
--   I.15 Quyen du lieu phong/kho: nhom quyen du lieu gom khoa-phong, kho,
--        loai dieu tri, doi tuong benh nhan.
--   I.16 Phan quyen du lieu nguoi dung: gan nhom quyen du lieu cho user.
-- Khac quyen CHUC NANG (menu/permission) da co — day la row-level scope.
-- FAIL-OPEN: user chua duoc gan nhom nao = khong gioi han (nhu hien tai).
-- ADDITIVE — chi tao bang moi. Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DataPermissionGroups')
BEGIN
    CREATE TABLE dbo.DataPermissionGroups (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        Code NVARCHAR(50) NOT NULL,
        Name NVARCHAR(200) NOT NULL,
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_DPG_IsActive DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DPG_CreatedAt DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_DPG_IsDeleted DEFAULT 0
    );
    CREATE UNIQUE INDEX UX_DataPermissionGroups_Code ON dbo.DataPermissionGroups (Code) WHERE IsDeleted = 0;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DataPermissionGroupItems')
BEGIN
    CREATE TABLE dbo.DataPermissionGroupItems (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        GroupId UNIQUEIDENTIFIER NOT NULL,
        -- Department | Room | Warehouse | TreatmentType | PatientObject
        ScopeType NVARCHAR(50) NOT NULL,
        ScopeId UNIQUEIDENTIFIER NULL,
        ScopeValue NVARCHAR(100) NULL,
        ScopeName NVARCHAR(300) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DPGI_CreatedAt DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_DPGI_IsDeleted DEFAULT 0,
        CONSTRAINT FK_DPGI_Group FOREIGN KEY (GroupId) REFERENCES dbo.DataPermissionGroups(Id)
    );
    CREATE INDEX IX_DPGI_Group ON dbo.DataPermissionGroupItems (GroupId, ScopeType);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserDataPermissionGroups')
BEGIN
    CREATE TABLE dbo.UserDataPermissionGroups (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        GroupId UNIQUEIDENTIFIER NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UDPG_CreatedAt DEFAULT SYSDATETIME(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_UDPG_IsDeleted DEFAULT 0,
        CONSTRAINT FK_UDPG_Group FOREIGN KEY (GroupId) REFERENCES dbo.DataPermissionGroups(Id)
    );
    CREATE UNIQUE INDEX UX_UDPG_User_Group ON dbo.UserDataPermissionGroups (UserId, GroupId) WHERE IsDeleted = 0;
END
GO
