-- 221 (QA round 11, 2026-09-25): P0 — POST /api/inspector-portal/login with body {} returned a BHXH inspector token.
-- Cause: the create-account endpoint accepted a blank username/password (a write scan created one on 2026-09-16),
-- and login matched Username == '' and verified '' against its hash. Code now refuses blank credentials on login and
-- create; this disables any such row that already exists. Also soft-deletes patient-portal accounts that have no
-- username, email or phone (unreachable junk from the same scans). Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

UPDATE dbo.BhxhInspectorAccounts
   SET IsDeleted = 1, IsActive = 0, UpdatedAt = SYSUTCDATETIME(), UpdatedBy = N'migration 221: blank credentials'
 WHERE IsDeleted = 0 AND LTRIM(RTRIM(ISNULL(Username, N''))) = N'';
GO

IF OBJECT_ID(N'dbo.PortalAccounts', N'U') IS NOT NULL
    UPDATE dbo.PortalAccounts
       SET IsDeleted = 1, UpdatedAt = SYSUTCDATETIME()  -- UpdatedBy is a uniqueidentifier here
     WHERE IsDeleted = 0
       AND LTRIM(RTRIM(ISNULL(Username, N''))) = N''
       AND LTRIM(RTRIM(ISNULL(Email, N''))) = N''
       AND LTRIM(RTRIM(ISNULL(Phone, N''))) = N'';
GO
