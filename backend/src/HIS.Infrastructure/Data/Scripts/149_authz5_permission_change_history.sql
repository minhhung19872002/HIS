-- AUTHZ-5 (#371) increment-1: bang PermissionChangeHistory (ai doi quyen gi, old->new).
-- ADDITIVE — chi tao bang moi. Idempotent. Wire ghi (noi thay doi quyen) = increment sau.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PermissionChangeHistories')
BEGIN
    CREATE TABLE dbo.PermissionChangeHistories (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        ChangeType NVARCHAR(40) NOT NULL,
        TargetUserId UNIQUEIDENTIFIER NULL,
        TargetRoleId UNIQUEIDENTIFIER NULL,
        PermissionCode NVARCHAR(100) NULL,
        Action NVARCHAR(20) NOT NULL,
        OldValueJson NVARCHAR(MAX) NULL,
        NewValueJson NVARCHAR(MAX) NULL,
        Reason NVARCHAR(500) NULL,
        ChangedBy NVARCHAR(450) NULL,
        ChangedAt DATETIME2 NOT NULL CONSTRAINT DF_PCH_ChangedAt DEFAULT GETUTCDATE(),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PCH_CreatedAt DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL CONSTRAINT DF_PCH_Deleted DEFAULT 0
    );
    CREATE INDEX IX_PermissionChangeHistories_Target ON dbo.PermissionChangeHistories(TargetUserId, ChangedAt);
END
GO
