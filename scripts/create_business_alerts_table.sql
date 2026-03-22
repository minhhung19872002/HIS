-- Create BusinessAlerts table for NangCap13 Section 3.1.9
-- 34 business alert rules: OPD (10), Inpatient (14), Radiology (4), Lab (3), Pharmacy (1), Billing (2)

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BusinessAlerts')
BEGIN
    CREATE TABLE BusinessAlerts (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        AlertCode NVARCHAR(20) NOT NULL,           -- e.g., 'OPD-01', 'IPD-11'
        Category NVARCHAR(50) NOT NULL,             -- OPD, Inpatient, Radiology, Lab, Pharmacy, Billing
        Title NVARCHAR(200) NOT NULL,
        Message NVARCHAR(2000) NOT NULL,
        Severity INT NOT NULL DEFAULT 2,            -- 1=Critical, 2=Warning, 3=Info
        Module NVARCHAR(50) NOT NULL,               -- OPD, Inpatient, Pharmacy, Lab, Radiology, Billing, Insurance
        PatientId UNIQUEIDENTIFIER NULL,
        ExaminationId UNIQUEIDENTIFIER NULL,
        AdmissionId UNIQUEIDENTIFIER NULL,
        EntityType NVARCHAR(100) NULL,
        EntityId UNIQUEIDENTIFIER NULL,
        Status INT NOT NULL DEFAULT 0,              -- 0=New, 1=Acknowledged, 2=Resolved, 3=Ignored
        AcknowledgedAt DATETIME2 NULL,
        AcknowledgedBy NVARCHAR(450) NULL,
        ActionTaken NVARCHAR(1000) NULL,
        Details NVARCHAR(MAX) NULL,                 -- JSON extra data
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CreatedBy NVARCHAR(450) NULL,
        UpdatedAt DATETIME2 NULL,
        UpdatedBy NVARCHAR(450) NULL,
        IsDeleted BIT NOT NULL DEFAULT 0
    );

    PRINT 'Created BusinessAlerts table';
END
GO

-- Performance indexes
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BusinessAlerts_PatientId_Status')
    CREATE INDEX IX_BusinessAlerts_PatientId_Status ON BusinessAlerts (PatientId, Status) WHERE IsDeleted = 0;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BusinessAlerts_Category_Severity')
    CREATE INDEX IX_BusinessAlerts_Category_Severity ON BusinessAlerts (Category, Severity) WHERE IsDeleted = 0;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BusinessAlerts_Module')
    CREATE INDEX IX_BusinessAlerts_Module ON BusinessAlerts (Module) WHERE IsDeleted = 0;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BusinessAlerts_AlertCode_CreatedAt')
    CREATE INDEX IX_BusinessAlerts_AlertCode_CreatedAt ON BusinessAlerts (AlertCode, CreatedAt DESC) WHERE IsDeleted = 0;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_BusinessAlerts_CreatedAt')
    CREATE INDEX IX_BusinessAlerts_CreatedAt ON BusinessAlerts (CreatedAt DESC) WHERE IsDeleted = 0;

PRINT 'BusinessAlerts indexes created';
GO
