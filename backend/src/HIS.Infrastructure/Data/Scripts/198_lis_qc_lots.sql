-- QA sweep 2026-09-15 (LIS): internal QC lots with target Mean/SD per lot + test + level.
-- The QC screens used hard-coded fake lots, and RunQC/Levey-Jennings queried QCLots/QCResults tables that never
-- existed (errors swallowed → every run "passed" with Mean=0, SD=1). LISCompleteService.SampleQc.cs reads/writes
-- this table via raw SQL; results stay in LabQCResults. Seeds lots from existing LabQCResults runs. Idempotent.
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON; -- filtered unique index below requires it (sqlcmd defaults OFF)

-- ------------------------------------------------------------
-- A. IQC lots (nội kiểm) — target Mean/SD per lot + test + level
-- ------------------------------------------------------------
IF OBJECT_ID(N'dbo.LabQCLots', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LabQCLots (
        Id            UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_LabQCLots PRIMARY KEY,
        LotNumber     NVARCHAR(50)     NOT NULL,
        TestCode      NVARCHAR(50)     NOT NULL,      -- = Services.ServiceCode (same as LabQCResults.TestCode)
        TestName      NVARCHAR(200)    NULL,
        QCLevel       INT              NOT NULL,      -- 1=Low, 2=Normal, 3=High (LabQCResults.QCLevel = 'Level{n}')
        Manufacturer  NVARCHAR(200)    NULL,
        TargetMean    DECIMAL(18,6)    NOT NULL,
        TargetSD      DECIMAL(18,6)    NOT NULL,
        Unit          NVARCHAR(50)     NULL,
        ExpiryDate    DATETIME2        NULL,
        IsActive      BIT              NOT NULL CONSTRAINT DF_LabQCLots_IsActive DEFAULT (1),
        CreatedAt     DATETIME2        NOT NULL CONSTRAINT DF_LabQCLots_CreatedAt DEFAULT (GETDATE()),
        CreatedBy     NVARCHAR(100)    NULL,
        UpdatedAt     DATETIME2        NULL,
        UpdatedBy     NVARCHAR(100)    NULL,
        IsDeleted     BIT              NOT NULL CONSTRAINT DF_LabQCLots_IsDeleted DEFAULT (0),
        CONSTRAINT CK_LabQCLots_Level CHECK (QCLevel BETWEEN 1 AND 3),
        CONSTRAINT CK_LabQCLots_SD CHECK (TargetSD > 0)
    );
    PRINT 'Created LabQCLots';
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_LabQCLots_Lot_Test_Level' AND object_id = OBJECT_ID(N'dbo.LabQCLots'))
    CREATE UNIQUE INDEX UX_LabQCLots_Lot_Test_Level ON dbo.LabQCLots (LotNumber, TestCode, QCLevel) WHERE IsDeleted = 0;
GO
-- Seed lots from existing IQC runs so RunQC keeps working for lots already in use (latest Mean/SD wins)
INSERT INTO dbo.LabQCLots (Id, LotNumber, TestCode, TestName, QCLevel, TargetMean, TargetSD, IsActive, CreatedAt, CreatedBy, IsDeleted)
SELECT NEWID(), x.QCLotNumber, x.TestCode, s.ServiceName,
       TRY_CAST(REPLACE(x.QCLevel, 'Level', '') AS INT), x.Mean, x.SD, 1, GETDATE(), N'migration', 0
FROM (
    SELECT r.QCLotNumber, r.TestCode, r.QCLevel, r.Mean, r.SD, r.ServiceId,
           ROW_NUMBER() OVER (PARTITION BY r.QCLotNumber, r.TestCode, r.QCLevel ORDER BY r.RunTime DESC) rn
    FROM dbo.LabQCResults r
    WHERE r.IsDeleted = 0 AND r.QCLotNumber IS NOT NULL AND r.QCLotNumber <> '' AND r.SD > 0
      AND TRY_CAST(REPLACE(r.QCLevel, 'Level', '') AS INT) BETWEEN 1 AND 3
) x
LEFT JOIN dbo.Services s ON s.Id = x.ServiceId
WHERE x.rn = 1
  AND NOT EXISTS (SELECT 1 FROM dbo.LabQCLots l
                  WHERE l.LotNumber = x.QCLotNumber AND l.TestCode = x.TestCode
                    AND l.QCLevel = TRY_CAST(REPLACE(x.QCLevel, 'Level', '') AS INT) AND l.IsDeleted = 0);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_LabQCResults_Service_Analyzer_RunTime' AND object_id = OBJECT_ID(N'dbo.LabQCResults'))
    CREATE INDEX IX_LabQCResults_Service_Analyzer_RunTime ON dbo.LabQCResults (ServiceId, AnalyzerId, QCLevel, QCLotNumber, RunTime);
GO
