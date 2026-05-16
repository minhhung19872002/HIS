-- ============================================================================
-- Audit Log Table Enhancement for Level 6 Security Compliance
-- Adds new columns to existing AuditLogs table for comprehensive audit trail
-- TT 54/2017, TT 32/2023 requirements
-- ============================================================================

-- Add new Level 6 audit columns if they don't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'UserFullName')
BEGIN
    ALTER TABLE AuditLogs ADD UserFullName NVARCHAR(200) NULL;
    PRINT 'Added UserFullName column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'EntityType')
BEGIN
    ALTER TABLE AuditLogs ADD EntityType NVARCHAR(100) NULL;
    PRINT 'Added EntityType column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'EntityId')
BEGIN
    ALTER TABLE AuditLogs ADD EntityId NVARCHAR(100) NULL;
    PRINT 'Added EntityId column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'Details')
BEGIN
    ALTER TABLE AuditLogs ADD Details NVARCHAR(MAX) NULL;
    PRINT 'Added Details column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'Timestamp')
BEGIN
    ALTER TABLE AuditLogs ADD [Timestamp] DATETIME2 NOT NULL DEFAULT GETUTCDATE();
    PRINT 'Added Timestamp column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'Module')
BEGIN
    ALTER TABLE AuditLogs ADD Module NVARCHAR(50) NULL;
    PRINT 'Added Module column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'RequestPath')
BEGIN
    ALTER TABLE AuditLogs ADD RequestPath NVARCHAR(500) NULL;
    PRINT 'Added RequestPath column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'RequestMethod')
BEGIN
    ALTER TABLE AuditLogs ADD RequestMethod NVARCHAR(10) NULL;
    PRINT 'Added RequestMethod column';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AuditLogs') AND name = 'ResponseStatusCode')
BEGIN
    ALTER TABLE AuditLogs ADD ResponseStatusCode INT NULL;
    PRINT 'Added ResponseStatusCode column';
END

-- Create indexes for common query patterns
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_Timestamp' AND object_id = OBJECT_ID('AuditLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AuditLogs_Timestamp ON AuditLogs ([Timestamp] DESC);
    PRINT 'Created IX_AuditLogs_Timestamp index';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_UserId_Timestamp' AND object_id = OBJECT_ID('AuditLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AuditLogs_UserId_Timestamp ON AuditLogs (UserId, [Timestamp] DESC);
    PRINT 'Created IX_AuditLogs_UserId_Timestamp index';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_Module_Action' AND object_id = OBJECT_ID('AuditLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AuditLogs_Module_Action ON AuditLogs (Module, Action);
    PRINT 'Created IX_AuditLogs_Module_Action index';
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_AuditLogs_EntityType_EntityId' AND object_id = OBJECT_ID('AuditLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AuditLogs_EntityType_EntityId ON AuditLogs (EntityType, EntityId);
    PRINT 'Created IX_AuditLogs_EntityType_EntityId index';
END

PRINT 'Audit log table enhancement complete.';
GO
