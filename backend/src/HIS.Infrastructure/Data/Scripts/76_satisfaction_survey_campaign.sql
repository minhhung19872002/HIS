-- Migration 76: Satisfaction Survey Campaign + Feedback Callback tables
-- Idempotent: uses IF NOT EXISTS / COL_LENGTH guards
-- Auto-applied by ProductionSchemaRepairRunner on startup

-- ============================================================
-- SatisfactionSurveyCampaigns
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'SatisfactionSurveyCampaigns'
)
BEGIN
    CREATE TABLE SatisfactionSurveyCampaigns (
        Id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        CampaignCode    NVARCHAR(50)     NOT NULL,
        [Name]          NVARCHAR(200)    NOT NULL,
        [Description]   NVARCHAR(1000)   NULL,
        TargetGroup     NVARCHAR(50)     NULL,          -- OPD, IPD, Emergency, All
        StartDate       DATETIME2(7)     NOT NULL,
        EndDate         DATETIME2(7)     NOT NULL,
        TemplateId      UNIQUEIDENTIFIER NULL,
        TemplateName    NVARCHAR(200)    NULL,
        [Status]        INT              NOT NULL DEFAULT 0, -- 0=Draft,1=Active,2=Closed,3=Archived
        TargetCount     INT              NOT NULL DEFAULT 0,
        ActualCount     INT              NOT NULL DEFAULT 0,
        Notes           NVARCHAR(2000)   NULL,
        -- BaseEntity audit
        CreatedAt       DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy       NVARCHAR(450)    NULL,
        UpdatedAt       DATETIME2(7)     NULL,
        UpdatedBy       NVARCHAR(450)    NULL,
        IsDeleted       BIT              NOT NULL DEFAULT 0
    );
    PRINT 'Created table SatisfactionSurveyCampaigns';
END
ELSE
    PRINT 'Table SatisfactionSurveyCampaigns already exists — skipped';

-- ============================================================
-- SurveyFeedbackCallbacks
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'SurveyFeedbackCallbacks'
)
BEGIN
    CREATE TABLE SurveyFeedbackCallbacks (
        Id                  UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        SurveyResultId      UNIQUEIDENTIFIER NULL,
        CampaignId          UNIQUEIDENTIFIER NULL,
        PatientName         NVARCHAR(200)    NULL,
        PatientPhone        NVARCHAR(20)     NULL,
        PatientCode         NVARCHAR(50)     NULL,
        IssueDescription    NVARCHAR(2000)   NULL,
        [Status]            INT              NOT NULL DEFAULT 0, -- 0=Pending,1=Contacted,2=Resolved,3=Closed
        ContactedByName     NVARCHAR(200)    NULL,
        ContactedAt         DATETIME2(7)     NULL,
        Resolution          NVARCHAR(2000)   NULL,
        AcknowledgmentNote  NVARCHAR(2000)   NULL,
        -- BaseEntity audit
        CreatedAt           DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy           NVARCHAR(450)    NULL,
        UpdatedAt           DATETIME2(7)     NULL,
        UpdatedBy           NVARCHAR(450)    NULL,
        IsDeleted           BIT              NOT NULL DEFAULT 0
    );
    PRINT 'Created table SurveyFeedbackCallbacks';
END
ELSE
    PRINT 'Table SurveyFeedbackCallbacks already exists — skipped';
