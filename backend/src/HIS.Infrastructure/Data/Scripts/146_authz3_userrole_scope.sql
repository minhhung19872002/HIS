-- AUTHZ-3 (#369): scope tren luot gan role (UserRoles) — OWN/DEPT/BRANCH/ORG.
-- Backfill 'ORG' = KHONG thu hep quyen dang dung (thu hep la buoc bat policy co kiem soat sau).
-- Idempotent: chay nhieu lan an toan.

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserRoles') AND name = 'ScopeType')
BEGIN
    ALTER TABLE dbo.UserRoles ADD ScopeType NVARCHAR(20) NOT NULL CONSTRAINT DF_UserRoles_ScopeType DEFAULT 'ORG';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserRoles') AND name = 'ScopeId')
BEGIN
    ALTER TABLE dbo.UserRoles ADD ScopeId UNIQUEIDENTIFIER NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserRoles') AND name = 'ValidFrom')
BEGIN
    ALTER TABLE dbo.UserRoles ADD ValidFrom DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserRoles') AND name = 'ValidTo')
BEGIN
    ALTER TABLE dbo.UserRoles ADD ValidTo DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserRoles') AND name = 'GrantedBy')
BEGIN
    ALTER TABLE dbo.UserRoles ADD GrantedBy NVARCHAR(450) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserRoles') AND name = 'GrantReason')
BEGIN
    ALTER TABLE dbo.UserRoles ADD GrantReason NVARCHAR(500) NULL;
END
GO

-- Backfill phong thu: hang cu truoc khi co DEFAULT (neu cot vua them thi DEFAULT da phu).
UPDATE dbo.UserRoles SET ScopeType = 'ORG' WHERE ScopeType IS NULL OR ScopeType = '';
GO
