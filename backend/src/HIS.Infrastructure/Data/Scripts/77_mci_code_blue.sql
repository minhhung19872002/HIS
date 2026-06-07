-- Migration 77: Mass Casualty Incident tables (MCIEvents, MCIVictims, MCISituationReports)
-- Idempotent: uses IF NOT EXISTS / COL_LENGTH guards
-- Auto-applied by ProductionSchemaRepairRunner on startup
-- CreatedBy/UpdatedBy: UNIQUEIDENTIFIER (whitelisted in HISDbContext.tablesWithGuidAudit)

-- ============================================================
-- MCIEvents
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'MCIEvents'
)
BEGIN
    CREATE TABLE MCIEvents (
        Id                    UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        EventCode             NVARCHAR(50)     NOT NULL,
        EventName             NVARCHAR(200)    NOT NULL,
        EventType             NVARCHAR(50)     NOT NULL,  -- Accident, NaturalDisaster, Fire, Chemical, Violence, Other
        EventLocation         NVARCHAR(300)    NOT NULL DEFAULT '',

        AlertReceivedAt       DATETIME2(7)     NOT NULL,
        ActivatedAt           DATETIME2(7)     NOT NULL,
        DeactivatedAt         DATETIME2(7)     NULL,

        AlertLevel            NVARCHAR(20)     NOT NULL DEFAULT 'Yellow',  -- Yellow, Orange, Red
        EstimatedVictims      INT              NOT NULL DEFAULT 0,
        ActualVictims         INT              NOT NULL DEFAULT 0,

        [Status]              NVARCHAR(20)     NOT NULL DEFAULT 'Active',  -- Active, Standby, Deactivated
        IncidentCommanderId   UNIQUEIDENTIFIER NULL,

        -- Resources
        BedsActivated         INT              NOT NULL DEFAULT 0,
        StaffMobilized        INT              NOT NULL DEFAULT 0,
        BloodBankAlerted      BIT              NOT NULL DEFAULT 0,
        ORsCleared            BIT              NOT NULL DEFAULT 0,

        -- Reporting
        ReportedToAuthority   BIT              NOT NULL DEFAULT 0,
        ReportedAt            DATETIME2(7)     NULL,
        AfterActionReport     NVARCHAR(MAX)    NULL,

        -- Audit
        CreatedAt             DATETIME2(7)     NOT NULL DEFAULT GETDATE(),
        CreatedBy             UNIQUEIDENTIFIER NULL,
        UpdatedAt             DATETIME2(7)     NULL,
        UpdatedBy             UNIQUEIDENTIFIER NULL,
        IsDeleted             BIT              NOT NULL DEFAULT 0,

        CONSTRAINT FK_MCIEvents_Users_IncidentCommander
            FOREIGN KEY (IncidentCommanderId) REFERENCES Users(Id)
    );
    PRINT 'Created MCIEvents';
END
GO

-- ============================================================
-- MCIVictims
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'MCIVictims'
)
BEGIN
    CREATE TABLE MCIVictims (
        Id                    UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        MCIEventId            UNIQUEIDENTIFIER NOT NULL,
        TagNumber             NVARCHAR(50)     NOT NULL DEFAULT '',

        -- Identity
        PatientId             UNIQUEIDENTIFIER NULL,
        [Name]                NVARCHAR(200)    NULL,
        EstimatedAge          INT              NULL,
        Gender                NVARCHAR(10)     NULL,
        IdentifyingFeatures   NVARCHAR(500)    NULL,

        -- Triage
        ArrivalTime           DATETIME2(7)     NOT NULL,
        TriageCategory        NVARCHAR(20)     NOT NULL DEFAULT '',  -- Red, Yellow, Green, Black
        TriageTime            DATETIME2(7)     NULL,
        TriagedById           UNIQUEIDENTIFIER NULL,
        TriageNotes           NVARCHAR(1000)   NULL,

        -- START assessment
        CanWalk               BIT              NULL,
        RespiratoryRate       INT              NULL,
        HasRadialPulse        BIT              NULL,
        FollowsCommands       BIT              NULL,

        -- Injuries
        InjuryDescription     NVARCHAR(1000)   NULL,
        BodyAreasAffected     NVARCHAR(500)    NULL,

        -- Status
        CurrentLocation       NVARCHAR(100)    NOT NULL DEFAULT '',  -- Triage, ED, OR, ICU, Ward, Morgue
        [Status]              NVARCHAR(30)     NOT NULL DEFAULT 'Active',  -- Active, Admitted, Discharged, Transferred, Deceased

        -- Treatment
        InitialTreatment      NVARCHAR(1000)   NULL,
        AdmissionId           UNIQUEIDENTIFIER NULL,

        -- Family contact
        FamilyNotified        BIT              NOT NULL DEFAULT 0,
        FamilyContactName     NVARCHAR(200)    NULL,
        FamilyContactPhone    NVARCHAR(50)     NULL,
        FamilyNotifiedAt      DATETIME2(7)     NULL,

        -- Audit
        CreatedAt             DATETIME2(7)     NOT NULL DEFAULT GETDATE(),
        CreatedBy             UNIQUEIDENTIFIER NULL,
        UpdatedAt             DATETIME2(7)     NULL,
        UpdatedBy             UNIQUEIDENTIFIER NULL,
        IsDeleted             BIT              NOT NULL DEFAULT 0,

        CONSTRAINT FK_MCIVictims_MCIEvents
            FOREIGN KEY (MCIEventId) REFERENCES MCIEvents(Id),
        CONSTRAINT FK_MCIVictims_Patients
            FOREIGN KEY (PatientId) REFERENCES Patients(Id),
        CONSTRAINT FK_MCIVictims_Users_TriagedBy
            FOREIGN KEY (TriagedById) REFERENCES Users(Id)
    );
    PRINT 'Created MCIVictims';
END
GO

-- ============================================================
-- MCISituationReports
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'MCISituationReports'
)
BEGIN
    CREATE TABLE MCISituationReports (
        Id                    UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
        MCIEventId            UNIQUEIDENTIFIER NOT NULL,
        ReportNumber          INT              NOT NULL DEFAULT 0,
        ReportTime            DATETIME2(7)     NOT NULL,
        ReportedById          UNIQUEIDENTIFIER NOT NULL,

        -- Victim counts
        TotalArrived          INT              NOT NULL DEFAULT 0,
        RedCount              INT              NOT NULL DEFAULT 0,
        YellowCount           INT              NOT NULL DEFAULT 0,
        GreenCount            INT              NOT NULL DEFAULT 0,
        BlackCount            INT              NOT NULL DEFAULT 0,

        -- Status counts
        InED                  INT              NOT NULL DEFAULT 0,
        InOR                  INT              NOT NULL DEFAULT 0,
        InICU                 INT              NOT NULL DEFAULT 0,
        Admitted              INT              NOT NULL DEFAULT 0,
        Discharged            INT              NOT NULL DEFAULT 0,
        Transferred           INT              NOT NULL DEFAULT 0,
        Deceased              INT              NOT NULL DEFAULT 0,

        -- Resources
        BedsAvailable         INT              NOT NULL DEFAULT 0,
        ORsInUse              INT              NOT NULL DEFAULT 0,
        VentilatorsInUse      INT              NOT NULL DEFAULT 0,
        BloodSupplyStatus     NVARCHAR(100)    NULL,
        CriticalSupplyIssues  NVARCHAR(500)    NULL,

        -- Staffing
        DoctorsOnDuty         INT              NOT NULL DEFAULT 0,
        NursesOnDuty          INT              NOT NULL DEFAULT 0,

        Comments              NVARCHAR(2000)   NULL,
        ImmediateNeeds        NVARCHAR(1000)   NULL,

        -- Audit
        CreatedAt             DATETIME2(7)     NOT NULL DEFAULT GETDATE(),
        CreatedBy             UNIQUEIDENTIFIER NULL,
        UpdatedAt             DATETIME2(7)     NULL,
        UpdatedBy             UNIQUEIDENTIFIER NULL,
        IsDeleted             BIT              NOT NULL DEFAULT 0,

        CONSTRAINT FK_MCISituationReports_MCIEvents
            FOREIGN KEY (MCIEventId) REFERENCES MCIEvents(Id),
        CONSTRAINT FK_MCISituationReports_Users_ReportedBy
            FOREIGN KEY (ReportedById) REFERENCES Users(Id)
    );
    PRINT 'Created MCISituationReports';
END
GO
