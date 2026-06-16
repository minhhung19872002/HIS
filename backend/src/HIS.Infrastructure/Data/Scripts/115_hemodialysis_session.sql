-- 115_hemodialysis_session.sql
-- Module Chay than nhan tao (#148 F1.7): tao bang HemodialysisSessions
-- Phieu theo doi tung buoi loc mau (per-session) gan vao Admission noi tru.
-- Idempotent: bao boc toan bo trong IF OBJECT_ID IS NULL

IF OBJECT_ID(N'dbo.HemodialysisSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.HemodialysisSessions (
        Id                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
        AdmissionId           UNIQUEIDENTIFIER NOT NULL,
        SessionDate           DATE             NOT NULL,
        StartTime             TIME(7)          NOT NULL,
        EndTime               TIME(7)          NULL,
        SessionNumber         INT              NOT NULL DEFAULT 0,  -- buoi thu may
        -- Can nang (kg)
        WeightPre             DECIMAL(10,2)    NOT NULL DEFAULT 0,
        WeightPost            DECIMAL(10,2)    NOT NULL DEFAULT 0,
        -- Dau hieu sinh ton
        Pulse                 INT              NOT NULL DEFAULT 0,  -- lan/phut
        BloodPressureLying    NVARCHAR(50)     NULL,                -- HA nam
        BloodPressureStanding NVARCHAR(50)     NULL,                -- HA dung
        Temperature           DECIMAL(5,2)     NOT NULL DEFAULT 0,  -- do C
        RespiratoryRate       INT              NOT NULL DEFAULT 0,  -- lan/phut
        -- Thong so may loc
        BloodFlowRate         INT              NOT NULL DEFAULT 0,  -- toc do mau ml/phut
        ArterialPressure      INT              NULL,                -- ap luc DM mmHg
        VenousPressure        INT              NULL,                -- ap luc TM mmHg
        Tmp                   DECIMAL(8,2)     NOT NULL DEFAULT 0,  -- PTM mmHg
        ReplacementFluid      DECIMAL(8,2)     NOT NULL DEFAULT 0,  -- tai dich (lit)
        DialyzerType          NVARCHAR(200)    NULL,                -- loai qua loc
        Medications           NVARCHAR(MAX)    NULL,                -- thuoc
        Complications         NVARCHAR(MAX)    NULL,                -- bien chung
        Notes                 NVARCHAR(MAX)    NULL,
        -- Audit cols: NVARCHAR(450) NULL (tranh ValueConverter Guid/String)
        CreatedAt             DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedBy             NVARCHAR(450)    NULL,
        UpdatedAt             DATETIME2        NULL,
        UpdatedBy             NVARCHAR(450)    NULL,
        IsDeleted             BIT              NOT NULL DEFAULT 0,
        CONSTRAINT PK_HemodialysisSessions PRIMARY KEY (Id),
        CONSTRAINT FK_HemodialysisSessions_Admissions
            FOREIGN KEY (AdmissionId) REFERENCES dbo.Admissions(Id)
    );

    CREATE INDEX IX_HemodialysisSessions_AdmissionId
        ON dbo.HemodialysisSessions (AdmissionId);
END
