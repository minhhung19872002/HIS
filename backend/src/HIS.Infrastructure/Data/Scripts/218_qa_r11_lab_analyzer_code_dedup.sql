-- 218 (QA round 11, 2026-09-25): LabAnalyzers.Code is the HL7 routing key (MSH-3/MSH-4 -> analyzer); duplicate
-- codes (local: ~98 x HL7SPY-001) make every ORU from that sender ambiguous and it is parked as "unrouted".
-- Keep one non-deleted row per trimmed non-blank Code (active > has mappings > oldest), soft-delete the rest (nothing hard-deleted, child FKs intact).
-- Uniqueness from now on is enforced in LISCompleteService (create/update); no filtered unique index on purpose
-- (a filtered index breaks sqlcmd writes with error 1934 — see 204/211). Idempotent.
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Draft of this script created a filtered unique index locally — remove it.
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_LabAnalyzers_Code_Active' AND object_id = OBJECT_ID('LabAnalyzers'))
    DROP INDEX UX_LabAnalyzers_Code_Active ON LabAnalyzers;
GO

;WITH d AS (
    -- Keep the row that is really in use: active first, then the one with parameter mappings, then the oldest.
    SELECT a.Id, ROW_NUMBER() OVER (
               PARTITION BY LTRIM(RTRIM(a.Code))
               ORDER BY a.IsActive DESC,
                        CASE WHEN EXISTS (SELECT 1 FROM LabAnalyzerTestMappings m WHERE m.AnalyzerId = a.Id) THEN 0 ELSE 1 END,
                        a.CreatedAt, a.Id) AS rn
    FROM LabAnalyzers a
    WHERE a.IsDeleted = 0 AND LTRIM(RTRIM(ISNULL(a.Code, N''))) <> N''
)
UPDATE a
   SET a.IsDeleted = 1,
       a.IsActive = 0,
       a.UpdatedAt = SYSUTCDATETIME(),
       a.UpdatedBy = 'migration 218: duplicate analyzer code'
  FROM LabAnalyzers a
  JOIN d ON d.Id = a.Id
 WHERE d.rn > 1;
GO
