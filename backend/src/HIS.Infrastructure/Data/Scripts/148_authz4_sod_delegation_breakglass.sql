-- AUTHZ-4 (#370) increment-1: bang SoD / Delegation / Break-glass / Temp-permission.
-- ADDITIVE — chi tao bang moi, KHONG doi bang/hanh vi hien co. Idempotent (IF NOT EXISTS).
-- Enforcement (SoD check, delegation resolve, break-glass endpoint, deny-override) = increment sau.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SoDConstraints')
BEGIN
    CREATE TABLE dbo.SoDConstraints (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        RoleAId UNIQUEIDENTIFIER NULL,
        PermissionA NVARCHAR(100) NULL,
        RoleBId UNIQUEIDENTIFIER NULL,
        PermissionB NVARCHAR(100) NULL,
        ConstraintType NVARCHAR(20) NOT NULL CONSTRAINT DF_SoD_Type DEFAULT 'role-role',
        EnforcedAt NVARCHAR(20) NOT NULL CONSTRAINT DF_SoD_EnforcedAt DEFAULT 'grant',
        Description NVARCHAR(500) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_SoD_Active DEFAULT 1,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_SoD_CreatedAt DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_SoD_Deleted DEFAULT 0
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DelegationGrants')
BEGIN
    CREATE TABLE dbo.DelegationGrants (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        GrantorId UNIQUEIDENTIFIER NOT NULL,
        GranteeId UNIQUEIDENTIFIER NOT NULL,
        RoleId UNIQUEIDENTIFIER NOT NULL,
        ValidFrom DATETIME2 NOT NULL,
        ValidTo DATETIME2 NOT NULL,
        Reason NVARCHAR(500) NULL,
        Status INT NOT NULL CONSTRAINT DF_Deleg_Status DEFAULT 0,
        RevokedAt DATETIME2 NULL,
        RevokedBy NVARCHAR(450) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Deleg_CreatedAt DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_Deleg_Deleted DEFAULT 0
    );
    CREATE INDEX IX_DelegationGrants_Grantee ON dbo.DelegationGrants(GranteeId, Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'BreakGlassSessions')
BEGIN
    CREATE TABLE dbo.BreakGlassSessions (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        PatientId UNIQUEIDENTIFIER NOT NULL,
        Reason NVARCHAR(1000) NOT NULL,
        StartAt DATETIME2 NOT NULL,
        ExpireAt DATETIME2 NOT NULL,
        IsEmergencyAccess BIT NOT NULL CONSTRAINT DF_BG_Emergency DEFAULT 0,
        IpAddress NVARCHAR(64) NULL,
        ReviewedBy UNIQUEIDENTIFIER NULL,
        ReviewedAt DATETIME2 NULL,
        ReviewOutcome NVARCHAR(20) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_BG_CreatedAt DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_BG_Deleted DEFAULT 0
    );
    CREATE INDEX IX_BreakGlassSessions_Review ON dbo.BreakGlassSessions(ReviewedAt, ExpireAt);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'UserPermissionOverrides')
BEGIN
    CREATE TABLE dbo.UserPermissionOverrides (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        PermissionId UNIQUEIDENTIFIER NOT NULL,
        IsGrant BIT NOT NULL CONSTRAINT DF_UPO_Grant DEFAULT 1,
        ScopeType NVARCHAR(20) NOT NULL CONSTRAINT DF_UPO_Scope DEFAULT 'ORG',
        ScopeId UNIQUEIDENTIFIER NULL,
        ValidFrom DATETIME2 NULL,
        ValidTo DATETIME2 NULL,
        Reason NVARCHAR(500) NULL,
        ApprovedBy NVARCHAR(450) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_UPO_CreatedAt DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_UPO_Deleted DEFAULT 0
    );
    CREATE INDEX IX_UserPermissionOverrides_User ON dbo.UserPermissionOverrides(UserId, IsGrant);
END
GO
