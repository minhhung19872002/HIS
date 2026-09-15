-- QA sweep 2026-09-15: three schema defects that made features fail silently.
-- Idempotent — every step checks the current state first.
--
-- 1) AuditLogs.Action was nvarchar(20). Actions such as "PublicEmrDownloadDenied" (23 chars) failed
--    with "String or binary data would be truncated", so the audit INSERT threw and the request that
--    wanted to log it failed. Widen to nvarchar(100); the two indexes that reference the column must
--    be dropped and recreated around the ALTER.
-- 2) Suppliers.SupplierType is nvarchar holding 'Pharmacy'/'MedicalSupply' while the entity maps int
--    (1-Thuốc, 2-Vật tư, 3-Thiết bị). Every query that materialised Supplier threw InvalidCastException:
--    the supplier catalog returned an empty list and /reports/reconciliation/supplier-procurement 500'd
--    (confirmed on prod). Convert values then the column to int NOT NULL.
-- 3) ItTickets table never existed: the IT support ticket screen listed nothing and "create" pretended
--    to succeed.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ===== 1. AuditLogs.Action → nvarchar(100) =====
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.AuditLogs') AND name = 'Action' AND max_length BETWEEN 1 AND 199)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_Module_Action' AND object_id = OBJECT_ID('dbo.AuditLogs'))
        DROP INDEX IX_AuditLogs_Module_Action ON dbo.AuditLogs;
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_EntityType_EntityId_Timestamp' AND object_id = OBJECT_ID('dbo.AuditLogs'))
        DROP INDEX IX_AuditLogs_EntityType_EntityId_Timestamp ON dbo.AuditLogs;

    ALTER TABLE dbo.AuditLogs ALTER COLUMN Action nvarchar(100) NOT NULL;
    PRINT 'Widened AuditLogs.Action to nvarchar(100)';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_Module_Action' AND object_id = OBJECT_ID('dbo.AuditLogs'))
    CREATE NONCLUSTERED INDEX IX_AuditLogs_Module_Action ON dbo.AuditLogs (Module, Action);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_EntityType_EntityId_Timestamp' AND object_id = OBJECT_ID('dbo.AuditLogs'))
    CREATE NONCLUSTERED INDEX IX_AuditLogs_EntityType_EntityId_Timestamp
        ON dbo.AuditLogs (EntityType, EntityId, [Timestamp] DESC)
        INCLUDE (Action, UserId, Module);
GO

-- ===== 2. Suppliers.SupplierType nvarchar → int =====
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Suppliers') AND name = 'SupplierType'
           AND TYPE_NAME(user_type_id) IN ('nvarchar', 'varchar', 'nchar', 'char'))
BEGIN
    -- Dynamic SQL: the statements reference the column as text and must compile after the type check.
    EXEC(N'
        UPDATE dbo.Suppliers SET SupplierType =
            CASE
                WHEN SupplierType IS NULL OR LTRIM(RTRIM(SupplierType)) = N'''' THEN N''1''
                WHEN LTRIM(RTRIM(SupplierType)) IN (N''1'', N''2'', N''3'') THEN LTRIM(RTRIM(SupplierType))
                WHEN SupplierType IN (N''MedicalSupply'', N''Supply'', N''Supplies'', N''VatTu'', N''Vật tư'') THEN N''2''
                WHEN SupplierType IN (N''Equipment'', N''Device'', N''ThietBi'', N''Thiết bị'') THEN N''3''
                ELSE N''1''  -- Pharmacy / Medicine / anything else → Thuốc
            END;');

    DECLARE @df sysname = (SELECT dc.name FROM sys.default_constraints dc
                           JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
                           WHERE dc.parent_object_id = OBJECT_ID('dbo.Suppliers') AND c.name = 'SupplierType');
    IF @df IS NOT NULL EXEC(N'ALTER TABLE dbo.Suppliers DROP CONSTRAINT [' + @df + N']');

    EXEC(N'ALTER TABLE dbo.Suppliers ALTER COLUMN SupplierType int NOT NULL;');
    EXEC(N'ALTER TABLE dbo.Suppliers ADD CONSTRAINT DF_Suppliers_SupplierType DEFAULT 1 FOR SupplierType;');
    PRINT 'Converted Suppliers.SupplierType to int';
END
GO

-- ===== 3. ItTickets =====
IF OBJECT_ID('dbo.ItTickets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ItTickets (
        Id              uniqueidentifier NOT NULL CONSTRAINT PK_ItTickets PRIMARY KEY,
        Title           nvarchar(300)    NOT NULL,
        Description     nvarchar(max)    NULL,
        DepartmentName  nvarchar(200)    NULL,
        RequestedByName nvarchar(200)    NULL,
        Priority        int              NOT NULL CONSTRAINT DF_ItTickets_Priority DEFAULT 0,
        Status          int              NOT NULL CONSTRAINT DF_ItTickets_Status DEFAULT 0, -- 0 mới · 1 đang xử lý · 2 đã xử lý · 3 đóng
        Response        nvarchar(max)    NULL,
        AssignedToName  nvarchar(200)    NULL,
        CreatedAt       datetime2        NOT NULL CONSTRAINT DF_ItTickets_CreatedAt DEFAULT SYSUTCDATETIME(),
        CreatedBy       nvarchar(100)    NULL,
        ResolvedAt      datetime2        NULL
    );
    CREATE NONCLUSTERED INDEX IX_ItTickets_Status_CreatedAt ON dbo.ItTickets (Status, CreatedAt DESC);
    PRINT 'Created ItTickets';
END
GO
