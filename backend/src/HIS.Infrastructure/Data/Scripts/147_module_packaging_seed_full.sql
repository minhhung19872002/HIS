-- #405: seed co EnabledModules cho DEPLOYMENT HIEN HUU = FULL (10 module + extended)
-- de KHONG doi hanh vi prod dang chay (demo full-feature). Deploy MOI thuong mai:
-- provisioning se ghi de row nay theo goi (PK/BV). Chua co row -> backend fallback Goi PK.
-- Idempotent: chi INSERT khi chua ton tai.

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SystemConfigs WHERE ConfigKey = 'EnabledModules')
BEGIN
    INSERT INTO dbo.SystemConfigs (Id, ConfigKey, ConfigValue, ConfigType, Description, IsActive, CreatedAt, IsDeleted)
    VALUES (
        NEWID(),
        'EnabledModules',
        '["BAOCAO","BHYT","CDHA","DUOCKHO","KHAMBENH","LIS","NOITRU","QUANTRI","THUNGAN","TIEPDON","extended"]',
        'JSON',
        '#405 module packaging - danh sach module thuong mai dang bat (seed FULL cho deployment hien huu)',
        1,
        GETUTCDATE(),
        0
    );
END
GO
